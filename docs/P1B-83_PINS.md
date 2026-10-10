# P1B-83: the completed switch and the retired fault-run verifications

## Grounding, authority and approved corrections

All twelve repositories began clean on main. P1B-82 is merged to main and
origin/main in design, devshell, orchestrator and UI, at the ticket's specified
heads. Only design and devshell change on p1b-83-phase-1b-closed. The other ten
repositories retain their baseline heads and clean trees. This ticket records
the operator's supplied switch and fault-rehearsal facts; it performs neither
and does not inspect his store or local fault block.

The governing sentence is in DESIGN.md §4.2's UBU-D0292 scope amendment:

> The switch criterion above is unchanged; release completion cannot be inferred from switching daily planning alone.

This is the exact quoted sentence implementing UBU-D0292, not a quotation from
that decision's own record. Phase 1b is complete by its exit criterion; the
MVP-release camera-and-voice commitment continues, with its sequence open in
UBU-Q0183. Phase 2 remains Next. No question is re-tagged.

The governing rule-6 sentence from ACCEPTANCE.md is:

> A verification is retired once it has passed live, unless the ticket changes something that could affect it.

Four grounding corrections were approved before editing:

1. Attribute the governing quotation to DESIGN.md §4.2's UBU-D0292 amendment,
   where it actually appears, rather than falsely attributing those words to
   the decision record. The historical UBU-D0292 record remains unchanged.
2. Point D0305 at §11.2, where the namespace/rename paragraph lives, rather
   than §11.3, which is Mutation vocabulary. Correct the reference rather
   than relocating an unchanged canonical section.
3. Also change §4.2's Quick UbU current-role clause from serves to served until
   the dated switch, with D0305. Leaving it would contradict the recorded
   primary-tool status; the rest of the phase's scope sentence and list stay.
4. Also put §11.2's pre-switch ratification requirement in past tense and retain
   the registry as the standing agenda for later roots. Leaving a future
   pre-switch deadline there would conflict with the completed switch and
   D0305's continuing governance. The rest of that paragraph stays except
   the separately requested non-disposable-store sentence.

These are status/attribution corrections, not new implementation scope.
Existing Markdown header hard breaks are retained. The readiness line records
an operator release with a prepared de-install path, not a claim that a
particular de-install procedure was executed or published.

| Section | Governing sentence from the required reading | What it governs |
|---|---|---|
| All/B | DESIGN.md §4.2: “The switch: the dogfooding user's primary daily planning runs on mainline UbU.” | Record the supplied completed switch, with no inferred release completion. |
| A | D0303: “The historical records and consequence bullets of UBU-D0275 and UBU-D0291 remain unchanged; this appended record amends their exit conditions.” | Append Accepted D0305; preserve every earlier decision byte for byte. |
| B | DESIGN.md §4.7: “A phase label names the phase that implements an item; pulling an item forward re-tags that item and never renumbers phases (UBU-D0275).” | Mark the exit criterion complete; retain phase scopes, Phase 2 Next and question-origin tags. |
| C | README.md: “When a derived file conflicts with a canonical file, the canonical file wins.” | Reconcile the status and readiness view with D0305 while preserving the dated Phase 1 report. |
| D | Each brief's header: “canonical design files win on any conflict” | Change status/opportunity words only; preserve audiences, implementation descriptions and release boundaries. |
| E | ACCEPTANCE rule 6, quoted above | Retire the two live-proven verifications with exact evidence qualifications. |
| E | P1B-80 A/B: “Unobserved actions remain unavailable; all three judgments remain unavailable when no completed answers exist.” | Record the retained block and unavailable later actions/judgments from the supplied fault run. |
| F | pinned-revs.toml: “Push a branch before pinning it.” | Advance only the design inventory entry after publication. |

## A: UBU-D0305 as recorded

## UBU-D0305: The switch happened on 2026-10-10; Phase 1b is complete and the store is no longer disposable

**Status:** Accepted → DESIGN.md §4.2, §4.7, §11.2; README.md. Meets the exit criterion of `UBU-D0275`; closes the gates of `UBU-D0291` and `UBU-D0303`; leaves `UBU-D0292` unchanged.

On 2026-10-10 the dogfooding user's primary daily planning moved to mainline UbU and Quick UbU became legacy software. The operator performed the switch as his own release with his own prepared de-install path, outside the public repositories; neither is a public artefact or a claim of this record. Phase 1b, defined by that exit criterion, is complete. Its open questions keep their `Phase 1b` tag as a record of origin and are not re-tagged. The MVP-release commitment of `UBU-D0292`, the camera-and-voice interaction surface, is not inferred from the switch and continues, with its sequence the operator's roadmap decision under `UBU-Q0183`.

The registry of the switched store held zero provisional subject roots at the switch; `UBU-D0291`'s ratification gate was met with nothing to ratify. From this date a provisional root minted later is promoted into the governed set or retired by an amending decision, and renaming one requires the migration of UniverseState keys, `fact_provenance` keys and precondition target strings that `UBU-D0291` warned has no tooling. Canonical state is no longer disposable: data backward compatibility is required of every later change, and `UBU-D0291`'s last cheap rename point has passed.

The planner gate was discharged by `UBU-D0303` on the greedy certification under the CPU tensor-worker profile. Both inputs the planner had been missing reach it in a rehearsal, the ordering as a seeded synthetic stand-in (P1B-81) and the affect observation as the operator's own reading (P1B-82). The live rehearsal remains the operator instrument. CUDA parity is not certified; the deferred ChunkedSweep mirror and the unimplemented confidence decay are not claimed by this record. Phase 2, single-user multi-device synchronization, is next in the phase map.

## B–D: every public sentence, heading and row changed

The following is the complete verbatim change ledger for the five public
documents. The gate paragraph replaces two old sentences with one recorded
sentence. New README paragraphs/blocks have no prior text. Everything outside
these declared replacements/additions remains byte-identical.

### ubu-design/DESIGN.md — §4.2 Quick UbU role (approved correction)

Before:

```markdown
Phase 1b extends the Phase 1 system until it can replace Quick UbU, the separately developed personal planner that serves as the dogfooding user's working daily tool, so that Quick UbU becomes legacy software (`UBU-D0275`).
```

After:

```markdown
Phase 1b extends the Phase 1 system until it can replace Quick UbU, the separately developed personal planner that served as the dogfooding user's working daily tool until the switch on 2026-10-10, so that Quick UbU becomes legacy software (`UBU-D0275`, `UBU-D0305`).
```

### ubu-design/DESIGN.md — §4.2 gate paragraph (two sentences replaced by one)

Before:

```markdown
The switch waits on ratification or retirement of every provisional subject root before the store becomes non-disposable (`UBU-D0291`); the planner condition is discharged by the greedy Stage 1 certification under the CPU tensor-worker profile (`UBU-D0303`). No switch date is set.
```

After:

```markdown
The switch happened on 2026-10-10 (`UBU-D0305`); the planner condition was discharged by the greedy Stage 1 certification under the CPU tensor-worker profile (`UBU-D0303`), and the ratification gate of `UBU-D0291` was met with no provisional subject root in the switched store; the registry remains the standing agenda for any root minted later.
```

### ubu-design/DESIGN.md — §4.2 primary tool and durable store

Before:

```markdown
Until the switch, Quick UbU remains the primary tool and mainline is exercised against non-primary test data.
```

After:

```markdown
From 2026-10-10, mainline UbU is the primary daily planning tool, Quick UbU is legacy software, and the store is no longer disposable (`UBU-D0305`).
```

### ubu-design/DESIGN.md — §4.7 phase-map row

Before:

```markdown
| Phase 1b | Quick UbU merge through the switch, including the planner (§4.2) | In progress |
```

After:

```markdown
| Phase 1b | Quick UbU merge through the switch, including the planner (§4.2) | Complete (switch 2026-10-10, UBU-D0305) |
```

### ubu-design/DESIGN.md — §11.2 ratification agenda (approved correction)

Before:

```markdown
Every provisional root must be ratified by an amending decision or retired before the switch; the registry is that agenda.
```

After:

```markdown
Before the 2026-10-10 switch, every provisional root had to be ratified by an amending decision or retired; the registry remains the standing agenda for roots minted later (`UBU-D0305`).
```

### ubu-design/DESIGN.md — §11.2 rename point

Before:

```markdown
The store is disposable until the switch, making that the last cheap rename point before UniverseState keys, fact_provenance keys and Task precondition strings require rewriting without migration tooling.
```

After:

```markdown
The store became non-disposable on 2026-10-10 (`UBU-D0305`), and the last cheap rename point has passed: UniverseState keys, fact_provenance keys and Task precondition strings require rewriting without migration tooling.
```

### ubu-design/README.md — status-line final sentence

Before:

```markdown
Phase 1 hardening and outreach remain, and **Phase 1b is in progress**: mainline is being extended to replace Quick UbU through the switch, including the planner, before Phase 2 sync (`UBU-D0275`).
```

After:

```markdown
Phase 1 hardening and outreach remain, and **Phase 1b is complete**: the switch happened on 2026-10-10 and the author's primary daily planning runs on mainline UbU, Quick UbU being legacy (`UBU-D0275`, `UBU-D0305`); Phase 2 sync is next.
```

### ubu-design/README.md — Phase 1b heading

Before:

```markdown
### Phase 1b: Quick UbU merge through the switch (in progress)
```

After:

```markdown
### Phase 1b: Quick UbU merge through the switch (complete, 2026-10-10)
```

### ubu-design/README.md — new single closing paragraph

Before: not present (addition).

After:

```markdown
The switch is recorded by `UBU-D0305`. What landed includes the certified greedy planner under the CPU tensor-worker profile (`UBU-D0303`), routines as evergreen-Objective recurrence (`UBU-D0286`), partial placement (`UBU-D0289`), pairwise Task Preferences as the ordering input (`UBU-D0282`), the affect observation route (`UBU-D0304`), the governed subject vocabulary and its standing ratification agenda (`UBU-D0291`, `UBU-D0305`), bounded advisory producers (`UBU-D0299`, `UBU-D0302`), and the live rehearsal as the operator instrument (`UBU-D0305`). The MVP-release camera-and-voice commitment continues (`UBU-D0292`), with its delivery sequence still the operator's roadmap decision under `UBU-Q0183`; completion of Phase 1b does not claim release completion.
```

### ubu-design/README.md — new readiness block

Before: not present (addition).

After:

```markdown
### Phase 1b readiness (complete)

- [x] The planner exit condition is discharged (`UBU-D0303`).
- [x] The ordering and affect inputs reach the kernel in the rehearsal, one as a marked stand-in and one as the operator's reading (P1B-81, P1B-82).
- [x] The switch was performed on 2026-10-10 with the operator's own release and prepared de-install path (`UBU-D0305`).
- [ ] The MVP-release camera-and-voice surface (`UBU-D0292`); its sequence remains open in `UBU-Q0183`.
```

### ubu-design/FUNDER_BRIEF.md — status header

Before:

```markdown
**Status:** Derived audience-facing brief — Phase 1 feature-complete; canonical design files win on any conflict
```

After:

```markdown
**Status:** Derived audience-facing brief — Phase 1 feature-complete; Phase 1b complete, switch 2026-10-10 (`UBU-D0305`); canonical design files win on any conflict
```

### ubu-design/PM_BRIEF.md — status header

Before:

```markdown
**Status:** Derived audience-facing brief — Phase 1 feature-complete; canonical design files win on any conflict
```

After:

```markdown
**Status:** Derived audience-facing brief — Phase 1 feature-complete; Phase 1b complete, switch 2026-10-10 (`UBU-D0305`); canonical design files win on any conflict
```

### ubu-design/OUTREACH.md — status header

Before:

```markdown
**Status:** Derived public-facing outreach document — Phase 1 feature-complete; canonical design files win on any conflict
```

After:

```markdown
**Status:** Derived public-facing outreach document — Phase 1 feature-complete; Phase 1b complete, switch 2026-10-10 (`UBU-D0305`); canonical design files win on any conflict
```

### ubu-design/FUNDER_BRIEF.md — funding opportunity sentence

Before:

```markdown
The immediate opportunity is to fund the hardening, the Phase 1b planner that lets UbU replace its author's separately developed daily planner (including the desktop GPU backend), and then the Phase 2 expansion (multi-device sync) from a working, inspectable base rather than a promise; the scope is still narrow enough to stay fully inspectable.
```

After:

```markdown
The Phase 1b planner is delivered and has been the author's daily planner since 2026-10-10 (`UBU-D0305`); the immediate opportunity is to fund the hardening, the MVP-release camera-and-voice surface (`UBU-D0292`), and the Phase 2 expansion (multi-device sync), from a working, inspectable base rather than a promise; the scope is still narrow enough to stay fully inspectable.
```

### ubu-design/OUTREACH.md — contributor opportunity sentence

Before:

```markdown
This is the moment when early contributors can engage with a working end-to-end system that runs its own development loop, meet the project in person, and shape the hardening, the Phase 1b planner, and the Phase 2 expansion.
```

After:

```markdown
This is the moment when early contributors can engage with a working end-to-end system that runs its own development loop, meet the project in person, and shape the hardening, the MVP-release interaction surface (`UBU-D0292`), and the Phase 2 expansion.
```

### ubu-design/OUTREACH.md — contributor status sentence

Before:

```markdown
The design is coherent and the Phase 1 feature set is complete enough to build on; the project is early enough that concrete contributions still matter.
```

After:

```markdown
The design is coherent and the Phase 1 feature set is complete enough to build on, and Phase 1b's switch has happened on 2026-10-10 (`UBU-D0305`); the project is early enough that concrete contributions still matter.
```

## Public status scans and preserved history

The requested DESIGN scan was:

```sh
rg -n -i 'in progress|no switch date|until the switch|remains the primary tool|disposable until' ubu-design/DESIGN.md
```

Its exact results are:

```text
999: Phase 1b extends the Phase 1 system until it can replace Quick UbU, the separately developed personal planner that served as the dogfooding user's working daily tool until the switch on 2026-10-10, so that Quick UbU becomes legacy software (`UBU-D0275`, `UBU-D0305`).
3886: - `in_process_awaiting_pr`: work is assigned or in progress and the next expected external projection is a PR or comparable artifact.
```

The switch match is explicitly past tense: Quick UbU served until the dated
switch. The other match is an unchanged external-work state description,
in_process_awaiting_pr, not a Phase 1b status statement. It is not rewritten
as history, because the ticket permits only phase-status edits. No current
Phase 1b in-progress, pending-switch, no-date or disposable-store claim remains.
The phase-map Phase 2 row remains Next. Scope lists and dated historical
statements stay unchanged; older decisions retain their historical gate words.

```sh
rg -n -i 'phase[ -]1b' ubu-design/PM_BRIEF.md
```

PM_BRIEF has exactly this match, so its body stays byte-identical:

```text
3: **Status:** Derived audience-facing brief — Phase 1 feature-complete; Phase 1b complete, switch 2026-10-10 (`UBU-D0305`); canonical design files win on any conflict
```

```sh
rg -n -i 'phase[ -]1b' ubu-design/WHAT_IS_UBU.md ubu-design/ORG_INTROSPECTION_BRIEF.md ubu-design/SOVEREIGN_COORDINATION.md ubu-design/NIKOS_TUESDAY.md ubu-design/MULTIMODAL_INTERACTION.md ubu-design/MULTIMODAL_SECURITY.md
```

No matches (rg exit 1). All six files are byte-identical. In particular,
MULTIMODAL_SECURITY.md's existing “No agent is implemented or activated here”
statement remains unchanged. The MVP-release commitment remains explicit in
DESIGN's amendment and the existing interaction passages in README, the funder
brief, the PM brief and outreach; no public status line claims the release is done.

The same Phase 1b grep over all other constellation repository READMEs finds:

```text
ubu-orchestrator/README.md:56: preconditions, domain timestamps, and Phase 1b representation choices.
```

This is a representation note, not a phase-status claim. Every other repository
README is unchanged. A case-insensitive scan of the eleven named public design
documents for phase 1b followed by in progress yields no matches. Historical
Phase 1 implementation headings and the dated Phase 1 readiness report are
outside this phase-status change and remain byte-identical.

## E: the two retirements and the new acceptance section

The operator's supplied fault rehearsal occurred on 2026-10-10 at 08:20 on
the P1B-82 driver. Its closed fault line and retained/unobserved sections are
the record quoted in this ticket; the private artifact was not opened or copied.
The ledger adds exactly these rows and the declined-approval observation:

### Retired in P1B-83; proven by the operator's fault rehearsal of 2026-10-10 on the P1B-82 driver

| retired | what it proved | proved in | on record | what covers it now | retired |
|---|---|---|---|---|---|
| P1B-80 §A: a failed rehearsal writes its rendered block before the fault line | a late failure keeps every completed step's counts, marks unobserved actions unavailable and leaves three unavailable judgments | the fault rehearsal of 2026-10-10 | this ticket's prompt quotes the fault line and names the retained sections; the block itself is the operator's local artifact | the injected test "P80 a late failure preserves completed capture, planning and approval before the fault" | P1B-83 |
| P1B-80 §B: a fault carries the closed cause its response gave it | the vocabulary refusal carried HTTP 200, response status `timeout` and the diagnostic-code counts, and nothing else | the fault rehearsal of 2026-10-10 | the same | the injected test "P80 all response-backed sibling refusals retain HTTP and diagnostic counts; approval exceptions invent none" | P1B-83 |

The same run was the first to show the declined-approval row `operator_did_not_approve_or_preview_stale` live, with no calendar write.

The appended ACCEPTANCE.md section is:

### P1B-83 the switch is recorded and the fault-run verifications retire

The operator's fault rehearsal of 2026-10-10 at 08:20 on the P1B-82 driver
retained capture, ranking, observation, Plan, the three reports, preview,
declined approval, UniverseState read, subject/authoring/requirement writes
and registry before Vocabulary timed out. Precondition and queue remained
“unavailable; action not observed”; all three judgments remained unavailable.
The ticket's prompt is the record; the operator's local block is not copied
into the repositories. Its closed fault line is:

```text
advisory_run_failed: action: vocabulary; HTTP 200; response status: timeout; diagnostics[].code: {"advisory_task_skipped":4,"advisory_timeout":1}. Remedy: Correct private advisory endpoint/model/budget settings using the diagnostic on screen; do not rerun for preferred candidates.
```

Under rule 6, the two P1B-80 §A/§B verifications retire in the ledger above.
The existing injected tests cover the retained block and closed response cause;
no instrument, driver reference or LIVE_REHEARSAL.md instruction changes.

The switch had already happened on 2026-10-10 (`UBU-D0305`). Phase 1b is
complete by its exit criterion, and the store is no longer disposable.
The MVP-release camera-and-voice commitment continues under `UBU-D0292`,
with its sequence still open in `UBU-Q0183`. There is no new rehearsal for
this documentation ticket. Acceptance is the operator reading the listed
before/after sentences and the appended decision; Claude merges afterward.

Every earlier ledger row and acceptance sentence is unchanged. LIVE_REHEARSAL.md,
LIVE_REHEARSAL_DRIVER.md and the instrument itself stay byte-identical. The
fault-run verifications retire; human consent, deliberate approval and live
judgments remain choices. This ticket adds no rehearsal or verification step.

## Verification, privacy and both kinds of pin

Standing check-all.sh: passed; existing fixture-demo quarantine unchanged.

It verifies that the documentation change did not break the standing checks;
it is not acceptance of the status wording or proof that the switch occurred.
The occurrence and zero-root count are the operator's supplied facts, not a
new observation by this ticket. Acceptance is his reading of the complete
before/after ledger and D0305, after which Claude merges.

| P1B-82 baseline | P1B-83 preservation / verification |
|---|---|
| Kernel Rust 125 | Unchanged head/tree; full suite not rerun for this documentation-only ticket. |
| Orchestrator Rust 657 | Unchanged head/tree, including P1B-82's corrected path-count test; full suite not rerun. |
| UI 227 | Unchanged head/tree; full suite not rerun. |
| Pure driver 88 | 88 passed, 0 failed in check-all; unchanged injected suite. |
| Runner 38/38, 703 loopback requests, two live skips | Runner and all endpoint inputs byte-identical; full walk not rerun. |
| Owned worker 35 | 35 passed, no skips in check-all with the pinned CPU Torch environment. |
| Pytest 58 with Torch; 39 passed / 19 skipped without | Worker/Python source and profiles unchanged; pytest not rerun. |
| Clippy zero kernel / eight distinct orchestrator | No Rust/source/dependency changes; Clippy not rerun. |
| endpoints.ts 57 paths / 44 constants | Unchanged; exact counts checked. |
| OpenAPI 57 paths / 197 schemas | Unchanged in orchestrator and UI; exact counts checked. |
| Closed vocabulary 281 | Byte-identical; unchanged source agreement exercised by standing checks. |

Source audits prove no code, test, schema, route, vocabulary, fingerprint,
manifest, lockfile or Cargo consumer revision changed. The one-job Cargo
setting, sequential repository invocation, nonblocking flock, memory scope
and worker/build exclusion remain unchanged. Standing checks use the existing
bounded owned-worker exception with the pinned CPU Torch environment. No real
operator rehearsal/pre-flight, Google, Ollama, editor, model-committee rank,
package installation or non-Git external network is used.

Both embargoes remain: no social-impact-delta §12 statistics or 8 October 2027
monthly-active-user ranges are added to any public/funder document. No private
local-hygiene-agent argument is quoted or copied. No operator root name, Task
title, fact key or stored reading appears in the new material. The switched
store contributes only its zero provisional-root count. The fault line is the
explicitly supplied closed protocol record, not a copied private transcript.
The three excluded local acceptance artifacts are not opened; their contents
and filenames do not enter outgoing commits. Privacy audits use local exclusion
metadata silently and emit only generic outcomes.

Inventory: only ubu_design advances, from 6d8a78aa3ba927ac402d27c0d96a627bf02de550 to 6c37de84dd20bc245c3a0007603ca8a763e029cf,
after that branch is pushed. Every other inventory value is byte-identical;
devshell has no self-pin. Cargo consumer revisions and lockfiles are all
unchanged: no crate consumes this design documentation as a Rust dependency.

Both changed repositories publish on p1b-83-phase-1b-closed without force-push
or merge. Main remains untouched. Claude performs the later main merges and
main-branch pushes after the operator reads the wording.

This ticket recorded a switch that had already happened and claimed nothing the decisions do not record.
