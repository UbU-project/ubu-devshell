# Cargo Patch Config

`ubu-devshell` owns generation of local-only Cargo `[patch]` config files for
Phase 1 Rust repositories.

Command:

```sh
./scripts/gen-patch-config.sh
```

For each local Rust consumer repo, the script writes:

```text
<repo>/.cargo/config.toml
```

The generated config points cross-repo dependencies at local siblings, for
example:

```toml
[patch."https://github.com/UbU-project/ubu-core"]
ubu_core = { path = "../ubu-core" }
```

## Safety Rules

- Generated `.cargo/config.toml` files are never committed.
- The script refuses to overwrite a tracked `.cargo/config.toml`.
- The script refuses to overwrite an untracked config unless it contains the
  devshell generated marker.
- Sibling Rust repos must ignore `.cargo/config.toml` in their own `.gitignore`
  files.

## Workflow TODO

TODO(workflow): re-verify this `[patch]` mechanism whenever the dev workflow
changes. It is the most workflow-fragile piece of the setup.

## Fallback

If local Cargo `[patch]` config stops matching the workflow, drop the override
entirely and commit plus bump the pinned git rev on each cross-repo iteration.

Use:

```sh
./scripts/show-revs.sh
./scripts/bump-rev.sh ../ubu-store ubu-core <rev>
```
