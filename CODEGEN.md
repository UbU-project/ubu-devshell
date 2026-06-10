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
