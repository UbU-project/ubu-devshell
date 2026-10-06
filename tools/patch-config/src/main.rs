//! Same local patch discovery contract, without a mandatory Python interpreter.
use std::{
    collections::{BTreeMap, BTreeSet},
    error::Error,
    fs,
    path::{Path, PathBuf},
    process::Command,
};
type Result<T> = std::result::Result<T, Box<dyn Error>>;
fn read_manifest(path: &Path) -> Result<toml::Value> {
    Ok(fs::read_to_string(path)?.parse()?)
}
fn packages(root: &Path) -> Result<Vec<serde_json::Value>> {
    // Isolated cwd avoids inherited stale generated patches. Offline no-deps
    // metadata describes packages and never fetches their Git dependencies.
    let cwd = tempfile::tempdir()?;
    let output = Command::new("cargo")
        .args([
            "metadata",
            "--offline",
            "--no-deps",
            "--format-version",
            "1",
            "--manifest-path",
        ])
        .arg(root.join("Cargo.toml"))
        .current_dir(cwd.path())
        .env("CARGO_NET_OFFLINE", "true")
        .output()?;
    if !output.status.success() {
        return Err(format!(
            "cargo metadata failed for {}:\n{}",
            root.display(),
            String::from_utf8_lossy(&output.stderr)
        )
        .into());
    }
    let value: serde_json::Value = serde_json::from_slice(&output.stdout)?;
    Ok(value["packages"]
        .as_array()
        .ok_or("missing metadata packages")?
        .clone())
}
fn tables(manifest: &toml::Value) -> Vec<&toml::map::Map<String, toml::Value>> {
    let mut result = Vec::new();
    for name in ["dependencies", "dev-dependencies", "build-dependencies"] {
        if let Some(table) = manifest.get(name).and_then(toml::Value::as_table) {
            result.push(table);
        }
        if let Some(targets) = manifest.get("target").and_then(toml::Value::as_table) {
            for target in targets.values() {
                if let Some(table) = target.get(name).and_then(toml::Value::as_table) {
                    result.push(table);
                }
            }
        }
    }
    if let Some(table) = manifest
        .get("workspace")
        .and_then(|w| w.get("dependencies"))
        .and_then(toml::Value::as_table)
    {
        result.push(table);
    }
    result
}
fn quoted(value: &str) -> String {
    // Match the old Python json.dumps ASCII escaping, including surrogate pairs.
    let encoded = serde_json::to_string(value).expect("string encoding");
    let mut result = String::new();
    for character in encoded.chars() {
        if character.is_ascii() {
            result.push(character);
        } else {
            for unit in character.encode_utf16(&mut [0; 2]) {
                result.push_str(&format!("\\u{unit:04x}"));
            }
        }
    }
    result
}
fn relative_path(directory: &Path, consumer: &Path) -> Result<String> {
    let a: Vec<_> = directory.components().collect();
    let b: Vec<_> = consumer.components().collect();
    let common = a.iter().zip(&b).take_while(|(a, b)| a == b).count();
    let mut relative = PathBuf::new();
    for _ in common..b.len() {
        relative.push("..");
    }
    for component in &a[common..] {
        relative.push(component.as_os_str());
    }
    Ok(relative.to_str().ok_or("non-UTF8 package path")?.to_owned())
}
fn patch_body(
    consumer: &Path,
    consumer_name: &str,
    repos_file: &Path,
    repos_dir: &Path,
    marker: &str,
) -> Result<String> {
    let consumer = consumer.canonicalize()?;
    let repos_dir = repos_dir.canonicalize()?;
    let repos = read_manifest(repos_file)?;
    let repos = repos["repos"].as_table().ok_or("missing repos table")?;
    let mut siblings = BTreeMap::new();
    for (name, url) in repos {
        let root = repos_dir.join(name.replace('_', "-"));
        if name != consumer_name && root.join("Cargo.toml").is_file() {
            let url = url.as_str().ok_or("repository URL must be a string")?;
            if siblings.get(url).is_some_and(|old| old != &root) {
                return Err(format!("multiple local checkouts configured for {url}").into());
            }
            siblings.insert(url.to_owned(), root);
        }
    }
    let manifest = read_manifest(&consumer.join("Cargo.toml"))?;
    let mut manifests = BTreeSet::from([consumer.join("Cargo.toml")]);
    if manifest.get("workspace").is_some() {
        for package in packages(&consumer)? {
            manifests.insert(PathBuf::from(
                package["manifest_path"]
                    .as_str()
                    .ok_or("missing manifest_path")?,
            ));
        }
    }
    let mut needed: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    for path in manifests {
        let manifest = read_manifest(&path)?;
        for table in tables(&manifest) {
            for (key, spec) in table {
                let Some(url) = spec.get("git").and_then(toml::Value::as_str) else {
                    continue;
                };
                if siblings.contains_key(url) {
                    let name = spec
                        .get("package")
                        .and_then(toml::Value::as_str)
                        .unwrap_or(key);
                    needed.entry(url.into()).or_default().insert(name.into());
                }
            }
        }
    }
    let mut blocks = Vec::new();
    for (url, names) in needed {
        let sibling = &siblings[&url];
        let canonical = sibling.canonicalize()?;
        let mut available = BTreeMap::new();
        for package in packages(sibling)? {
            let directory = Path::new(
                package["manifest_path"]
                    .as_str()
                    .ok_or("missing manifest_path")?,
            )
            .parent()
            .ok_or("missing package directory")?
            .to_owned();
            let name = package["name"].as_str().ok_or("missing package name")?;
            if !directory.starts_with(&canonical) {
                return Err(format!("package {name} lies outside {}", sibling.display()).into());
            }
            available.insert(name.to_owned(), directory);
        }
        let mut lines = vec![format!("[patch.{}]", quoted(&url))];
        for name in names {
            let directory = available.get(&name).ok_or_else(|| {
                format!(
                    "package {name} not found in {} for {}",
                    sibling.display(),
                    consumer.display()
                )
            })?;
            let relative = relative_path(directory, &consumer)?;
            let key = if !name.is_empty()
                && name
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
            {
                name.clone()
            } else {
                quoted(&name)
            };
            lines.push(format!("{key} = {{ path = {} }}", quoted(&relative)));
        }
        blocks.push(lines.join("\n"));
    }
    if blocks.is_empty() {
        return Ok(String::new());
    }
    Ok(format!("{marker}\n# Local-only Cargo patches. Do not commit this file.\n# Re-run from ubu-devshell when sibling paths change.\n\n{}\n",blocks.join("\n\n")))
}
fn run() -> Result<()> {
    let args: Vec<_> = std::env::args().skip(1).collect();
    if let [mode, path] = args.as_slice() {
        if mode == "parse" {
            println!(
                "{}",
                serde_json::to_string(&read_manifest(Path::new(path))?)?
            );
            return Ok(());
        }
    }
    let [consumer, name, repos_file, repos_dir, marker] = args.as_slice() else {
        return Err("expected consumer, name, repos file, repos directory and marker".into());
    };
    print!(
        "{}",
        patch_body(
            Path::new(consumer),
            name,
            Path::new(repos_file),
            Path::new(repos_dir),
            marker
        )?
    );
    Ok(())
}
fn main() {
    if let Err(error) = run() {
        eprintln!("error: {error}");
        std::process::exit(1);
    }
}
