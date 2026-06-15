# Codegen

This repository coordinates local, public-safe code generation workflows across
Phase 1 repositories.

The harness only generates or copies derived artifacts from pinned local
sources. It does not fetch schemas, OpenAPI files, or generated clients from
the network.

Primary commands:

```sh
./scripts/generate-ui-api-client.sh
./scripts/generate-ui-schema-types.sh
./scripts/generate-codegen-issues.sh
./scripts/generate-public-artifacts.sh
```

See [docs/codegen-workflow.md](docs/codegen-workflow.md).

## Governing Decisions

Generated issue text must cite governing decision IDs when touching
vocabulary. The current governing decisions for Phase 1 vocabulary are:

- **UBU-D0226** through **UBU-D0230**

Any PR that adds, renames, or removes fields in the generated API client or
schema types must reference the relevant decision ID from this range in the
PR description and in the generated issue draft.
