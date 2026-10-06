# P1B-67 pins and verification

UbU may propose a UniverseState target name; only the operator supplies its value.
Vocabulary is an explicit producer on the existing advisory run route. Its
name-only candidates inherit durable rejection, deferral and resurfacing.
Admission requires the operator's value, refuses existing names, and records
asserted provenance through shared UniverseState mutation validation and the
existing atomic candidate admission writer. The separate precondition producer
can then use the larger vocabulary. Automated verification passes; operator
acceptance remains outstanding, so test counts alone do not complete this ticket.

All twelve repositories began clean on main. Fresh origin/main fetches matched
the eight required baseline heads; P1B-66 was merged in orchestrator, UI and
devshell. Every changed repository uses p1b-67-ubu-may-name-a-fact. No main
merge or force-push was performed. Upstream revisions were pushed before pins.
Each lettered section has one commit per affected repository, including one C
commit each for store, kernel and adapter. Only UI and devshell commits carry
Co-Authored-By. The four read-only repositories retain their baseline heads.

## Revisions

| Repository | Final upstream revision |
|---|---|
| ubu-schemas | `926636041ded437d101aa51bb123559f52bc155e` |
| ubu-core | `46135fea0312bab3606e467c3012d7327096d400` |
| ubu-store | `b80787d86c235a754b285cb80c800fea2e178e54` |
| ubu-planning-kernel | `8413a270cd2525b515501563e78fde474f112f48` |
| ubu-github-adapter | `2a253029b8dea8a824aff970532face21a6c354e` |
| ubu-orchestrator | `3459428b7d2ed28fca529ec163f2dfbdc0ebc469` |
| ubu-ui | `ec404a4fa53393dbc36e3de2f8924a2c6a32725f` |
| ubu-devshell | Section G commit carrying this report; section F is `70a1d37` |

All seven chain keys move in pinned-revs.toml. Design and brand pins do not move;
devshell has no self-pin. The final show-revs inventory reports OK for all nine
rows, with every pinned commit on origin. All twelve final working trees are
clean, including the core submodule at its recorded pointer.

## Sections and governing sentences

| Section | Governing sentence read before writing | Result |
|---|---|---|
| A | schemas CONTRACT: “Cross-file `$ref` values must use absolute `$id` URIs.” P1B-61's schema output was read as precedent. | Both literal kind enums gain universe_target; the conditional candidate contract and five invented fixtures are added. |
| B | core CONTRACT: “Compatibility is checked by round-tripping canonical fixtures from `schemas-ref/fixtures` when the submodule is available.” CODEGEN: “This crate uses the `schemas-ref/` submodule only for fixture compatibility tests.” | Variant, snake-case table, proposal-only authority coverage, whole candidate and authority round trips, and the non-Cargo gitlink. |
| C | pinned-revs header: “Push a branch before pinning it.” | Consumer manifest core rev and matching lockfile source only; no source or migration changes. |
| D | ADVISORY: “The controller validates before enqueueing, even for injected transports.” UNIVERSE_STATE: “The order of work is fixed, and nothing is written until every check passes:” | Independent bounded producer, code-authored per-proposal refusals, and explicit-value atomic admission through shared mutation service validation. |
| E | NAVIGATION's disclosure: “Fact values are not sent.” Codegen workflow: “It does not fetch generation inputs from the network unless `--from-server` is explicitly passed.” | Generated types/API snapshot, hand-written narrowing, manual run panel and value-entry card; generators retain relative source descriptions. |
| F | ACCEPTANCE: “A step must not depend on what a model chooses to emit.” CONTRACT_CHECK: “The boundary: anything assertable over HTTP is a scenario here, never a manual step there.” | One new stub-backed runner scenario and the audited 13-step/eight-item rehearsal. |
| G | ACCEPTANCE: “A step says exactly what to open, exactly what to click, exactly what to read, and exactly what to copy back. It never asks the operator to infer.” pinned-revs: “Push a branch before pinning it.” | Both orchestrator documents, acceptance rule and evidence, all seven published pins, and this report. |

Two grounding conflicts were corrected with operator approval. First, step 7
already named “no Diagnostic counts line” in P1B-66. We preserved it and audited
all copy-back assumptions rather than claiming it as new work. Second, core's
schemas-ref is fixture compatibility input, not runtime schema enum validation.
Core types remain handwritten. Its existing whole UniverseState fixture round
trip was found and checked rather than assumed; new candidate fixture round
trips supplement existing whole-candidate coverage. Schema engine validation
runs in schemas, separately from core's serialization compatibility checks.

The schemas-ref gitlink moved from
`3b2c93e65710b85a1b29b8c97278a72b87b22944` to
`926636041ded437d101aa51bb123559f52bc155e`.
This is the only non-Cargo dependency link. An initial core test ran before the
new fixtures were present in that checkout and failed; advancing the recorded
gitlink and rerunning produced the final passing 163-test result.

## Request and candidate boundary

The target constraint in the request schema is exactly:

```json
{"type":"string","pattern":"^(facts|numeric_values)\\.[A-Za-z0-9_-]+(\\.[A-Za-z0-9_-]+)*$","maxLength":128}
```

The proposals array has maxItems 3 and each proposal has exactly id and target.
The id enum is the selected Task set. The prompt asks for necessary names
justified from the Task title and optional description, explicitly forbidding
values. Vocabulary reuses the precondition Context and selection gate, including
cold-start empty target names. No observation values, provenance, Plan, Log or
another Task's precondition is included. Its own ten-awaiting backlog is checked
before configuration or transport construction; deferred candidates do not count.
A full precondition backlog does not block a vocabulary run.

The kind is UniverseTarget / universe_target and the operation is
record_universe_target. normalized_proposal and payload's inline wrapper contain
only operation and target. The inline wrapper's field named value holds this
name-only proposal, never a fact observation. target_refs names one Task as
evidence, while admission writes UniverseState. No explicit suppression key is
supplied: the default identity over kind, normalized proposal and Task refs makes
rejection durable for that name and Task, leaving another name or Task distinct.

## Every refusal message

vocabulary_proposal_refused uses the following exact template, with each reason
below substituted verbatim. A proposal with no selected Task uses subject
“A proposal” instead of “Task `{id}`”. No arbitrary model prose or value is echoed.

```text
Task `{id}`: {reason}. No candidate was enqueued for this Task; the rest of the run stands.
```

| Refusal | Exact reason |
|---|---|
| Extra value or malformed name-only envelope | a proposal must contain only a target name; values belong to the operator |
| Evidence reference | the proposal must reference exactly one selected Task |
| Length | the target name exceeds 128 bytes |
| Grammar | the target requires a collection and non-empty ASCII letter, digit, underscore or hyphen key segments |
| Collection | only facts and numeric_values target names are in scope |
| Reserved first key segment | the first key segment names a reserved collection or intrinsic-affect namespace |
| Existing target | the target name is already recorded; an existing value must not be overwritten |
| Task eligibility | the Task is absent, inactive or a routine occurrence |

Three named refusals are followed by this exact count template:

```text
{N} more Tasks had refused target-name proposals; no candidates were enqueued for those Tasks. The rest of the run stands.
```

Existing result diagnostics are pushed to and never assigned. One bad proposal
loses one candidate, preserving survivors and ok status. The controller rechecks
injected transports, including name-only payload and selected evidence Task.

Other new exact messages are:

| Code | Exact message |
|---|---|
| vocabulary_queue_full | {N} target-name candidates are waiting in Review; review, defer or reject them before asking for more. No model was asked. |
| vocabulary_no_task | No active non-occurrence Task has a title or description to reason over; no model was asked. |
| advisory_malformed_result, vocabulary response | The model response was not a valid bounded target-name proposal; no candidates were enqueued |
| vocabulary_value_required | An operator-supplied value is required; no value is defaulted, inferred or derived |
| vocabulary_admission_refused | The applicable exact name-only, Task-reference, name-validation or Task-eligibility reason above, without the enqueue wrapper. |
| advisory_value_unsupported | Only a target-name proposal takes an operator value |
| vocabulary_task_skipped | Existing selection messages are preserved under the new code: Task `{id}` is a routine occurrence; edit its template instead; or Task `{id}` has neither a title nor a description to reason over. The aggregate is `{N} more Tasks were skipped: they are routine occurrences or have neither a title nor a description`. |

Value validation uses the existing universe_mutation_invalid diagnostic and
core message. The numeric non-number witness is exactly
“mutation 0: payload must be a JSON number”. Mode and reserved-namespace checks
share the existing UniverseState service; existing manual namespace diagnostic
templates are unchanged. Existing transport, stale-version and lifecycle errors
retain their behavior. No new writer, route, predicate or dependency was added.

## Admission and UI

The review card says exactly: **“UbU suggested the name; the value is yours.”**
It shows the proposed target and evidence Task. Its value input starts empty;
Facts accept a free scalar, Numbers a finite number. Admit is disabled without
entered valid input. Explicit zero and false are preserved; explicit JSON null
is distinct from omission. Reject, Defer and Resurface use existing durable
review actions. Other cards and PreconditionWords retain their behavior.

Admission requires an operator-supplied value, rechecks the active non-occurrence
Task and target absence, dispatches set_fact or set_numeric through the shared
UniverseState mutation service and records asserted provenance. The existing
atomic candidate writer commits the prepared world and admission decision
together. Task and stored world versions are observed under the Task-action lock.
The Task is unchanged; the response retains its evidence task and adds the
written universe_state. No value is defaulted, inferred or derived.

On an empty store the atomic admission creates the complete state at version 1
with user-capture label. The manual editor remains seed-at-1/edit-at-2. Both use
the same mode, five-reserved-segment and core mutation checks. Existing state
labels, capture time, summaries and unrelated values are preserved. Sharing
preparation and the existing atomic writer was chosen over calling manual apply
then admitting separately, which could leave a value or seed after failed
candidate admission, and over changing store logic, which this ticket keeps
pin-only. No route behavior was changed to make this choice.

The sequence is two explicit producer clicks: run Vocabulary, admit useful names
and supply values, then run Precondition against the larger vocabulary. Neither
promises a candidate. The rehearsal's hand-authoring remains the fallback when
no proposal is admitted. Proposing into facts and numeric_values is a scope
choice: Sets need a member form and Event markers an occurrence form. It makes
no statement about those collections. No advisor uses proposed provenance.
Controlled subject vocabulary remains unenforced and finite-snooze live
acceptance remains outstanding.

## Copy-back presence audit, every item

The rehearsal remains **13 numbered steps and eight numbered copy-back items**.
The audit preserves existing absence branches and adds the missing ones:

| Item | Figures/content requested and every absence outcome |
|---|---|
| 1, capture | Six counter labels and numbers. Each missing label has “no captured counter”, “no updated counter”, “no unchanged counter”, “no skipped counter”, “no moved counter” or “no resized counter”. The no-colour sentence has “no no-colour sentence”. The count line retains “no Diagnostic counts line”, already present before this ticket. No diagnostic transcription or hand tally. |
| 2, Plan | Diagnostic count line: “no Diagnostic counts line”. Placement count line: “no Placements line”. Whole Not in this Plan section: “no such section”. All branches were already explicit. |
| 3, risk | Whole Plan risk panel or “no Plan risk panel”, already explicit. No finding extraction or tally. |
| 4, preview | Operations count or new “no Operations proposed line”. First Dynamic Update or “no Dynamic Update operation”, which also covers a preview containing only Static updates. The converged-state explanation is preserved verbatim. |
| 5, approval | Both result lines; each missing line has “no Approval status line” or “no Operations applied line”. “I did not approve” applies only when the operator did not click Approve. |
| 6, UniverseState | Entries line or new “no Entries line”. Counts only. The protected step 11 paragraph is preserved verbatim; no key, value or table row is requested. |
| 7, advisors | Vocabulary and Precondition result lines are labelled separately. Missing lines have “no Vocabulary Run status line”, “no Vocabulary Candidates enqueued line”, “no Precondition Run status line” and “no Precondition Candidates enqueued line”. Vocabulary judgment: a name worth recording, no name worth recording, no vocabulary candidate, or queue-full/no-model; failed admission has its named phrase. Precondition absence retains no-candidate/no-rejection or queue-full/no-model. Existing first/replacement requirement words and durable rejection outcomes remain, without restoring hand redaction. |
| 8, assessment | The operator's own answer about the week and whether the store is useful. No UI figure is assumed; this asks for judgment. |

The [value], NONE and absent-count-line incidents are recorded as the evidence
for the new absence rule. Nothing is retired. The operator's prior transcription
waiver is preserved. The new first half of step 12 judges useful names and does
not repeat the runner's deterministic admission/context verification.

## Verification

| Repository | Final tests/checks |
|---|---|
| ubu-schemas | 2 Rust tests; 1 Node bundler regression; 93 valid and 113 invalid fixtures (from 91/110); casing and codegen passed. |
| ubu-core | 163 tests, including new candidate/authority round trips and existing whole UniverseState fixture coverage. |
| ubu-store | 110 tests; core manifest/lockfile pin only. |
| ubu-planning-kernel | 83 tests; core manifest/lockfile pin only. |
| ubu-github-adapter | 23 tests; core manifest/lockfile pin only. |
| ubu-orchestrator | 609 tests, from 590; 19 new vocabulary tests. |
| ubu-ui | 185 tests, from 179; 6 new vocabulary tests. TypeScript and production build passed. |
| ubu-devshell | 30 of 30 runner scenarios, from 29; 11 staging seeds for the unchanged 1 staged step passed. |

```text
RESULT: 30 of 30 scenarios passed, 0 failed, 2 skipped, 590 requests, all to 127.0.0.1
```

The request count grew from 579 to 590. Both live Google Calendar and live ollama
were skipped explicitly and prove nothing about those integrations.

The existing clarify_producer test's one expected producer-list message was
updated to include vocabulary, matching the intentional new producer. No other
existing test assertion was changed. The newly added admission test initially
compared raw Task payload with helper-added __status/__version metadata; its own
comparison was corrected to compare raw with raw and separately verify the
stored Task unchanged. No production behavior was weakened to make tests pass.

Clippy unique warnings: **8 before, 8 after**, against baseline 8.
An intermediate run found two new test warnings (duplicate fixture inclusion
and a mutex guard across await); both were fixed before the final passing run.
The OpenAPI path count remains **56**. ubu-ui/src/api/endpoints.ts is unchanged,
with **43 endpoint constants**. Both UI generators used local file mode, preserving
relative committed source paths. Schema generation covers 83 schemas.

scripts/check-all.sh completed with exit 0, including patch-generator regressions,
standing mock GitHub diagnostics and the hard-boundary checks. Node and shell
syntax checks passed. The standing fixture demo stayed QUARANTINED and did not
run; it is not a pass. Inventory from show-revs reports nine OK rows. Following
the two-job rebuild, both rebuilt test suites passed again under one job
(31 tests total); the full 609-test result remains the ticket measurement.
Final cleanliness is checked after the report commit; no pre-commit DIRTY marker
is copied as a final result.

All ticket validation invocations used one Cargo job, sourced the existing
env.sh and ran sequentially across repositories. The operator subsequently
approved one deliberate measured two-job rebuild trial, relaxing only the
per-invocation job constraint for that trial. The permanent env.sh default stays
one and all remaining checks returned to one. No other constraint was relaxed.
No OOM occurred, including during the trial. No persistent runtime configuration
or build-cap change was made.

The trial forced vocabulary and precondition_producer test binaries to compile
and link again, retaining dependency and incremental caches. Two rustc processes
and two linkers were observed concurrently. It finished successfully in
1.02 seconds (Cargo reported 0.84 seconds), with sampled aggregate
Cargo process-tree RSS peaking at 2.91 GiB.
Available RAM stayed at or above 27.16 GiB; the 8-GiB
available-memory abort guard did not fire. Swap use did not grow. This tests that
incremental two-binary workload, not a clean full-suite rebuild or sustained
memory pressure; the earlier two-job OOM remains relevant. It does not guarantee
that a future build fits. An initial attempt was refused before compilation
because sourcing env.sh from the non-repository workspace selected no target
override; sourcing it from orchestrator corrected the invocation without changing
env.sh or its rules.

Dependencies stayed offline. Cache misses for fresh pins were resolved by
importing already-committed local Git revisions into Cargo's normal cache;
this changed no project configuration or dependency set.

## Privacy and unchanged boundaries

No UniverseState fact value reaches a model in any producer or model-input
fixture. Illegal model-supplied-value response fixtures are refusal witnesses,
never observations sent to a model. Every added fixture, title, description,
key and value is invented. No real calendar data, event id, Task title or notes,
Quick UbU data, fact key or fact value is committed. Protected acceptance artifact
contents were not opened; exclusion metadata alone supplied the filename audit.
Their names and the protected operator key are absent from outgoing commits and
additions. No machine-specific path is committed. No operator store, real calendar,
OAuth cache or credential was opened. No password-hygiene agent was invoked or
fed input; credentials remain outside canonical StateStore. No model-committee
ranking was run.

New Rust tests use StubTransport; UI tests use the mocked existing plugin.
No new test reaches a live model, external HTTP, editor or signal, starts a
process or installs a signal handler. The exempt devshell runner/staging harness
uses loopback, mock processes and throwaway stores; both live flags stay off.
Precondition's existing prompt, request schema and bounds are unchanged; only
admitted operator-authored names can enlarge its context. Plan, capture contract,
colour partition, collision diagnostics, controlled subject vocabulary and
finite review snooze are unchanged. Automated checks are not operator acceptance.
The operator must run docs/LIVE_REHEARSAL.md end to end against his own calendar
and return the eight-item copy-back.

Operator acceptance has not been performed; the step under test is whether UbU proposes a target name worth recording.
