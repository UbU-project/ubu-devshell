# Changelog

## Unreleased

- Initial public scaffold for the UbU Phase 1 development harness.
- Added multi-repo clone, update, check, test, format, run, codegen, and public
  artifact helper scripts.
- Added local Cargo `[patch]` config generation workflow.

## D4: Repoint fixture smoke test at store-backed orchestrator

- Rewrote `run-fixture-demo.sh` to exercise the store-backed orchestrator
  path (O4 decision: MemoryState removed; all state through ubu_store).
- Demo creates a throwaway SQLite store under a temp directory via
  `UBU_DB_PATH`; migrations run on open; store removed on exit including on failure.
- Demo drives import → plan → next_action through the HTTP API and asserts
  `admitted_to_store >= 1` and a non-empty `task_id` in the next_action response.
- Demo requires no live GitHub and no network egress; fails clearly if
  prerequisites (orchestrator repo, cargo, curl, python3) are missing.
- Updated `pinned-revs.toml`: R_orchestrator → post-O4 rev (889d0b2).
- Updated `docs/fixture-demo.md` with store-backed demo description citing O4.
- Updated `CODEGEN.md` with O4 governing decision reference.
- Confirmed: no `[patch]` residue in committed files.

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
