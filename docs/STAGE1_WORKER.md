# Atomic Stage 1 over the owned worker

P1B-71 adds `stage1-atomic-v1`, an internal Stage 1 input/output profile approved
as an explicit exception to D0283's complete-object envelope restriction. It
changes no canonical frame enum, schema version or PlanningRequest/PlanStep
type. `stage1` carries one minimized legacy request plus CPU-derived order,
slot masks and a tagged sampling source. `stage1_result` returns padded
structural arrays. Existing request/reference/final_response echo stays intact.
Both codecs assert fixtures/worker/stage1-frames.json's exact input/output bytes.

Stage 1 means CpuStrategy's deterministic skeleton and bounded perturbations;
Stages 2–4 already run in planning core and remain unchanged. The original
ChunkedSweep boundary-v1 oracle remains a separate profile. Current durations
are fixed seconds or shifted-log-normal mode, not random samples. The sampling
input is tagged `placement_seconds`; the envelope can later accept a specified
seed-based source without inventing a new frame kind. P1B-71 implements no RNG.

## Optional CPU-only dependency

The extra pins **torch==2.6.0+cpu**. The official v2.6.0 wheel build matrix includes
CPU wheels for Python 3.9–3.13, covering the repository minimum 3.10 and this
execution's 3.13. See [the pinned upstream matrix](https://github.com/pytorch/pytorch/blob/v2.6.0/.github/scripts/generate_binary_build_matrix.py).
This is a deliberate stable CPU-wheel pin, not a claim it is the latest release.
Use a supported Linux Python 3.10–3.13 environment for the optional extra.
Unsupported versions retain CPU fallback. Documented installation, **not run**:

```sh
python3 -m pip install --index-url https://download.pytorch.org/whl/cpu 'torch==2.6.0+cpu'
```

No check installs torch or another compute dependency. Python and pytest are
optional to the mandatory Rust CPU-only goldens. Existing pytest can run the
kernel's gpu-advisory/tests with gpu-advisory/src on PYTHONPATH; an optional
UBU_WORKER_TEST_PYTHON selects an interpreter, never a committed machine path.
No real framework is installed in this execution. Tensor tests explicitly
skip; those skips leave real tensor execution unverified.

Detection owns a bounded child running only the kernel's committed worker
module. It must perform a real import to distinguish a working CPU package
from stale metadata or a broken native extension; Rust imports no framework.
The probe reports the observed version and whether the pinned CPU framework
works. A missing interpreter, broken import or incompatible version falls back
to CPU. The probe never calls a device discovery API. The worker clears inherited
environment and bounds native CPU thread settings; all tensor construction
specifies `device="cpu"`. No device-placement or GPU allocation code is added.

## Shapes and dtypes

MAX_PLANNING_TASKS is 256, the contract's Phase 1 default; the existing CPU
candidate bound is 16. Arrays pad to those fixed shapes, never ragged lists.

| name | shape | torch dtype | meaning |
|---|---|---|---|
| task_index | 16 × 256 | int64 | input Task slot, -1 for padding |
| slot_mask | 16 × 256 | bool | occupied placement slot |
| validity_mask | 16 | bool | emitted candidate, distinct from feasibility |
| start_time_offsets | 16 × 256 | int64 | whole seconds from request window start |
| duration_samples | 16 × 256 | int64 | shared deterministic placement seconds |
| piece_index, piece_count | 16 × 256 | int64 | atomic 1/1, padding 0/0 |
| dependency_slack | 16 | int64 | minimum dependency slack in seconds, 0 if none |
| dependency_feasibility | 16 | bool | all prerequisites finish before starts |
| hard_constraint_feasibility | 16 | bool | schedule validity, windows and anchors |

Int64 preserves integer placement arithmetic and avoids float rounding at window
boundaries. Bool represents masks directly. Rejection codes and omission/failure
metadata are categorical JSON, not numeric tensors. Every padded output is
canonical (-1 for task_index, false/zero elsewhere); padded input durations are
ignored before tensor construction, including values outside int64 range.

Atomic output is 1/1. Unsupported split input explicitly rejects with
unsupported_split_policy and no candidates. Current types cannot represent
splittable Tasks; successful piece scheduling awaits 0.2. Repair remains CPU
because prior_plan is serde-skipped. Requests above 256 Tasks or outside the
integer tensor profile also fall back without changing the built-in CPU path.
Request coordinate strings stay whole-second UTC; only internal output offsets
are integer seconds. No affect observations cross this Stage 1 seam.

## Certification, lifecycle and truth about provenance

Every structural array, mask, padded value, feasibility result, rejection,
omission order and CandidateSet is exact against CpuStrategy. CPU generation
is repeated for certification; this ticket proves an independent computation,
not a CPU-work or performance reduction. Tolerance profile boundary-v1 is
unchanged and is never used for Stage 1. Actual returned candidates are
assembled from worker outputs only after exact certification. Planning core
then retains its existing validation, affect filtering, scoring and rollout.

Stage1Strategy is a one-owner adapter to the existing PlannerStrategy trait.
LocalStageTransport lazily owns one compute session, reused across requests,
and takes Cargo's nonblocking reservation before spawn. An already-owned
session retains that reservation; it must not fail eligibility by probing its
own lock. Crash, timeout, cancellation/error frame, wrong identity/version,
malformed output or exact mismatch falls back to CpuStrategy. Stop/error/Drop
reaps the child and releases the reservation. No test installs a signal handler.

Use plan_stage1 to reset per-invocation provenance before planning. Real tensor
execution records gpu_worker / persistent_python_worker / pytorch / 2.6.0+cpu /
cpu, with certified CPU authority and stage1-atomic-v1 profile. Downstream stages
still run on CPU. An in-memory stub claims CPU provenance; a permission flag
or synthetic answer never manufactures worker provenance. No fifth enum exists.

The orchestrator remains pinned to its P1B-70 kernel and CPU path. Only the
devshell kernel inventory pin moves. No live planning.gpu_enabled activation,
HTTP route or UI change is delivered here. The same torch-absent, policy-off
operator rehearsal remains required.

## Specified future duration stream (implementation decision)

D0171 makes deterministic seed conventions canonical; it does not itself name
this generator or transform. The following is P1B-71's explicit implementation
decision for a future stochastic Stage 1, not a claim it is implemented today.
It neither changes the existing Stage 4 correlated sampler nor authorizes a
change to today's deterministic placements. P1B-72 must implement and certify
both sides against the same specification before changing that behavior.

Use **Philox4x32-10**, stateless and keyed on
`(rng_seed, candidate_index, task_index, draw_index)`:

- The key is (low32(seed), high32(seed)). The counter is
  (candidate_index, task_index, low32(draw_index), high32(draw_index)). Candidate
  and Task indices are unsigned 32-bit; seed/draw_index are unsigned 64-bit.
- Multiply words 0 and 2 by 0xD2511F53 and 0xCD9E8D57 respectively. One round
  returns (high(product2) xor word1 xor key0, low(product2),
  high(product0) xor word3 xor key1, low(product0)). All words wrap at 32 bits.
- Perform ten rounds; between rounds increment key0 by 0x9E3779B9 and key1 by
  0xBB67AE85 modulo 2^32. Slot keying makes evaluation/batching order irrelevant.
- From output words r0,r1, obtain the exactly representable binary64 open-unit
  value `u = (((r0 >> 6) * 2^26 + (r1 >> 6)) + 0.5) / 2^52`. This avoids 0 and
  1; using all 53 integer bits plus a half would round the upper endpoint to 1.

The named normal transform is **Wichura AS241 inverse standard-normal CDF**,
with its published coefficient tables, binary64 arithmetic, Horner evaluation
order, round-to-nearest ties-to-even, and no fused multiply-add substitution.
Use the **fdlibm 5.3** log/sqrt/exp paths consistently on both sides; do not
substitute device library math, torch.distributions, Box–Muller or Ziggurat.
Apply the same shifted-log-normal calibration as core rollout.sample_duration:
`a=mode-min`, `b=p95-min`, `z95=1.6448536269514722`,
`sigma=(-z95+sqrt(z95*z95+4*log(b/a)))/2`,
`mu=log(a)+sigma*sigma`, `duration=min+exp(mu+sigma*AS241(u))`.
Fixed durations stay fixed. Convert occupied duration to whole seconds by ceil,
with checked int64 range; overflow is an explicit unsupported-profile fallback.
These math/rounding choices are part of the stream profile, not implementation
freedom to exchange one transform for another. P1B-72 must freeze boundary and
transform vectors, including near-window placements, before activation.

Stage 1 structural equality has no statistical acceptance substitute. The
existing floating score, diversity, rollout-frequency and interval profiles
remain the appropriate numeric comparison classes for Stages 3–4; probabilities
come from duration/outcome simulations, not solely composite score reductions.
No tolerance is widened here. No counter-based sampler or transform is coded
by P1B-71, and nothing in ubu-design changes.
