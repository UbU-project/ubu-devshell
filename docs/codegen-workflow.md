# Codegen Workflow

The devshell coordinates generated UI inputs from pinned local repositories.
It does not fetch generation inputs from the network.

## UI API Client

Source:

```text
ubu-orchestrator/openapi/openapi.generated.json
```

Target:

```text
ubu-ui/src/api/generated
```

Command:

```sh
./scripts/generate-ui-api-client.sh
```

The script copies the pinned OpenAPI file into the UI generated directory. Run
any repository-local client generator from `ubu-ui` after that if the UI repo
defines one.

## UI Schema Types

Source candidates under `ubu-schemas`:

```text
generated/typescript
typescript/generated
dist/typescript
```

Target:

```text
ubu-ui/src/types/generated
```

Command:

```sh
./scripts/generate-ui-schema-types.sh
```

## Codegen Issue Drafts

```sh
./scripts/generate-codegen-issues.sh
```

The output lives under `artifacts/codegen-issues` by default.
