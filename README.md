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

## Manual Recursive Live GitHub Smoke

Default devshell checks are offline and egress-free. `scripts/check-all.sh`,
`scripts/test-all.sh`, and `scripts/run-fixture-demo.sh` must run with
`UBU_GITHUB_INGEST_MODE` and `UBU_GITHUB_PROJECTION_EXPORT_MODE` unset or
non-live and with no `GITHUB_TOKEN` in the environment. They use the recording
fake path and never run the live smoke.

The live smoke is governed by `UBU-D0244` and `UBU-D0245`. The canonical home
for the recursive live smoke procedure is `ubu-design`'s `README.md`; this
section mirrors the runnable devshell procedure for the local script.

1. Create a throwaway GitHub repository.
2. In that repository, create one throwaway issue. Do not use a real project
   issue. Keep the repository to that single issue for the smoke so the imported
   issue, planned next Task, and projection target are the same object.
3. Ensure the repository has the managed label `ubu-managed`. The script only
   adds and removes that managed label on the issue; it does not create issues,
   comments, contents, or administration changes.
4. Create a fine-grained personal access token:
   - Repository access: only the single throwaway repository.
   - Permissions: `Issues: Read and write` and `Metadata: Read`. The same token
     covers read-for-import and write-for-projection.
   - Expiry: short, single-use window.
   - No `Contents` permission is needed.
   - No `Administration` permission is needed.
5. Supply the token only at run time. Do not place it in a file:

```sh
read -rsp 'GitHub token: ' GITHUB_TOKEN
echo
export GITHUB_TOKEN
export UBU_GITHUB_INGEST_MODE=live
export UBU_GITHUB_PROJECTION_EXPORT_MODE=live
export UBU_LIVE_GITHUB_SMOKE=1
export UBU_LIVE_GITHUB_OWNER='<owner>'
export UBU_LIVE_GITHUB_REPO='<throwaway-repo>'
export UBU_LIVE_GITHUB_ISSUE_NUMBER='<issue-number>'
./scripts/live-github-smoke.sh
unset GITHUB_TOKEN
```

The smoke starts a local throwaway orchestrator store with both live modes set,
pastes the token into the in-memory desktop session, imports issues live, checks
that the target issue was admitted as a Task and External Reference, generates a
plan, and selects the next Task. It then runs a dry-run projection preview,
prints the planned operation, and requires a second explicit confirmation before
approving exactly one live `ubu-managed` add. It reads the issue back through
live reconciliation, removes `ubu-managed` from the issue, and verifies cleanup.
Revoke the token immediately after the run.

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
