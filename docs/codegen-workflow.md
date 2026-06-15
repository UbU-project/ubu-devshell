# Codegen Workflow

The devshell coordinates generated UI inputs from pinned local repositories.
It does not fetch generation inputs from the network unless `--from-server` is
explicitly passed.

## Prerequisites

| Script | Required repo(s) | Required path |
|---|---|---|
| `generate-ui-api-client.sh` | `ubu-orchestrator`, `ubu-ui` | `ubu-orchestrator/openapi/openapi.generated.json` |
| `generate-ui-schema-types.sh` | `ubu-schemas`, `ubu-ui` | any candidate under `ubu-schemas` (see below) |

All repos are siblings of `ubu-devshell` by default. Clone with:

```sh
./scripts/clone-all.sh
```

No private credentials are required.

## UI API Client

### Default (pinned file)

Source:

```text
ubu-orchestrator/openapi/openapi.generated.json
```

Target:

```text
ubu-ui/src/api/generated/
```

Command:

```sh
./scripts/generate-ui-api-client.sh
```

The script copies the pinned OpenAPI file into the UI generated directory and
writes a `README.md` noting the source. Run any repository-local client
generator from `ubu-ui` after that if the UI repo defines one.

The script fails clearly when:
- `ubu-orchestrator/openapi/openapi.generated.json` is missing
- `ubu-ui` repo is missing
- The destination resolves outside `ubu-ui` (safety guard)

### Live server mode

If `ubu-orchestrator` is running locally, you can fetch the live spec instead:

```sh
./scripts/run-orchestrator.sh   # in another terminal
./scripts/generate-ui-api-client.sh --from-server
```

This fetches `$ORCHESTRATOR_URL/openapi.json` (default:
`http://127.0.0.1:8080`). Requires `curl`. Override the base URL with:

```sh
ORCHESTRATOR_URL=http://127.0.0.1:9090 ./scripts/generate-ui-api-client.sh --from-server
```

### Environment overrides

| Variable | Default | Description |
|---|---|---|
| `REPOS_DIR` | `../` relative to devshell | Parent directory of all repos |
| `ORCHESTRATOR_DIR` | `$REPOS_DIR/ubu-orchestrator` | Path to orchestrator checkout |
| `UI_DIR` | `$REPOS_DIR/ubu-ui` | Path to UI checkout |
| `OPENAPI_SOURCE` | `$ORCHESTRATOR_DIR/openapi/openapi.generated.json` | Pinned source file |
| `UI_API_GENERATED_DIR` | `$UI_DIR/src/api/generated` | Destination directory |
| `ORCHESTRATOR_URL` | `http://127.0.0.1:8080` | Base URL for `--from-server` |

## UI Schema Types

Source candidates tried in order under `ubu-schemas`:

```text
generated/typescript
typescript/generated
dist/typescript
```

Target:

```text
ubu-ui/src/types/generated/
```

Command:

```sh
./scripts/generate-ui-schema-types.sh
```

The script clears the destination directory, copies the first matching source
candidate, and writes a `README.md` noting the source.

The script fails clearly when:
- `ubu-schemas` repo directory is missing
- No TypeScript output candidate exists under `ubu-schemas`
- `ubu-ui` repo is missing
- The destination resolves outside `ubu-ui` (safety guard)

### Environment overrides

| Variable | Default | Description |
|---|---|---|
| `REPOS_DIR` | `../` relative to devshell | Parent directory of all repos |
| `SCHEMAS_DIR` | `$REPOS_DIR/ubu-schemas` | Path to schemas checkout |
| `UI_DIR` | `$REPOS_DIR/ubu-ui` | Path to UI checkout |
| `UI_SCHEMA_GENERATED_DIR` | `$UI_DIR/src/types/generated` | Destination directory |

## Codegen Issue Drafts

```sh
./scripts/generate-codegen-issues.sh
```

Output lives under `artifacts/codegen-issues/` by default. Generated drafts
cite governing decisions UBU-D0226 through UBU-D0230 for any PR touching
vocabulary. See [../CODEGEN.md](../CODEGEN.md) for the full policy.

## Fixture Demo (Smoke Test)

```sh
./scripts/run-fixture-demo.sh
```

Uses public-safe fixtures under `fixtures/` as the cross-repo smoke test.
Does not require a running orchestrator or UI. See
`fixtures/demo/phase1-demo-manifest.json`.
