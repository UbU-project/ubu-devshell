# P1B-72 — the rehearsal drives itself

Implementation is prepared for the operator's comparison. Automated verification
passed; **operator acceptance has not been performed**, and the proposed ledger
retirements remain pending. Run the instrument as described in LIVE_REHEARSAL.md;
a real-calendar acceptance run was not performed by the agent.

## Governing sentences and approved conflicts

ACCEPTANCE.md rule 1: **“A manual step may not verify what the runner or a
`ubu-ui` test already asserts.”** The former copy-back rendering/count checks
were already in tension with it. The replacement visual pass adds actual
operator data/layouts and human assessments; it does not re-prove fixtures.
All required governing documents were read, including ACCEPTANCE.md and the
previous LIVE_REHEARSAL.md in full. P1B-71 kernel/devshell HEADs were on main
and were confirmed ancestors of origin/main before implementation.

| section | governing sentence quoted | change |
|---|---|---|
| A | LIVE_REHEARSAL.md: “Do the numbered steps in order, from the first to the last, and copy back exactly the list at the end.” | owned startup and actions in the original order; explicit private inputs, missing-input skips |
| B | LIVE_REHEARSAL.md step 11: “It holds the names of the collections and a count for each, and no value.” | public field whitelist, labelled counts and withheld content; no UniverseState key/value/row |
| C | LIVE_REHEARSAL.md item 9: “And one answer, in your own words: is what it chose to schedule what you would have chosen, and is this a store you would plan tomorrow on?” | four deliberately public judgments at the end, as required by P1B-72 and its approved exception |
| D | run-live.sh: “Before it starts it prints the absolute path of the store, the calendar id and the horizon, and waits for you to type the word: live” | equivalent destination check and literal live consent; separate preview approval; manual-decision reasons documented |
| E | CONTRACT_CHECK.md: “anything assertable over HTTP is a scenario here, never a manual step there.” | driver-led normal procedure, full fallback appendix and one-cycle comparison |
| F | ACCEPTANCE.md: “A ticket that changes the thing a line names brings that check back.” | proposed ledger lines with evidence quality and pending retirement; absence rule scoped to manual readings |
| G | pinned-revs.toml: “Record the expected HEAD SHA here each time an upstream repo lands.” | no upstream moved, no pin changed; no devshell self-entry exists |

BUILD_ENV.md's sourced build configuration and the run-live safety word govern
the launcher too. It calls the existing Cargo shell wrapper, never `exec cargo`,
then runs the binary after the build lock has been released. The horizon is
passed through to the unchanged orchestrator; no driver-specific default is
invented. Only store/calendar destinations are echoed, not credential paths.

Seven grounded conflicts were reported before writing and explicitly approved:
private authoring/decisions stay operator-owned; generic counts are labelled
client-computed; the visual pass also includes Tasks/Review and withholds UI-only
words; deliberate public judgment sentences are permitted; reset cannot be
certified; comparison forwards the same UI responses instead of duplicating
stateful requests; retirements await comparison. Reasons and alternatives are
recorded explicitly in ACCEPTANCE.md's P1B-72 section. No unresolved contradiction
was silently treated as permission. These corrections do not change upstream
contracts or the canonical state/content boundaries.

## Ownership, order and confirmation

The driver **starts and owns** its orchestrator. Attaching was rejected because
no existing API can establish that a process opened the displayed store/calendar.
The launcher takes absolute paths from the environment, imports UI endpoint and
schema constants, builds offline if needed, removes build scratch and releases
the shared lock before Node waits. Its forwarder binds the UI port and forwards
to an owned ephemeral loopback backend port; it creates no backend route.

Normal actions are routine, explicit settings, session enable, capture, Plan,
preview, human approval decision, UniverseState entry counts before authoring,
explicit subject minting/mutations, versioned ordinary-Task precondition patch
and readback, Vocabulary, Precondition, queue. Missing private inputs stay skipped.
Existing compound requirements are preserved. No inferred hours, values, names,
admissions, rejections or retries substitute for operator choices.

The store path and calendar id are printed before startup. The operator must
type **live**. After preview, the operator must separately type **approve** for
a write. No flag, timeout or default provides either confirmation. Stale/missing
preview is not offered. Comparison mode instead forwards the UI's own preview
and explicit Approve click, without replaying automatic actions. It preserves
request/response bodies and preflight/CORS headers, disallows off-host URL
spellings and redirects, and retains producer snapshots independently.

Reset stays the operator's own copy tool. Stamped leftovers and Plan collision
codes are observable; reset completeness is explicitly unverifiable. A second
invocation is a second rehearsal. No real driver, reset, Google session, approval
or model run was executed here.

## Every public figure and its source

No API object is serialized into the report. All arbitrary strings are withheld;
fixed enum/code vocabularies reject unknown strings, which are counted under
withheld_unknown where applicable. Every cardinality/histogram below is labelled
**client-computed** in the block. Those generic reductions are the approved
exception, not duplicated UI rendering or gesture logic.

| copy-back item | route/method | fields printed |
|---|---|---|
| 1 | POST /projection/calendar/capture | captured, updated, unchanged, skipped, moved, resized; diagnostics[].code histogram; diagnostic entries with capture_colour_absent |
| 2 | POST /planning/generate | status; diagnostics[].code histogram; plan.steps cardinality and plan.steps[].static_anchor histogram; unplaced_tasks, blocked_tasks, invalid_tasks cardinalities |
| 3 | POST /planning/generate | risk_report.level; risk_report.findings cardinality; each finding's category, severity, blocking |
| 4 | GET /projection/calendar/preview | stale; matching_placements; operations cardinality and operations[].kind histogram; each operation's kind/static_anchor, event.start_at/end_at/color_id/transparent and event.reminders_minutes cardinality; first kind=update/static_anchor=false operation's same fields; diagnostics[].code histogram |
| 5 | POST /projection/calendar/approve | status; operation_results cardinality and operation_results[].status histogram; diagnostics[].code histogram |
| 6 | GET /universe-state before authoring | entry cardinalities for facts, numeric_values, set_memberships, event_markers; no inner member sum |
| 7 | PUT /setting/{name}, PATCH /universe-state, PATCH /task/{task_id}, GET /task/{task_id} | write HTTP/outcomes and any diagnostics[].code histogram; payload.preconditions presence at readback; private identity used only in memory to bind the edited Task's readback |
| 8 | POST /advisory/run, independently for producer=vocabulary and producer=precondition | status; candidates_enqueued; selected cardinality; diagnostics[].code histogram; advisory_task_skipped diagnostic-entry count for each run (includes aggregate notes; not a Task count) |
| 8 | GET /advisory/queue | candidates cardinality; proposal names/words withheld |
| 8, optional deliberate UI decision | POST /advisory/candidate/{candidate_id}/admit or /reject | HTTP status only; body/response content withheld |
| 9 | terminal, not API | the four deliberate operator judgment sentences, collected at the end |
| additional action outcomes | POST /objective; PUT /setting/{name}; POST /desktop/session/google-calendar | HTTP/outcome per observed attempt; session accepted and enabled booleans; any safe diagnostic histogram |
| all observed actions | same route templates as above | HTTP response status or unavailable; fixed local skip/transport/status outcome; safe action-attempt list, with no replay |

Capture diagnostics, Plan diagnostics, and producer-specific selection snapshots
are distinct. The report does not recreate the UI's separate diagnostic-panel
partitioning. All known diagnostic entries are represented in a single source
histogram per action; unknown code text is withheld. Empty histograms mean
observed empty arrays, not an inferred successful run. Missing fields/actions
are unavailable, rather than manufactured zeroes. Risk absence is likewise
explicitly unavailable. A non-200 response can still supply safe diagnostics.

Withheld figures/content are the whole private “Not in this Plan” prose
(titles, IDs, reasons, explanations and alternatives), Plan risk detail/subject,
operation summaries/IDs, diagnostic messages and examples, Task titles/notes,
Vocabulary names, saved-authored condition AST and first/replacement proposal
AST/words. Generic counts and safe fixed fields remain. PreconditionWords and
Currently required/Proposed requirement labels/words are UI-only; placement
colour/window gesture prose also belongs to UI rendering. The visual pass reads
these privately. No HTTP route supplies the rendered wording, and none was added.

The driver hard-codes **no machine path**, logs no credential/token or their
paths, and emits no API-derived Task title, description, fact key or fact value.
The launcher cleans its private build scratch before runtime; child output is
ignored, not persisted. The driver leaves no response/answer log or public file.
The owned orchestrator persists the explicitly authorized authoring in its
selected store, as the existing workflow necessarily does. No hygiene agent
consumes untrusted inputs. Public sentences are the narrow approved content
exception; known private configuration strings in them are withheld. The
operator is instructed not to quote private content into a judgment.

## Four questions, verbatim

- whether what it chose to schedule is what he would have chosen, and whether this is a store he would plan tomorrow on
- whether the precondition's words express his requirement
- whether a proposed name was worth recording
- whether anything on Today or Calendar looked visibly wrong

## Volume and retained manual work

Before: **14 steps, 9 branching copy-back items**. After, ordinary driver mode:
**1 invocation, 1 approval decision, 1 visual pass, 4 questions, 1 paste**;
9 data groups, zero human figure transcriptions. Typed startup consent, private
genuine authoring preparation, calendar reset and optional candidate choices
remain explicit responsibilities. The first comparison cycle has extra manual
reading, deliberately, and is not described as reduced effort.

Item 1's **7 named missing-figure phrases become 0** in the ordinary manual path.
For an additional reproducible lexical measure, the old procedure has **30**
distinct curly-quoted phrases beginning “no ” (18 in its final copy-back list),
with whitespace normalized. The normal path has **0** such named transcription
branches. This is a lexical count, not a total of all possible failure outcomes.
The entire old prose/fallback remains, including all 14 steps, nine items and
all absence branches. Step 11's protection paragraph survives verbatim; every
original prose sentence was checked against the private pre-ticket snapshot.

## Verification and limits

| check | result |
|---|---|
| new devshell injected-effects unit tests | 19 passed; no listener, child spawn, signal, handler installation, editor, Google/model or external request |
| schemas / core / store / adapter Rust | 2 / 166 / 110 / 23 passed, unchanged |
| kernel Rust | 105 passed, unchanged; explicit absent-torch skip in the real tensor body |
| kernel pytest | 32 passed, 15 torch tests skipped; existing private pytest reused, PYTHONPATH=src, no installation |
| orchestrator Rust | 633 passed, unchanged |
| UI | 212 passed across 25 files, unchanged |
| check-all.sh | passed offline initially and after final driver changes; final run includes 18 pure tests; the final malformed-list regression also passed directly; never invokes the live CLI |
| test-all.sh | passed offline; all upstream suites unchanged; final pure tests also run directly |
| devshell planning parity | 5 Rust parity/worker tests passed; exact CPU atomic goldens and existing ChunkedSweep profile unchanged |
| build exclusion | passed; existing synthetic conflict/worker containment checks unchanged |
| scenario runner | 36/36, zero failures, 2 explicit live skips, 667 owned-loopback requests |
| kernel Clippy | 0 warnings, all-targets -D warnings |
| orchestrator Clippy | 8 distinct warning texts, same baseline; 9 emitted occurrences plus duplicate lib-test summaries |
| shell/JS syntax and whitespace | passed |
| privacy/path audit | all 12 repo outgoing histories/added lines passed; protected local acceptance filenames/contents never read or published |

```text
RESULT: 36 of 36 scenarios passed, 0 failed, 2 skipped, 667 requests, all to 127.0.0.1
```

The transport extraction preserved the existing runner pass line/request count.
Final checks also cover producer count separation, whitelist privacy under
unknown/malformed responses, explicit approval/decline/stale preview, versioned
leaf updates/tree preservation, pre-authoring counts, same-response comparison
and binding readback to the edited Task. Review caught missing admitted/worker
status enum entries and the unrelated-Task readback risk; both were fixed with
regressions in section F. Final startup/forwarding hardening preserves real UI
preflight headers, rejects directories as configured files, JSON-escapes the
two public destinations, exposes only fixed safe startup reasons, suppresses
private build-environment diagnostics and waits for the owned child's exit even
after a kill escalation. Malformed Task lists also report an unavailable selector and still reach both producers, covered by a final pure regression. No upstream behavior changed.

An initial pytest command used the wrong private interpreter path, then lacked
PYTHONPATH for the uninstalled src-layout package. The corrected invocation above
passed without installing anything. These command errors changed no tests.

**env.sh constraint relaxed: no. Two Cargo jobs used anywhere: no. OOM during
this ticket: no.** Every Cargo invocation was sourced, one job and sequential;
the shared flock and available MemoryHigh=16G/MemoryMax=20G scope are unchanged.
No two-job trial, torch installation, real Stage 1 computation or model-committee
rank was performed. The fixture-demo quarantine is unchanged and explicitly
reported. Automated checks do not establish live acceptance or tensor parity.

## Pins and publication

Only **ubu_devshell** moved from 0e370b2. No orchestrator, UI, kernel, core,
schema, store or adapter file changed; all eleven sibling HEADs/trees match the
pre-ticket inventory. There is no devshell self pin. pinned-revs.toml is byte
unchanged: **the other nine do not move**. show-revs.sh reports nine **OK** rows.
The branch is p1b-72-the-rehearsal-drives-itself, with one Co-Authored-By commit
per section A–G and no force push. Section G's SHA is its report's containing
commit; recording it inside itself would be circular.

| upstream | unchanged pin |
|---|---|
| ubu_schemas | 070d0a6f9a6ad7833dd523042925008316ce923b |
| ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b |
| ubu_store | 83a099f55220b1286ffb2dee3c9d19006e2090b5 |
| ubu_planning_kernel | 097a6197ed8694168c38f98a360d6306c89f9c67 |
| ubu_github_adapter | e14a43b47aeb0a928f4dfdc83cd78ea9a2e044f6 |
| ubu_orchestrator | b42cadd9b3a6a010021a080e5a4f4af16ac2095a |
| ubu_ui | 698a15fde8244dca96a03b07ad144a4c2b65af15 |
| ubu_design | 7313e82f7fb835965bc18521b10f897b238b65dc |
| ubu_brand | faf2005a8bd9e64742dd76ee6d1f91f45223946b |

## Ledger lines added, verbatim

| retired | what it proved | proved in | on record | what covers it now | retired |
|---|---|---|---|---|---|
| proposed item 1 transcription | live capture counters, no-colour observation and diagnostic counts | P1B-71 whole run; new instrument unverified | P1B-72 opening accepts P1B-71 as a whole; no item-1 measurements quoted | existing capture scenarios/UI tests; driver API counters and labelled diagnostic-entry histograms, pending comparison | pending P1B-72 operator comparison |
| proposed item 2 transcription | live placements, exclusions and planning diagnostics | P1B-71 whole run; new instrument unverified | P1B-72 opening accepts P1B-71 as a whole; no item-2 measurements quoted | existing Plan scenarios/UI tests; driver labelled cardinalities/histograms, private excluded-work prose withheld, pending comparison | pending P1B-72 operator comparison |
| proposed item 3 transcription | live risk level and findings | P1B-71 whole run; new instrument unverified | P1B-72 opening accepts P1B-71 as a whole; no item-3 measurements quoted | existing risk scenario/UI tests; driver fixed risk fields, private detail withheld, pending comparison | pending P1B-72 operator comparison |
| proposed item 4 transcription | live operation counts, matching placements and first Dynamic Update | P1B-71 whole run; new instrument unverified | P1B-72 opening accepts P1B-71 as a whole; no item-4 measurements quoted | existing preview scenarios/UI tests; driver operation fields and counts, identity/gesture prose withheld, pending comparison | pending P1B-72 operator comparison |
| proposed item 5 transcription | explicit live approval result and operations applied | P1B-71 whole run; new instrument unverified | P1B-72 opening accepts P1B-71 as a whole; no item-5 measurements quoted | existing apply scenarios/UI tests; driver approval status and operation-result histogram, human approval retained, pending comparison | pending P1B-72 operator comparison |
| proposed item 6 transcription | UniverseState's four pre-authoring entry counts | P1B-71 whole run; new instrument unverified | P1B-72 opening accepts P1B-71 as a whole; no item-6 measurements quoted | existing UniverseState scenarios/UI tests; driver collection cardinalities only, pending comparison | pending P1B-72 operator comparison |
| proposed item 7 status transcription only | genuine authoring and saved requirement outcome | P1B-71 whole run; new instrument unverified | P1B-72 opening accepts P1B-71 as a whole; no item-7 measurements quoted | existing authoring scenarios/UI tests; driver HTTP outcomes/readback presence, meaning/words remain operator-owned, pending comparison | pending P1B-72 operator comparison |
| proposed item 8 numeric transcription only | each advisory producer's separate result/selection counts | P1B-71 named producer readings; new instrument unverified | P1B-72 opening quotes Vocabulary and Precondition candidates_enqueued 3 and selection none; no new-driver measurements | existing advisory scenarios/UI tests; driver separate producer snapshots, words/names/decisions remain operator-owned, pending comparison | pending P1B-72 operator comparison |
| item 9 active human judgment; no retirement proposed | whether the chosen schedule and store suit the operator | P1B-71 whole run; judgment remains live each time | P1B-72 opening accepts P1B-71 as a whole; no schedule-judgment sentence quoted | operator's public judgment at every rehearsal; script cannot supply it | not retired |

Operator acceptance has not been performed; the thing under test is whether the driver’s block and the operator’s manual reading agree.
