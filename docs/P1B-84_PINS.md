# P1B-84: Phase 1b closed by decision; switch deferred; Phase 2 in development

Recorded 2026-10-10. Phase 1b closes by operator decision, with the planner gate discharged and the ordering and affect inputs reaching the kernel in the rehearsal. The switch is not in force: it follows Phase 2 completion. Quick UbU remains primary, mainline uses non-primary test data, the store remains disposable, and data backward compatibility is neither required nor supported. Camera-and-voice remains an MVP-release commitment with sequence open in UBU-Q0183.

## Grounding, approved corrections and branch provenance

All twelve repositories started clean on main. P1B-82 is an ancestor of main in design, devshell, orchestrator and UI. The two changed repositories started at the specified P1B-82 main heads:

| Repository | Starting main | P1B-84 branch |
|---|---|---|
| ubu-design | 6d8a78aa3ba927ac402d27c0d96a627bf02de550 | p1b-84-phase-1b-closed-phase-2-open |
| ubu-devshell | 4f4186d3acebd6937073603f249d9ef9c0ca0699 | p1b-84-phase-1b-closed-phase-2-open |

Neither main contains any commit unique to p1b-83-phase-1b-closed. The new branches start directly from these main heads and take no commit, content or report from that branch. P1B-83 is superseded, left present and unchanged, and neither merged, cherry-picked nor deleted. The two retirement rows below are restated from P1B-84 itself. All main refs remain unchanged.

Grounding found two corrections, both explicitly approved by the operator:

1. DESIGN.md:1017 said the switch criterion was unchanged, but D0305 amends the Phase 1b exit criterion. Its full sentence now names that amendment and says release completion cannot be inferred from closing Phase 1b alone. Replacing only the word “switching” would retain a false first clause and leave “closing Phase 1b daily planning alone.” This explicit sentence correction is included alongside §B’s otherwise bounded edits.
2. DESIGN.md §4.3 lists six validation items, while §C requested five. README gains all six unchecked items, including Zone and Compartment boundaries, rather than silently omitting that established boundary or narrowing §4.3.

The remaining judgment calls are consistent with the grounding. Complete is stated as closed by decision. Quick UbU primary and disposable-until-switch sentences retain their words. Open Questions and their origin tags are byte-identical. The zero provisional-root count is definite and no root name is recorded. The operator used his own release and prepared de-install path outside the public repositories; this does not claim a public release artifact. The other repository READMEs remain unchanged.

Existing two-space Markdown hard breaks in the four edited status headers remain unchanged. A whitespace check permits those existing hard breaks for that invocation only; no Git setting is changed.

## Governing sentences by section

The documents in the ticket’s read-first table were read before edits, including the five decision records, the full §4.2/§4.3/§4.7 sections, README status/readiness, brief authority headers, the full retirement ledger, P1B-80 A/B, P1B-82 D and the pin-file comments.

### All and B — unchanged operating condition

> Until the switch, Quick UbU remains the primary tool and mainline is exercised against non-primary test data.

DESIGN.md:1007 remains verbatim; only the requested deferral parenthesis is appended. DESIGN.md §11.2’s ratification/disposable-store paragraph remains byte-identical.

### A — amend by an appended decision

> The historical records and consequence bullets of `UBU-D0275` and `UBU-D0291` remain unchanged; this appended record amends their exit conditions.

UBU-D0303 governs the register discipline. D0304 was the final identifier on main; D0305 was unused. Only D0305 is appended, leaving the full earlier decision prefix intact.

### B — scope of the planner certification

> Records the operator's reading on 2026-10-09: the switch's planner condition is met by the Stage 1 certification of the greedy strategy against the CPU reference on the operator's own week, under the CPU tensor-worker profile.

UBU-D0303 discharges the planner condition within that profile. UBU-D0292’s continuing commitment governs the amended release sentence:

> Local camera-and-voice interaction is part of the MVP release, rather than an optional post-MVP input feature.

### C — README authority

> The canonical design authority is `DESIGN.md`, `DECISIONS.md`, `OPEN_QUESTIONS.md`, `PLANNING_KERNEL_CONTRACT.md`, and `DEVICE_SYNC_AND_COMPARTMENT_CONTRACT.md`.

README’s derived-file sentence governs reconciliation to D0305. The existing Phase 1b scope paragraph stays as history, with the new paragraph explicitly identifying its original exit criterion as amended. The dated Phase 1 readiness report and all existing Phase 0/1 readiness items remain byte-identical.

### D — the briefs yield to canonical files

> **Status:** Derived audience-facing brief — Phase 1 feature-complete; canonical design files win on any conflict

This is the original authority header in FUNDER_BRIEF.md and PM_BRIEF.md. OUTREACH.md’s original authority header is:

> **Status:** Derived public-facing outreach document — Phase 1 feature-complete; canonical design files win on any conflict

Only their current Phase 1b/2 status and specified funding/contribution sentences change. PM’s body contains no Phase 1b/2 status. Existing Phase 1 “implementation in progress” headings in PM and Outreach are unrelated to this ticket and remain unchanged.

### E — retirement after live proof

> A verification is retired once it has passed live, unless the ticket changes something that could affect it.

ACCEPTANCE.md rule 6 governs both new ledger rows. The P1B-80 A/B report governs the retained failure evidence:

> finishFailure writes report.render(), then the fault line and its remedy.

P1B-82 D governs the affect reading’s public projection:

> Snapshot id, observed_at and readings are withheld.

Only the closed fault line and the retained-section description supplied by this ticket are recorded. The operator’s private block is not opened, copied, reconstructed or published; no model/runtime explanation beyond its response is inferred.

### F — publication before pinning

> show-revs.sh compares these against local checkout HEADs, and checks that each pinned commit is on a branch of origin. Push a branch before pinning it.

The pin-file comments govern the order. Design was committed, normally pushed and verified with git ls-remote before ubu_design advanced. All other inventory values and all Cargo consumer revisions remain unchanged.

## A — UBU-D0305 as recorded

## UBU-D0305: Phase 1b closes by decision on 2026-10-10; the switch is deferred until Phase 2 is complete; Phase 2 is in development.

**Status:** Accepted → DESIGN.md §4.2, §4.3, §4.7; README. Amends the exit criterion of `UBU-D0275`; keeps `UBU-D0291`'s agenda standing; builds on `UBU-D0303`; leaves `UBU-D0292` unchanged.

On 2026-10-10 the operator performed the switch with his own release and prepared de-install path, outside the public repositories, and the same day decided to continue with Quick UbU until Phase 2 is complete. Phase 1b is closed by that decision: its planner gate was discharged by `UBU-D0303`, and both inputs the planner had been missing reach it in a rehearsal, the ordering as a seeded synthetic stand-in (P1B-81) and the affect observation as the operator's own reading (P1B-82). The switch is not in force. It is deferred and follows the completion of Phase 2.

Until the switch, Quick UbU remains the operator's primary daily planner, mainline is exercised against non-primary test data through the live rehearsal, the store stays disposable, and data backward compatibility is neither required nor supported. The store the operator switched to held no provisional subject root, so `UBU-D0291`'s ratification gate was met with nothing to ratify; the registry remains the standing agenda and is evaluated at the deferred switch, which is still the last cheap rename point.

Phase 2, single-user multi-device synchronization (§4.3), opens on 2026-10-10 and is in development. Phase 1b's open questions keep their `Phase 1b` tag as a record of origin and are not re-tagged. The MVP-release commitment of `UBU-D0292`, the camera-and-voice interaction surface, is not inferred from this closure and continues, with its sequence the operator's roadmap decision under `UBU-Q0183`. CUDA parity is not certified; the deferred ChunkedSweep mirror and the unimplemented confidence decay are not claimed by this record.

## B–D — every changed public sentence, heading and status row

Before and after below are verbatim changed text. Insertions are labeled and shown after only. Unchanged surrounding sentences, prefixes, scope lists and formatting are preserved by an exact reverse-replacement audit against the starting commits.

### DESIGN.md

B: closure, planner gate and deferred ratification agenda

Before:

```text
The switch waits on ratification or retirement of every provisional subject root before the store becomes non-disposable (`UBU-D0291`); the planner condition is discharged by the greedy Stage 1 certification under the CPU tensor-worker profile (`UBU-D0303`). No switch date is set.
```

After:

```text
Phase 1b closed by decision on 2026-10-10 (`UBU-D0305`), with its planner condition discharged by the greedy Stage 1 certification under the CPU tensor-worker profile (`UBU-D0303`). The ratification gate of `UBU-D0291` was met with no provisional subject root; its registry remains the standing agenda, evaluated at the deferred switch. The switch is not in force and follows the completion of Phase 2.
```

B: preserved Quick UbU sentence with the requested parenthesis

Before:

```text
Until the switch, Quick UbU remains the primary tool and mainline is exercised against non-primary test data.
```

After:

```text
Until the switch, Quick UbU remains the primary tool and mainline is exercised against non-primary test data. (The switch is deferred until Phase 2 is complete (`UBU-D0305`).)
```

B: approved release-sentence correction

Before:

```text
The switch criterion above is unchanged; release completion cannot be inferred from switching daily planning alone.
```

After:

```text
`UBU-D0305` amends the Phase 1b exit criterion; release completion cannot be inferred from closing Phase 1b alone.
```

B: Phase 2 status inserted after its unchanged first sentence

Insertion after the unchanged first sentence:

```text
Phase 2 is in development from 2026-10-10 (`UBU-D0305`), and the switch of `UBU-D0275` follows its completion.
```

B: Phase 1b phase-map status

Before:

```text
| Phase 1b | Quick UbU merge through the switch, including the planner (§4.2) | In progress |
```

After:

```text
| Phase 1b | Quick UbU merge through the switch, including the planner (§4.2) | Complete (closed by decision 2026-10-10, UBU-D0305; switch deferred until Phase 2 is complete) |
```

B: Phase 2 phase-map status

Before:

```text
| Phase 2 | Single-user multi-device synchronization (§4.3) | Next |
```

After:

```text
| Phase 2 | Single-user multi-device synchronization (§4.3) | In development (from 2026-10-10, UBU-D0305) |
```

### README.md

C: current project status; all preceding status-line text is preserved

Before:

```text
Phase 1 hardening and outreach remain, and **Phase 1b is in progress**: mainline is being extended to replace Quick UbU through the switch, including the planner, before Phase 2 sync (`UBU-D0275`).
```

After:

```text
Phase 1 hardening and outreach remain, and **Phase 1b is complete**, closed by decision on 2026-10-10 with its planner delivered; the switch to mainline is deferred until Phase 2 is complete, and Quick UbU remains the author's daily planner until then (`UBU-D0275`, `UBU-D0305`). **Phase 2 is in development.**
```

C: Phase 1b heading

Before:

```text
### Phase 1b: Quick UbU merge through the switch (in progress)
```

After:

```text
### Phase 1b: Quick UbU merge through the switch (complete, closed 2026-10-10)
```

C: one closure paragraph added after the unchanged historical scope

One inserted paragraph after the unchanged historical scope:

```text
`UBU-D0305` closes Phase 1b by decision on 2026-10-10, amending the original exit criterion recorded above; the switch is deferred until Phase 2 is complete. What landed is the certified greedy planner under the CPU tensor-worker profile (`UBU-D0303`), routines as evergreen-Objective recurrence (`UBU-D0286`), partial placement (`UBU-D0289`), pairwise Task Preferences as the ordering input (`UBU-D0282`), the affect observation route (`UBU-D0304`), the governed subject vocabulary and its standing ratification agenda (`UBU-D0291`), bounded advisory producers (`UBU-D0299`, `UBU-D0302`), and the live rehearsal as the operator instrument. The MVP-release camera-and-voice commitment continues (`UBU-D0292`), with its sequence open in `UBU-Q0183`; completion of Phase 1b does not claim release completion.
```

C: Phase 2 heading

Before:

```text
### Phase 2 sync and Compartment contract
```

After:

```text
### Phase 2 sync and Compartment contract (in development from 2026-10-10)
```

C: Phase 2 status added to its unchanged first paragraph

Inserted sentence at the end of the unchanged first paragraph:

```text
Phase 2 is in development from 2026-10-10 (`UBU-D0305`), and the switch follows its completion.
```

C: readiness insertions; approved six-item Phase 2 list

Inserted after the existing Phase 1 readiness list and before the unchanged dated report:

```text
### Phase 1b readiness (complete)

- [x] The planner exit condition is discharged (`UBU-D0303`).
- [x] The ordering and affect inputs reach the kernel in the rehearsal, one as a marked stand-in and one as the operator's reading (P1B-81, P1B-82).
- [x] Phase 1b closed by decision on 2026-10-10; the switch is deferred until Phase 2 is complete (`UBU-D0305`).
- [ ] The MVP-release camera-and-voice surface (`UBU-D0292`); sequence open in `UBU-Q0183`.

### Phase 2 readiness (in development)

- [ ] Local-first sync.
- [ ] Partial replication.
- [ ] Zone and Compartment boundaries.
- [ ] Device roles.
- [ ] Conflict handling.
- [ ] User-owned worker execution on the user's own trusted device.
```

### FUNDER_BRIEF.md

D: status header

Before:

```text
**Status:** Derived audience-facing brief — Phase 1 feature-complete; canonical design files win on any conflict
```

After:

```text
**Status:** Derived audience-facing brief — Phase 1 feature-complete; Phase 1b complete, closed by decision 2026-10-10 (`UBU-D0305`); Phase 2 in development; canonical design files win on any conflict
```

D: delivered planner, open Phase 2 and continuing funding opportunity

Before:

```text
The immediate opportunity is to fund the hardening, the Phase 1b planner that lets UbU replace its author's separately developed daily planner (including the desktop GPU backend), and then the Phase 2 expansion (multi-device sync) from a working, inspectable base rather than a promise; the scope is still narrow enough to stay fully inspectable.
```

After:

```text
The Phase 1b greedy planner under the CPU tensor-worker profile is delivered and certified (`UBU-D0303`), and Phase 1b is closed by decision on 2026-10-10 (`UBU-D0305`); Phase 2, multi-device sync, is in development from 2026-10-10. The immediate opportunity is to fund the hardening, the MVP-release camera-and-voice surface (`UBU-D0292`), and the Phase 2 expansion from a working, inspectable base rather than a promise; the scope is still narrow enough to stay fully inspectable.
```

### PM_BRIEF.md

D: status header

Before:

```text
**Status:** Derived audience-facing brief — Phase 1 feature-complete; canonical design files win on any conflict
```

After:

```text
**Status:** Derived audience-facing brief — Phase 1 feature-complete; Phase 1b complete, closed by decision 2026-10-10 (`UBU-D0305`); Phase 2 in development; canonical design files win on any conflict
```

### OUTREACH.md

D: status header

Before:

```text
**Status:** Derived public-facing outreach document — Phase 1 feature-complete; canonical design files win on any conflict
```

After:

```text
**Status:** Derived public-facing outreach document — Phase 1 feature-complete; Phase 1b complete, closed by decision 2026-10-10 (`UBU-D0305`); Phase 2 in development; canonical design files win on any conflict
```

D: outreach contribution status

Before:

```text
This is the moment when early contributors can engage with a working end-to-end system that runs its own development loop, meet the project in person, and shape the hardening, the Phase 1b planner, and the Phase 2 expansion.
```

After:

```text
This is the moment when early contributors can engage with a working end-to-end system that runs its own development loop, meet the project in person, and shape the hardening, the MVP-release interaction surface (`UBU-D0292`), and the Phase 2 expansion, which is in development from 2026-10-10.
```

D: outreach closure status

Before:

```text
The design is coherent and the Phase 1 feature set is complete enough to build on; the project is early enough that concrete contributions still matter.
```

After:

```text
The design is coherent and the Phase 1 feature set is complete enough to build on, and Phase 1b is complete, closed by decision on 2026-10-10 (`UBU-D0305`); the project is early enough that concrete contributions still matter.
```

## Greps and preserved historical scope

These searches cover the five public documents named for edits, the six explicitly frozen ancillary documents and every tracked README across all twelve repositories. Historical decision records, ticket reports and quoted “before” text are records rather than current phase status.

### DESIGN status grep

```text
rg -n -i 'in progress|no switch date|\| Next \|' DESIGN.md
```

Exit 0.

```text
3888:- `in_process_awaiting_pr`: work is assigned or in progress and the next expected external projection is a PR or comparable artifact.
```

The sole match is the external-work-state enum in_process_awaiting_pr. No Phase 1b/2 “in progress”, “no switch date” or “| Next |” status remains.

### Current Phase 1b/2 status grep

```text
rg -n -i 'Phase 1b.*in progress|Phase 2.*(is next|\| Next \|)' DESIGN.md README.md FUNDER_BRIEF.md PM_BRIEF.md OUTREACH.md
```

Exit 1.

```text
(no matches)
```

### PM phase references

```text
rg -n -i 'phase[ -]+1b|phase[ -]+2' PM_BRIEF.md
```

Exit 0.

```text
3:**Status:** Derived audience-facing brief — Phase 1 feature-complete; Phase 1b complete, closed by decision 2026-10-10 (`UBU-D0305`); Phase 2 in development; canonical design files win on any conflict  
```

The only match is the updated status header; the body contains neither phase’s status.

### Frozen ancillary phase references

```text
rg -n -i 'phase[ -]+1b|phase[ -]+2' WHAT_IS_UBU.md ORG_INTROSPECTION_BRIEF.md SOVEREIGN_COORDINATION.md NIKOS_TUESDAY.md MULTIMODAL_INTERACTION.md MULTIMODAL_SECURITY.md
```

Exit 0.

```text
SOVEREIGN_COORDINATION.md:59:- Phase 2 sync semantics are specified by `DEVICE_SYNC_AND_COMPARTMENT_CONTRACT.md`, including arbitrary-device architecture, Zones, partial replicas, SyncStatements, and Compartment-safe replication;
NIKOS_TUESDAY.md:3:**Status:** Derived far-horizon narrative — a projection of the full-product (Phase 2/3+) user experience; canonical design files win on any conflict
```

SOVEREIGN_COORDINATION describes a specified contract; NIKOS_TUESDAY labels a far-horizon projection. Neither states current Phase 1b/2 progress. The other four files have no phase references. All six are byte-identical.

### Repository READMEs

```text
git -C <repo> ls-files '*README*'
rg -n -i 'phase[ -]+1b|phase[ -]+2' <tracked READMEs>
```

All tracked READMEs were scanned, including nested documentation READMEs. Outside the changed design README, the only Phase 1b/2 matches are:

ubu-orchestrator/README.md:

```text
31: TODO(security): Phase 2 may use an OS keychain for desktop sessions.
56: preconditions, domain timestamps, and Phase 1b representation choices.
```

ubu-store/README.md:

```text
21: Phase 2 may use separate SQLite files per Compartment and optional SQLite encryption.
```

The orchestrator line 56 is the existing Phase 1b representation note. Its line 31 and the store line 21 describe possible Phase 2 security/storage choices, not current progress. All other non-design tracked READMEs have no Phase 1b/2 match; all remain byte-identical. No README still states Phase 1b in progress or Phase 2 as merely next.

DESIGN §4.2’s original exit quote and “includes” list and README’s original Phase 1b scope paragraph are retained as history under D0275; the new closure text explicitly records their amendment by D0305. Phase 2 contract descriptions, validation scope, pending implementation items and triggers retain their scope: opening development is not a claim they are implemented. DESIGN §4.7’s scope column and all later phase statuses remain unchanged. No Open Question is re-tagged; the complete question register is unchanged.

## E — the retirements and new ACCEPTANCE section

### Retired in P1B-84; proven by the operator's fault rehearsal of 2026-10-10 on the P1B-82 driver

| retired | what it proved | proved in | on record | what covers it now | retired |
|---|---|---|---|---|---|
| P1B-80 §A: a failed rehearsal writes its rendered block before the fault line | a late failure keeps every completed step's counts, marks unobserved actions unavailable and leaves three unavailable judgments | the fault rehearsal of 2026-10-10 | this ticket's prompt quotes the fault line and names the retained sections; the block itself is the operator's local artifact | the injected test "P80 a late failure preserves completed capture, planning and approval before the fault" | P1B-84 |
| P1B-80 §B: a fault carries the closed cause its response gave it | the vocabulary refusal carried HTTP 200, response status `timeout` and the diagnostic-code counts, and nothing else | the fault rehearsal of 2026-10-10 | the same | the injected test "P80 all response-backed sibling refusals retain HTTP and diagnostic counts; approval exceptions invent none" | P1B-84 |

The same run was the first to show the declined-approval row `operator_did_not_approve_or_preview_stale` live, with no calendar write.

### P1B-84 — closure by decision, deferred switch and Phase 2 in development

`UBU-D0305` closes Phase 1b by decision on 2026-10-10 and opens Phase 2 in
development; the switch follows Phase 2's completion. Quick UbU remains primary
until that deferred switch. The live rehearsal remains the operator instrument
on its own throwaway store, exercising mainline against non-primary test data.
No instrument changed; LIVE_REHEARSAL.md and the driver reference are unchanged.
Acceptance of this documentation ticket is the operator's review of the changed
sentences and appended decision, not another rehearsal.

The operator's fault rehearsal of 2026-10-10 on the P1B-82 driver retires P1B-80
§A and §B under rule 6, as recorded in the ledger. The ticket records completed
capture, ranking, observation, Plan, the three reports, preview, declined
approval, UniverseState read, subject/authoring/requirement writes and registry.
The retained block observed Vocabulary with status `timeout`, marked the
precondition run and queue unavailable because their actions were not observed,
and left all three judgments unavailable. The closed fault line supplied by
P1B-84 is the whole record; the block remains the operator's local artifact:

```text
advisory_run_failed: action: vocabulary; HTTP 200; response status: timeout; diagnostics[].code: {"advisory_task_skipped":4,"advisory_timeout":1}. Remedy: Correct private advisory endpoint/model/budget settings using the diagnostic on screen; do not rerun for preferred candidates.
```

No model/runtime cause beyond that response is inferred. The governing quotes,
sentence review, decision, ledger entries, unchanged baselines and both kinds
of pin are recorded in [P1B-84_PINS.md](P1B-84_PINS.md).

## Verification and unchanged P1B-82 baselines

The required standing check-all.sh exited 0 after the ledger edits and published design pin were in place. Its selected diagnostics, document-reading driver tests and worker suite passed. Driver: 88 passed, 0 failed, 0 skipped. CPU-only parity harness: 5 passed. Owned worker: 35 passed (12 + 15 + 8), no skips; the synthetic failing owner was reaped. The existing fixture-demo quarantine remains explicit and unchanged.

```text
export CARGO_BUILD_JOBS=1
# Select the existing pinned CPU Torch interpreter from the local environment.
source scripts/env.sh
scripts/check-all.sh
```

Cargo invocations were sequential, offline and governed by the unchanged nonblocking flock and available user scope with MemoryHigh=16G/MemoryMax=20G. The existing pinned CPU Torch environment was selected locally; no machine-specific path is committed. No package installation, non-Git external network, model-committee rank, real Google/Ollama call, editor launch, operator pre-flight or rehearsal was performed.

This documentation ticket preserves the prior P1B-82 full-suite results through unchanged source, tests, manifests, locks and frozen repository heads. It does not relabel those counts as newly rerun full suites. The standing check is evidence that §E did not break the documents its checks read; it cannot supply the operator’s wording acceptance.

| Baseline | P1B-82 | P1B-84 evidence |
|---|---|---|
| Kernel Rust | 125 | unchanged source/tests/head; retained full-suite count |
| Orchestrator Rust | 657 | unchanged source/tests/head; retained full --no-fail-fast count at 9fddef1 |
| UI | 227 | unchanged source/tests/head; retained full-suite count; standing check/lint passed |
| Driver | 88 | 88 passed in check-all.sh; no source/test change |
| Runner | 38/38; 703 requests; two live skips | retained; runner and scenario bytes unchanged |
| Owned worker | 35 | 35 passed in check-all.sh; no skips |
| Pytest with Torch | 58 | retained; no Python source/test change |
| Pytest without Torch | 39 passed / 19 skipped | retained; no Python source/test change |
| Kernel / orchestrator Clippy | zero / eight distinct (nine occurrences) | retained; no Rust change; Clippy not rerun |
| endpoints.ts | 57 paths / 44 constants | file byte-identical |
| OpenAPI | 57 paths / 197 schemas | recounted 57/197; document and UI copy unchanged |
| Closed vocabulary | 281 | vocabulary/fingerprints byte-identical |
| Standing check-all.sh | required | exited 0; fixture quarantine unchanged |

The exact scope audit reverses every recorded public replacement to reproduce each starting blob. It verifies the historical DECISIONS prefix, the dated readiness report, whole §11.2 disposal paragraph, unchanged phase scope lists, the question register, LIVE_REHEARSAL.md, driver reference, scripts, routes, generated contracts, vocabulary, fingerprints, all Cargo manifests/revisions/locks and ten frozen heads/trees. No code, test, schema, route, vocabulary or Cargo revision changed. Every main ref and both superseded P1B-83 refs stay unchanged; the new histories contain no merge commits or P1B-83-only commits.

The three excluded local acceptance artifacts were not opened. Neither their contents nor filenames enter any changed document or outgoing commit. A local privacy audit uses exclusion metadata and generic assertions only. Added lines and outgoing commits were also checked for the previously protected operator keys and machine-specific paths. No operator-private verbal argument, social-impact §12 statistics or 8 October 2027 monthly-active-user ranges are added to any public or funder document. The only new store figure is zero provisional subject roots; the separately supplied closed fault-line diagnostic counts are recorded exactly as authorized.

## F — both kinds of pin and publication

Inventory pin ubu_design alone advances from 6d8a78aa3ba927ac402d27c0d96a627bf02de550 to 25e1d43b1f49f775c44378fcc00202d977a451d7. Its design branch was pushed and its remote SHA verified before that edit. Every other inventory entry remains unchanged:

| Inventory key | P1B-84 value | Change |
|---|---|---|
| ubu_schemas | 070d0a6f9a6ad7833dd523042925008316ce923b | unchanged |
| ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b | unchanged |
| ubu_store | 83a099f55220b1286ffb2dee3c9d19006e2090b5 | unchanged |
| ubu_planning_kernel | 464b4924cd114c64dd1e2fc8ae98bae3e5bba04d | unchanged |
| ubu_github_adapter | e14a43b47aeb0a928f4dfdc83cd78ea9a2e044f6 | unchanged |
| ubu_orchestrator | 9fddef16990ac89d07a168c75bf04b77c35b9bc3 | unchanged |
| ubu_ui | dda2312fd17a5dc330fef102f9def30ab88ac5bf | unchanged |
| ubu_design | 25e1d43b1f49f775c44378fcc00202d977a451d7 | advanced after publication |
| ubu_brand | faf2005a8bd9e64742dd76ee6d1f91f45223946b | unchanged |

Cargo consumer pins are separate from this inventory. Every declared git rev below, each manifest and every lockfile remains byte-identical:

| Consumer manifest | Dependency | Cargo rev |
|---|---|---|
| ubu-github-adapter/Cargo.toml | ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b |
| ubu-orchestrator/Cargo.toml | ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b |
| ubu-orchestrator/Cargo.toml | ubu_store | 83a099f55220b1286ffb2dee3c9d19006e2090b5 |
| ubu-orchestrator/Cargo.toml | ubu_github_adapter | e14a43b47aeb0a928f4dfdc83cd78ea9a2e044f6 |
| ubu-orchestrator/Cargo.toml | ubu_planning_core | 8653cf2bbe96cd7cf0337fd857881be6665d1ceb |
| ubu-orchestrator/Cargo.toml | ubu_planning_cpu | 8653cf2bbe96cd7cf0337fd857881be6665d1ceb |
| ubu-orchestrator/Cargo.toml | ubu_planning_worker | 8653cf2bbe96cd7cf0337fd857881be6665d1ceb |
| ubu-planning-kernel/Cargo.toml | ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b |
| ubu-store/Cargo.toml | ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b |

In particular, the orchestrator’s three planning crate consumers stay at 8653cf2bbe96cd7cf0337fd857881be6665d1ceb; the kernel inventory remains 464b4924cd114c64dd1e2fc8ae98bae3e5bba04d. This ticket moves neither. Schema dependencies expressed by paths and all lockfile resolutions are likewise unchanged.

Both changed repositories publish on p1b-84-phase-1b-closed-phase-2-open using ordinary Git pushes, without force-push or merge. The reporting repository has no self-pin; its published head is the commit containing this report and is verified against origin after publication. Design’s verified published head is 25e1d43b1f49f775c44378fcc00202d977a451d7. The final local inventory records the actual devshell head after committing this report. All twelve working trees are checked clean after publication. Claude performs the subsequent merges to main and main-branch pushes after the operator’s review.

## Operator acceptance

Acceptance is the operator reading the verbatim changed sentences, inserted readiness items, ledger records and appended D0305 above. There is no new rehearsal because the instrument did not change. That wording review remains for the operator; check-all.sh alone does not establish ticket acceptance. Quick UbU remains primary until the deferred switch; the ratification agenda is evaluated then. The continuing camera-and-voice commitment is not reported as delivered, and no CUDA certification, ChunkedSweep mirror, confidence decay or durable store is claimed.

This ticket recorded a closure by decision and a deferred switch, and claimed nothing the decisions do not record.
