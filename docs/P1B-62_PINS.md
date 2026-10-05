# P1B-62 pins and verification

P1B-62 is the review operation for admitted preconditions. The implementation
was completed on `p1b-62-an-admission-is-open-to-review`; no main merge or
operator acceptance was performed. The initial ticket grounding said that
only three repositories changed and that no schema or store work was needed.
The review envelope and durable contextual suppression required those two
prerequisites; the operator approved the additional store and lockfile
exception, and the schema/store commits are recorded here rather than hidden.
No force-push was used.

## Revisions

| Repository | Final revision |
|---|---|
| `ubu-schemas` | `02e4c91ce149ef594f1d08408216097b48dd7afb` |
| `ubu-store` | `9e471a46b357f99cff567c250ae59084a6768b52` |
| `ubu-orchestrator` | `a8888c2444bf13c4008e855d05f2a416bc48b5ab` |
| `ubu-ui` | `e6b6603ae5c32a530f7f3b38381c383980ae51b2` |
| `ubu-devshell` | this report's section G commit |

The unchanged P1B-61 pins remain in `pinned-revs.toml`. There is no
`ubu_devshell` pin.

## Sections

### A — `ubu-orchestrator`, `9bc93f3`

The reviewer runs once per Task, sends only screen-visible descriptions,
existing preconditions and available targets to the stubbed model, and emits a
candidate only for an actionable replacement or removal. Sound verdicts are
diagnostics. The store assertion proves that the candidate enqueue is the only
write.

Governing sentence from the advisory boundary: “Proposals never mutate
canonical Task state. The advisor only enqueues candidates; admission is an
explicit operator act.”

### B — `ubu-orchestrator`, `7daee90`

Admission has explicit replacement and clear operations. It checks the
reviewed existing tree, Task and UniverseState versions, and uses the ordinary
atomic writer. Clearing a false precondition restores the Task to the next
Plan; rejection leaves it unchanged and records the operator's reason.

Governing sentence from the admission contract: “admission is an explicit
operator act.”

### C — `ubu-orchestrator`, `a8888c2`

Review suppression is keyed by Task, field and the existing value, while the
escalation series is keyed by Task and field. Dismissals are finite snoozes,
never permanent; the policy is 7, 14, 28, 56, 112, 224, 365, 365 days, with
the blocking-now case capped at the seven-day seed. Admission resets the
series. `PolicyReviewInterval` and `UserRequest` are driven; the change effect
of `AcceptedChangeToTargetOrDependencies` comes from the subject key;
`MateriallyNewEvidence` and `ClarificationOrExternalReferenceArrival` remain
unused.

Governing sentence from `docs/ADMISSION_REVIEW.md`: “The blocking-now cap
overrides the escalation and never the reverse.”

### A prerequisite — `ubu-schemas`, `02e4c91`

The review replacement and removal envelopes were added, with valid and
invalid fixtures and the contract update. This was necessary to describe both
trees without introducing a new candidate kind.

Governing sentence from the schema contract: “Cross-file `$ref` values must
use absolute `$id` URIs.”

### A prerequisite — `ubu-store`, `9e471a4`

Context-aware candidate writers now preserve the immutable review decision
context and renew suppression records atomically, allowing repeated finite
snoozes without losing the subject key. Store tests cover the contextual
writer and durable suppression behavior.

Governing sentence from `CANONICAL_WRITER_AUDIT.md`: “Advisory proposals live
only in `advisory_candidates` as candidate state.”

### D — `ubu-ui`, `165f905`, with generated contract refresh `e6b6603`

The queue renders the existing and proposed precondition trees in shared
words, the model's reason, the removal consequence, and the finite defer or
reject choices with the return date and cap. It provides explicit review and
resurface actions. The generated OpenAPI copy was refreshed after the
orchestrator DTOs landed; no route or path was added.

Governing sentence from `NAVIGATION.md`: “Review loads the decision queue on
entry and after explicit actions; it does not poll or start models
automatically.”

### E — `ubu-ui`, `ee5a433`

Today now states the total Plan placements, Skeleton count and Static anchor
count beside Timed placements. Mixed, all-Skeleton, all-Static and empty Plans
are covered, with an oracle that counts the rendered badges.

Governing sentence from `NAVIGATION.md`: “The screen performs no calculation
of that count and adds no diagnostic.”

### F — `ubu-devshell`, `42aa39f`

The deterministic stage-only harness remains at 11 seeds and one manual step;
the loopback runner now has 25 scenarios. Scenario 25 proves removal admission
restores blocked work and a rejected review remains held on the next normal
run. The interim `grep -o 'Skeleton' | wc -l` copy-back method is retained as
history only; section E supplies the counts on the page. The rehearsal remains
13 steps and 8 copy-backs, with no new model-dependent step.

Governing sentence from `docs/CONTRACT_CHECK.md`: “The boundary: anything
assertable over HTTP is a scenario here, never a manual step there.”

### G — `ubu-devshell`

`pinned-revs.toml` records the four changed upstream pins above. The devshell
branch has no self-pin. `show-revs.sh` is the final pin and origin check.

## Validation

| Check | Before | After |
|---|---:|---:|
| schema tests | 2 | 2 |
| valid / invalid schema fixtures | 89 / 103 | 91 / 110 |
| store tests | 108 | 110 |
| orchestrator tests | 530 | 553 |
| UI tests | 161 | 172 |
| OpenAPI paths | 56 | 56 |
| `endpoints.ts` constants | 43 | 43 |
| orchestrator clippy unique warnings | 8 | 7 |
| runner scenarios | 24 | 25 |
| runner requests | 466 | 483 |
| rehearsal steps / copy-backs | 13 / 8 | 13 / 8 |

The runner result was:

```text
RESULT: 25 of 25 scenarios passed, 0 failed, 2 skipped, 483 requests, all to 127.0.0.1
```

The stage-only harness passed all 11 seeds and printed its one existing manual
step. `check-all.sh` was run with the fixture-demo quarantine disabled and
completed with exit 0. Unit and HTTP tests used StubTransport; only the
explicit devshell runner and harness used isolated loopback processes. No live
Google, Ollama, operator store, editor or signal handler was used.

No remaining rehearsal copy-back asks the operator to count rendered badges:
the interim counting command is documented as history, and the Today line is
the authoritative count.
