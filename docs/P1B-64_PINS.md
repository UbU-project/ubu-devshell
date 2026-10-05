# P1B-64 pins and verification

The model's precondition format now offers only predicates supported by the
current vocabulary, enforces each expectation's presence and kind, and bounds
the tree to three levels. The controller refuses independent proposals
independently and explains each refusal without echoing the model's values.
Evidence refs name the fields actually supplied. Automated verification has
passed; operator acceptance remains outstanding, so P1B-64 is not complete.

All twelve repositories began clean on `main`. Fresh fetches confirmed P1B-63
was merged in orchestrator, UI and devshell at the required heads. Orchestrator
and devshell use `p1b-64-the-model-is-told-what-the-validator-accepts`; the ten
other repositories remain read-only at their baseline heads. No main merge or
force-push was performed. Each lettered section has one commit per affected
repository. Orchestrator commits have no Co-Authored-By trailer; devshell
commits carry the required trailer.

## Revisions and unchanged pins

| Repository | Final revision |
|---|---|
| orchestrator | `ddb10f1a81e56a175948bb46534b747948073ccf` |
| devshell | the section F commit carrying this report |
| UI, unchanged | `07d34817867907274560ccab3f5464c32320cf59` |

Only `ubu_orchestrator` changes in `pinned-revs.toml`, with its test/path counts
in the comment. The upstream branch was pushed before pinning. There is no
devshell self-pin. UI and these five chain pins did not move:

| Pin | Unchanged revision |
|---|---|
| `ubu_schemas` | `02e4c91ce149ef594f1d08408216097b48dd7afb` |
| `ubu_core` | `c4b624d76f210f77f865c61801e02c89219763ce` |
| `ubu_store` | `9e471a46b357f99cff567c250ae59084a6768b52` |
| `ubu_planning_kernel` | `8af10ece07043c307fe351ac867cfd8449e08c4f` |
| `ubu_github_adapter` | `50fae565e6d48fb5c41107ab3259096ad243ccf3` |

The `ubu_core` manifest rev remains
`c4b624d76f210f77f865c61801e02c89219763ce` in its four consumers. No new
dependency, manifest/lockfile change, route, OpenAPI path, candidate kind or
predicate was introduced. The limit of 25, capture contract, review snoozes,
colour partition and Plan behavior remain unchanged.

## Sections and governing sentences

| Section | Commit | Governing sentence read before implementation |
|---|---|---|
| A, orchestrator | `905f529` | ADVISORY: “Proposals never mutate canonical Task state. The advisor only enqueues candidates; admission is an explicit operator act.” |
| B, orchestrator | `27a3956` | ADVISORY: “Arbitrary model text, expected values and descriptions are not copied into this diagnostic.” |
| C, orchestrator | `59ba48f` | ADVISORY: “The model receives Task IDs, titles with or without descriptions, and the current supported UniverseState target names, not its values or provenance.” |
| D, devshell | `1773f35` | CONTRACT_CHECK: “The boundary: anything assertable over HTTP is a scenario here, never a manual step there.” ACCEPTANCE: “A step must not depend on what a model chooses to emit.” |
| E, orchestrator / devshell | `ddb10f1` / `1c4ded7` | ADVISORY: “The controller validates before enqueueing, even for injected transports.” ACCEPTANCE: “A step must not depend on what a model chooses to emit.” |
| F, devshell | the commit carrying this report | pinned-revs: “Push a branch before pinning it.” CONTRACT_CHECK: “The boundary: anything assertable over HTTP is a scenario here, never a manual step there.” |

A changes `src/services/precondition_advisor.rs`,
`src/services/advisory_wire.rs`, `tests/precondition_producer.rs`, and adds
`tests/precondition_schema.rs` (three tests). Target partitions are derived
beside the vocabulary in the producer. Empty membership/number partitions add
no branches. The wire delegates its format to the producer's schema builder.
Existing producer coverage now asserts the numeric branch's four comparisons
rather than the superseded seven-predicate enum.

B changes `src/services/precondition_advisor.rs`, updates the existing refusal
test in `tests/precondition_producer.rs` to assert `ok` and the new code, and
adds `tests/precondition_refusals.rs` (seven tests). The validator's accepted
set is unchanged. Valid siblings survive; existing diagnostics are appended
to, never replaced in this producer. Refusals, rechecked ineligible Tasks and
missing-target Tasks each name three before counting the rest. The mixed batch
test proves the only store writes are the two candidate enqueues and their
ordinary mutation-envelope entries.

C changes `src/services/advisory_wire.rs` and adds
`tests/precondition_evidence.rs` (two tests). A title-only candidate names only
`<task-id>:title`; a described candidate names title and description. This
records supplied fields, not an assertion about the model's hidden reasoning.

D changes `scripts/check-ui-contract.mjs`, `scripts/check-ui-contract.sh`,
`docs/CONTRACT_CHECK.md` and `docs/LIVE_REHEARSAL.md`. Scenario 27 observes the
facts-only format, deliberately returns two valid proposals and one equals
leaf without expected, and proves two candidates survive with `ok` status and
one diagnostic naming the third Task. Canonical Tasks and UniverseState do
not change. Scenarios 24 and 26 retain their assertions and needed no fixture
correction: their existing numeric proposals already satisfy the new format.
Step 12 adds the new refusal code, distinguishes an undecodable response,
and explains: “Facts alone offer ‘is’ and ‘is not recorded’; a number also
offers the comparisons.” Its position, fact authoring, “Leave it in Review for
this rehearsal” and all eight redacted copy-back items are unchanged.

E changes `docs/ADVISORY.md` and `docs/ACCEPTANCE.md`. Both document the schema
contract, independent refusals and the approved corrections below, with their
reasons and alternatives. Nothing is retired and no vocabulary advisor is
added. F changes only `pinned-revs.toml` and this report.

## Grounding conflicts, approved corrections, and alternatives

Implementation stopped at the required grounding check. The operator then
approved these corrections and required the reasons and alternatives to be
documented explicitly:

| Correction | Why needed | Why chosen over alternatives |
|---|---|---|
| A safe subset, with the existing validator preserved | UNIVERSE_STATE documents facts as “any JSON value”; core and the existing validator accept object/array equals expectations. The ticket's scalar-only and shallower schema cannot have the same accepted set. | Narrowing the validator would restrict existing authoring/admission. Expanding the grammar to all JSON expectations and the outer depth would abandon the small grammar the ticket requested. A safe subset preserves those contracts and states the relationship honestly. |
| Three tree levels, ten children per group | Depth alone does not enforce the validator's global 128-node bound. Retaining 128 children permits oversized shallow trees. | The largest offered tree has `1 + 10 + 100 = 111` nodes. Full depth-16 expansion or an exact 128-node-budget grammar would add many branches for little operator benefit. This simple finite grammar stays readable and fits the outer guard. |
| “the predicates allowed by the response schema” | Keeping the old phrase “the seven allowed predicates” would contradict facts-only vocabulary's two predicates. | Correct this one phrase while preserving the remaining system sentences. Rewriting the whole prompt would alter unrelated constraints; keeping seven would misstate the contract. |

Schema membership is therefore sufficient for validation against a matching
current vocabulary in this MVP user-mode instance. Validator refusal implies
schema refusal. Validator acceptance does not imply schema acceptance: the
scalar, depth and breadth restrictions are deliberate conservative exclusions.
The model grammar has three levels, root depth zero and leaf depth at most two.
The validator's depth 16 and 128-node limits are unchanged.

The prompt also drops exactly the two sentences about collection restrictions
and expected presence because the grammar now enforces them. A baseline
comparison verified every other sentence is verbatim, apart from the approved
predicate phrase. There are seven core predicates and two facts-only predicates,
so five are omitted, correcting the ticket's incidental “three fewer” arithmetic.

Existing oversized-response rejection retains `advisory_result_too_large` and
its `rejected` status. This ticket changes tree refusals within a decoded
proposal result; it does not redefine transport failure statuses. A response
that cannot decode as proposals still yields `advisory_malformed_result` and
`malformed_result`.

## The representative tree table

Each row is tested against the built format schema and `validate_tree`, over
matching invented facts, numbers, memberships and event-marker targets. Schema
membership uses an independent, dependency-free interpreter of the actual
JSON Schema keywords; it contains no predicate or collection logic and starts
no process. Unrecognized schema keywords fail the test rather than being ignored.

| Tree case | Schema | Validator |
|---|---|---|
| equals with scalar expectation | accepts | accepts |
| absent with no expectation | accepts | accepts |
| **equals without expected** | refuses | refuses |
| **comparison over facts** | refuses | refuses |
| absent with an expectation | refuses | refuses |
| null expectation | refuses | refuses |
| numeric comparison with a string | refuses | refuses |
| membership over facts | refuses | refuses |
| membership with object / array expectation (two cases) | refuses | refuses |
| empty group | refuses | refuses |
| group without an array | refuses | refuses |
| mixed all_of / any_of keys | refuses | refuses |
| unknown leaf key | refuses | refuses |
| unknown predicate | refuses | refuses |
| unknown target collection | refuses | refuses |
| non-string target | refuses | refuses |
| bad branch hidden behind a satisfied alternative | refuses | refuses |
| root group containing groups of leaves | accepts | accepts |
| four levels | refuses | accepts |
| equals with object / array expectation (two cases) | refuses | accepts |
| eleven children, within validator bounds | refuses | accepts |
| largest schema tree, 111 nodes | accepts | accepts |
| 131 nodes | refuses | refuses |
| each of four comparisons over a number (four cases) | accepts | accepts |
| membership with string / number / boolean (three cases) | accepts | accepts |

There are 32 representative trees. The two bold cases are the shapes identified
in the ticket's explanation of the operator's red box; no real model output
was inspected or committed. Separate tests verify partition omission,
scalar types, required keys, and forbidden expected on absent.

## Reason enum and exact diagnostic text

The code is `precondition_proposal_refused`. A named diagnostic uses this exact
wrapper around each reason below:

```text
Task `<id>`: <reason>. No candidate was enqueued for this Task; the rest of the run stands.
```

| TreeRefusal variant | Reason text |
|---|---|
| `BoundExceeded` | the tree exceeds 128 nodes or depth 16 |
| `InvalidGroup` | the tree must contain leaves or single-key boolean groups with non-empty arrays |
| `MissingLeafFields` | a leaf requires string target and predicate fields |
| `UnknownLeafFields` | a leaf has an unrecognised target, predicate or key |
| `ExpectedRequired` | this predicate requires an expected value |
| `ExpectedForbidden` | absent forbids an expected value |
| `TreeDeserialization` | the tree cannot be decoded without losing fields |
| `NullExpectation` | a null expected value cannot be represented by this precondition |
| `ModeRefusal` | this instance mode does not permit an intrinsic-affect target |
| `EvaluatorRefusal(String)` | core's code-authored message after strict leaf checks; for example, at_least expected value must be a finite number |
| `InvalidTaskReference` | the proposal must reference exactly one Task |

Evaluator tests also cover “member_of requires a set_memberships target”,
“at_least requires a numeric_values target”, and “member_of expected value must
be a JSON scalar”. No value of the wrong kind is printed. Defensive decoding
and Task-reference variants have direct diagnostic mapping tests; real input
cases exercise the reachable shape, bound, expected, null, mode and evaluator
refusals. Every enum variant's exact diagnostic is tested.

After three named refusals the exact aggregate is:

```text
<N> more Tasks had unevaluable proposals; no candidates were enqueued for those Tasks. The rest of the run stands.
```

After three controller-rechecked ineligible Tasks:

```text
<N> more Tasks are no longer eligible: they are inactive, absent, or routine occurrences. Nothing was changed.
```

Neither aggregate contains Task identifiers, targets, descriptions or expected
values. The pre-selection skip wording, missing-target bounds, no-facts guard,
strict shape/evaluator checks, instance mode and admission checks are preserved.

## Facts-only format, verbatim

This is the actual `format` observed by scenario 27, pretty-printed without
changing any JSON value. All three Task IDs were minted in its throwaway
synthetic store; the target is invented. It is neither real calendar data nor
a redacted approximation of the artifact.

```json
{
  "$defs": {
    "group": {
      "oneOf": [
        {
          "$ref": "#/$defs/leaf"
        },
        {
          "additionalProperties": false,
          "properties": {
            "all_of": {
              "items": {
                "$ref": "#/$defs/leaf"
              },
              "maxItems": 10,
              "minItems": 1,
              "type": "array"
            }
          },
          "required": [
            "all_of"
          ],
          "type": "object"
        },
        {
          "additionalProperties": false,
          "properties": {
            "any_of": {
              "items": {
                "$ref": "#/$defs/leaf"
              },
              "maxItems": 10,
              "minItems": 1,
              "type": "array"
            }
          },
          "required": [
            "any_of"
          ],
          "type": "object"
        }
      ]
    },
    "leaf": {
      "oneOf": [
        {
          "additionalProperties": false,
          "properties": {
            "predicate": {
              "const": "absent"
            },
            "target": {
              "enum": [
                "facts.synthetic.lunar_ready"
              ],
              "type": "string"
            }
          },
          "required": [
            "target",
            "predicate"
          ],
          "type": "object"
        },
        {
          "additionalProperties": false,
          "properties": {
            "expected": {
              "type": [
                "string",
                "number",
                "boolean"
              ]
            },
            "predicate": {
              "const": "equals"
            },
            "target": {
              "enum": [
                "facts.synthetic.lunar_ready"
              ],
              "type": "string"
            }
          },
          "required": [
            "target",
            "predicate",
            "expected"
          ],
          "type": "object"
        }
      ]
    },
    "tree": {
      "oneOf": [
        {
          "$ref": "#/$defs/leaf"
        },
        {
          "additionalProperties": false,
          "properties": {
            "all_of": {
              "items": {
                "$ref": "#/$defs/group"
              },
              "maxItems": 10,
              "minItems": 1,
              "type": "array"
            }
          },
          "required": [
            "all_of"
          ],
          "type": "object"
        },
        {
          "additionalProperties": false,
          "properties": {
            "any_of": {
              "items": {
                "$ref": "#/$defs/group"
              },
              "maxItems": 10,
              "minItems": 1,
              "type": "array"
            }
          },
          "required": [
            "any_of"
          ],
          "type": "object"
        }
      ]
    }
  },
  "additionalProperties": false,
  "properties": {
    "proposals": {
      "items": {
        "additionalProperties": false,
        "properties": {
          "id": {
            "enum": [
              "task_01a10c1c1e1f7830a09e0e611ca9b728",
              "task_01a10c1c1e267dd099e3da2a037a90a9",
              "task_01a10c1c1e297a5093eea5d4eeabe463"
            ],
            "type": "string"
          },
          "precondition": {
            "$ref": "#/$defs/tree"
          }
        },
        "required": [
          "id",
          "precondition"
        ],
        "type": "object"
      },
      "maxItems": 3,
      "type": "array"
    }
  },
  "required": [
    "proposals"
  ],
  "type": "object"
}
```

## Validation and runtime

| Check | Before | After |
|---|---:|---:|
| orchestrator full suite | 568 | 580 |
| orchestrator unique Clippy warnings | 8 | 8 |
| devshell runner scenarios | 26 | 27 |
| runner requests | 501 | 516 |
| stage-only harness seeds / manual steps | 11 / 1 | 11 / 1 |
| live rehearsal steps / copy-back items | 13 / 8 | 13 / 8 |
| OpenAPI paths | 56 | 56 |
| `endpoints.ts` endpoint constants | 43 | 43 |

The full orchestrator suite passed. Targeted A/B/C suites passed before their
commits. Clippy completed with the same eight unique `(code, message)` warning
pairs and no new warning. OpenAPI regeneration is byte-identical to baseline.
UI's generated OpenAPI and `src/api/endpoints.ts` remain byte-identical. UI's
174 tests, store's 110 tests and schemas' 91 valid / 110 invalid fixtures are
unchanged baseline counts, not newly claimed full-suite runs in this ticket.

The complete devshell runner passed:

```text
RESULT: 27 of 27 scenarios passed, 0 failed, 2 skipped, 516 requests, all to 127.0.0.1
```

The two skips are live Google and live Ollama; neither ran or proves anything
about those services. The stage-only acceptance harness passed:

```text
staged and checked 11 seed(s) for 1 step(s); not waiting for the app
```

The first workspace check stopped with exit 1 because it ran before the
orchestrator pin was updated; its inventory correctly reported a revision
mismatch, not a test failure. After confirming the upstream push and updating
the single authorized pin, the final check was rerun.

Node syntax checks passed. `scripts/check-all.sh` completed with exit 0. Its
standing fixture demo remains QUARANTINED and did not run; it is not a pass.
`scripts/show-revs.sh` reports `OK` in all nine inventory rows, with clean
trees and origin presence for their pins. Existing unsigned baseline commits
were preserved.

Every Cargo invocation sourced the existing `scripts/env.sh`, used one Cargo
job and ran sequentially across repositories. No `env.sh` constraint was
relaxed; `env.sh` is byte-identical to baseline. No OOM occurred during P1B-64.
Every test model transport is StubTransport. No new Rust test starts a process,
installs a signal handler or invokes an editor. Only the exempt devshell
runner/harness used temporary stores and loopback processes. No live Google,
Ollama, operator calendar or operator StateStore was used.

## Privacy and remaining acceptance

No diagnostic or report echoes an untrusted returned expected value or Task
description. All fixture/test expectations and notes are invented; no
diagnostic, fixture, test or document added by this ticket contains real
calendar data, descriptions, titles or event IDs. Refusal messages are
code-authored, and aggregate messages contain no identifiers or target names.
Protected local acceptance artifacts were not opened or tracked; neither their
contents nor filenames occur in outgoing commits. The privacy audit reads
exclusion metadata and outgoing diffs only. No machine-specific path was added.
Password-hygiene behavior and its input boundary are unchanged; credentials
remain outside canonical StateStore.

Operator acceptance has not been performed: P1B-64 remains incomplete until the operator runs `docs/LIVE_REHEARSAL.md` end to end against their own calendar, completes all 13 steps and reports all 8 copy-back items, with step 12 as the step under test.
