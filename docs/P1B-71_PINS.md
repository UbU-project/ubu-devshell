# P1B-71: Stage 1 crosses the boundary

Only ubu-planning-kernel and ubu-devshell change, on
p1b-71-stage-one-crosses-the-boundary. P1B-70 was confirmed merged to main in all
seven of its repositories before work; all twelve trees were clean and core's
schemas-ref matched its HEAD gitlink. No design/core/schema/store/adapter/
orchestrator/UI/Quick/model-committee source is edited. No model rank runs.

## Governing sentences

| section | governing sentence and application |
|---|---|
| A | ACCEPTANCE P1B-66: “P1B-62 established that no copy-back may ask for a hand tally of rendered items.” Preserve count-only wording, capture once immediately after each producer run, keep named absences. |
| B | D0283: “The CPU reference path remains the built-in authoritative certification path and the no-GPU fallback.” Verify the optional pinned CPU framework in an owned child; every unavailable gate falls back. |
| C | Contract §5: “The Phase 1 PyTorch implementation should use padded fixed-size tensors and masks using stable implementation-facing names.” Use 16 × 256 arrays and exact mask/padding semantics. |
| D | Contract §5: “CPU certification is the final authority for any selected Plan.” Assemble only an exactly certified Stage 1 result, then retain all existing core stages. |
| E | Contract §5: “Parity tests compare the GPU worker with the CPU reference path and CPU-only goldens.” Preserve ChunkedSweep and add a separate CpuStrategy profile. |
| F | BUILD_ENV: “This limits concurrent compiler/linker work, not the memory of one process or the number of test threads.” Keep one Cargo job and add independent lock/scope protections. |

## Six approved grounding corrections

1. Stages 2–4 already exist in planning core. Their absence from the CPU
   strategy crate did not establish their absence from the CPU reference.
   Correct the description and preserve their behavior; implementing them again
   would duplicate established filtering/scoring/rollout.
2. Stage 1 currently uses placement_seconds: fixed seconds or log-normal mode.
   Share those exact integer durations. Introducing random draws here would
   alter the Plan and invalidate the unchanged-reference requirement. The future
   stochastic generator/transform is documented separately, not implemented.
3. TaskSpec has no split_policy and PlanStep has no piece metadata. Use atomic
   1/1 tensors and explicitly reject unsupported raw split input. Successful
   split scheduling requires the deferred 0.2 types/validation; pretending to
   support it would either drop the policy or change unapproved semantics.
4. D0283 normally permits only complete request/response/stream envelopes.
   The operator explicitly approved a bounded internal stage1/stage1_result
   exception. Canonical four frame kinds stay closed. Repair stays CPU because
   prior_plan is serde-skipped; reconstructing it from incomplete wire input
   would change preservation behavior.
5. P1B-70's goldens use ChunkedSweepStrategy. Preserve that oracle and add an
   exact CpuStrategy stage1-atomic-v1 profile. Replacing it with greedy goldens
   would change the reference being tested and could conceal regressions.
6. Review already prohibited diagnostic sentence transcription. Preserve that
   rule, clarify selection counts per run, and correct the stale introduction
   to fourteen steps/nine items. This is not a newly added sentence ban and no
   UI rendering or diagnostic message is changed.

## Dependency, computation and parity

The optional extra pins torch==2.6.0+cpu. Its official v2.6.0 CPU wheel matrix
supports Python 3.9–3.13, covering minimum 3.10 and host 3.13; this is a stable
CPU-wheel choice, not a latest-version claim. Documented, **not run**:

```sh
python3 -m pip install --index-url https://download.pytorch.org/whl/cpu 'torch==2.6.0+cpu'
```

No compute package is installed. The existing private pytest environment is
reused; no test runner installation is needed. Detection performs a bounded,
owned interpreter probe because metadata alone cannot prove a native import
works. Rust imports no framework. Tests cover absent, incompatible, working
and broken imports, with synthetic probe objects rather than a real framework.
The five P1B-70 spawn conditions are unchanged. Real child construction remains
inside the owned kernel worker tests and devshell failing-owner/worker suite;
no advisory, UI or orchestrator test gains worker spawning. Their advisory
transports remain StubTransport. Existing runner-owned mock loopback is retained.
No signal handler is installed by a worker test; no real Google/Ollama/editor
or operator store is reached.

All newly added tensor construction/placement specifies CPU. There is no CUDA
call, CUDA device string or GPU allocation in added executable code. No GPU
execution or speed improvement is claimed. Real framework computation remains
unverified because torch is absent; skips are not positive tensor parity.

Dtypes/shapes and rationale are in STAGE1_WORKER.md: int64 for Task indices,
whole-second offsets/durations, atomic piece metadata and dependency slack;
bool for occupied/candidate/feasibility masks; strings for rejection classes.
The padded shape is 16 candidates × 256 slots. Masked input duration padding
is discarded before conversion; output padding is canonical. Both new input
and output envelope golden byte strings are frozen in kernel
fixtures/worker/stage1-frames.json and asserted by Rust and Python. They are
implementation messages, not a fifth canonical PlanningStreamFrame kind.

All eleven CpuStrategy fixtures compare exactly: complete candidate batch,
Task slots, offsets, durations, pieces, feasibility, rejection, omission order
and padding. boundary-v1 absolute/relative tolerances remain 1e-9/1e-9; none is
widened or used for Stage 1. Existing ChunkedSweep stage goldens remain unchanged.

The first independent Python-versus-Rust disagreement was
synthetic-optional-omission: schedules matched but Python returned omissions in
input order while Rust sorts least protected first, including reverse Task-ID
tie-breaking. Python now matches that rank order exactly. It is not a
**torch-versus-Rust** disagreement: no real torch test ran, so “never disagreed”
would overstate evidence. The real tensor fixture tests remain explicitly skipped.

CPU certification regenerates the reference candidate batch and compares every
output before assembly. It is intentionally duplicated work during this proof.
Actual tensor computation would record gpu_worker / persistent_python_worker /
pytorch / 2.6.0+cpu / cpu; downstream core stages remain CPU. An in-memory stub
retains CPU provenance. Error, timeout, cancellation, forged output or a worker
killed during Stage 1 returns the unchanged CPU answer and CPU provenance.
Session/panic tests reap owned children and release the reservation.

Kernel's only Cargo.lock change adds already-resolved serde to the worker's
internal dependency list. CpuStrategy becomes a normal worker dependency;
registry versions and Git upstream pins remain unchanged. Core/CPU planning
implementations are not refactored. Orchestrator remains pinned to P1B-70,
so no live GPU-setting handoff is implied by devshell's moved inventory pin.

## Complete pre-ticket Plan

The unchanged P1B-70 orchestrator binary generated the invented fixture-store
baseline before section E changed the runner. Scenario 36 now asserts the
complete Plan, including existing provenance and replay metadata, against
p1b70-complete-plan.json. The original P1B-69 field-projection assertion stays.
Only old volatile Task/Plan IDs and four named generation timestamps normalize:
created_at, risk_report.generated_at, human_complete_plan_quality.generated_at,
and replay_metadata.generated_at. Valid UTC shape is asserted before replacing
them. Effective time, seed, version and every semantic field are exact. This is
a complete normalized byte comparison, not a raw identity claim about fresh
IDs or wall-clock timestamps. No HTTP request is added.

## Copy-back audit

| item | audit |
|---|---|
| 1 capture | Rendered counters/counts only; named missing-counter/no-colour outcomes, none or count-line diagnostic answer, missing-summary failure. No tally or sentence transcription. |
| 2 Plan | Rendered diagnostic/Placements count and whole unplaced section; none and missing-line/section outcomes remain. |
| 3 risk | Whole rendered panel, or no Plan risk panel; no per-finding extraction. |
| 4 preview | Rendered operation count and whole first Dynamic Update; missing count/no Dynamic Update are answers. |
| 5 approval | Rendered approval/operations lines, named missing lines, or I did not approve. |
| 6 UniverseState | Entries line, or no Entries line; no row/key/value requested. Protected step 11 text remains unchanged. |
| 7 authoring | Existing saved-condition judgment/words or named failure/no-target outcomes; no new private target is introduced. |
| 8 producers | Each producer's status/candidate lines plus named absences. Capture each selection count once immediately after its own click, labelled by producer; two clicks retain two answers even if equal. none/missing-summary are answers. No diagnostic sentences/Task IDs/tally. Existing proposal-word waiver and failure/queue outcomes remain. |
| 9 judgment | Operator's assessment, no invented expected result or hand counting. |

The procedure has **14 steps and 9 copy-back items**. The stale 15/10
introduction is corrected. The preview convergence explanation, protected
UniverseState paragraph and authoring-before-model order remain unchanged.

## Recorded sampling decision

STAGE1_WORKER.md specifies future **Philox4x32-10**, stateless keying tuple
(rng_seed, candidate_index, task_index, draw_index), counter/key layout, round
constants and a binary64 open-unit conversion. The named duration transform is
**Wichura AS241 inverse normal CDF**, with specified binary64/Horner/rounding,
fdlibm 5.3 log/sqrt/exp, shifted-log-normal calibration and checked ceil-to-whole
seconds. Substituting Box–Muller/Ziggurat/device math is not equivalent. This is
an explicit implementation decision, not an open question or already-coded
sampler. D0171 fixes deterministic seed conventions but does not name this
specific choice. P1B-71 shares deterministic placement seconds; P1B-72 must
implement/certify the future profile before activation. Current Stage 4's
correlated sampling is unchanged. No ubu-design file changes.

## Exclusion and memory containment

Shared Linux convention: `/tmp/ubu-planning-build-worker-<uid>.lock`, owned
regular file, no symlink/other owner accepted. Every acquisition is nonblocking:
Cargo uses flock --nonblock and the compute handle File::try_lock. A held lock
makes compute ineligible and yields CPU; Cargo returns 75 without waiting.
A persistent compute session reserves the same lock until stop/error/Drop.
The explicit unlock also handles a concurrent fork briefly inheriting the
open descriptor before exec. That release race was caught and fixed during B.

Available user systemd runs Cargo and its flock owner in a separate scope with
**MemoryHigh=16G, MemoryMax=20G**. The scoped lock owner must survive terminal
loss alongside Cargo so exclusion persists. Missing systemd uses the lock
alone with a visible message; the fake fixture verifies that fallback.
A clean kernel all-target build passed with one job under the final configured
ceiling in 49.35 seconds (maximum resident set 436880 KiB). The lock owner
was verified inside that scope; an observed active cgroup MemoryPeak was
1188208640 bytes, distinct from the process RSS measure.
Actual systemd properties confirmed MemoryHigh=17179869184 and
MemoryMax=21474836480 bytes. The initial timing command inadvertently executed
Cargo directly through /usr/bin/time, bypassing the shell wrapper; the corrected
trial timed a sourced shell in a separate empty target, and passed. This
setup correction is reported rather than presenting the first trial as scoped.

The one-job/target-root settings are preserved, no build cap is relaxed, no
two-job invocation is used, and no OOM occurs. New mechanisms add exclusion and
containment; they do not remove the job cap. All Cargo invocations remain
sequential across repositories. The wrapper protects sourced-shell calls;
external programs resolving Cargo themselves require a sourced helper shell.

## Verification and pins

| check | measured result |
|---|---|
| schemas/core (read only) | 2 / 166 Rust tests |
| store/adapter (read only) | 110 / 23 Rust tests |
| kernel | 105 Rust test passes; real tensor-worker body explicitly skips without pinned torch; the two lock-dependent bodies are also run outside Cargo by devshell |
| kernel Clippy | zero warnings, -D warnings |
| pytest | 32 passed, 15 real-torch tests skipped; existing private pytest reused |
| UI (read only) | 212 tests in 25 files |
| orchestrator (read only) | 633 tests; 8 unique Clippy warnings before/after |
| devshell | 5 preserved ChunkedSweep parity tests, 17 owned kernel worker checks (one tensor skip), 11 preserved patch-config cases, fake build-exclusion fixture and uncaught failing-owner reap check |
| check-all / test-all | passed offline sequentially with torch absent; standing fixture-demo quarantine explicitly unchanged |
| full runner | 36/36, 0 failed, 2 live scenarios skipped, 667 owned loopback requests |

```text
RESULT: 36 of 36 scenarios passed, 0 failed, 2 skipped, 667 requests, all to 127.0.0.1
```

The test floors are preserved or raised (kernel 96 → 105, pytest 11 → 32 passes
plus explicit skips). No tolerance is widened. OpenAPI paths and endpoint
constants remain the baseline 56/43: their repositories/files are unchanged,
and no new manual inventory or endpoint-constant inspection is performed.
Automated counts do not constitute operator acceptance.


The negative-environment check-all trial also passed with a private executable
allowlist containing no Python/pytest and an explicit nonexistent worker
interpreter. Mandatory CPU, codec, both parity profiles and standing guards ran;
interpreter-dependent bodies/failing-owner check printed explicit skips. No
host package or runtime configuration was uninstalled/reconfigured.

Only ubu_planning_kernel moves in pinned-revs.toml; the other eight values are
byte-identical to P1B-70. The final kernel pin is
097a6197ed8694168c38f98a360d6306c89f9c67, published on
p1b-71-stage-one-crosses-the-boundary. B is ee79fac, C 1a54e71 and D fac9382.
The operator explicitly approved one additional documentation-only kernel
commit, 097a619, after D was pushed: correct the stale README and module
header while preserving all behavior. The preserved no-compute echo and the
optional CPU tensor/probe paths are now described accurately. No force-push
is used. Kernel tests remain 105 and pytest 32 passed / 15 skipped afterwards.
Devshell A is 36a45cb and E 9829d01; F owns this report, inventory and build
mechanisms, on the same ticket branch with its required Co-Authored-By trailer.

The inventory comparison reports nine OK pinned upstreams, each on origin;
the other eight pin values are unchanged. Working trees and final branch
publication are checked after section F commits. Only the two named repositories
have outgoing ticket commits; all other ten remain at their clean baseline.

Operator acceptance has not been performed; the two things under test are the
Review copy-back's length and the rehearsal being identical to P1B-70.
