# P1B-79: enumerated feasibility and occupancy-bounded perturbations

## Grounding, corrections and governing sentences

All twelve repositories began clean on main. The P1B-78 kernel, orchestrator
and devshell heads matched the ticket and were on origin/main. Eight repositories
remain read only. No Compartment scoping, schema, route, public code, framework
profile or default-strategy change occurs.

The operator approved four corrections before implementation:

1. Python independently generates perturbations, so its proposal bound must
   move with Rust's. A Rust-only bound would change schedule matrices on one
   side and fail exact comparison. Three added Python lines mirror occupancy;
   its feasibility predicate, within term and dependency calculations remain
   byte-identical. Removing its disjointness check would permit a double-booking.
2. Python directly indexes prerequisite placements and raises KeyError when
   absent; it does not skip an absent prerequisite and return true. Q0184 records
   that actual asymmetry. Choosing infeasible or incomplete here would answer a
   separate semantic question, so neither calculation changes.
3. static_task_collision also diagnoses ordinary static overlaps, as well as
   dependent/prerequisite conflicts. Judgment 5's narrower description is
   corrected; its existing behavior is preserved.
4. assemble's comparison rule is unchanged relative to the authoritative CPU
   reference. Since this ticket intentionally changes that reference, absolute
   outcomes against the old reference need not remain identical. Keeping every
   old result would defeat the sanctioned generator correction. Every inequality
   against the current reference still refuses.

The two governing sentences are:

> Schema decoding, chunk partitioning, task-slot `validity_mask`, dependency feasibility, hard-constraint feasibility, rejection classes, and CPU-certified selected Plan validity must match exactly.

> Exact comparison covers every padded value, code, mask and omission, not only the final schedule. Never widen a numeric tolerance here.

No tolerance is widened and no inequality gains permission to admit. CPU
authority is retained; the contract definition was published first in f8c8801,
before changing either implementation. The final design head is
ecb1c2654dc8445a04ae403fa4fc33652b6383ce: its follow-up changes only Q0184's
metadata category from my invalid Semantics label to the parser's existing
Data model enum. Enum checks pass; the optional model-committee parser could
not run in the host Python because pydantic is absent. No package is installed,
question is ranked, or answer is recorded.

| Section | Governing sentence from required reading | Constraint applied |
|---|---|---|
| All | UBU-D0283: “When GPU and CPU advisory scores disagree beyond tolerance, CPU certification and CPU reference goldens are the final authority.” | Record the definition first; retain exact certification and CPU authority. |
| A | UBU-D0171: “The design contract specifies the semantic data each stage consumes and produces.” | Enumerate the missing Stage 1 fields and predicate in the contract and amend the accepted decision. |
| A | STAGE1_WORKER: “Arrays pad to those fixed shapes, never ragged lists.” | Change the field's one documentation row, preserving shapes and document structure. |
| B | skeleton: “DESIGN.md §15.2.2: affix all Static Tasks before placing Dynamic Tasks.” | Thread existing occupancy; preserve all placement behavior. |
| B | candidate_generation: “At most fifteen distinct placements per pivot.” / “Integer interpolation makes the bound independent of the size of the schedule window.” | Preserve interpolation, proposal ordering, dedupe and the sixteen-candidate cap. |
| B | chunked partition: “Clip, sort, and union fixed intervals, retaining only nonempty free gaps.” | Use the same occupancy boundary lesson without changing chunked generation. |
| C | assemble's exact-comparison sentence quoted above | Keep comparator, assembly and public/private split byte-identical. |
| D | week_scale: “Shape-only generation. No external input, titles, facts or operator durations.” | Extend that generator with one fixed-seed case; use no operator records. |
| D/E | freeze_stage1: “Explicit developer regeneration; no live data, process or framework.” | Freeze expected values from Rust CPU output, not Python or hand edits. |
| E | Planning Goldens: “These fixtures are not auto-trusted as proof of correctness.” / “They are review artifacts: changes to expected output should be deliberate, reviewed, and tied to an intentional contract or planner behavior change.” | Report every changed expectation and retain exact assertions. |
| F | pinned-revs.toml: “Record the expected HEAD SHA here each time an upstream repo lands.” / “Push a branch before pinning it.” | Advance inventory only after publishing design, kernel and orchestrator. |
| Acceptance | ACCEPTANCE rules 10/11: “A manual step exists only for rendering.” / “A manual instrument has one line of execution.” | Keep LIVE_REHEARSAL.md's one invocation; perform no operator acceptance. |

## A: the definition is recorded before the implementation

Stage 1 now enumerates dependency_feasibility and hard_constraint_feasibility
in its Produces list. Dependency feasibility describes prerequisite completion
at or before dependent starts when prerequisites are present. It does not settle
the missing-prerequisite case.

The hard_constraint_feasibility definition in PLANNING_KERNEL_CONTRACT.md §5 is
the conjunction of:

- plan validity: a non-empty candidate, no Task placed twice, every placement
  with start < end, and every dependency present and earlier in declared order;
- dependency feasibility by time, as reported by dependency_feasibility;
- containment inside the plan window and any Task window, with every declared
  Static anchor matched exactly at the placement's start;
- pairwise disjointness: no two placements overlap. Overlap means
  start < other.end && end > other.start; touching endpoints are allowed.

The document explicitly distinguishes Stage 2's feasible_mask from this Stage 1
field. UBU-D0171 is amended in place with the same enumeration. New UBU-D0301
records that exact parity of a derived field requires an enumerated definition,
and that a parity clause's field must be enumerated at its producing stage. Its
consequence records P1B-79's eleven-ticket history of conforming implementations
diverging under an underspecified contract until live contact exposed it.

UBU-Q0184 asks whether a candidate omitting a prerequisite is infeasible or
incomplete. Rust's false and Python's direct-index KeyError behavior are recorded;
the question remains Open, Human only, unscored, unanswered and unresolved.
STAGE1_WORKER.md changes only its hard_constraint_feasibility table row.

## B/C: each suffix placement is bounded, and disjointness is an invariant

For each suffix placement, maximum_shift is clamped by the gap from its end to
the nearest occupied interval not belonging to any suffix Task and starting at
or after that end, taking the minimum across placements and the existing plan
and Task-window bounds.

SkeletonOutcome returns the existing final occupied vector through a
crate-private field. Recomputing it would duplicate the placement authority.
Intervals retained for any later-excluded affixed Task remain conservative
bounds; none is filtered out. Interpolation, proposal_key, ordering, placement
dedupe and MAX_CANDIDATES are byte-identical after removing the added bound and
its occupancy parameter from the source comparison.

every_generated_candidate_is_disjoint_across_topological_time_interleaving
exercises 64 seeds with both static and dynamic non-suffix occupancy. Declared
order has starts [100, 0, 200], so the occupied interval lies before the suffix's
maximum end and ahead of its earlier placement. Every generated candidate is
disjoint, early shifts stop at the interval, suffix shifts remain uniform and
touching endpoints are actually generated. zero_occupancy_gap_keeps_the_early_step_and_allows_later_suffixes
verifies a zero forward gap prevents that shift without preventing later pivots.

Rust reference_output gains the pairwise disjointness conjunct with the exact
skeleton overlap convention. whole_golden_set_never_fails_hard_feasibility_due_to_disjointness
independently checks all generated golden candidates for disjointness and true
hard feasibility. It never filters a generated candidate to make a golden pass.

Python adds the same bound in proposal generation only. Byte checks removing
those three added lines reproduce the entire original file, including within,
dependency margins, missing-prerequisite indexing and both disjointness paths.
Removing Rust's new conjunct likewise reproduces the original stage1.rs in full:
dependency computation, assemble, certification_difference, the thirteen fields,
private values, public metadata and error formatting are unchanged. Skeleton
differs only in the returned field and constructor; place_task, anchored_step,
push_occupied and all placement behavior are byte-identical. chunked.rs, core
production code, protocol, locks, worker spawn conditions and reaping are also
byte-identical. No inequality against the updated reference is admitted.

## D: demonstrated reproduction, before and after

The existing generated week remains correct and does not reproduce the defect.
Its anchor 85 depends on dynamic 09, and dynamic 10 depends on that anchor. Every
anchor-free suffix therefore starts beyond the last anchor. Density alone was
not the trigger.

The one new case is synthetic-week-occupancy-ahead, appended by the existing
week_scale.rs generator. It removes that bridge in a clone of the existing
shape, orders all anchors before the dynamic chain and retains mandatory-tail
protection of the whole chain. Shape parameters are 120 Tasks, 93 static anchors
(including 7 routines), 27 dynamic Tasks, 7 days of 86,400 seconds, zero input
overlap pairs, and fixed seed 0x78a1_2026 (2023825446).

Commitment durations remain 600 + ((seed xor index) mod 17) * 11 seconds;
routine durations are 900; dynamic durations remain
420 + ((seed + index * 37) mod 13) * 23. All new identifiers use synthetic-.
No identifier, title, calendar summary, fact key, event id or duration derives
from operator data. The generator has no external-data reader and stays below
MAX_PLANNING_TASKS = 256.

Before applying the bound, the unchanged CPU baseline is feasible and emits
16 candidates with 120 placements. Its perturbable suffix has 27 anchor-free
placements. The loose window shift bound is 555500 seconds, while its minimum
forward occupancy gap is 179 seconds. Task-window bounds are also looser than
that gap; thus all four required conditions are independently asserted by
occupancy_ahead_week_has_a_feasible_shiftable_suffix_with_loose_windows.

The existing owned_tensor_worker_exact_parity_reuse_and_true_cpu_device_provenance
test was built and run with the added CPU golden before B. It failed through
P1B-78's exact thirteen-field comparator, without a skip or a predicate change:

| Measurement | First field | Candidate | Slot | Diverging fields |
|---|---|---|---|---|
| Before occupancy bound | hard_constraint_feasibility | 4 | null | 1 |
| After occupancy bound, actual pinned CPU tensor worker | none | n/a | n/a | 0 |

All other twelve fields matched before B. After B, the owned worker matches all
fifteen golden cases and the new week is included in the existing plan/provenance
checks. Its backend_kind is gpu_worker with device_summary cpu. This is CPU
tensor certification, not CUDA parity and not operator acceptance.

## E: freezer output and exact assertion changes

Run from the kernel after sourcing devshell scripts/env.sh and setting one job:

```sh
cargo run --locked --offline -p ubu_planning_worker --example freeze_stage1
```

The existing freezer now also regenerates C-1 expected counts, rejection counts,
ranked candidates and selected identifiers through the authoritative CPU
pipeline. A dev-only raw_value feature on the existing serde_json dependency
preserves untouched numeric literals; no package version, Git revision or
kernel lockfile changes. Lexical formatting preserves every literal and keeps
the golden readable. Historical C-1 kernel_revision and coverage tags stay
unchanged, with explicit regeneration metadata explaining their original epoch.
The historically named prune case now guards against generating those overlaps.
Every regenerated expected value comes from the freezer; none is edited by hand.

| Worker case | Valid candidates before → after | Placements per valid candidate before → after | Change |
|---|---|---|---|
| synthetic-dependency-chain | 16 → 16 | 3 → 3 | unchanged |
| synthetic-static-anchor | 1 → 1 | 1 → 1 | unchanged |
| synthetic-affect-break-required | 10 → 10 | 1 → 1 | unchanged |
| synthetic-cyclic-dependency | 0 → 0 | none → none | unchanged refusal |
| synthetic-implicit-order | 16 → 16 | 3 → 3 | unchanged |
| synthetic-shifted-mode | 16 → 16 | 3 → 3 | unchanged |
| synthetic-large-seed | 16 → 16 | 3 → 3 | unchanged |
| synthetic-optional-omission | 1 → 1 | 1 → 1 | unchanged |
| synthetic-mandatory-failure | 0 → 0 | none → none | unchanged refusal |
| synthetic-static-collision | 0 → 0 | none → none | unchanged refusal |
| synthetic-invalid-order | 0 → 0 | none → none | unchanged refusal |
| synthetic-week-bound | 16 → 16 | 120 → 120 | unchanged |
| synthetic-week-candidate-padding | 1 → 1 | 120 → 120 | unchanged |
| synthetic-week-three-overlaps | 0 → 0 | none → none | unchanged refusal |
| synthetic-week-occupancy-ahead (new case measured before B) | 16 → 16 | 120 → 120 | only start_time_offsets changes: the occupancy bound replaces unsafe long delays with bounded shifts. |

All fourteen pre-existing worker cases retain their complete JSON semantics;
their expected values are unchanged. Shared Stage 1 frame bytes are unchanged.

| C-1 case | Generated candidates before → after | Placements per candidate before → after |
|---|---|---|
| abundant-slack-utility-heavy | 16 → 16 | 3 → 3 |
| abundant-slack-robustness-heavy | 16 → 16 | 3 → 3 |
| abundant-slack-diversity-heavy | 16 → 16 | 3 → 3 |
| tightly-constrained-single-candidate | 1 → 1 | 2 → 2 |
| static-anchor-semi-legitimization-prunes | 16 → 9 | 2 → 2 |
| exact-score-ties-use-candidate-id | 16 → 16 | 2 → 2 |

The changed C-1 case places movable at [0,2) and anchor at [10,12), so the
occupancy gap is eight seconds: baseline plus shifts 1 through 8 gives exactly
nine candidates. Its generated-count expectation changes 16 → 9, semi-rejected
count 2 → 0, ranked array 14 → 9, and selected ID suffix c06 → c03 on
plan-p8-semi-prune-00000000000d6db7. The new bounded schedules and preserved
proposal-key ordering explain the rank/identifier change; scoring and pruning
code are unchanged. The other five C-1 cases are semantically unchanged.

scoring_and_selection_goldens_match_byte_exact_ranked_candidates retains all
assertions: its exact generated count, semi-rejection count, ranked JSON and
selected ID now read the freezer's exact expectations. No cap, role, tie,
weighting or coverage assertion is relaxed. The generated-week test adds an
explicit 16-candidate success arm for the new case; it preserves all existing
counts. The owned parity test includes the new case in its existing provenance
filter. These are the only existing assertion inputs/coverage changed. No
orchestrator or driver assertion changes. skeleton-phase-a.json and all other
planning goldens remain byte-identical and pass their exact tests.

## Verification and publication

| Check | Accepted baseline | After |
|---|---|---|
| Design | no executable suite | register uniqueness and parser-enum checks passed; Q0184 remains open |
| Kernel Rust, locked/offline all targets | 121 | 125 passed |
| Orchestrator Rust, locked/offline all targets | 645 | 645 passed; no assertion changes |
| Read-only UI | 220 | 220 passed; build passed |
| Pure driver | 64 | 64 passed |
| Runner | 36/36, 669 requests | 36/36, 669 loopback requests; two live scenarios skipped |
| Kernel Clippy | 0 | 0 with -D warnings |
| Orchestrator Clippy | 8 distinct / 9 occurrences | 8 distinct / 9 occurrences, unchanged |
| Closed code vocabulary | 279 | 279, source agreement passed |
| OpenAPI paths / endpoint constants | 56 / 43 | 56 / 43; OpenAPI byte-identical |
| Actual owned worker suite, pinned CPU-only Torch, outside Cargo lock | 33 | 35 passed, no skips |
| Pytest, pinned Torch 2.6.0+cpu | 56 passed | 58 passed, no skips |
| Pytest, Torch absent | 38 passed / 18 skipped | 39 passed / 19 skipped |
| Standing check-all.sh | required | passed; unchanged fixture-demo quarantine |

Four new Rust tests explain 121 → 125; the two new worker invariants explain
33 → 35. The additional golden reaches both existing parametrized Python tests,
explaining 56 → 58 and the additional pass/skip in the Torch-absent environment.
Pytest uses the two existing environments; nothing is installed or downloaded.
The P1B-70 five spawn conditions remain unchanged and confined to the existing
kernel-owned worker path. No test gains real Ollama, Google, editor or new signal
handler access. The runner retains its existing synthetic loopback exemption and
skips its two live scenarios. No operator invocation or model-committee rank runs.

One Cargo job, sequential invocations, the shared nonblocking flock and available
MemoryHigh=16G/MemoryMax=20G scope are unchanged. No two-job trial occurs. Root
free space remains about 234 GiB; the prior cleanup and relocated build/results
symlink are preserved. No additional deletion or runtime change was needed.
Privacy/path audits exclude protected local artifacts and their names from all
outgoing commits without opening those artifacts or printing their names.

Changes publish on p1b-79-feasibility-occupancy without force-push or merge.
Design publishes first, then kernel, then consumer pins, then devshell inventory.
The three Cargo dependencies in ubu-orchestrator advance together from
3e9d947cbf846b152a101f27559c6e3d98955ace to
8653cf2bbe96cd7cf0337fd857881be6665d1ceb:
ubu_planning_core, ubu_planning_cpu and ubu_planning_worker. Cargo.lock changes
only four kernel source URLs, including transitive ubu_planning_worker_protocol;
every unrelated version, source and dependency is unchanged.

| Inventory key | Full published revision | Disposition |
|---|---|---|
| ubu_schemas | 070d0a6f9a6ad7833dd523042925008316ce923b | unchanged |
| ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b | unchanged |
| ubu_store | 83a099f55220b1286ffb2dee3c9d19006e2090b5 | unchanged |
| ubu_planning_kernel | 8653cf2bbe96cd7cf0337fd857881be6665d1ceb | advanced from 3e9d947cbf846b152a101f27559c6e3d98955ace |
| ubu_github_adapter | e14a43b47aeb0a928f4dfdc83cd78ea9a2e044f6 | unchanged |
| ubu_orchestrator | c140f80be90e1bb78c899eb6fb3e834dc09d1f5d | advanced from d0d67631dce2dc564724fc771800a4b4b1557dac |
| ubu_ui | 649f8e117a3eec08b5f8581885b06999d187f8a3 | unchanged |
| ubu_design | ecb1c2654dc8445a04ae403fa4fc33652b6383ce | advanced from 9e57b4959fecc39e852b84d2391deb95a93da446 |
| ubu_brand | faf2005a8bd9e64742dd76ee6d1f91f45223946b | unchanged |

Final source/whitespace/privacy audits pass. All twelve repositories are clean after publication; the four working branches match their origin heads, and all nine inventory entries match published checkout heads. The eight read-only heads are unchanged.

Operator acceptance has not been performed; it is one invocation, and what is under test is whether Stage 1 certifies on the operator’s own week.
