# Changelog

## D16: Effect application on completion and intrinsic-affect mode rejection

- Extended the fixture smoke test to assert effect application on Task completion
  for `UBU-D0242` (Wiring-B): completing a Task with `effects` through
  `/task/{id}/action` mutates the current `UniverseState` (read back and
  deep-checked, including an object-valued fact payload); a Task whose
  `effects.success_probability` is below 1 still applies; and a `failed` Task's
  completion is rejected (`invalid_task_state`) leaving the `UniverseState`
  version and payload unchanged.
- Added an offline `ubu-core` mode-rejection smoke that asserts
  `organization_mode` and `worker_mode` reject precondition and effect targets in
  the intrinsic-affect namespace while `user_mode` permits them, across the
  canonical `validate_precondition_for_mode`/`validate_mutations_for_mode`
  validators (the running orchestrator is fixed to `user_mode`).
- Added the `fixtures/demo/intrinsic-affect-mode-cases.json` fixture and
  registered it in the demo manifest.
- Updated recorded `R_orchestrator`, `R_schemas`, `R_core`, and `R_store` labels
  for the post-O17/post-S17/post-C12/post-ST7 revs.

## D15: Precondition-gated planning fixture

- Added an offline fixture smoke assertion for `UBU-D0242` that seeds a
  `UniverseState` and five Tasks, then verifies `/planning/generate` partitions
  no-precondition, satisfied, failed, malformed, and absent-target preconditions
  into eligible, blocked, and invalid outcomes.
- Updated recorded `R_orchestrator`, `R_schemas`, and `R_core` labels for the
  post-O16/post-S16/post-C10 revs.

## D14: UniverseState fixture semantics

- Added an offline UniverseState fixture smoke step for `UBU-D0241` that admits and
  reads back a four-collection `UniverseState`, applies all seven mutation
  operations, rejects an invalid mutation list without partial application, and
  evaluates preconditions over `equals`, `member_of`, and `absent`.
- Updated recorded `R_schemas`, `R_core`, and `R_store` labels for the
  post-S15/post-C9/post-ST6 revs.

## D13: Risk and plan-quality fixture reports

- Added offline designed fixtures and smoke assertions for derived deadline,
  affect-margin, destructive-pressure, and recommendation-path skeleton risks.
- Asserted bounded human-complete plan-quality signals and model-cause-only failure
  patterns from a synthetic recent failure Log.
- Verified that blocking findings append a recalculation request and mark an admitted
  Compact Calendar stale, while the clean fixture stays low-risk and non-stale
  (`UBU-D0240`).
- Recorded the post-O15 orchestrator and post-S14 schemas revisions; `show-revs.sh`
  verifies each recorded pin against the corresponding checkout.

## Unreleased

- Initial public scaffold for the UbU Phase 1 development harness.
- Added multi-repo clone, update, check, test, format, run, codegen, and public
  artifact helper scripts.
- Added local Cargo `[patch]` config generation workflow.

## D12: Stochastic rollout integration test

- Added offline `shifted_lognormal_p95` fixtures for full-quality Monte Carlo rollout,
  fixed-seed reproducibility, rollout-grounded re-ranking, correlation effects, and
  zero-rollout `not_estimated` behavior through `/planning/generate` (UBU-D0239).
- Asserted the full sixteen-candidate set survives rollout, non-finalists remain
  `not_estimated`, and the Compact Calendar follows the rollout-grounded rank 1.
- Documented that degraded/strict factorization states are unreachable through valid
  §7 API inputs by construction and remain verified by P10 raw-matrix kernel tests.
- Updated post-S12, post-ST5, and post-O14 revision pins.

## D5: Extend fixture smoke test to full bootstrap-to-act loop

- Extended `run-fixture-demo.sh` to drive the full bootstrap-to-act loop store-backed
  against a throwaway store: token intake → bootstrap/seed → next_action (ready) →
  action recording (complete) → next_action (bounded diagnostic, UBU-D0210).
- Demo asserts: Objective, Preference, and Task admitted from seed; ready Task returned
  with non-empty readiness explanation; Task transitions to `completed`; append-only Log
  event admitted; bounded diagnostic returned on second next_action (UBU-D0210).
- Demo remains offline: import_live is a Phase 1 stub (source=github_live_stub) that
  creates Tasks locally without outbound HTTP; fixture/dev token never sent to GitHub.
- Removed old three-step flow (bootstrap/start, /github/import/fixture, planning/generate).
- Updated `pinned-revs.toml`: R_orchestrator → post-O6 rev (8d9ad42).
- Updated `docs/fixture-demo.md` with full bootstrap-to-act loop description citing
  O4, O5, O6, and UBU-D0210.
- Updated `CODEGEN.md` with full loop description and UBU-D0210 citation.
- Confirmed: no `[patch]` residue in committed files.

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
