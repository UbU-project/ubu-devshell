# The invocation boundary before device computation

P1B-70 implements an explicitly scoped legacy planning-kernel-contract/0.1
invocation profile. Design 0.2 and its split-policy bump remain deferred.
No GPU stage, tensor layout, stochastic duration model, PyTorch dependency or
CUDA requirement lands here. The CPU oracle exists before a device stage can
be moved across the boundary.

The kernel computes one complete CPU response with its unchanged candidate
strategy, certification, affect filtering, scoring, ranking and rollout.
Two separately length-framed input messages carry one PlanningRequest and one
reference PlanningResponse. Each has only kind and payload; a single message
never carries two semantic objects. Cancellation carries request identity only.
Python echoes one final_response and remains alive for its owned session.
Actual provenance is cpu_reference / in_process_cpu / certified, because Python
performs no computation. Policy permission does not manufacture GPU provenance.

The prefix is four-byte unsigned big-endian byte length; payload is UTF-8 JSON,
positive and at most 1,048,576 bytes. Golden canonical byte tests use sorted
object keys, compact separators and no NaN; JSON object key ordering otherwise
has no semantic meaning. Both language codecs assert the same golden file in
kernel fixtures/worker/golden-frames.json. Partial/split reads, clean EOF,
zero/oversize/truncated frames, identity/order errors and terminal duplication
are tested. The batch profile emits frame_index zero and only final_response.

Every existing typed time path becomes a whole-second RFC3339 UTC string on
these pipes: request time/window/Static-anchor coordinates, affect observation
times, response schedule starts/ends and coverage boundary starts. Durations,
lateness and indices remain numbers. The adapter names typed paths; arbitrary
affect dimension names are not interpreted as coordinate names. Decode rejects
numeric, fractional, non-UTC and unrepresentable coordinates. Response replay
fields are planner_version, rng_seed_echo, effective_time and generated_at.
The pure kernel uses the supplied window's logical time, reading no clock;
orchestration supplies its injectable clock for generation time.

The return envelope is core's PlanningStreamFrame; kernel composes its typed
payload. The CPU verifies identity, frame sequence, typed response decoding,
full equality to its retained reference and schedule validation before accepting
the echo. No chunk is surfaced. The contract requires: “The CPU may surface a
streamed chunk only after CPU certification of that frame's partial response.”
Future streaming work must satisfy that rule before exposing any partial result.
Malformed output, EOF, timeout, failed certification and cancellation retain the
CPU answer; transport_status is engine_error with an engine_error or cancelled
frame. These transport frames never certify a Plan. The retained response keeps
its own actual CPU planning status and provenance.

WorkerSession is a real PlanningTransport; StubTransport exercises the same
pure codec in memory. The only real construction sites are kernel's owned
worker tests through their real helper (and missing-interpreter test), plus
devshell's failing_owner example. That example deliberately exits 101 on an
uncaught synthetic panic; the script verifies its recorded owned PID is gone.
Both use the kernel's own committed repository module. Orchestrator tests create no worker, and advisory
transports remain stubbed. The repository module/import root is fixed, inherited
environment is cleared, no shell/socket/network is used, and owner Drop kills,
waits and joins its reader. Positive response timeouts are capped at 30 seconds.
The test suite uses three seconds, or ten milliseconds for deliberate timeout.
Two requests reuse one PID; cancellation allows later reuse; killed-child,
timeout and panic tests assert reaping. Missing Python skips cleanly.

## Parity classes and profile

scripts/check-planning-worker.sh builds an offline temporary Rust harness from
reviewable sources in tools/planning-parity. It starts from kernel's committed
lockfile versions and the published pin; its temporary lockfile is never
committed. Its build target belongs to devshell. No package is downloaded.
The script then runs kernel's real-worker tests in a separate sequential Cargo
invocation using kernel's own target. Both check-all.sh and test-all.sh include
this suite. Python is optional; all CPU and in-memory parity checks always run.
A missing UBU_WORKER_TEST_PYTHON interpreter selects the documented clean skip.
Pytest tests can separately run when pytest is already available; no check
installs it. The operator authorized its installation once for this execution.

The four stage names are skeleton_sampling, affect_legitimacy_filter,
value_scoring and monte_carlo_rollout. CPU-only goldens freeze actual existing
CPU reference responses and structured stage snapshots. These are ordinary
semantic lists, not padded device tensors or a new tensor layout. The snapshot
calls existing CPU partitioning, candidate generation, legitimization and score
functions; it records stage-3 scores before rollout and stage-4 summaries after
it. This oracle does not claim any device stage has been implemented.

Exact comparisons cover schema decoding, chunk partitioning, task-slot
validity_mask, dependency feasibility, hard-constraint feasibility, rejection
classes and CPU-certified selected Plan validity. feasible_mask and
value_scoring.top_k_indices are exact too. Request seed, effective rollout
count, schema, candidate order and profile identity are exact context. Native
CPU schedule validation and independent dependency/window/anchor/duration
checks provide the feasibility evidence; certification remains CPU authority.

Tolerance comparisons cover floating-point scores (including composite_scores),
rollout frequencies, probability intervals and schedule-diversity scores.
Profile boundary-v1 accepts abs(a-b) <= 1e-9 + 1e-9 * max(abs(a), abs(b)), using
absolute and relative tolerance 1e-9 each. Shape, keys, missing/null values,
booleans, masks, indices, seed and rollout count never receive float tolerance.
All pass-through classes additionally compare exactly. Tests mutate a frozen
fixture within profile and beyond it, exercise every exact class independently,
and check absolute/relative bounds, numeric shape and seed/count mismatches.
The profile name is recorded as engine_provenance.tolerance_profile.

Goldens regenerate only through an explicit maintenance command:

```sh
./scripts/check-planning-worker.sh --freeze
```

Normal checks never rewrite them. requests.json contains only invented fixture
requests copied from the existing kernel corpus, with 64 rollouts and top_k 3.

## Persistence and the pre-ticket golden

Responses and newly admitted Plans carry actual CPU provenance. Plans carry
replay_metadata too; older records retain absent metadata instead of invented
past certification. planning.gpu_enabled is an ordinary boolean Setting,
default off. Policy-on reports missing GPU implementation, unverified
PyTorch/CUDA suitability and unavailable GPU budget justification; Python can
be located without being run or assumed suitable. CPU remains selected.

Runner scenario 36 recreates the invented Task store and supplied stable request
used to capture the pre-ticket P1B-69 binary's Plan. It byte-compares the entire
pre-existing Plan-field projection to fixtures/planning-worker/pre-ticket-plan.json,
including placements, candidate scores, alternatives, risk and quality reports.
Only the original volatile Task/Plan identifiers and three explicit timestamp
paths are normalized: Plan created_at, risk_report.generated_at and
human_complete_plan_quality.generated_at. Their UTC timestamp shape is checked
before normalization. Every other risk/quality field remains compared.
Only the new root engine_provenance and replay_metadata fields are excluded;
they are asserted independently. The expanded persisted record cannot be
raw-byte identical after additive metadata, which the operator approved as a
correction. The orchestration suite independently compares the actual stored
JSON to the returned Plan. No planner semantics or rehearsal steps change.


## The standing no-Python guard

The negative-environment trial found a pre-existing mandatory Python call in
check-all.sh's test-patch-config.sh, independent of the new worker. Section G
ports that guard to Node and its generator's manifest discovery to a small
cached Rust tool. Both shell entry points and all eleven fixture cases remain.
The generator still discovers actual package directories with offline,
isolated-cwd Cargo metadata; parses full TOML including workspace/target/dev/
build dependency tables; resolves aliases; groups by exact Git URL; rejects
missing/outside packages, tracked or unmarked configs; ignores unused/absent
siblings; preserves bytes and mtime on unchanged generation; and removes only
obsolete marked files. All fixture repositories and Git indexes are temporary.
No local patches are generated in any actual constellation repository.

The added parser dependency is toml 0.8.2, with cached serde_json and tempfile.
The helper's manifest and lockfile live only in ignored .cache; all versions
resolve offline from existing cache. This preserves full TOML parsing rather
than using a partial Node parser, and preserves the standing regression checks
rather than skipping them when Python is absent. No npm dependency, Python
package, upstream lockfile, new service or planner behavior changes.
