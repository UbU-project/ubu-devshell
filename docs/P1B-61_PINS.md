# P1B-61 pins and verification

Eight repositories changed on `p1b-61-advisor-proposes-a-precondition`. Upstream
commits were pushed before dependent pins. No main merge, dependency addition
or operator acceptance was performed. The
operator granted a one-time force-push exception to correct the missed
replacement requirement; explicit old-revision leases protected those updates.
One commit covers each section
in each affected repository (C spans four repositories; F necessarily spans two).
UI and devshell commits carry Co-Authored-By trailers; Rust commits do not.

## Revisions

| Repository | Final upstream revision |
|---|---|
| `ubu-schemas` | `3b2c93e65710b85a1b29b8c97278a72b87b22944` |
| `ubu-core` | `c4b624d76f210f77f865c61801e02c89219763ce` |
| `ubu-store` | `c62eabc5983db554d3b57f694fe49d6597fe3ea8` |
| `ubu-planning-kernel` | `8af10ece07043c307fe351ac867cfd8449e08c4f` |
| `ubu-github-adapter` | `50fae565e6d48fb5c41107ab3259096ad243ccf3` |
| `ubu-orchestrator` | `6c931d870e0924450b0d32e897071c8f5b78d9e5` |
| `ubu-ui` | `9e0a8978b388abdfd64cf972fda965be1bd17ee0` |
| `ubu-devshell` | H below; I is the commit carrying this report |

## Sections and governing sentences

### A — ubu-schemas, `3b2c93e65710b85a1b29b8c97278a72b87b22944`

Both literal candidate-kind enums gain precondition. A conditional schema validates either a bare precondition tree or an explicit existing/proposed tree pair. Synthetic valid and invalid fixtures exercise it. CONTRACT and CHANGELOG record the contract.

CONTRACT.md: “Cross-file `$ref` values must use absolute `$id` URIs.” Both enum sites were read; the schema-only grep found exactly **2** literal `clarification_question` occurrences, both enum sites. Suppression records inherit the reference and need no edit.

Files: `CHANGELOG.md`, `CONTRACT.md`, `fixtures/invalid/core/advisory-candidate/precondition-not-tree.json`, `fixtures/invalid/core/advisory-candidate/replacement-not-tree.json`, `fixtures/valid/core/advisory-candidate/proposed-precondition.json`, `fixtures/valid/core/advisory-candidate/replacement-precondition.json`, `schemas/core/advisory-candidate.schema.json`, `schemas/worker/worker-authority.schema.json`.

### B — ubu-core, `c4b624d76f210f77f865c61801e02c89219763ce`

Adds CandidateKind::Precondition, extends the wire vocabulary/authority coverage, moves the schemas-ref submodule to A, and adds whole canonical candidate round-trip tests for initial and replacement proposals, plus unknown-kind refusal. No other runtime domain type changes.

CONTRACT.md: “Compatibility is checked by round-tripping canonical fixtures from `schemas-ref/fixtures` when the submodule is available.” CODEGEN.md: “This crate uses the `schemas-ref/` submodule only for fixture compatibility tests.” Module header: “Advisory review-queue types, separate from admitted objects (UBU-D0274).”

Files: `CHANGELOG.md`, `CONTRACT.md`, `schemas-ref`, `src/advisory_candidate.rs`, `src/worker/local_advisory.rs`, `tests/schema_fixture_roundtrip.rs`.

### C — ubu-store, `c62eabc5983db554d3b57f694fe49d6597fe3ea8`

Only the core manifest pin and one lockfile Git source line change; no source or test changes.

Ticket governing pin chain: “Cargo treats two git revisions of `ubu_core` as two distinct packages, so a repo left behind cannot exchange core types with one that moved.”

Files: `Cargo.lock`, `Cargo.toml`.

### C — ubu-planning-kernel, `8af10ece07043c307fe351ac867cfd8449e08c4f`

Only the workspace core manifest pin and one lockfile Git source line change; no source or test changes.

The same ticket pin-chain sentence quoted for store governs this update.

Files: `Cargo.lock`, `Cargo.toml`.

### C — ubu-github-adapter, `50fae565e6d48fb5c41107ab3259096ad243ccf3`

Only the core manifest pin and one lockfile Git source line change; no source or test changes.

The same ticket pin-chain sentence quoted for store governs this update.

Files: `Cargo.lock`, `Cargo.toml`.

### C — ubu-orchestrator, `f84953ddd6c02faf33557f893f161b07f46a4a8f`

Moves core, store, adapter and both kernel package pins in the manifest. Exactly five Git source lines change in Cargo.lock and nothing else. All 513 tests pass without a source or test change.

The same ticket pin-chain sentence quoted for store governs this update.

Files: `Cargo.lock`, `Cargo.toml`.

### D — ubu-orchestrator, `503c9a7e3fef6d92cf2a8c790fe39c27ecd86ca0`

Adds the precondition producer to the existing advisory run route, constrained model vocabulary/schema, strict bounded tree validation, all-branch evaluation, current-target checking, safe missing-target diagnostics, explicit existing/proposed replacement context and durable deduplication. The model sees descriptions and target names, not fact values. Nine new tests use a StubTransport or the pure mode validator. The one-line assertion at `tests/clarify_producer.rs:237` changes “The producers are suggest_tags and clarify” to “The producers are suggest_tags, clarify and precondition”.

ADVISORY.md: “Proposals never mutate canonical Task state. The advisor only enqueues candidates; admission is an explicit operator act.” A store snapshot asserts **every non-candidate domain table stays identical**, with the ordinary mutation-envelope enqueue metadata checked separately. Malformed-result and missing-target tests assert no enqueue or ledger delta.

Files: `docs/ADVISORY.md`, `openapi/openapi.generated.json`, `src/api/advisory_run.rs`, `src/services/advisory_service.rs`, `src/services/advisory_wire.rs`, `src/services/mod.rs`, `src/services/precondition_advisor.rs`, `tests/clarify_producer.rs`, `tests/precondition_producer.rs`, `tests/support/precondition_fixture.rs`.

### E — ubu-orchestrator, `b70490ea8dcebcbc5e7974fc6c6a04055587cb5e`

The precondition kind dispatches a set-preconditions action using the bare tree or the proposed half of a replacement pair. Admission compares canonical preconditions with the reviewed prior tree and refuses added, changed or cleared conditions. Existing admission writes Task.preconditions through the ordinary atomic candidate/admission writer. It preserves other Task declarations, rechecks facts and mode, and observes Task and UniverseState versions. Rejection leaves the Task untouched, deferral requires resurfacing, and repeat admission is refused with 409. Six HTTP tests include one whole false-to-true planning test, explicit replacement and stale-review refusal.

TASK_CAPTURE.md: “Both operations deserialize the whole resulting payload as `ubu_core::core::Task` and call its validator before admission.” ADVISORY.md: “admission is an explicit operator act.” UNIVERSE_STATE.md: “A Task’s `preconditions` are evaluated against the current state when a Plan is generated, by `ubu-core`’s `evaluate_universe_precondition`.”

Files: `docs/ADVISORY.md`, `docs/UNIVERSE_STATE.md`, `src/services/advisory_service.rs`, `src/services/precondition_advisor.rs`, `src/services/proposal_applier.rs`, `tests/precondition_admission.rs`.

### F — ubu-orchestrator, `6c931d870e0924450b0d32e897071c8f5b78d9e5`

matching_placements now counts only distinct current Dynamic Plan event IDs with no operation. Static commitments, retained completed history and entries outside the Plan are excluded. Static-only and mixed-plan tests are added beside the existing Dynamic-only, moved and retained-history cases. No new response property is needed.

CALENDAR_INTERACTION.md: “Preview does not read Google; the count describes the applied snapshot, not a fresh calendar observation.” The old and new definitions are recorded beside each other.

Files: `docs/CALENDAR_INTERACTION.md`, `openapi/openapi.generated.json`, `src/api/calendar_projection.rs`, `src/services/calendar_apply.rs`, `tests/calendar_retained.rs`.

### F — ubu-ui, `d349fbabc315af94d38ae0405647dbe95c5ee3c3`

The one preview summary line uses the backend Dynamic count, with singular/plural grammar and explicit zero, followed by the true clause that Static commitments keep their fixed times. Existing summary assertions are updated for this intended change; none are removed. The copied OpenAPI contract is current.

NAVIGATION.md: “The screen performs no calculation of that count and adds no diagnostic.”

Files: `docs/NAVIGATION.md`, `src/api/generated/openapi.generated.json`, `src/presentation/calendar-preview.ts`, `src/routes/Calendar.tsx`, `tests/calendar.test.tsx`.

### G — ubu-ui, `9e0a8978b388abdfd64cf972fda965be1bd17ee0`

Extracts PreconditionWords as a shared component without changing its wording or fallback. Review renders the new candidate in words, reuses Admit/Reject/Defer/Resurface, and adds an explicit precondition advisor trigger using the existing route. Missing-target and skipped-Task diagnostics are informational. Five rendered/action tests are added, including both replacement trees, explicit replacement wording, and proposal-only rendering when no prior tree exists; canonical generated declarations are refreshed.

NAVIGATION.md: “Review loads the decision queue on entry and after explicit actions; it does not poll or start models automatically.” Its tone rule says information “came with a response that succeeded. Something happened and the operator should know; nothing went wrong.”

Files: `docs/NAVIGATION.md`, `src/api/client.ts`, `src/components/PreconditionWords.tsx`, `src/routes/Review.tsx`, `src/routes/Today.tsx`, `src/types/generated/index.d.ts`, `tests/review.test.tsx`.

### H — ubu-devshell, `c0b175084bc7bf3f6ec753887f240ad4c566d62f`

Adds a synthetic fact/description staging seed and a loopback runner scenario proving proposal, admission, false/true planning and replacement of an existing condition. The harness stages inputs only. Live step 9 uses Dynamic wording; new step 12 authors facts and runs the advisor after the deterministic UniverseState check; Stop becomes 13. Copy-back adds one item and redacts target names/expected values. Nothing is retired. BUILD_ENV records the requested two-job trial and restoration to one after the operator reported another OOM.

ACCEPTANCE.md: “Deterministic steps come first and model-dependent steps come last, and no step may be a prerequisite of a later step unless it is deterministic.” CONTRACT_CHECK.md: “The boundary: anything assertable over HTTP is a scenario here, never a manual step there.”

Files: `docs/ACCEPTANCE.md`, `docs/BUILD_ENV.md`, `docs/CONTRACT_CHECK.md`, `docs/LIVE_REHEARSAL.md`, `scripts/acceptance.mjs`, `scripts/check-ui-contract.mjs`, `scripts/check-ui-contract.sh`.

### I — ubu-devshell, the commit carrying this report

Seven pins move: schemas, core, store, kernel, adapter, orchestrator and UI.
There is no ubu_devshell key. Files: `pinned-revs.toml`, `docs/P1B-61_PINS.md`.
The same CONTRACT_CHECK boundary quoted for H governs these results: HTTP
behavior is checked by the runner, and operator acceptance remains unperformed.

## Validation

All full suites listed below passed on their section commits. The final
orchestrator suite ran with network sockets denied; every model transport in
new Rust tests is a StubTransport. The runner and stage-only harness are the
explicitly exempt isolated loopback subprocess checks. No live Google, Ollama,
operator store, editor or signal handler was used by the new unit/HTTP tests.

| Repository / check | Before | After |
|---|---:|---:|
| ubu-schemas tests | 2 | 2 |
| ubu-core tests | 158 | 161 |
| ubu-store tests | 108 | 108 |
| ubu-planning-kernel tests | 83 | 83 |
| ubu-github-adapter tests | 23 | 23 |
| ubu-orchestrator tests | 513 | 530 |
| UI tests | 156 | 161 |
| schema valid / invalid fixtures | 87 / 101 | 89 / 103 |
| OpenAPI paths | 56 | 56 |
| endpoints.ts path constants | 43 | 43 |
| runner scenarios | 23 | 24 |
| runner requests | 444 | 466 |
| harness seeds | 10 | 11 |
| live rehearsal steps | 12 | 13 |
| live copy-back items | 7 | 8 |

The endpoints.ts file is unchanged; no route or response property was added.
OpenAPI regeneration matches the committed artifact byte for byte. UI tests,
TypeScript/production build, schema fixture validation, schema bundler test,
TypeScript generation and wire casing checks passed. No baseline test was
removed. The new test that incorrectly expected existing preconditions to be
skipped was corrected to assert replacement review and unchanged canonical state. The section D producer-list assertion and section F wording assertions
were updated to match the intentionally expanded/changed contract.

Clippy unique warnings use diagnostic code + message, deduplicated across
all targets, as in P1B-60:

| Rust repository | Before | After |
|---|---:|---:|
| ubu-schemas | 0 | 0 |
| ubu-core | 2 | 2 |
| ubu-store | 0 | 0 |
| ubu-planning-kernel | 0 | 0 |
| ubu-github-adapter | 0 | 0 |
| ubu-orchestrator | 8 | 8 |

`check-all.sh`: **exit 0**. Its existing fixture-demo quarantine was not run and is not claimed as passed.

```text
RESULT: 24 of 24 scenarios passed, 0 failed, 2 skipped, 466 requests, all to 127.0.0.1
```

The harness was run with `--stage-only`; its eleven seeds passed and its one
existing manual step was printed. That is staging verification, not operator
acceptance. Runner/harness before counts are from the accepted P1B-60 record;
repository suite before counts were measured in this ticket. The runner imports
shared wording helpers but does not render React; UI tests cover rendering.

## Corrections and limits

- The ticket’s missing-key explanation was too broad: `absent` is true for a
  missing key, and later fact authoring can unblock a Task. Existing predicate
  semantics remain intact. Every proposed leaf nevertheless requires an existing
  target, including `absent`; the operator explicitly approved this correction.
- The governing advisory document prohibited generated text in diagnostics.
  The operator approved a narrow exception: canonical target identifiers only,
  at most 128 ASCII bytes each, first three unique targets named and the rest
  counted. No description, expected value or arbitrary model prose is echoed.
- The original §H ordering contradicted the acceptance contract. The operator
  approved placing the model-dependent step after the UniverseState check and
  before Stop. The introduction’s §G pointer refers to work actually in §H.
- Calling the core evaluator once does not validate every branch: it
  short-circuits and accepts empty boolean groups. The producer therefore
  validates strict shape, nonempty groups, depth/node bounds and every leaf,
  and calls both the mode validator and the whole-tree evaluator. No core
  predicate implementation changes were needed.
- The initial implementation mistakenly skipped Tasks that already had a
  precondition, contrary to judgment call 8. This was my implementation error,
  not an approved ticket correction. With the operator's one-time force-push
  authorization, sections A–G and their dependent pins were corrected in place,
  preserving one commit per section/repository. The producer now reads the prior
  tree from canonical state, the queue shows both trees, and admission refuses
  stale review context. Corrected suites passed before the rewritten commits.
- First-time proposals retain the bare-tree shape. Replacement proposals carry
  `existing_precondition` and `proposed_precondition`, both canonical trees.
  The kind-specific dispatcher identifies set-preconditions without an operation
  field; the existing tree is never taken from model output or sent to it.
- Candidate words can themselves disclose private target names and expected
  values. The copy-back preserves counts and relationship words while replacing
  identifiers and expected values with placeholders; it requests no description,
  real Task title or stored fact value.
- The ticket calls for five Rust repository counts; the report also includes
  the schemas repository’s Rust tooling, making six. The literal enum search
  found exactly two sites, not a third in the ref-based suppression schema.
- No new facts, effects, proposed provenance or
  UniverseState-screen advisor was implemented. No claim about a real model’s
  proposal quality or operator acceptance is made. The rehearsal records every
  outcome, including no described Task, no supported facts and no candidate.

## Build recovery

Git history confirmed the default before P1B-60 was four Cargo jobs per
invocation. P1B-60 reduced it to one after overlapping invocations contributed
to memory pressure. During P1B-61 the operator requested a trial of two jobs,
then reported another OOM during the orchestrator pin check. That interrupted
check is not counted as a pass. The default was restored to **one job**, no
Cargo/rustc process remained before restart, and the interrupted check passed
on retry. Cargo invocations remained sequential across repositories. Shell
syntax and default/override behavior were checked. The final env.sh is identical
to the accepted one-job configuration; BUILD_ENV.md records the trial/reversal.
The second OOM is reported by the operator, not independently attributed to a
particular compiler by a new journal analysis. No machine-specific path is
committed and no build/profile/debug settings were otherwise changed.

## Pin inventory

The show-revs output below was captured after all upstream commits were pushed
and all seven pins updated. All nine pinned repositories are clean and their
pins are present on origin. Devshell has no self-pin. Final checks confirm the
eight changed repositories are clean and match their pushed branch; four other
repositories remain clean at their starting revisions. Privacy/path audits
covered all outgoing commits without reading protected local artifacts.

```text
Recorded R_* baseline: post-O20 R_orchestrator, post-GA2 R_adapter, post-S17 R_schemas, post-C12 R_core, post-ST7 R_store

REPO                     BRANCH         HEAD      SIG                 TREE   PINNED    ORIGIN  STATUS
----                     ------         ----      ---                 ----   ------    ------  ------
ubu_design               main           f7c4a1db  signed-ok           clean  f7c4a1db  yes     OK
ubu_schemas              p1b-61-advisor-proposes-a-precondition 3b2c93e6  unsigned            clean  3b2c93e6  yes     OK
ubu_core                 p1b-61-advisor-proposes-a-precondition c4b624d7  unsigned            clean  c4b624d7  yes     OK
ubu_store                p1b-61-advisor-proposes-a-precondition c62eabc5  unsigned            clean  c62eabc5  yes     OK
ubu_github_adapter       p1b-61-advisor-proposes-a-precondition 50fae565  unsigned            clean  50fae565  yes     OK
ubu_planning_kernel      p1b-61-advisor-proposes-a-precondition 8af10ece  unsigned            clean  8af10ece  yes     OK
ubu_orchestrator         p1b-61-advisor-proposes-a-precondition 6c931d87  unsigned            clean  6c931d87  yes     OK
ubu_ui                   p1b-61-advisor-proposes-a-precondition 9e0a8978  unsigned            clean  9e0a8978  yes     OK
ubu_brand                main           faf2005a  signed-ok           clean  faf2005a  yes     OK
```
