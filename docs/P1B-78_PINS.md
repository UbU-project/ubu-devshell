# P1B-78: exact certification location and generated week coverage

## Grounding and governing sentences

All twelve repositories began clean on main. The kernel, orchestrator and
devshell heads were the stated P1B-77 commits, confirming that ticket merged.
The operator approved four corrections before editing:

1. Shared goldens contain one to three Tasks, not zero to two. The small-test
   coverage gap is real, but scale is a hypothesis rather than a proven cause.
2. The CPU refuses overlapping static anchors. A successful non-overlap week
   and a three-overlap refusal are separate fixtures; changing the reference
   to produce 120 placements despite collisions would invert CPU authority.
3. Filling all sixteen candidates leaves no unused candidate rows. A constrained
   one-candidate variant verifies unused candidate padding separately; unused
   slot padding remains covered in both successful week cases.
4. The existing wire value is gpu_worker, not GpuWorker, and the public block
   previously omitted provenance. A closed projection of existing backend_kind
   makes successful certification visible without an API/schema change.

The governing sentence, retained verbatim in assemble, is:

> Exact comparison covers every padded value, code, mask and omission, not only the final schedule. Never widen a numeric tolerance here.

It constrains every field and padded element to exact equality. Description is
added; no inequality gains permission to admit. The CPU reference remains the
unchanged authority. No Rust-side cause was found and no reference repair occurs.

| Section | Governing sentence from required reading | Constraint |
|---|---|---|
| All | UBU-D0283: “When GPU and CPU advisory scores disagree beyond tolerance, CPU certification and CPU reference goldens are the final authority.” | Worker matches CPU; no tolerance widening or authority reversal. |
| All/B | UBU-D0171: “Stage 1 consumes a CPU-provided topological_order; the GPU engine does not discover graph order.” | Generate and validate order on the CPU, retain the internal atomic profile. |
| All/C | ACCEPTANCE.md: “A manual step exists only for rendering.” / “A manual instrument has one line of execution.” | Code projects diagnostics; no human transcription or extra invocation. |
| A | assemble's exact-comparison sentence quoted above | Every old inequality refuses; comparison/reconstruction retain their outcomes. |
| B | reference_output: “Semantic CPU-only golden, independent of any process or framework.” | Freeze expected results through unchanged CPU code, not by copying Python or operator data. |
| B | candidate_generation.rs: “At most fifteen distinct placements per pivot.” | Exercise the unchanged sixteen-candidate bound and occupancy/dependency paths with generated inputs. |
| C | planning_worker.rs: “The executable supplies the kernel-owned transport; library and orchestrator tests never probe or spawn an interpreter.” | Inject facts in server tests; use only the existing bounded kernel worker path for real tensors. |
| C | live-rehearsal-report.mjs: “Public projection: never serialize an API object, arbitrary string, or key.” | Construct whitelisted field/index/count objects; keep differing values private. |
| D | pinned-revs.toml: “Record the expected HEAD SHA here each time an upstream repo lands.” / “Push a branch before pinning it.” | Advance only the three consumer revisions plus the approved published-head inventory entries. |

## A: exact comparison and first difference

CertificationField is the closed set of thirteen StageOutput fields, in their
declaration order. certification_difference compares each using its existing
typed PartialEq semantics, including lengths, ordering and all padding. It counts
all unequal fields and locates only the first one. Matrices traverse candidates
then slots ascending; candidate vectors traverse indices ascending. Omissions
and failure are global, so their candidate/slot indices are null. Missing rows
have a candidate index and null slot; missing cells have the first absent slot.
Indices may equal the expected dimension at a length boundary (16 or 256).

**Outcome equivalence for every input follows from the exhaustive same thirteen
field comparisons used by derived StageOutput equality.**
comparator_matches_legacy_equality_for_shape_order_padding_and_multiple_fields
compares the new result against the former whole-struct equality for equal,
ragged, padded, reordered and multi-field variants. The existing
every_structural_class_including_padding_is_exactly_certified now checks every
forged field's identity, indices, count and the old refusal predicate. The
original full golden roundtrip/assembly test still compares exact CPU candidates.
Source agreement also asserts the public field list matches the actual struct.
No field is skipped and there is no numeric tolerance. Post-comparison assembly
is byte-identical, as is reference_output and all CPU/core implementation code.

CertificationDifference is retained through the existing io::Error and the
strategy's latest-generation state. It resets with each generation and after
success; CPU fallback remains CertificationFailed. Display, Debug and io::Error
formatting include public metadata alone, verified by
certification_error_formatting_never_logs_private_values. Explicit private_values
supplies only the two values at the first difference to the existing private
screen message; missing rows use a row-length summary instead of dumping a row.
No differing value enters a public code or new log output. No logging call or
private transcript sink is introduced.

## B: generator and actual reproduction finding

Generator: crates/ubu-planning-worker/examples/support/week_scale.rs, called by
crates/ubu-planning-worker/examples/freeze_stage1.rs. Regenerate from the kernel
with sourced devshell env.sh, one Cargo job, then:

```sh
cargo run --locked --offline -p ubu_planning_worker --example freeze_stage1
```

The generator has no external input, process/framework import or operator-data
reader. It produces requests from shape parameters; freeze uses the unchanged
CPU reference for StageInput and expected StageOutput. Eleven original golden
cases retain their JSON semantics and the shared frame-byte fixture stays
byte-identical. Three cases append to the shared golden array, automatically
reaching both existing parametrized Python tests and the existing owned worker.

| Generated case | Tasks / anchors / routines / dynamic | Input overlaps | Placements per valid candidate | Valid / unused candidates | Unused slots per valid candidate | First divergence / candidate / slot / field count |
|---|---|---|---|---|---|---|
| synthetic-week-bound | 120 / 93 / 7 / 27 | 0 | 120 | 16 / 0 | 136 | none / n/a / n/a / 0 |
| synthetic-week-candidate-padding | 120 / 93 / 7 / 27 | 0 | 120 | 1 / 15 | 136 | none / n/a / n/a / 0 |
| synthetic-week-three-overlaps | 120 / 93 / 7 / 27 | 3 | no placements; CPU refusal | 0 / 16 | all slots unused | none / n/a / n/a / 0 |

The fixed seed is 2023825446 (0x78a12026). Time starts at the synthetic Unix
origin; durations are fixed arithmetic formulas from seed/index (anchors
600 + ((seed XOR index) mod 17)*11, routines 900, dynamics
420 + ((seed + index*37) mod 13)*23). No duration derives from the operator's
week. All identifiers begin synthetic-, and no real title, summary, event id,
fact key or observation appears. Routine anchors are mandatory synthetic labels,
not new schema fields. The generator supplies a valid deterministic order.
An anchor depends on a ten-deep dynamic chain; the mandatory tail protects the
27-dynamic chain. Early placement scans and skips many affixed anchors; seventeen
late dynamic suffixes generate proposals toward the candidate bound. The
padding variant binds the window end to the synthetic CPU baseline's last end.
The overlap variant moves three synthetic commitment anchors into the three
daily routine intervals and preserves the authoritative static-collision refusal.

**The live divergence did not reproduce.** For every case, both Python's
reference_without_framework and pinned CPU tensor compute return:
first field **none**, candidate **not applicable**, slot **not applicable**,
total diverging fields **0**. The owned LocalStageTransport test also exchanges
and certifies the successful week cases against CpuStrategy, reusing the existing
owned interpreter path. No mismatching field was repaired. Python remains
byte-identical because the ticket permits a repair only after reproduction of
a worker-side cause. The trigger in the operator's week is not captured by these
shape parameters. This is not a finding that the CPU is wrong, and it does not
settle the operator's live certificate.

## C: closed public codes and private values

The generic planning_gpu_fallback_certification_failed is retained. Exactly one
first-field code is added when typed difference metadata is available:

| Field | Public code |
|---|---|
| task_index | planning_gpu_fallback_certification_failed_task_index |
| slot_mask | planning_gpu_fallback_certification_failed_slot_mask |
| start_time_offsets | planning_gpu_fallback_certification_failed_start_time_offsets |
| duration_samples | planning_gpu_fallback_certification_failed_duration_samples |
| piece_index | planning_gpu_fallback_certification_failed_piece_index |
| piece_count | planning_gpu_fallback_certification_failed_piece_count |
| validity_mask | planning_gpu_fallback_certification_failed_validity_mask |
| dependency_slack | planning_gpu_fallback_certification_failed_dependency_slack |
| dependency_feasibility | planning_gpu_fallback_certification_failed_dependency_feasibility |
| hard_constraint_feasibility | planning_gpu_fallback_certification_failed_hard_constraint_feasibility |
| rejection_codes | planning_gpu_fallback_certification_failed_rejection_codes |
| omissions | planning_gpu_fallback_certification_failed_omissions |
| failure | planning_gpu_fallback_certification_failed_failure |


PlanningWorkerResult carries this internal explanation to the adapter. Its
existing DiagnosticBody.message contains structural metadata plus explicit
private expected/actual values; no new API field, route, schema or profile exists.
The driver accepts metadata only beside a known field-specific code, checks the
field matches the code, bounds candidate to 0..=16 and slot to 0..=256, checks
null applicability and a field count of 1..=13, then constructs a new object.
Malformed/missing data reports location unavailable instead of fabricated zeros.
Arbitrary keys, expected/actual values and free text are discarded publicly.
Independent canaries reach the private renderer and remain absent from the
public block. One-field projection tests change only the corresponding line.
The existing closed source extractor is unchanged; vocabulary grows 266 → 279.

The existing engine_provenance.backend_kind is projected under its wire enum:
cpu_reference, gpu_worker, mobile_cpu or mobile_gpu. Unknown strings are withheld;
framework/device/version details stay private. The actual exercised worker is a
CPU tensor profile. No CUDA parity, live acceptance or default ChunkedSweep
certification is claimed. LIVE_REHEARSAL.md is unchanged and remains the sole
one-invocation procedure.

## Verification and disk cleanup

| Check | Accepted baseline | After |
|---|---|---|
| Kernel Rust, locked/offline all targets | 118 | 121 passed |
| Orchestrator Rust, locked/offline all targets | 644 | 645 passed; targeted worker suite 12 passed after removing a new unused test import |
| Pure driver tests | 59 | 64 passed |
| Read-only UI tests/build | 220 | 220 passed; build passed |
| Runner | 36/36, 669 requests | 36/36, 669 synthetic loopback requests; two live scenarios intentionally skipped |
| Kernel Clippy | 0 | 0 with -D warnings |
| Orchestrator Clippy | 8 distinct | 8 distinct / 9 occurrences, unchanged after unused-import cleanup |
| Closed code vocabulary | 266 | 279, source agreement passed |
| OpenAPI paths / endpoint path constants | 56 / 43 | 56 / 43; generated OpenAPI byte-identical |
| Owned worker tests with pinned CPU-only torch, outside Cargo lock | 30 | 33 passed, no skips |
| Python with pinned CPU-only torch | 50 passed | 56 passed, no skips |
| Python without torch | 35 passed / 15 skipped | 38 passed / 18 skipped; framework-dependent checks unavailable |
| Standing check-all.sh | required | passed, including unchanged build-exclusion and worker/parity suite |

The P1B-70 five conditions and existing bounded worker path are unchanged. The
owned suite runs after Cargo releases the build lock, with the existing pinned
CPU-only interpreter; it verifies genuine computation, reuse and CPU-device
provenance. No install or download occurs. Torch-absent checks skip only the
framework-dependent paths; pure codec/oracle comparisons remain mandatory.
No test gains real HTTP, Google, real ollama, editor or new signal-handler access.
The runner retains its existing synthetic loopback exemption and deliberately
skips its two live Google/ollama scenarios. The old fixture demo quarantine
remains unchanged. No model-committee rank or operator acceptance is run.

In response to the operator's disk-space feedback, six untracked, regenerable
incremental-cache directories were removed under the existing shared build lock.
11765123989 logical bytes (approximately 10.96 GiB) were reclaimed. Root free
space rose from about 224 GiB to 235 GiB at cleanup; after ticket verification
about 234 GiB remains free. Source, fixtures, dependency
outputs, test binaries, installed environments and verification records were
retained. The operator-relocated results symlink was preserved; orchestrator
debug output already follows it to the other drive. No machine-specific target
path or new permanent runtime/build setting is committed.

Byte checks confirm unchanged CPU/core/Python and reference_output, post-guard
assembly, canonical/shared frames, all worker/build wrappers, compute locks and
reaping, API/OpenAPI and endpoints. One Cargo job, sequential invocations,
shared nonblocking flock and available MemoryHigh=16G/MemoryMax=20G scope remain.
OpenAPI stays at 56 paths and endpoints.ts at 43 path constants. Nine read-only
repository heads stay unchanged. Protected local artifacts and their names are
excluded from outgoing commits; audits never open those artifacts or print names.

## D: publication and every pin

Changes publish on p1b-78-certification-location, without force-push or merge.
The three Cargo dependencies advancing together are ubu_planning_core,
ubu_planning_cpu and ubu_planning_worker, from
1c0d1b2ba776deae004ab93177983d733d8e020d to
3e9d947cbf846b152a101f27559c6e3d98955ace. Cargo.lock changes only the four kernel
source URLs, including transitive ubu_planning_worker_protocol; unrelated package
versions and dependencies remain unchanged. Published kernel and orchestrator
inventory entries advance; every other inventory entry is unchanged.

| Inventory | Full published revision | Disposition |
|---|---|---|
| ubu_schemas | 070d0a6f9a6ad7833dd523042925008316ce923b | unchanged |
| ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b | unchanged |
| ubu_store | 83a099f55220b1286ffb2dee3c9d19006e2090b5 | unchanged |
| ubu_planning_kernel | 3e9d947cbf846b152a101f27559c6e3d98955ace | advanced from 1c0d1b2ba776deae004ab93177983d733d8e020d |
| ubu_github_adapter | e14a43b47aeb0a928f4dfdc83cd78ea9a2e044f6 | unchanged |
| ubu_orchestrator | d0d67631dce2dc564724fc771800a4b4b1557dac | advanced from 755fc131e62759831d209e0f6e0b742e3eb48965 |
| ubu_ui | 649f8e117a3eec08b5f8581885b06999d187f8a3 | unchanged |
| ubu_design | 9e57b4959fecc39e852b84d2391deb95a93da446 | unchanged |
| ubu_brand | faf2005a8bd9e64742dd76ee6d1f91f45223946b | unchanged |


| Cargo consumer | Dependency | Full revision |
|---|---|---|
| ubu-github-adapter | ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b |
| ubu-orchestrator | ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b |
| ubu-orchestrator | ubu_store | 83a099f55220b1286ffb2dee3c9d19006e2090b5 |
| ubu-orchestrator | ubu_github_adapter | e14a43b47aeb0a928f4dfdc83cd78ea9a2e044f6 |
| ubu-orchestrator | ubu_planning_core | 3e9d947cbf846b152a101f27559c6e3d98955ace |
| ubu-orchestrator | ubu_planning_cpu | 3e9d947cbf846b152a101f27559c6e3d98955ace |
| ubu-orchestrator | ubu_planning_worker | 3e9d947cbf846b152a101f27559c6e3d98955ace |
| ubu-planning-kernel | ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b |
| ubu-store | ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b |


Core's schemas-ref remains 070d0a6f9a6ad7833dd523042925008316ce923b. The devshell
parity template still takes its inventory placeholder, not a new literal rev.
There is no devshell self pin. Remaining non-inventory read-only heads are
quick-ubu 9ccc8b8e302d4e39207b749fb00bc449dc172cf0 and model-committee
4359c557fc8b6228f9da6bbdcd62a4cdf9f26260. Kernel commit
3e9d947cbf846b152a101f27559c6e3d98955ace and orchestrator commit
d0d67631dce2dc564724fc771800a4b4b1557dac are published. The final devshell commit is
reported by the completion response rather than a circular self pin. All twelve
worktrees and published upstream equality are verified after publication.

Operator acceptance has not been performed; it is one invocation, and what is under test is whether a refused certification names the field it refused.
