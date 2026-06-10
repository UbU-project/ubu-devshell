# Release Artifacts

The public artifact helper creates a placeholder package shape for later
dogfooding:

```sh
./scripts/generate-public-artifacts.sh
```

Default output:

```text
artifacts/public-package/
  manifest.json
  claim-register.json
  evidence-index.json
  export-review.json
  approvals.json
  publication-plan.json
  known-limitations.md
  demo-summary.md
```

The package is a scaffold. It must not contain private data, production
credentials, canonical schema definitions, or domain semantics.
