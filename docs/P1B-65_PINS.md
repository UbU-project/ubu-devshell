# P1B-65 pins and verification

Manual UniverseState edits now refuse reserved first key segments, and the
screen previews the complete target before a write. Rehearsal copy-back uses
diagnostic codes and line counts and copies precondition words as rendered.
Automated verification has passed; operator acceptance remains outstanding,
so P1B-65 is not complete.

All twelve repositories began clean on `main`. Fresh fetches confirmed P1B-64
merged in orchestrator and devshell at the ticket's required heads; UI's older
`07d3481` main head is the expected baseline. The three changed repositories
use `p1b-65-the-screen-shows-the-target`; the other nine remain at their
baseline revisions. No main merge or force-push was performed. Each lettered
section has one commit per affected repository. Orchestrator commits have no
Co-Authored-By trailer; UI and devshell commits carry the required trailer.

## Revisions and unchanged pins

| Repository | Final revision |
|---|---|
| orchestrator | `7be33798a14033cb65bbcb13b9873d3fe92b6767` |
| UI | `a04ec66e9ac4473d9c88aeda8254f80a834dbb92` |
| devshell | the section E commit carrying this report |

Only `ubu_orchestrator` and `ubu_ui` change in `pinned-revs.toml`. Their
branches were pushed before pinning. These five chain pins did not move:

| Pin | Unchanged revision |
|---|---|
| `ubu_schemas` | `02e4c91ce149ef594f1d08408216097b48dd7afb` |
| `ubu_core` | `c4b624d76f210f77f865c61801e02c89219763ce` |
| `ubu_store` | `9e471a46b357f99cff567c250ae59084a6768b52` |
| `ubu_planning_kernel` | `8af10ece07043c307fe351ac867cfd8449e08c4f` |
| `ubu_github_adapter` | `50fae565e6d48fb5c41107ab3259096ad243ccf3` |

Design and brand pins also remain unchanged. There is no devshell self-pin.
`scripts/show-revs.sh` reports `OK` for all nine inventory rows, with clean
upstream trees and the pinned commits present on origin.

## Sections and governing sentences

| Section | Commit | Governing sentence read before implementation |
|---|---|---|
| A, orchestrator | `a5f2fdf` | UNIVERSE_STATE: “A key is the part of a target after its collection: the fact a precondition names as `facts.kettle.descaled` is stored under `kettle.descaled` in `facts`.” DECISIONS: “The first target segment names the UniverseState collection: `facts`, `numeric_values`, `set_memberships`, or `event_markers`.” |
| B, UI | `a04ec66` | NAVIGATION: “An entry is shown by its target: the collection, a dot, then the key.” |
| C, devshell | `ee50e13` | ACCEPTANCE: “A step says exactly what to open, exactly what to click, exactly what to read, and exactly what to copy back. It never asks the operator to infer.” CONTRACT_CHECK: “The boundary: anything assertable over HTTP is a scenario here, never a manual step there.” |
| D, orchestrator / devshell | `7be3379` / `31a0a2d` | UNIVERSE_STATE: “A change to the route's operations, to the predicates the planner evaluates, or to the provenance it records, changes this file in the same commit.” ACCEPTANCE: “A step must not depend on what a model chooses to emit.” |
| E, devshell | the commit carrying this report | pinned-revs: “Push a branch before pinning it.” CONTRACT_CHECK: “The boundary: anything assertable over HTTP is a scenario here, never a manual step there.” |

Two grounding conflicts were reported and the operator approved the corrections
before implementation. Initial precondition proposals use durable rejection;
finite snoozes apply to `precondition_review` critiques of already-admitted
requirements. Step 12 now uses Reject, Reason and Confirm reject and reads the
durable warning. It reports whether the proposal left the queue. A sound
proposal remains in Review; no candidate is an explicit outcome. Live acceptance of finite
snoozes remains outstanding. Admitting a requirement and running an
extra advisor would change the rehearsal's decision and still could not promise
a critique, so that alternative was not introduced.

UNIVERSE_STATE requires contract changes in the implementation commit. Section A
therefore includes the essential route contract; D adds the preview and design
context. Leaving all documentation for D would break the same-commit rule;
combining A and D would break the ticket's section-commit rule. The route uses
its existing `PATCH /universe-state` method; the prompt's references to POST do
not introduce another method or path.

## A: the manual target grammar

The five refused first key segments are `facts`, `numeric_values`,
`set_memberships`, `event_markers` and `affect`. The guard covers `set_fact`,
`set_numeric`, `increment_numeric`, `decrement_numeric`, `add_membership` and
`append_event_marker`, before any store write. One code,
`universe_target_namespace_invalid`, has two exact message templates:

```text
Key segment `{segment}` names a collection; the collection comes from the panel, not the key. The target would be `{target}`.
Key segment `affect` is reserved for intrinsic affect, which organization_mode and worker_mode refuse. The target would be `{target}`; the collection comes from the panel, not the key.
```

The first template is used for each of the four collection names. The second
explains core's intrinsic-affect namespace semantics. In each, `target` is the
complete attempted target; `segment` is its first key segment. No diagnostic
or comment attributes the grammar to an operator's mistake.

Later segments named `facts` or `affect` remain valid. Singular `fact` remains
valid. The broader controlled subject vocabulary in UBU-D0243 is knowingly
unenforced and its gap remains open. No migration runs. Existing doubled and
reserved keys remain readable, offered by `targets()` and evaluable; legacy
`clear_fact`, `clear_numeric` and `remove_membership` work. Core and Task effects
retain their mutation semantics, which the runner uses to stage an invented
legacy fixture entirely through existing HTTP contracts.

Four new in-process route tests cover the five-by-six refusal matrix with
exact messages and no empty seed, later-segment acceptance in all four
collections, whole-batch atomicity on an existing state, and legacy read,
vocabulary, evaluation and cleanup. Two existing intrinsic-affect tests were
updated because manual writes are now narrower even in user_mode; their
organization/worker mode assertions retain the existing core diagnostic.
New event-marker fixtures use core's existing object payload and `equals`
evaluation; set membership uses `member_of`. No predicate was added.

## B: complete target previews

Each preview uses the exact `.trim()` used by the mutation builder and the
same `<code>` form as the tables. Event markers remain read-only and have no
key input. No client warning or validation was added; the server refusal is
rendered by the existing diagnostic UI.

| Field | Correct invented key → preview | `affect.energy` → preview |
|---|---|---|
| Facts | `kettle.descaled` → `facts.kettle.descaled` | `facts.affect.energy` |
| Numbers | `shelf.jars` → `numeric_values.shelf.jars` | `numeric_values.affect.energy` |
| Sets | `toolbox` → `set_memberships.toolbox` | `set_memberships.affect.energy` |

Typing `fact.kettle` under Facts displays `facts.fact.kettle` unchanged. Two
new UI tests check live trimmed previews without sending a mutation, and
server refusal rendering with the draft and stored entries retained.

## C and D: changed copy-back wording

The final list's changed items are reproduced verbatim:

```text
1. From step 7: the six counters with their numbers, the sentence that
   begins “N events had no colour.”, and each diagnostic code in the grey
   box with how many lines carry it, or “no diagnostics”. Do not expand or copy the list behind “The N events with no colour”.
```

```text
2. From step 8: each diagnostic code in the boxes above “Timed placements”
   with how many lines carry it, or “no diagnostics”; the
   “Placements:” count line, and the whole section “Not in this Plan”
   or the words “no such section”.
```

```text
7. From step 12: the candidate count and the first precondition’s words as
   rendered, with no substitution or hand redaction (both requirements for a
   replacement); and “left in Review”, “rejected; proposal left the queue”,
   or “rejection failed” with diagnostic codes and line counts. If none
   appeared: “no candidate appeared, so nothing was rejected”, with diagnostic
   codes and line counts, or “no diagnostics”.
```

The step 7 instructions likewise request each grey-box diagnostic code and
how many lines carry it, or “no diagnostics”, without transcribing sentences.
Step 8 does the same for coded boxes above Timed placements, retaining the
Placements count line and the whole Not in this Plan section. Step 12 asks for
the words as rendered and the durable rejection outcome, including “no candidate
appeared, so nothing was rejected”. Its existing diagnostic codes remain.
The final counts are **13 steps and 8 copy-back items**. Step 11's load-bearing
paragraph prohibiting a UniverseState value, key or table row in copy-back is
byte-for-byte unchanged. No substitution or replacement rendering was added.

ACCEPTANCE records the operator's waiver verbatim and explicitly supersedes
P1B-62's forward placeholder rule for his own live rehearsal transcription.
It does not waive repository privacy. Bulk transcription has shortened four
rehearsals; code/count copy-back addresses labour, not privacy. Planning
collision messages name Tasks for recognition on screen, while calendar capture
uses ids for bulk reading. Both families are correct and unchanged. Nothing
is retired. Their wording, Plan and capture behavior, colour partition, advisor
schema, candidate kinds and review snoozes remain unchanged.

## Validation and runtime

| Check | Before | After |
|---|---:|---:|
| orchestrator full suite | 580 | 584 |
| UI full suite | 174 | 176 |
| store full suite | 110 | 110 |
| orchestrator unique Clippy warnings | 8 | 8 |
| devshell runner scenarios | 27 | 28 |
| runner requests | 516 | 527 |
| schema fixtures, valid / invalid | 91 / 110 | 91 / 110 |
| stage-only harness seeds / manual steps | 11 / 1 | 11 / 1 |
| live rehearsal steps / copy-back items | 13 / 8 | 13 / 8 |
| OpenAPI paths | 56 | 56 |
| `endpoints.ts` endpoint constants | 43 | 43 |

Baseline orchestrator tests and Clippy were rerun before implementation.
The after counts above were measured in this ticket: full orchestrator, UI and
store suites, schema fixture validation, Clippy, the complete HTTP runner and
the stage-only harness all passed. UI production build passed. There are no new
unique Clippy warning pairs. OpenAPI regeneration is byte-identical to baseline,
and both generated OpenAPI copies and `src/api/endpoints.ts` are unchanged.
No dependency, manifest, lockfile, route, OpenAPI path, predicate or candidate
kind changed. `planning_service.rs` and `PreconditionWords.tsx` are byte-for-byte
unchanged.

The complete runner passed:

```text
RESULT: 28 of 28 scenarios passed, 0 failed, 2 skipped, 527 requests, all to 127.0.0.1
```

The two skips are live Google and live Ollama; neither ran or proves anything
about those services. The staging harness passed:

```text
staged and checked 11 seed(s) for 1 step(s); not waiting for the app
```

Node and shell syntax checks passed. `scripts/check-all.sh` completed with
exit 0, including patch-generator regressions and the standing boundary and
mock GitHub diagnostics. Its inventory was taken with the pending section E
pin edits, before this report's commit; final tree cleanliness is checked
after committing E. The standing fixture demo remains QUARANTINED and did not
run, so it is not counted as a pass.

Every Cargo build/test/check invocation used the existing `scripts/env.sh`,
one Cargo job, offline dependencies and sequential execution across repositories.
No `env.sh` constraint was relaxed. No OOM occurred. The sandbox initially
refused the runner's loopback bind before any request; the authorized mock
runner and staging harness then passed with loopback permission. This changed
no build setting and enabled no live service. An invocation made from the
parent directory refused its default target path; rerunning from the repository
restored the existing configured target root, without relaxing a constraint.

## Privacy and boundaries

All added fixtures, tests and documentation examples are invented and contain
no real Task title, description, event id, fact key or fact value. The operator's
own key is absent from every outgoing commit, message and addition. No real
calendar, Quick UbU data, credential or operator store was opened. Protected
local acceptance artifacts remain ignored and untracked; neither their names
nor contents occur in outgoing commits. The pre-push audit checked those
names using only local exclusion metadata, without opening the artifacts.
No machine-specific path is committed. No password-hygiene agent was invoked
or given input. Credentials remain outside canonical StateStore.

Orchestrator tests stay in-process and use no live model or external HTTP,
process spawn, signal handler or editor. UI tests retain their mocked plugin
transport. The exempt devshell runner uses its own mock orchestrators,
loopback stubs and throwaway stores. No model-committee ranking was run.

Operator acceptance has not been performed; the step under test is whether the whole document can be reported without bulk hand transcription.
