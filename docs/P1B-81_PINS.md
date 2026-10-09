# P1B-81: seeded rehearsal ranking and the planner gate

## Grounding, corrections and governing sentences

All twelve repositories began clean on main. P1B-80 is merged to main and
origin/main in design, devshell, orchestrator and kernel. Only design and
devshell change; the other ten repositories retain their exact baseline heads
and clean working trees.

The governing ACCEPTANCE rule 11 sentence is:

> A manual instrument has one line of execution.

Ranking is one optional private input on that line. Supplied input is applied;
absence is recorded, without a new flag, prompt, retry, comparison branch or
judgment. The separate pre-flight remains readiness, not a rehearsal. Calendar
approval remains the existing deliberate human choice.

Five grounding corrections were approved before implementation:

1. Unranked eligible Tasks still produce task_priorities rows. Missing ranking
   input is not missing response data. Report actual rows and bucket metadata.
2. One eligible Task produces one synthetic bucket and no pairwise statement;
   it cannot acquire a canonical rank and remains unranked.
3. Static Tasks can participate in server layering. Excluding them is this
   rehearsal's policy, not a restriction attributed to the orchestrator.
4. generatePlan returns only the Plan. The new scenario uses the existing call
   helper directly to inspect the full response without changing old callers.
5. Inserting after Preferences would create scenario 12. The new scenario is
   appended as 37, keeping every existing scenario's number and bytes unchanged.

The operator additionally fixed the plan-line semantics: row count; bucket_count
as the rows' shared value; ranked as rows with a bucket; unranked as rows without;
missing_task_priorities only when the field is actually absent. The absent-ranking
test expects real unranked rows with bucket_count 0. Non-mandatory Static Tasks
can contribute those rows, so this line never substitutes the smaller client
ranking selection for the server's explanation. No operator Task count, title,
seed or layer count is turned into a fixture.

| Section | Governing sentence from required reading | Application |
|---|---|---|
| All | ACCEPTANCE rule 1: “A manual step may not verify what the runner or a ubu-ui test already asserts.” | Deterministic ranking and projection checks remain automated. |
| All | ACCEPTANCE rule 10: “A manual step exists only for rendering.” | No new manual tally, comparison or transcription. |
| All/A | UBU-D0009: “If the user provides an ordinal ranking, UbU compiles it immediately into pairwise Preference objects.” | The stand-in emits pairwise statements, never kernel value declarations. |
| A | PLANNING_PRIORITY: “Planning continues. A node's bucket is its longest-path depth from the best layer.” | Chains of merged indifferent groups produce dense buckets, verified by the server scenario. |
| A | UBU-D0282: “A Task is ranked if at least one enabled Preference relates it to another eligible Task.” | The singleton remains unranked; indifference is enough for larger one-bucket cases. |
| B | live-rehearsal: “Real operator instrument, never executed by checks. Tests inject all effects.” | No test executes the real CLI or gains a live/process/signal effect. |
| B | live-rehearsal-report: “Public projection: never serialize an API object, arbitrary string, or key.” | Fresh integer/count/closed-value projections only. |
| B | live-rehearsal-private: “Private presentation has no import, callback or output connection to PublicReport.” | Titles are printed only privately and remembered for judgment screening. |
| B | PREFERENCE_AUTHORING: “The client cannot supply attribution, IDs, acquisition dates, or initial enablement.” | No synthetic generator is added to a product route, Setting, flag or UI. |
| C | ACCEPTANCE: “Anything assertable over HTTP belongs in check-ui-contract.mjs, as a scenario, not here.” | The actual unchanged server proves the layering on its own throwaway store. |
| C | CONTRACT_CHECK: “Every scenario starts its own orchestrator on its own ephemeral loopback port with its own empty store.” | Scenario 37 uses the existing isolation/exemption without widening it. |
| D | UBU-D0291: “Ratification is due before the switch.” | Append D0303's planner amendment while preserving the subject gate and historical decisions. |
| D | UBU-D0302: “Keep that distinction visible instead of reporting a live cause that the source does not establish.” | Identify the operator's supplied certification/comparison reading; claim no new measurement or CUDA certification. |
| E | P1B-80 D/E: “blocked_tasks and invalid_tasks now serialize empty arrays, like unplaced_tasks.” | Replace the stale omission finding with the present serialization and priority-field semantics. |
| F | pinned-revs.toml: “Record the expected HEAD SHA here each time an upstream repo lands.” / “Push a branch before pinning it.” | Only the published design inventory revision advances; no consumer pin changes. |

## A: one pure generator, two consumers

scripts/synthetic-ranking.mjs implements the standard 32-bit mulberry32 state
transitions with Math.imul and integer operations, returning floats in [0, 1).
Fisher–Yates shuffles a sorted copy: the Task-ID set and seed, not listing order,
determine the result. Neither caller's array nor canonical Task values change.
No dependency, Rust rule, request-value formula or planner seed derivation is
copied into the generator.

For n IDs, m = min(layers, n). The shuffled IDs are cut into balanced nonempty
buckets, best first, with the remainder assigned to earlier buckets. Statements
come in this exact order: each bucket's consecutive-member a_indifferent_to_b
chain, in bucket order, then an a_preferred_to_b edge between the first members
of each adjacent pair of buckets. There are n - 1 statements for n >= 1 and
none for n <= 1. For n = 0 there are no buckets; for n = 1 there is one proposed
bucket but no admitted pairwise ranking.

| Tested n | Requested layers | Buckets | Statements |
|---|---|---|---|
| 0 | 1 | 0 | 0 |
| 1 | 64 | 1 | 0 |
| 2 | 1 | 1 | 1 |
| 2 | 64 | 2 | 1 |
| 7 | 3 | 3 | 6 |
| 12 | 4 | 4 | 11 |
| 10 | 64 | 10 | 9 |
| 65 | 64 | 64 | 64 |

Pure tests assert repeated inputs give identical statements, reversed listings
give identical statements, seed 8 differs from seed 7, input arrays are unchanged,
and PRNG output remains in range at both u32 endpoints. They check balanced
membership, exact chain/bridge order, two distinct in-set subjects per statement,
and no misplaced or omitted member.

## B: admission, truthful public counts and private titles

The optional ranking object accepts exactly seed and layers, with three new
driver input rules and safe structural field paths:

| Rule | Field | Requirement |
|---|---|---|
| ranking_object_required | ranking | object, not null/array/scalar; no extra keys |
| ranking_seed_u32 | ranking.seed | integer 0–4294967295, required |
| ranking_layers_1_to_64 | ranking.layers | integer 1–64, required |

The existing liveConfig/pre-flight validates these before any effect. Invalid
supplied names/values never enter the fault context or public file.

Between capture and planning, ranking_lookup performs GET /tasks with the existing
read schema and status=active. The relevant row fields and unique IDs are checked;
malformed lists stop with action_request_failed, action ranking_lookup, the closed
HTTP/diagnostic cause and the existing invalid JSON/field shape check. Planned,
non-occurrence Tasks are selected. Static exclusion remains deliberate rehearsal
policy; server eligibility is not reconstructed here.

ranking_statement sends one POST /preference per generated statement, in fixed
order, with only schema_version, task_a, task_b and order. Every statement requires
HTTP 201. A refusal stops before planning with the response's closed cause, and
the partial block retains attempts/counts already observed. The summary counts
distinct Task IDs named by successful statements; a failed run does not claim
the unadmitted Tasks were ranked. Proposed bucket cardinality is separately the
generator's count. Individual attempts remain in Observed action attempts and
are never collapsed into that summary.

Missing ranking uses the existing private_input_missing skip. The one added
safe skip is no_eligible_tasks. A singleton attempts zero statements and reports
zero ranked Tasks; its plan explanation remains an unranked row with zero buckets.

The successful eligibility/privacy fixture renders these exact public lines:

```text
GET /tasks ranking_lookup HTTP: 200; outcome: response_observed
GET /tasks ranking_lookup tasks: 4; eligible (placement=planned, not occurrence): 2 (client-computed cardinalities; ids/titles withheld)
POST /preference ranking: seed 7; layers requested 2; buckets 2; ranked Tasks 2; statements attempted 1; HTTP 201: 1 (operator-chosen integers and client-computed counts; Preference ids withheld); source: synthetic_stand_in
```

A separate injected Plan-response fixture, containing four rows with two buckets
present and two absent/null, renders the plan line as:

```text
POST /planning/generate task_priorities: 4 (client-computed cardinality); bucket_count: 4; ranked: 2; unranked: 2 (client-computed from the rows' shared bucket_count and bucket presence; values withheld); ranking_input: unavailable
```

unavailable there means that this isolated projection record supplied no driver
input-presence metadata. Actual runActions records report ranking_input as
synthetic_stand_in or not_supplied. The absent-ranking flow renders:

```text
POST /planning/generate task_priorities: 3 (client-computed cardinality); bucket_count: 0; ranked: 0; unranked: 3 (client-computed from the rows' shared bucket_count and bucket presence; values withheld); ranking_input: not_supplied
```

Only an absent field prints task_priorities: missing_task_priorities. Empty arrays
count zero rows, ranked zero and unranked zero, but have no shared bucket_count to
invent. A malformed field prints invalid_task_priorities; malformed row metadata
is unavailable. Inconsistent bucket_count values have no shared value and are
reported unavailable rather than taking the first or largest. Optional absent
and null buckets both mean unranked; valid present buckets mean ranked.

After all statements, PrivateRenderer prints Synthetic ranking (seed S), best
first: and one titled line per bucket, remembering each title for judgment privacy.
The private ranking is not printed prematurely if admission fails. No title,
Task ID, Preference ID, diagnostic message or value float reaches render().
Canary and one-field mutation tests prove the integer/count projections are fed
only by their corresponding observed fields. The existing order test now covers
both new actions, while preserving explicit calendar approval and versioned PATCH.

Both consumers generate only inside throwaway stores. The live CLI requires an
absent store/WAL/SHM and owns its orchestrator; it never attaches to a real store.
The runner creates its own store and scrubbed process environment. Native
Preferences still carry user_defined/user provenance, so the public block and
documents identify synthetic_stand_in explicitly. No product generator, new
attribution field, route, Setting, binary flag or UI control is introduced.

## C: the unchanged server proves dense layering

Scenario 37 captures twelve Invented ranked Tasks, each with a fixed 15-minute
estimate, calls seed 7/layers 4, admits all eleven statements and lists eleven
Preferences. It reads the full planning response with the existing request helper,
asserts every Task has exactly one explanation, bucket_count 4 on all rows, each
bucket equals the generator's proposed membership, and exact contract values
1.0 - 0.9*p/3 with the bottom endpoint explicitly 0.1. No tolerance is introduced.
There is no preference_cycle or preference_ignored_unknown_task diagnostic.

The server returned these rows in this run; titles are invented fixture labels:

| Invented Task | Bucket (zero-based) | Shared bucket_count | Server value |
|---|---|---|---|
| Invented ranked 01 | 3 | 4 | 0.1 |
| Invented ranked 02 | 1 | 4 | 0.7 |
| Invented ranked 03 | 2 | 4 | 0.4 |
| Invented ranked 04 | 0 | 4 | 1.0 |
| Invented ranked 05 | 2 | 4 | 0.4 |
| Invented ranked 06 | 1 | 4 | 0.7 |
| Invented ranked 07 | 2 | 4 | 0.4 |
| Invented ranked 08 | 0 | 4 | 1.0 |
| Invented ranked 09 | 1 | 4 | 0.7 |
| Invented ranked 10 | 3 | 4 | 0.1 |
| Invented ranked 11 | 0 | 4 | 1.0 |
| Invented ranked 12 | 3 | 4 | 0.1 |

The proposed generator was not adjusted to match these results. The same ID set
listed in reverse gives deep-equal statements; seed 8 gives different statements.
Replay is deterministic for the same ID set, not a promise that newly minted
handles in another store are the same inputs.

The existing 36 scenario implementations and helpers remain byte-identical after
removing the one pure import and appended scenario. Scenario 37 adds 25 requests:
twelve captures, eleven statements, one Preference list and one Plan generation.
CONTRACT_CHECK now lists 37 scenarios, including the previously missing current
row 36, and its example is replaced with the actual result:

```text
RESULT: 37 of 37 scenarios passed, 0 failed, 2 skipped, 694 requests, all to 127.0.0.1
```

This is synthetic layering evidence through the existing loopback exemption.
It is not the operator's week, real Google/Ollama access, CUDA certification,
planner-quality measurement or operator acceptance.

## D: D0303 records the operator's gate decision

UBU-D0303 is Accepted, amending the planner exit conditions of D0275 as restated
by D0291. It records the operator's 2026-10-09 reading that greedy Stage 1
certification on the operator's own week, under the CPU tensor-worker profile,
discharges the planner condition. CUDA parity is not certified or an exit
condition. The ChunkedSweep GPU mirror is deferred: the supplied offline finding
is identical schedules under uniform values, at most three of 42 Dynamic
placements differing under dense seeded values, while ranking moves 40–42.
Revisit only when a measured input separates the strategies; no switch date is set.
This ticket adopts the supplied evidence/decision and makes no new such measurement.

The rewritten DESIGN §4.2 sentence is:

> The switch waits on ratification or retirement of every provisional subject root before the store becomes non-disposable (`UBU-D0291`); the planner condition is discharged by the greedy Stage 1 certification under the CPU tensor-worker profile (`UBU-D0303`). No switch date is set.

DECISIONS retains its entire previous byte prefix, including D0275/D0291 and
their consequence bullets. Only D0303 is appended, with a unique identifier;
Open Questions remain byte-identical. The previously named D0291 append-only-marker
retirement gap remains: roots with such references cannot use ordinary retirement.
No clearing operation, automatic promotion, new gap decision or switch lock is added.

## E: the stale paragraph now describes the wire

LIVE_REHEARSAL_DRIVER's rewritten paragraph is:

> Empty JSON arrays project 0; absent collections project missing_<field>, and malformed collections invalid_<field>. unplaced_tasks, blocked_tasks and invalid_tasks now serialize alike, including empty arrays, following P1B-80. task_priorities is omitted when empty; only an absent field projects missing_task_priorities. Unranked eligible Tasks still have explanation rows with bucket_count 0 and no bucket. Producers print selected_tasks as the cardinality of selected[] Tasks, with the actual request.limit beside it.

The same reference also corrects its stale fault-only paragraph to the actual
P1B-80 partial-block behavior, needed for failed ranking admissions. Behavior
does not change: early pre-report failures retain the named reason/remedy alone.
The input/rule tables, action order, stand-in boundary and LIVE_REHEARSAL optional
ranking field are documented; ACCEPTANCE adds no manual steps of its own.

## Verification and F: both kinds of pin

| Check | P1B-80 baseline | P1B-81 after |
|---|---|---|
| Pure driver | 73 | 82 passed; nine new tests, no skips |
| Runner | 36/36, 669 requests, two live skips | 37/37, 694 requests, two live skips |
| Standing check-all.sh | required | passed; existing fixture-demo quarantine unchanged |
| Kernel Rust | 125 | unchanged baseline; exact repository head/tree retained |
| Orchestrator Rust | 650 | unchanged baseline; exact repository head/tree retained |
| UI | 220 | unchanged baseline; exact repository head/tree retained |
| Owned worker with pinned CPU Torch | 35 | unchanged baseline |
| Pytest with Torch 2.6.0+cpu | 58 | unchanged baseline |
| Pytest without Torch | 39 passed / 19 skipped | unchanged baseline |
| Kernel / orchestrator Clippy | 0 / 8 distinct (9 orchestrator occurrences) | unchanged baseline |
| OpenAPI / endpoint constants | 56 / 43 | 56 / 43; OpenAPI byte-identical |
| Closed-code vocabulary | 279 | 279; source agreement passed |
| live-rehearsal-validation.json | existing Rust fingerprints | byte-identical |

The unchanged Rust/UI/worker/pytest/Clippy figures are P1B-80 verified baselines,
not a claim that all those complete suites were rerun for this JS/documentation
ticket. The required standing checks run their existing selected Rust/worker
tests; the ordinary environment reports explicit Torch/Python skips. P1B-80's
separate pinned CPU Torch 2.6.0+cpu profile had 35 worker tests and 58 pytest tests
without skips; its absent profile had 39 passes/19 skips. No environment is
installed, changed or probed against live services here.

Only the runner build and standing check-all Cargo invocations run, after env.sh,
one job at a time and sequential across repositories. Nonblocking flock,
MemoryHigh=16G/MemoryMax=20G and build/compute exclusion stay byte-identical.
No live rehearsal CLI, real Ollama/Google/editor, new unit-test process/signal
effect, handler, model-committee rank, package installation or download occurs.
Outgoing privacy audits keep the protected local artifact contents and filenames
out of commits without opening or printing them; no machine-specific path is added.

Only ubu_design's inventory entry advances, after publication. Every other entry
matches its unchanged repository head and a published origin branch:

| Inventory key | Full published revision | Disposition |
|---|---|---|
| ubu_schemas | 070d0a6f9a6ad7833dd523042925008316ce923b | unchanged |
| ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b | unchanged |
| ubu_store | 83a099f55220b1286ffb2dee3c9d19006e2090b5 | unchanged |
| ubu_planning_kernel | 464b4924cd114c64dd1e2fc8ae98bae3e5bba04d | unchanged |
| ubu_github_adapter | e14a43b47aeb0a928f4dfdc83cd78ea9a2e044f6 | unchanged |
| ubu_orchestrator | 164f6c4db27462e10c399d4406d0f2bd2c4e71c0 | unchanged |
| ubu_ui | 649f8e117a3eec08b5f8581885b06999d187f8a3 | unchanged |
| ubu_design | 51345d377cd363233773f667832dd0944a886e34 | advanced from 63cd428eaf896755ccb9b7ab6de0a9b894b24d76 |
| ubu_brand | faf2005a8bd9e64742dd76ee6d1f91f45223946b | unchanged |

Every Cargo revision and lockfile remains unchanged. The three orchestrator
kernel consumer revisions remain 8653cf2bbe96cd7cf0337fd857881be6665d1ceb;
inventory and consumer pins retain their distinct purposes.

Both changes publish on p1b-81-seeded-ranking, without force-push or merge.
All twelve working trees are clean and both changed heads equal their published
upstreams. All nine inventory entries match published heads. Merge to main and
the subsequent push are reserved for Claude after this run, not this agent or
the operator. No operator acceptance or private request replay is performed.

Operator acceptance has not been performed; it is one pre-flight plus one rehearsal with ranking supplied, and what is under test is whether a seeded ranking produces a value-ordered week whose block reports it as a stand-in.
