# Local Development

This repository coordinates sibling checkouts of the public UbU Phase 1 repos.

## Layout

Default layout:

```text
workspace/
  ubu-devshell/
  ubu-design/
  ubu-schemas/
  ubu-core/
  ubu-store/
  ubu-github-adapter/
  ubu-planning-kernel/
  ubu-orchestrator/
  ubu-ui/
  ubu-brand/
```

Use `REPOS_DIR` when your checkouts live elsewhere:

```sh
REPOS_DIR=/path/to/workspace ./scripts/clone-all.sh
```

## Bootstrap

```sh
./scripts/clone-all.sh
./scripts/update-all.sh
./scripts/gen-patch-config.sh
./scripts/show-revs.sh
```

`gen-patch-config.sh` writes local-only Cargo patch files into Rust sibling
repos. Those generated files must be ignored by those sibling repos.

## Checks

```sh
./scripts/check-all.sh
./scripts/test-all.sh
./scripts/fmt-all.sh
```

Each script skips missing repositories and repositories without a known project
type.

## Running Apps

```sh
./scripts/run-orchestrator.sh
./scripts/run-ui.sh
```

Both bind to `127.0.0.1` by default when the underlying repo honors `HOST` or
`BIND_ADDR`.

Override commands when repository-specific commands change:

```sh
ORCHESTRATOR_CMD='cargo run --bin ubu-orchestrator' ./scripts/run-orchestrator.sh
UI_CMD='npm run dev -- --host 127.0.0.1 --port 5173' ./scripts/run-ui.sh
```
