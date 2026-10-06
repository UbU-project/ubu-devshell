# P1B-68 verification and pins

Implementation and automated verification are published on
`p1b-68-the-operator-can-see-what-he-admitted` in UI, orchestrator, devshell and
design. The Tasks screen reads, authors and clears its own requirements; the
UniverseState screen can record a reading; Review states diagnostic counts and
shows the latest shared selection once; calendar reconciliation tells the truth
about stamped exports; gesture legends are conditional. The design records and
the 15-step rehearsal are updated. Operator acceptance is outstanding.

## Grounding and approved corrections

All twelve repositories began clean on main. Fresh origin fetches confirmed
P1B-67 merged to main in all eight of its repositories. Core's schemas-ref
checkout matched HEAD's recorded `926636041ded437d101aa51bb123559f52bc155e`
gitlink. Only the four named repositories change.

Three documentary conflicts were reported before implementation, and the
operator approved all three corrections:

1. ADVISORY prescribes “The intended sequence is two explicit clicks: run
   Vocabulary, agree to useful names and supply every value during admission,
   then run Precondition against the larger vocabulary.” There is no combined
   producer request. Renaming a diagnostic cannot deduplicate two visible
   independent results. Each API run therefore retains its own gate report;
   Review renders the latest shared selection once and excludes those notes
   from both producer panels. This preserves independently useful responses
   without a combined request, hidden cross-request suppression, new route or
   model run. Producer-specific refusals remain beside their own result.
2. The previous rehearsal already requested both producers' candidate counts,
   supplied their missing-line phrases, and forbade hand tallying or diagnostic
   code transcription. The observed missing count was a reporting omission,
   not a missing instruction. The correction preserves those requests, adds
   the rendered Diagnostic counts lines and requests results immediately
   before navigation discards them. Adding screen counts makes reporting
   concrete without reinstating diagnostic transcription or hand counting.
3. The deprecated decomposition-undo rule was also present in DESIGN §23.1 and
   solved UBU-Q0132. Correcting D0259 alone would leave canonical summaries
   contradictory. The approved correction updates only those undo summaries
   to D0278, preserves the question's metadata/status and other tombstone
   policy, and adds only the prescribed D0291. A second decision, reopening the
   solved question or changing the implementation would add unnecessary scope.

## Commits and revisions

| Section | Repository | Commit |
|---|---|---|
| A | ubu-ui | `1763946` |
| B | ubu-ui | `b7df886` |
| C | ubu-orchestrator | `3f7dee9` |
| D | ubu-ui | `2996403` |
| E | ubu-orchestrator | `873b6ff` |
| F | ubu-ui | `f979a86` |
| G | ubu-devshell | `f5ef7cc` |
| H | ubu-design | `7313e82` |
| I | ubu-devshell | The commit carrying this report and the three updated pins |

There is one commit per lettered section. UI, devshell and design commits carry
Co-Authored-By; orchestrator commits do not. No force-push or main merge was used.

| Pin | Published revision |
|---|---|
| ubu_schemas | `926636041ded437d101aa51bb123559f52bc155e` |
| ubu_core | `46135fea0312bab3606e467c3012d7327096d400` |
| ubu_store | `b80787d86c235a754b285cb80c800fea2e178e54` |
| ubu_planning_kernel | `8413a270cd2525b515501563e78fde474f112f48` |
| ubu_github_adapter | `2a253029b8dea8a824aff970532face21a6c354e` |
| ubu_orchestrator | `873b6ffe86b3d07e30da25ce6c1363ad3042b872` |
| ubu_ui | `f979a86dec08846b34f68f2b7fec81cfe6f2123a` |
| ubu_design | `7313e82f7fb835965bc18521b10f897b238b65dc` |
| ubu_brand | `faf2005a8bd9e64742dd76ee6d1f91f45223946b` |

The five chain pins did not move. Only orchestrator, UI and design pins move;
design's pin moves from `f7c4a1d`. Brand remains unchanged, and devshell has no
self-pin. show-revs reports **OK for all nine rows**, with each pin on origin.
Final cleanliness is checked after committing this report; the pre-commit
devshell edits are not reported as final dirtiness. The eight read-only heads
and trees, including Quick UbU and model-committee, retain their baselines.

## Governing sentences, A–I

| Section | Sentence read before writing | Application |
|---|---|---|
| A | TASK_CAPTURE: “Explicit JSON `null` removes an editable field, including a previously set due date.” UNIVERSE_STATE: “It authors no precondition.” ADMISSION_REVIEW: “Editing the value invalidates its hold immediately.” | The existing Task PATCH authors or clears preconditions on Tasks; UniverseState still authors none. The existing suppression key handles edits. |
| B | UNIVERSE_STATE: “A mutation states the kind of what it writes, and none means `asserted`.” | Untouched controls omit the kind; choosing a reading sends measured. |
| C | ADVISORY: “The controller validates before enqueueing, even for injected transports.” Its two-click sequence is quoted above. | Neutral initial gate diagnostics preserve independent producer validation and refusals. |
| D | P1B-66's DiagnosticsList output: “It is a status, and it is quiet.” Its `showCounts` defaults to false. | Only the rehearsal-facing Review lists opt in; other call sites and the component remain unchanged. |
| E | CALENDAR_RECONCILE: “An event is owned by UbU if and only if UbU recorded applying its external ID.” CAPTURE_PROVENANCE: “Only an insert writes it.” | Stamp evidence changes the origin sentence, never applied ownership or adoption. |
| F | CALENDAR_SURFACE: “A Delete carries no Task, window or placement and therefore no colour meaning.” CALENDAR_INTERACTION: “Only applied ownership permits interaction.” | Change the two legend sentences' mood, preserving grouping, gestures and Delete layout. |
| G | ACCEPTANCE: “Deterministic steps come first and model-dependent steps come last, and no step may be a prerequisite of a later step unless it is deterministic.” CONTRACT_CHECK: “The boundary: anything assertable over HTTP is a scenario here, never a manual step there.” | HTTP assertions become three runner scenarios; deterministic authoring precedes optional model review. |
| H | D0243: “The first segment after the collection is effectively a permanent top-level taxonomy referenced by every fact, precondition target, and mutation target, so it is governed deliberately.” D0278: “Undo is another admitted structural replacement, not erasure.” DESIGN §4.2: “The switch: the dogfooding user's primary daily planning runs on mainline UbU.” | Preserve governance, record provisional ratification timing, correct undo summaries and state undated exit conditions. |
| I | pinned-revs header: “Push a branch before pinning it.” | Pin the three published sibling heads, retain the five chain pins, and record the inventory and evidence here. |

ACCEPTANCE rule 5 also governs the copy-back audit: “A step says exactly what to
open, exactly what to click, exactly what to read, and exactly what to copy back.
It never asks the operator to infer.” NAVIGATION and all named section documents
were read before their changes.

## Task requirements and provenance

An expanded “Notes for” row reads the stored Task and renders its condition with
the unchanged PreconditionWords. No condition reads **“This Task has no
precondition.”** An active non-occurrence Task offers Write precondition.
Opening it lazily reads UniverseState and lists only its recorded, well-formed
targets, within the existing 128-character grammar. It offers no invented name.

| Collection | Offered predicates | Expected-value input |
|---|---|---|
| facts | equals, absent | equals: text input accepting a text, JSON number or boolean scalar; absent: none |
| numeric_values | equals, absent, at_least, at_most, greater_than, less_than | equals and all four comparisons: finite number input; absent: none |
| set_memberships | equals, absent, member_of | equals and member_of: text input accepting a text, JSON number or boolean scalar; absent: none |
| event_markers | equals, absent | equals: text input accepting a text, JSON number or boolean scalar; absent: none |

The form conservatively offers the advisor's scalar expected-value scope rather
than objects, lists or null. A stored string that resembles a boolean is
prefilled quoted to preserve its type. No JSON condition editor is presented.
Nonempty all_of/any_of trees remain readable and clearable, but have no leaf-edit
form; tree authoring remains possible through existing routes. Completed Tasks
and routine occurrences are read-only here.

Save sends only `preconditions`, alongside the route's schema_version and
expected_version metadata. Clear sends `preconditions: null`. Its exact warning
before acting is:

> Removing this requirement allows the Task to be planned when this condition is false.

Successful writes reload the stored Task and list. A 409 retains the error and
reloads the current Task/version. Existing title, notes and other field edits
retain their behavior. An admitted proposal's condition is edited the same way
as an operator-authored condition: no lineage, extra warning or candidate reopen
was added. Verified review_policy::subject_key already hashes Task, field and
existing_value; changing the admitted value invalidates that subject's hold
without new resurfacing code. Escalation remains Task-and-field based.

Facts and Numbers offer exactly **“My assertion”** and **“A reading”** beside
their values. My assertion is the default and sends no provenance_kind. A reading
sends `provenance_kind: "measured"`; the resulting stored badge displays measured.
A successful write resets the choice. Derived and proposed remain readable
provenance explanations, never offered choices. Existing clears and set-member
operations are unchanged. The explanatory clause is now:

> What you set on this screen is recorded as asserted unless you choose “A reading”; the choice is yours.

## Shared selection and Review counts

The producer-neutral initial gate code is **`advisory_task_skipped`**. These exact
messages are retained, with no producer name:

```text
Task `{id}` is a routine occurrence; edit its template instead
Task `{id}` has neither a title nor a description to reason over
{N} more Tasks were skipped: they are routine occurrences or have neither a title nor a description
```

At most three Tasks are named, then one aggregate naming no Task id. Eight
ineligible Tasks yield three named lines and “5 more Tasks were skipped”:
four lines in each independent API response. Review's “Latest Task selection
notes” renders the latest such report once, outside both result panels; a later
selection without skips clears it. No report is suppressed in the API.
Late precondition eligibility refusals retain precondition_task_skipped;
vocabulary_proposal_refused, malformed results, missing targets and queue
refusals remain producer-specific. No advisory request schema, prompt, budget,
queue bound or context boundary changed.

Only rehearsal-facing Review lists opt into showCounts: the action-error list,
Vocabulary and Precondition result lists, precondition_review result and the
new shared selection list. SuggestTags and Clarify lists retain their default
rendering, as do every other route and DiagnosticsList itself. Counts describe
rendered diagnostic lines by code, not the number of Tasks represented by an
aggregate. A list with five lines under one code and three under another states
those counts without asking the operator to tally sentences.

## Calendar truth and legend wording

Reconciliation receives the minted-id set from the same calendar list read and
reuses capture's stale_export_diagnostic wording:

```text
Calendar event `{id}` was created by UbU for a Task this store does not have, so it is left alone and becomes no Task
```

The conflict_type remains **foreign**; no fifth type is introduced. Applied
ownership takes priority, followed by an unrecorded match to a known active
Task, then the stamped unknown-Task origin case, then a genuinely foreign event.
Existing sorting, UI grouping, repairs and non-adoption remain intact. Capture's
caller passes its already-read set to the extended classifier; its contract
and stamping/409-to-PATCH behavior are unchanged.

Both legend lines retain their paragraph positions. Their complete before/after
wording for each existing branch is:

| Branch | Before | After |
|---|---|---|
| Colour, Static | Colour means: its category | If you give this event a colour, it means: its category |
| Colour, UbU-created Dynamic | Colour means: done | If you give this event a colour, it means: done |
| Colour, captured Dynamic | Colour means: a commitment at the time it then has, in that colour's category | If you give this event a colour, it means: a commitment at the time it then has, in that colour's category |
| Window, Static | Window change means: move — the window follows the event | If you change this window, it means: move — the window will follow the event |
| Window, Dynamic | Window change means: resize — the duration changed | If you change this window, it means: resize — the Task's duration will change |

No layout, colour partition or gesture rule changes. Existing layout assertions
are retained. A new test reads the conditional legends after approval, when
applied status previously made the wording especially misleading.

## Rehearsal and copy-back presence audit

The rehearsal grows from **13 to 15 numbered steps** and from **eight to ten
copy-back items**. Existing deterministic steps 1–11 remain first. New step 12
records an honest assertion/reading, reads a Task's requirement, writes a leaf
and judges its words in the actual app. A one-off Task is the deterministic
fallback; a useful tree need not be cleared. Step 13 reviews that authored
requirement and, if a card arrives, reads the selected finite span, eligible
date and optional saved hold. It promises neither a candidate nor a deferral.
Step 14 retains Vocabulary → explicit operator values → separate Precondition,
including manual fallback and zero/blocked-model results. Step 15 stops.
Failure or absence at any model step cannot block a later one. No run is repeated
to manufacture a candidate or snooze.

The protected step 11 paragraph and step 9 convergence explanation are preserved
byte for byte. Precondition-word transcription retains the existing operator
waiver; no new hand-redaction work is imposed. This audit covers every item:

| Item | Requested material and explicit absence/failure outcomes |
|---|---|
| 1, capture | Six counters, each with its own “no captured counter”, “no updated counter”, “no unchanged counter”, “no skipped counter”, “no moved counter” or “no resized counter”. The no-colour sentence has “no no-colour sentence”; the count line has “no Diagnostic counts line”. No expansion of event lists or diagnostic tally. |
| 2, Plan | Diagnostic counts or “no Diagnostic counts line”; Placements or “no Placements line”; the whole Not in this Plan section or “no such section”. |
| 3, risk | Whole Plan risk panel or “no Plan risk panel”; no extraction or count of findings. |
| 4, preview | Operations proposed or “no Operations proposed line”; first Dynamic Update block or “no Dynamic Update operation”, including only-Static/converged previews. The existing explanation of convergence stays verbatim. |
| 5, approval | Approval status and Operations applied, each with “no Approval status line” or “no Operations applied line”; “I did not approve” when the action was not taken. |
| 6, UniverseState | Entries line or “no Entries line”; collection names and counts only, never a key, value or table row. |
| 7, authoring | “saved; the words express my requirement” or “saved; the words do not express my requirement”, plus rendered words. Alternatives: “precondition authoring failed”, “no Task precondition section”, “no saved precondition words”, “no recorded target; no condition saved”, “no Write precondition control”, “no Save precondition control”. These outcomes allow continuation. |
| 8, review/hold | Selected/enqueued line or “no Precondition review result line”; counts or “no review Diagnostic counts line”. Card words have “no Currently required words”, “no Proposed requirement words” or “no removal sentence”. Interval fields have “no snooze span” or “no Eligible to return line”. Saved hold has “no Currently held until line”; otherwise “I did not defer”. No card: “no review candidate; no snooze interval”; no selection: “no admitted precondition selected”. No model reason, Task id or hand tally. |
| 9, advisors | Both producers' Run status and Candidates enqueued lines retain “no Vocabulary Run status line”, “no Vocabulary Candidates enqueued line”, “no Precondition Run status line”, “no Precondition Candidates enqueued line”. Added count absences: “no Vocabulary Diagnostic counts line”, “no Precondition Diagnostic counts line”, “no selection Diagnostic counts line”. Vocabulary judgment has “a name was worth recording”, “no name was worth recording”, “no vocabulary candidate appeared”, or “vocabulary queue full; no model asked”; failed admission has “target admission failed”. Condition words have “no precondition words”, “no Currently required words” or “no Proposed requirement words”. Rejection outcomes remain “left in Review”, “rejected; proposal left the queue”, “rejection failed”, “no candidate appeared, so nothing was rejected”, or “queue full; no model asked”. Each result is copied immediately while visible, before navigation resets it. Counts are rendered lines, never diagnostic sentences or Task ids. |
| 10, assessment | The operator's own judgment about scheduling and whether the store is useful tomorrow. No screen figure or model output is assumed. |

The previous candidate-count request was preserved rather than represented as
new. ACCEPTANCE records the reporting incident accurately, and CONTRACT_CHECK
places all HTTP-assertable behavior in the runner. No acceptance step is retired.

## Design corrections and decision

1. D0275's justification now records that live greedy planning met the earlier
   practical bar, while the expectation raised on 2026-10-05 is automated
   results requiring minimal human-labor ordering. Desktop GPU planning remains
   Phase 1b; the change corrects reasoning without changing scope.
2. The exit criterion remains the switch, with no date. It waits on desktop GPU
   planning and the CPU reference/certification path, plus provisional-root
   ratification or retirement.
3. D0259 explicitly deprecates only its decomposition-undo rule in favor of
   D0278. The old paragraph remains quoted as history. The approved DESIGN §23.1
   and UBU-Q0132 corrections use a restored Task with a new handle and retained
   retirement/history, preserving other tombstone/purge policy and statuses.
4. Exactly one new decision, D0291, amends D0243's timing while preserving
   governance. No subject root is proposed. D0242 and D0243 are byte-identical
   to the baseline; affect's reserved meaning and D0242's mode rejection are
   untouched. Every existing decision Status line is unchanged. No existing
   Open Question was found for this vocabulary amendment, so none is added or
   marked resolved by D0291. Question headers/statuses remain unchanged.

### UBU-D0291, full record

```markdown
## UBU-D0291: Subject vocabulary is governed by ratification before the switch

**Status:** Accepted → DESIGN.md §11.2. Amends UBU-D0243.

Accepted on 2026-10-06. The first segment after a collection is a permanent top-level taxonomy referenced by every fact, precondition and mutation. It stays governed and reviewed. This amendment changes when a root must be ratified; it does not repeal the namespace grammar or its governance.

The effective subject vocabulary a target's `<subject>` must belong to is the governed set union the provisional registry. The governed set is unchanged: `operator`, `project`, `github`, `affect`, `relationship`. Extending that governed set still requires a recorded amending `UBU-D` decision. `affect` remains reserved, and `UBU-D0242`'s organization/worker-mode intrinsic-affect rejection keyed on `<subject> == affect` is untouched.

The provisional registry is operator-authored and visible in one place. Minting a provisional root is an explicit operator act, never a side effect of authoring a fact and never available to an advisor. A producer may propose a subject only from the effective vocabulary; a model can never mint a root. This follows the same constraint that limits the precondition advisor to recorded targets.

A root's shape is enforced on minting: a snake_case singular noun naming an entity or domain, never an instance, an attribute, a provenance or source, or a reverse-DNS authority prefix. The root rule is unchanged from `UBU-D0243`. Predicates and entity-path segments retain their existing discipline. No subject root is proposed by this record.

Ratification is due before the switch. Every provisional root must either be promoted into the governed set by an amending `UBU-D` record or retired. The registry is that decision's agenda. The switch is when the operator's store stops being disposable; it is the last moment when a rename is cheap. Afterward a rename rewrites UniverseState keys, fact_provenance keys and every precondition target string in Task payloads, with no migration tooling. Backward compatibility is not required while the store is disposable.

Consequences:

- The switch waits on the desktop GPU planner and CPU reference/certification path, and on ratification or retirement of every provisional subject root before the store becomes non-disposable. No switch date is set. This adds ratification to `UBU-D0275`'s exit conditions without changing the planner's Phase 1b scope.
- `DESIGN.md` §4.2 records those switch conditions; §11.2 records the two-tier vocabulary and preserved namespace invariants.
- The provisional registry, explicit minting act, orchestrator validator and advisor subject constraint are follow-up implementation work in `ubu-orchestrator`. This ticket implements none of them and adds no root.
- Phase 1b's Tasks form authors single precondition leaves. Nonempty all_of/any_of trees are readable and clearable; tree authoring remains available through the existing routes and is outside that form's scope.
```

### All three switch-condition statements

D0291's consequences:

> The switch waits on the desktop GPU planner and CPU reference/certification path, and on ratification or retirement of every provisional subject root before the store becomes non-disposable. No switch date is set. This adds ratification to `UBU-D0275`'s exit conditions without changing the planner's Phase 1b scope.

D0275's consequences:

> The switch waits on the desktop GPU planner and CPU reference/certification path, and on ratification or retirement of every provisional subject root before the store becomes non-disposable (`UBU-D0291`). No switch date is set.

DESIGN §4.2:

> The switch waits on the desktop GPU planner and CPU reference/certification path, and on ratification or retirement of every provisional subject root before the store becomes non-disposable (`UBU-D0291`). No switch date is set.

Registry, explicit minting, subject enforcement and advisor constraints are
follow-up implementation work. This ticket implements none and offers no roots.

## Verification

| Repository | Result |
|---|---|
| ubu-orchestrator | **615 tests**, from 609; three shared-selection tests and three minted-origin tests. Full suite passed. |
| ubu-ui | **203 tests**, from 185; nine Task-precondition, four provenance-choice, four Review-count and one post-approval legend tests. Full suite and TypeScript/production build passed. |
| ubu-devshell | **33 of 33 scenarios**, from 30; **622 requests**, from 590; 0 failed and 2 explicitly skipped live integrations. Eleven staging seeds for the unchanged one staged step passed. Node and shell syntax checks passed. |
| ubu-design | No native test suite, build or drift-guard script exists. A structural consistency check passed: exactly D0291 added, all existing Status lines preserved, D0242/D0243 byte-identical, three switch conditions consistent, question headers/statuses unchanged, no switch date or private argument. |
| ubu-store, read-only floor | **110 tests**, unchanged; full offline suite passed. |

```text
RESULT: 33 of 33 scenarios passed, 0 failed, 2 skipped, 622 requests, all to 127.0.0.1
```

New runner scenarios cover the existing versioned Task PATCH's authoring,
stale-clear refusal, null clearing, other-field preservation and ordinary Plan
gate; eight occurrences' four-line neutral gate report in each independent
producer run and producer-specific malformed-result refusals; and stamped-origin
truth shared with capture, unchanged foreign classification/sorting and no
reconciliation adoption. Existing staging seeds remain eleven for one step.

Existing test expectations were updated only for intentional changes:

- B: one explanatory-sentence expectation in tests/universe-state.test.tsx.
- C: two initial-gate code expectations in orchestrator's
  tests/advisory_diagnostic_bounds.rs and tests/vocabulary.rs.
- D: two status selectors in tests/review.test.tsx and one in
  tests/vocabulary.test.tsx now select the diagnostics list, since the count
  summary adds another status element. Their diagnostic-content checks remain.
- E: existing classifier calls pass an empty fourth set where appropriate;
  their assertions are unchanged.
- F: existing legend text expectations match the conditional mood. Paragraph
  selection and layout assertions are unchanged. The new post-approval test's
  initial mock omitted applied_events; correcting that fixture produced a
  passing test without changing production behavior.

No existing assertion was removed or weakened to conceal a failure. New tests
exercise boundaries, not just copies of the implementation. Section A's initial
build caught a mistaken client method name; using the existing readUniverseState
resolved it before the passing build. A Review-count test's unsupported query
option was removed before the final TypeScript build.

Clippy has **8 distinct warning messages before and 8 after**, matching baseline
8. Those messages occur at nine source locations, including the same Copy-clone
warning at two locations; both the messages and locations are unchanged.
No new warning was introduced.

The OpenAPI path count remains **56**. `ubu-ui/src/api/endpoints.ts` is
byte-identical to baseline and retains **43 endpoint constants**. PreconditionWords
and DiagnosticsList are also byte-identical. No new route, candidate kind,
predicate, dependency, manifest, lockfile or pin-chain revision was added.
Plan, capture contract, colour partition, collision diagnostics and advisory
schemas/prompts/bounds remain unchanged.

scripts/check-all.sh completed with exit 0, including offline builds,
patch-generator regressions, fake GitHub import/projection, static export-bypass
guard and hard-boundary checks. The standing fixture demo remained
**QUARANTINED** and did not run; that is not a pass. Final inventory and tree
checks follow the report commit rather than copying a pre-commit DIRTY marker.

**No env.sh constraint was relaxed. Two jobs were not used anywhere in P1B-68.
No OOM occurred.** Every Cargo invocation sourced env.sh, used one job and ran
sequentially across repositories. No persistent runtime configuration or build
cap changed. P1B-67's approved incremental trial is historical evidence only;
it was neither repeated nor generalized to a full build here. Dependencies
remained offline, with Git the authorized network exception.

## Privacy and acceptance boundary

Every added fixture, test and document example uses invented data. None carries
real calendar data, event ids, real Task titles or notes, real Quick UbU data,
or real fact keys or values. The private three-Ps argument appears nowhere in
ubu-design. Public design prose uses only the ticket's stated governance and
switch reasoning. Protected acceptance artifacts were not opened; local
exclusion metadata alone supplies the outgoing-commit filename audit. Neither
their names nor the protected operator key appears in outgoing commits or added
lines. No machine-specific path is committed. No operator store, calendar,
OAuth token cache or credential was opened.

New advisory Rust tests use StubTransport; calendar tests use the existing
RecordingCalendarApi, with no HTTP transport. UI tests mock the existing Tauri
HTTP plugin. No new Rust/UI test reaches a real model, external HTTP, Google,
editor or signal, starts a process or installs a signal handler. The exempt
devshell runner and staging harness use loopback, mock processes and throwaway
stores; live Google and live ollama are explicitly skipped. No observation value
reaches a model in any producer or model-input fixture. Invented expected
condition thresholds are requirements, not observed World values. No
password-hygiene agent consumed input or was invoked; credentials remain outside
canonical StateStore. No model-committee ranking was run.

Automated checks are not operator acceptance. The operator must follow
[LIVE_REHEARSAL.md](LIVE_REHEARSAL.md) end to end against his own calendar and
return its **ten-item copy-back**. This report adds no separate manual sequence.

Operator acceptance has not been performed; the two steps under test are §A's precondition authoring and the finite snooze's first live reading.
