# Changelog

## Unreleased

- Initial public scaffold for the UbU Phase 1 development harness.
- Added multi-repo clone, update, check, test, format, run, codegen, and public
  artifact helper scripts.
- Added local Cargo `[patch]` config generation workflow.

## D1: Rev-pinning and fixture loop

- Added `pinned-revs.toml` to record expected R_* revs for Phase 1 repos.
- Updated `show-revs.sh` to compare local checkout HEADs against pinned revs
  and report OK / MISMATCH / unset / MISSING status per repo.
- Updated `generate-codegen-issues.sh` to cite governing decision IDs
  UBU-D0226 through UBU-D0230 in generated issue text that touches vocabulary.
- Updated `CODEGEN.md` to document the decision citation requirement.
- Confirmed: no `[patch]` residue in committed files.
- Confirmed: `fixtures/github/*.json` and `fixtures/demo/phase1-demo-manifest.json`
  use snake_case UbU fields throughout.
