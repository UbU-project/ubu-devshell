# Codegen

This repository coordinates local, public-safe code generation workflows across
Phase 1 repositories.

The harness only generates or copies derived artifacts from pinned local
sources. It does not fetch schemas, OpenAPI files, or generated clients from
the network.

Primary commands:

```sh
./scripts/generate-ui-api-client.sh          # copy pinned OpenAPI file into ubu-ui
./scripts/generate-ui-api-client.sh --from-server  # fetch from running orchestrator
./scripts/generate-ui-schema-types.sh        # copy pinned TS types into ubu-ui
./scripts/generate-codegen-issues.sh         # write issue drafts under artifacts/
./scripts/generate-public-artifacts.sh       # write public-safe artifact package
```

## Prerequisites

Both generation scripts require local checkouts of their source repos:

| Script | Needs |
|---|---|
| `generate-ui-api-client.sh` | `ubu-orchestrator` with `openapi/openapi.generated.json` present, and `ubu-ui` |
| `generate-ui-schema-types.sh` | `ubu-schemas` with TypeScript output generated, and `ubu-ui` |

Clone all repos first if needed:

```sh
./scripts/clone-all.sh
```

Scripts fail clearly when prerequisites are missing. No private credentials
are required.

See [docs/codegen-workflow.md](docs/codegen-workflow.md) for full details
including environment variable overrides.

## Governing Decisions

Generated issue text must cite governing decision IDs when touching
vocabulary. The current governing decisions for Phase 1 vocabulary are:

- **UBU-D0226** through **UBU-D0230**

Any PR that adds, renames, or removes fields in the generated API client or
schema types must reference the relevant decision ID from this range in the
PR description and in the generated issue draft.

The fixture smoke test (`scripts/run-fixture-demo.sh`) exercises the
store-backed orchestrator path. The removal of the in-memory MemoryState
path and the addition of `UBU_DB_PATH` config are governed by orchestrator
ticket **O4** (`O4: Replace MemoryState with ubu_store admission and query
boundary`). See `docs/fixture-demo.md` for the full demo description.
