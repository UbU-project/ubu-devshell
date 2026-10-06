# P1B-66 pins and verification

The two rehearsal information lists now state their own per-code counts.
Precondition runs consider up to 25 Tasks, propose for at most three, and
refuse another run when ten or more precondition candidates await review.
These caps manage review labour; they do not improve proposal relevance.
P1B-67 remains the vocabulary cold-start work. Automated verification has
passed; operator acceptance remains outstanding, so P1B-66 is not complete.

All twelve repositories began clean on main. Fresh origin fetches confirmed
P1B-65 merged at `a04ec66`, `7be3379` and `3e06c7f` in UI, orchestrator and
devshell. The three changed repositories use
`p1b-66-the-screen-counts-and-the-advisor-proposes-less`; the other nine remain
at their baseline heads. No main merge or force-push was performed. Each
lettered section has one commit per affected repository. UI and devshell
commits carry Co-Authored-By; orchestrator commits do not.

## Revisions and unchanged pins

| Repository | Final revision |
|---|---|
| orchestrator | `cb7a607b7d443e02ba23910c8e8b1b3d1343442e` |
| UI | `0873f314b5412d56e279d543395d132209e1068e` |
| devshell | the section E commit carrying this report |

Only `ubu_orchestrator` and `ubu_ui` change in pinned-revs.toml. Both branches
were pushed before pinning. These five chain pins did not move:

| Pin | Unchanged revision |
|---|---|
| `ubu_schemas` | `02e4c91ce149ef594f1d08408216097b48dd7afb` |
| `ubu_core` | `c4b624d76f210f77f865c61801e02c89219763ce` |
| `ubu_store` | `9e471a46b357f99cff567c250ae59084a6768b52` |
| `ubu_planning_kernel` | `8af10ece07043c307fe351ac867cfd8449e08c4f` |
| `ubu_github_adapter` | `50fae565e6d48fb5c41107ab3259096ad243ccf3` |

Design and brand pins are unchanged. There is no devshell self-pin.
show-revs reports OK for all nine inventory rows; the upstream trees are
clean and the pins are present on origin.

## Sections and governing sentences

| Section | Commit | Governing sentence read before implementation |
|---|---|---|
| A, UI | `0873f31` | DiagnosticsList: “It is a status, and it is quiet.” CALENDAR_SURFACE: “Every diagnostic is readable, including occurrence-override, observation-resize and inactive-Task explanations.” NAVIGATION: “One line gives the names and the counts and no value:” |
| B, orchestrator | `9dc5efd` | ADVISORY: “The controller validates before enqueueing, even for injected transports.” CLARIFY: “Answer, defer or reject it first. No model was asked.” |
| C, devshell | `01a4f18` | ACCEPTANCE: “A step says exactly what to open, exactly what to click, exactly what to read, and exactly what to copy back. It never asks the operator to infer.” CONTRACT_CHECK: “The boundary: anything assertable over HTTP is a scenario here, never a manual step there.” |
| D, orchestrator / devshell | `cb7a607` / `d8d0721` | ADVISORY: “It authors no facts and no proposed provenance, and it does not move Tasks or write Task preconditions.” ACCEPTANCE: “No other copy-back asks for a hand tally of rendered items.” |
| E, devshell | the commit carrying this report | pinned-revs: “Push a branch before pinning it.” CONTRACT_CHECK: “The boundary: anything assertable over HTTP is a scenario here, never a manual step there.” |

Grounding found no conflict requiring a departure from the requested changes.
Today has separate failure and information lists. The two opt-ins are the
successful information lists; the failure list remains unchanged. The rehearsal
names an absent count-line outcome and never treats it as proof that there
was no failure diagnostic. The eight-item audit found additional naming/tally
work in items 3 and 7, corrected in C under judgment call 8.

## A: the screen counts

The opt-in prop is `showCounts`, default false. Only these call sites pass it:

- Calendar's capture diagnostics after filtering out `capture_colour_absent`.
- Today's `notices` list above Timed placements.

All other twenty-nine DiagnosticsList call-site lines are unchanged, confirmed
against the baseline across all twelve source files. A muted paragraph with
role status and aria-label “Diagnostic counts” precedes the existing list.
Its first-seen code order matches the list's render order. The sentences and
codes stay readable; no count replaces them. Empty lists still render nothing.
The default DOM remains byte-identical in the regression test, including an
untouched Calendar preview call site that has no count summary.

The exact single-code and interleaved-code test renderings are:

```text
Diagnostic counts: synthetic_notice 19.
Diagnostic counts: synthetic_z 2, synthetic_a 1.
```

The mixed input order is synthetic_z, synthetic_a, synthetic_z; the summary is
not alphabetical. Three new tests verify nineteen lines, mixed ordering,
quiet status semantics, default DOM and empty rendering. The existing preview
test additionally checks that its untouched call site has no summary.

## B: proposal and backlog bounds

`maxItems` is `min(3, selected Tasks)`, therefore 3 for a context of 25.
MAX_LIMIT stays 25. The system adds this bound without changing its other
sentences:

> The response is bounded to at most three proposals in total, regardless of how many Tasks are supplied.

A four-proposal response is refused whole by the existing malformed-result
path. None is enqueued, even when each tree is valid. The existing tree grammar,
validator, mode checks, candidate kinds and diagnostic sentences remain.

The backlog threshold is **10**, explicitly a judgment about the operator's
attention that he may want lower. It counts only precondition candidates in
proposed and resurfaced states, excluding deferred candidates and other kinds.
Before settings, selection or advisory_transport_factory access, a full queue
returns HTTP 200, status ok, selected [], report null and candidates_enqueued 0.
The new code is `precondition_queue_full`; its exact message template is:

```text
{count} precondition candidates are waiting in Review; review, defer or reject them before asking for more. No model was asked.
```

For ten, the exact text starts “10 precondition candidates”. Twelve is reported
as twelve; the count is not hardcoded. Nine awaiting permits a run. This is a
refusal threshold, not a strict queue-size ceiling: a permitted run can add
three to nine. The model chooses its three and may choose the first three.
Neither bound fixes the relevance of proposals over a small vocabulary.

Six new in-process tests cover the 25/3 schema and system bound, whole-response
refusal at four, refusal at ten and twelve with mixed proposed/resurfaced rows,
no factory invocation, guard precedence over an absent factory, nine permitting
an enqueue, and ten deferred permitting a model call. Three older tests that
returned ten proposals were corrected to test controller aggregation with
separately valid capped StubTransport batches. Their three-named/one-count
assertions remain, with no change to diagnostic text or loss of test count.
The first full-suite run exposed the third of these obsolete wire fixtures;
the corrected full suite subsequently passed. No wire cap was weakened to
preserve a fixture.

## C and D: copy-back and the eight-item audit

| Item | Audit result |
|---|---|
| 1 | Copies the six displayed capture counters, the already-counted no-colour sentence and the Diagnostic counts line. No event-list expansion or line tally; named absent-line outcomes. |
| 2 | Copies Diagnostic counts and Placements, both numbers supplied by the screen, plus the entire Not in this Plan block or its absence. No per-code selection or badge count. |
| 3 | Copies the Plan risk panel as one block or its absence, replacing extraction of each finding's name and severity. No item-by-item naming. |
| 4 | Copies Operations proposed and the first Dynamic Update block; when no Update exists, copies “no Update operation”. No operation count by eye. |
| 5 | Copies the two approval lines or “I did not approve”. Applied counts already appear on screen. |
| 6 | Copies Entries with its printed collection counts. No fact key, value or table row. |
| 7 | Copies Run status, Candidates enqueued, precondition words as rendered and the decision outcome. Removes Review diagnostic tallying; a full queue has “queue full; no model asked” and no new proposal words. |
| 8 | The operator's own assessment, with no request to count or name rendered items. |

All eight pass judgment call 8. The exact final list is:

```text
1. From step 7: the six counters with their numbers; the sentence beginning
   “N events had no colour.” or “1 event had no colour.”, or “no no-colour
   sentence”; and the “Diagnostic counts:” line exactly as shown, or “no
   Diagnostic counts line”. Do not expand or copy the list behind “The N
   events with no colour”, transcribe diagnostic sentences or count lines.
2. From step 8: the “Diagnostic counts:” line above “Timed placements”, or
   “no Diagnostic counts line”; the “Placements:” count line, or “no Placements
   line”; and the whole section “Not in this Plan”, or “no such section”.
3. From step 8: the whole panel headed “Plan risk”, exactly as rendered,
   or “no Plan risk panel”. Select it as one block; do not extract each finding.
4. From step 9: the line beginning “Operations proposed:”, and the whole of
   the first operation headed “Update:” that reads “Placement: Dynamic”,
   or “no Update operation” if none is headed “Update:”.
5. From step 10: the two approval lines, or “I did not approve”.
6. From step 11: the line that begins “Entries:”. The names and the counts
   only, never a value.
7. From step 12: the “Run status:” and “Candidates enqueued:” lines; the first
   precondition’s words as rendered, with no substitution or hand redaction
   (both requirements for a replacement); and “left in Review”, “rejected;
   proposal left the queue”, or “rejection failed”. If none appeared: “no
   candidate appeared, so nothing was rejected”. If the queue blocked the run:
   the two result lines and “queue full; no model asked”, with no proposal words.
   Do not name diagnostic codes for copy-back or tally their lines.
8. And one answer, in your own words: is what it chose to schedule what you
   would have chosen, and is this a store you would plan tomorrow on? If
   not, what is missing?
```

The final counts remain **13 steps and 8 copy-back items**. “Do not transcribe
their sentences” remains in step 8; capture retains “Do not transcribe its
sentences”. Step 11's load-bearing UniverseState paragraph and step 9's
converged-state explanation remain byte-for-byte unchanged. The new zero-Update
branch appears both in step 9 and item 4. Step 12 explains that queue refusal
means no run and no model call, with review/defer/reject as the remedy, and
that at most three proposals is the design rather than a thin result.

ACCEPTANCE records P1B-65's breach of P1B-62's no-hand-tally rule as a recurrence
by the same ticket author, and “each X and how many” as a tally in disguise.
The repair is the established one: the screen states the number. It also records
that a newly working producer is a labour source and should be assumed to flood
its queue until bounded. Nothing is retired. P1B-67 remains the vocabulary work;
no proposal's relevance improved here. The operator's own transcription waiver
remains, while repository fixtures stay invented. Durable proposal rejection
and the outstanding live acceptance of finite review snoozes are unchanged.

## Validation and runtime

| Check | Before | After |
|---|---:|---:|
| orchestrator full suite | 584 | 590 |
| UI full suite | 176 | 179 |
| store full suite | 110 | 110 |
| unique Clippy warnings | 8 | 8 |
| runner scenarios | 28 | 29 |
| runner requests | 527 | 579 |
| schema fixtures, valid / invalid | 91 / 110 | 91 / 110 |
| stage-only harness seeds / steps | 11 / 1 | 11 / 1 |
| live rehearsal steps / copy-back items | 13 / 8 | 13 / 8 |
| OpenAPI paths | 56 | 56 |
| endpoints.ts endpoint constants | 43 | 43 |

The baseline orchestrator suite and Clippy were rerun before B. All after
counts above were measured in this ticket. Full orchestrator, UI and store
suites, UI production build, schema validation, the runner and stage-only
harness passed. Clippy's eight unique code/message pairs are identical before
and after. OpenAPI regeneration is byte-identical; both generated OpenAPI files
and endpoints.ts remain unchanged. No dependency, manifest, lockfile, route,
OpenAPI path, candidate kind or predicate was added.

```text
RESULT: 29 of 29 scenarios passed, 0 failed, 2 skipped, 579 requests, all to 127.0.0.1
staged and checked 11 seed(s) for 1 step(s); not waiting for the app
```

Scenario 29 uses existing HTTP contracts and a loopback stub to verify the
schema cap, whole-response refusal, nine/ten boundary, deferring, resurfacing
and ten deferred candidates. Live Google and Ollama were skipped, not passed.
Node and shell syntax checks passed. scripts/check-all.sh completed with
exit 0, including patch-generator regressions and standing mock GitHub and
boundary diagnostics. Its inventory was taken with pending section E pin
edits, before committing this report; final tree cleanliness is checked after
E. The standing fixture demo remained QUARANTINED and did not run; it is not
a pass.

Every Cargo invocation retained one job, sequential execution across repositories
and the sourced existing env.sh settings; dependencies were offline. No env.sh
constraint was relaxed. No OOM occurred. No two-job or larger trial was made.
No env.sh, target-root policy or persistent build configuration was changed.

## Unchanged messages, privacy and boundaries

No existing diagnostic message was reworded in any repository. Only the new
queue-refusal message was added; the model's system text gained its numeric
bound. planning_service.rs, calendar_capture.rs and PreconditionWords.tsx are
byte-for-byte unchanged. Plan, capture contract, colour partition, schema shape
beyond proposal maxItems, review snoozes, advisory.model and its default, and
the knowingly open controlled-subject-vocabulary gap are unchanged.

Every added fixture and documentation example is invented. No real event id,
Task title, Task description, Quick UbU data, fact key or fact value was committed.
The operator's protected key and the protected local acceptance artifact names
are absent from outgoing commits and additions. Exclusion metadata alone was
used for that audit; the artifacts were never opened. No machine-specific path
is committed, and no real calendar, operator store, OAuth cache or credential
was opened. No password-hygiene agent was invoked or given input; credentials
remain outside canonical StateStore. No model-committee ranking was run.

Tests use StubTransport or the existing mocked UI plugin, with no live model,
external HTTP, process spawn, signal handler or editor. The exempt devshell
runner and staging harness use mock processes, loopback and throwaway stores.

Operator acceptance has not been performed; the step under test is whether the whole document can be reported without transcribing a diagnostic sentence or counting a rendered line.
