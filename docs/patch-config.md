# Cargo Patch Config

`ubu-devshell` owns generation of local-only Cargo `[patch]` config files for
Phase 1 Rust repositories.

Command:

```sh
./scripts/gen-patch-config.sh
```

For each local Rust consumer with git dependencies on locally available siblings,
the script writes:

```text
<repo>/.cargo/config.toml
```

The generator reads TOML using Python 3.11+'s standard-library `tomllib`. It reads
`dependencies`, `dev-dependencies`, `build-dependencies`, and
`workspace.dependencies`, including target-specific dependency tables. For a
workspace consumer it also reads member manifests discovered by Cargo, so member
dependencies and inherited workspace dependencies are covered. Each dependency's
`package` override supplies its real package name; otherwise its key does.

Only git URLs declared by that consumer and matched exactly in `repos.toml` are
eligible. The repository key still locates the sibling checkout (underscores
become hyphens), but is never assumed to be a Cargo package name. Unlisted URLs
and siblings without a root `Cargo.toml` are skipped. Registry/path dependencies
are not converted to patches. No repository names or crate layouts are special
cased. URL spelling is literal; `.git` suffixes and alternate transports are not
normalized. The existing `repos.toml` shell reader expects the conventional
unquoted keys and quoted URLs used by the stock file.

To locate packages, the script runs Cargo with `CARGO_NET_OFFLINE=true`:

```sh
cargo metadata --offline --no-deps --format-version 1 --manifest-path <sibling>/Cargo.toml
```

The metadata's package names and manifest paths handle package roots, virtual
workspaces, and packages with workspace members. Cargo itself expands workspace
membership; the script does not guess `crates/` layouts. Metadata runs from an
isolated temporary directory so a stale generated config in the caller cannot
break discovery. No dependency resolution or network access is required. An
unresolved package in a present sibling, invalid manifest, or metadata error fails
generation instead of producing an invalid patch. Members outside their sibling
checkout are rejected; external workspace ownership is not inferred for a
consumer root without its own workspace table.

One block is emitted per URL, and only the packages actually declared in the
consumer's dependency tables are included. Entries and paths are deterministic;
paths are relative to the consumer. For example, the orchestrator's kernel
dependencies produce:

```toml
[patch."https://github.com/UbU-project/ubu-planning-kernel"]
ubu_planning_core = { path = "../ubu-planning-kernel/crates/ubu-planning-core" }
ubu_planning_cpu = { path = "../ubu-planning-kernel/crates/ubu-planning-cpu" }
```

A package-root dependency instead produces:

```toml
[patch."https://github.com/UbU-project/ubu-core"]
ubu_core = { path = "../ubu-core" }
```

No file is written for a consumer without eligible sibling git dependencies. A
stale marked file for that consumer is removed after the same safety checks.
Unused repositories, such as a schemas workspace that nobody depends on, produce
no patch entries. The script preserves `unchanged:` and `Files written:` reports;
stale-file deletion is reported separately as `removed:`.

## Safety Rules

- Generated `.cargo/config.toml` files are never committed.
- The script refuses to overwrite a tracked `.cargo/config.toml`.
- The script refuses to overwrite an untracked config unless it contains the
  devshell generated marker.
- Sibling Rust repos must ignore `.cargo/config.toml` in their own `.gitignore`
  files.

## Guarantees and verification

The generator guarantees that each emitted entry names a package discovered by
Cargo and points to that package's manifest directory, never a virtual workspace
root. It guarantees dependency-driven selection, not API compatibility between
different sibling revisions. Cargo applies a git-source patch across the resolved
graph, so a local core can replace the older core pinned by an adapter or kernel.
Such consumers still need source code compatible with the local core.

Run `./scripts/test-patch-config.sh` for isolated offline fixture tests. It is
also invoked by `scripts/check-all.sh`. It covers root packages, renamed workspace
members, dependency tables, missing/unused siblings, stale files, deterministic
reporting, tracked/unmarked refusal, and the gitignore warning. It creates no
files in the real constellation.

When checking real consumers, remember that Cargo builds can rewrite their
tracked lockfiles to record local patches. Preserve any existing work and restore
only verification-induced lockfile changes if a clean constellation is required.
DS-1's real verification findings are recorded in `docs/DS-1-verification.md`.

## Fallback

If local Cargo `[patch]` config stops matching the workflow, drop the override
entirely and commit plus bump the pinned git rev on each cross-repo iteration.

Use:

```sh
./scripts/show-revs.sh
./scripts/bump-rev.sh ../ubu-store ubu-core <rev>
```
