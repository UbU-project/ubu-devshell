# ubu-devshell

`ubu-devshell` is the public utility harness for UbU Phase 1 development.
It clones, updates, checks, tests, runs, and dogfoods the separate public
`UbU-project/*` repositories.

This repository owns local development overrides, including generated Cargo
`[patch]` configuration for sibling Rust repositories. It does not own
canonical schemas, planner logic, production deployment tooling, or private
fixtures.

## Repositories

The repositories are listed in [repos.toml](repos.toml). By default, scripts
expect them as siblings of this checkout:

```text
parent/
  ubu-devshell/
  ubu-core/
  ubu-store/
  ...
```

Override the location with `REPOS_DIR`:

```sh
REPOS_DIR=/path/to/ubu ./scripts/clone-all.sh
```

## Common Flow

```sh
./scripts/clone-all.sh
./scripts/update-all.sh
./scripts/gen-patch-config.sh
./scripts/check-all.sh
./scripts/test-all.sh
```

Run local apps when the target repositories exist:

```sh
./scripts/run-orchestrator.sh
./scripts/run-ui.sh
```

## Local Cargo Patch Files

`./scripts/gen-patch-config.sh` writes gitignored `.cargo/config.toml` files in
local Rust consumer repositories so cross-repo dependencies can point at local
siblings during development.

Those generated files are never committed. See
[docs/patch-config.md](docs/patch-config.md).

## Non-goals

- No domain semantics
- No canonical schema definitions
- No planner logic
- No production deployment tooling
- No private data fixtures
- No credentials required by default

## License

MIT. See [LICENSE](LICENSE).
