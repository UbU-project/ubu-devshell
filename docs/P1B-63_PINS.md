# P1B-63 pins and verification

Calendar capture now carries bounded event notes into an otherwise undescribed
Task, and a title alone makes a non-occurrence Task eligible for precondition
advice. Existing Task notes survive capture; notes never enter a Google write
body. Automated verification has passed. Operator acceptance is outstanding,
so these results do not establish that P1B-63 is complete.

All twelve repositories began clean on `main`. Fresh fetches confirmed P1B-62
was on `origin/main` in its five repositories: schemas, store, orchestrator,
UI and devshell. The three changed repositories started at the ticket's
specified heads. All twelve now use
`p1b-63-the-advisor-reads-what-capture-writes`. Only orchestrator, UI and
devshell changed. No force-push or main merge was performed.

## Revisions

| Repository | Final revision |
|---|---|
| `ubu-orchestrator` | `5ef42b11c58c75286ee13658e8ba8156012c4d9f` |
| `ubu-ui` | `07d34817867907274560ccab3f5464c32320cf59` |
| `ubu-devshell` | the section G commit carrying this report |

Only the orchestrator and UI entries changed in `pinned-revs.toml`, including
their test/path count comments. Both upstream commits were pushed before
pinning them. There is no devshell self-pin.

These five pins are unchanged:

| Pin | Revision |
|---|---|
| `ubu_schemas` | `02e4c91ce149ef594f1d08408216097b48dd7afb` |
| `ubu_core` | `c4b624d76f210f77f865c61801e02c89219763ce` |
| `ubu_store` | `9e471a46b357f99cff567c250ae59084a6768b52` |
| `ubu_planning_kernel` | `8af10ece07043c307fe351ac867cfd8449e08c4f` |
| `ubu_github_adapter` | `50fae565e6d48fb5c41107ab3259096ad243ccf3` |

The `ubu_core` manifest `rev` remains
`c4b624d76f210f77f865c61801e02c89219763ce` in orchestrator, store, planning
kernel and GitHub adapter. No Cargo manifest, dependency, lockfile, candidate
kind or route changed. There is no pin chain update.

## Sections and governing sentences

### A — orchestrator, `355a243`

`docs/ADVISORY.md`: “Proposals never mutate canonical Task state. The advisor
only enqueues candidates; admission is an explicit operator act.”
`docs/CLARIFY.md`: “A routine occurrence is never selected, named or not.”

Changed `src/services/precondition_advisor.rs`, `src/services/advisory_wire.rs`
and `tests/precondition_producer.rs`. A non-occurrence Task is eligible when
its title or description is non-blank. An absent/blank description sends no
description key; a present description remains available as data. The prompt
changes its opening clause to “from its title and description” and adds:
“A Task may arrive with no description, and its title is then the whole of
what is known about it.” Every other prompt sentence is preserved. Three new
tests cover title-only and empty inputs, routine exclusion, and serialization.

### B — orchestrator, `13209c7`

The deliberately superseded `docs/CALENDAR_CAPTURE.md` limit was:
“No attendees, location, description or conferencing data.”
`docs/CLARIFY.md`: “It asks the operator questions about one Task, and the
answers accumulate in the Task's `description`.”
`docs/TASK_CAPTURE.md`: “Edits preserve server metadata: status, compartment,
creation time and provenance.”
`docs/CAPTURE_PROVENANCE.md`: “A PATCH leaves an omitted field alone, so a
stamp written at insert survives every later patch.”

Capture imports only the event's own notes, trims boundary whitespace, keeps
markup as text, and reuses Clarify's 16,384-byte bound. Non-string notes fail
parsing. Oversized notes produce a diagnostic and are refused without
truncation; the event still captures and is not counted as skipped for that
warning. Admission fills only an absent or whitespace-only description.
Existing manual notes and actual Clarify interview answers survive recapture.
Declined notes do not turn an unchanged capture into an update.

Changes propagate the optional field through capture, wire parsing, normalized
mock inputs and calendar recorders. Managed-field comparisons exclude notes,
preventing note-only changes from creating projection drift. `GoogleEventBody`,
`event_body` and `event_request` retain their explicit write-field contracts.
Recording mocks omit notes on inserts and preserve remote notes on PATCH,
matching that omission. Tests assert the direct body and both request types
have no description key.

Implementation files: `calendar_capture.rs`, `calendar_client.rs`,
`calendar_projection.rs`, `calendar_range.rs`, `calendar_reconcile.rs`,
`calendar_reconciliation_service.rs`, and `calendar_wire.rs` under
`src/services/`. Tests and existing event initializers changed in
`calendar_capture.rs`, `calendar_interaction.rs`, `calendar_move_resize.rs`,
`calendar_reconcile.rs`, `calendar_wire.rs`, `capture_partition.rs`,
`capture_provenance.rs`, and `setting_authoring.rs` under `tests/`.
New coverage is in `tests/calendar_notes.rs` (seven tests) and
`tests/calendar_mock_seed.rs` (one additional test). No fourth repository
needed a change.

### C — orchestrator, `6143ed1`

`calendar_capture.rs`: “How many unowned events one capture names before it
counts the rest.” Its convention names three.
`docs/ADVISORY.md`: “Arbitrary model text, expected values and descriptions
are not copied into this diagnostic.”

Changed `src/services/suggest_tags.rs`, `src/services/precondition_advisor.rs`
and added `tests/advisory_diagnostic_bounds.rs`. Both producers name at most
three skipped Tasks, then count the rest. Missing-target diagnostics likewise
name three Tasks before counting further Tasks, retaining the existing bound
on target names within a named diagnostic. Three new tests cover 3/30 skips
in both producers and ten Tasks with missing targets, including aggregate
privacy. `MAX_LIMIT` stays 25; `precondition_no_facts` is unchanged.

### D — UI, `07d3481`

`docs/CALENDAR_SURFACE.md`: “Keeping these on one screen makes the order and
the approval boundary visible.”

Changed `src/routes/Calendar.tsx` and `tests/calendar.test.tsx`. The capture
panel explains notes before Run capture using the existing `capture-rule`
style. The new test checks both sentences, placement before the action and
absence of an automatic capture. No Review text or unrelated snapshot changed.

### E — orchestrator `5ef42b1`; devshell `e8cacf3`

`docs/ACCEPTANCE.md` rule 4: “what a later step needs is staged by the harness,
never produced by an earlier step that could fail.”

Orchestrator `docs/CALENDAR_CAPTURE.md`, `docs/ADVISORY.md` and
`docs/CLARIFY.md` now document title eligibility, bounded diagnostics, the
dated description-only exception to limit 4, the overwrite/export rules and
Clarify's unchanged default selection. After capture has supplied notes,
the default may find every Task described; choose a Task explicitly to
interview it again. The selector still includes non-occurrence Tasks.

Devshell `docs/ACCEPTANCE.md` records why a live procedure that stops the
harness must supply its own inputs, and why manual `POST /task` fixtures did
not test calendar-origin input. Nothing is retired.

### F — devshell, `2eadb27`

`docs/ACCEPTANCE.md`: “A step must not depend on what a model chooses to emit.”
`docs/CONTRACT_CHECK.md`: “The boundary: anything assertable over HTTP is a
scenario here, never a manual step there.”

Changed `docs/LIVE_REHEARSAL.md`, `docs/CONTRACT_CHECK.md`,
`scripts/check-ui-contract.mjs`, `scripts/check-ui-contract.sh` and
`scripts/rehearsal-week.mjs`. Step 12 describes title eligibility and calendar
notes, bounded skip reasons and the did-not-run outcome. Fact authoring,
“Leave it in Review for this rehearsal”, all 13 steps and all eight redacted
copy-back items remain. The step promises no model candidate.

New scenario 26 seeds two invented calendar events and uses calendar capture,
not the manual `captureTask` helper. It proves optional notes, a title-only
Task's candidate, the exact optional fields received by the stub, preservation
of manually edited notes on unchanged recapture, and description-free approved
projections. The Rust wire tests independently prove omission from actual
insert/PATCH bodies; a projection DTO alone cannot prove a transport body.
Existing scenario 10 now proves edited notes survive recapture as unchanged.
Exactly one staged week event has invented notes. The deterministic
`week_precondition` staging and `scripts/acceptance.mjs` are unchanged.

The first runner attempt exposed an obsolete scenario 24 fixture assumption:
its title-only control now also reaches the model. The stub now explicitly
omits that control's proposal, and the scenario asserts that both Tasks were
selected. Its original single-proposal admission/planning assertions remain;
scenario 26 separately requires a title-only proposal. The complete corrected
runner then passed.

### G — devshell, the commit carrying this report

`pinned-revs.toml`: “Push a branch before pinning it.”
`docs/CONTRACT_CHECK.md`: “The boundary: anything assertable over HTTP is a
scenario here, never a manual step there.”

Only `pinned-revs.toml` and this report change in G. `show-revs.sh` reports
`OK` for all nine inventory rows: design, schemas, core, store, GitHub adapter,
planning kernel, orchestrator, UI and brand. Every row has a clean tree and
its pinned commit present on origin. Existing unsigned baseline commits are
unchanged. UI and devshell commits carry the required Co-Authored-By trailer;
orchestrator commits do not. Each lettered section has one commit per affected
repository.

## Grounding corrections and scope

The ticket's opening claim that Clarify was the sole description writer was
incorrect: existing manual Task POST/PATCH authoring also writes descriptions,
as the ticket's repository section and Task capture contract acknowledge.
The live calendar-only procedure still had the stated unreachable input gate.
Core allows empty titles, while manual Task capture rejects them; the empty
title regression therefore seeds canonical state directly.

The reused bound governs Clarify accumulation and imported calendar notes.
Existing manual Task editing is not retroactively capped, and no existing
manual text is truncated. The deliberately authorized calendar limit-4
conflict changes description only; attendees, location and conferencing data
remain excluded. The ticket's route shorthand means the existing
`/projection/calendar/capture` and `/projection/calendar/approve`; no new
route was introduced. Optional-field propagation and managed-field comparison
changes were necessary inside the authorized orchestrator repository.

Fresh baseline measurement found 554 orchestrator tests and eight unique
Clippy `(code, message)` pairs, correcting P1B-62's reported 553 and seven.
Those measured baselines are used below. No vocabulary advisor, routine
template advisor, new reviewer, colour partition or Plan count change is part
of this ticket.

## Validation

| Check | Before | After |
|---|---:|---:|
| orchestrator full suite | 554 | 568 |
| UI full suite | 173 | 174 |
| runner scenarios | 25 | 26 |
| runner requests | 483 | 501 |
| stage-only harness seeds / manual steps | 11 / 1 | 11 / 1 |
| OpenAPI paths | 56 | 56 |
| `src/api/endpoints.ts` endpoint constants | 43 | 43 |
| orchestrator unique Clippy warnings | 8 | 8 |
| live rehearsal steps / copy-back items | 13 / 8 | 13 / 8 |

The full orchestrator suite passed, as did all 174 UI tests in 20 files and
the UI production build. Clippy completed with the same eight unique warning
pairs and no new warning. OpenAPI regeneration produced byte-identical
`openapi/openapi.generated.json`; UI generated OpenAPI and `endpoints.ts`
also remain byte-identical to baseline.

The devshell runner result was:

```text
RESULT: 26 of 26 scenarios passed, 0 failed, 2 skipped, 501 requests, all to 127.0.0.1
```

The two skips are live Google and live Ollama; neither proves anything about
those services. The stage-only harness passed:

```text
staged and checked 11 seed(s) for 1 step(s); not waiting for the app
```

`scripts/check-all.sh` completed with exit 0, including the offline patch
configuration checks and export-gate tests. The existing fixture demo remains
QUARANTINED and did not run; it is not a passing test. Node syntax checks
passed. Store's 110 tests and schemas' 91 valid / 110 invalid fixtures are
unchanged baseline counts, not newly claimed full-suite runs in this ticket.

Every Cargo invocation sourced `scripts/env.sh`, used one Cargo job and ran
sequentially across repositories. No `env.sh` constraint was relaxed and
`env.sh` is unchanged. No OOM occurred during P1B-63. Test model transports
were StubTransport; calendar writes used recording mocks. No new Rust test
starts a process, installs a signal handler or invokes an editor. Only the
exempt devshell runner/harness used throwaway stores and loopback processes.
No live Google, Ollama, operator calendar or operator StateStore was used.

## Exact interface wording

`precondition_task_skipped` selection messages are:

```text
Task `<id>` is a routine occurrence; edit its template instead
Task `<id>` has neither a title nor a description to reason over
<N> more Tasks were skipped: they are routine occurrences or have neither a title nor a description
```

The missing-target aggregate is:

```text
<N> more Tasks need recorded targets; no candidates were enqueued for those Tasks.
```

The oversized-notes diagnostic has code `capture_description_too_large` and
names only the event identifier and byte bound, never its notes:

```text
Calendar event `<id>`: description exceeds 16384 bytes; notes were not imported, but the event remains available for capture
```

The two capture-panel sentences, verbatim:

> An event's own notes become the Task's notes when it is first captured; a Task that already has notes keeps them. Read and change a Task's notes afterwards on the Tasks screen.

## Privacy and remaining acceptance

All new fixture data is invented. No fixture, test, document or diagnostic
added by this ticket contains a real calendar description, title or event id.
No diagnostic echoes imported notes or Clarify answers. Protected local
acceptance artifacts were not opened or tracked; their contents and filenames
are absent from outgoing commits. The audit examined exclusion metadata and
outgoing diffs only. No machine-specific path was added to a repository.
Credentials remain outside canonical StateStore; password-hygiene behavior
and its input boundary are unchanged.

Operator acceptance has not been performed: P1B-63 remains incomplete until the operator runs `docs/LIVE_REHEARSAL.md` end to end against their own calendar, completes all 13 steps and reports all 8 copy-back items, with step 12 as the step under test.
