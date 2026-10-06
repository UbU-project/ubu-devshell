# P1B-70 verification and pins

The invocation boundary and automated verification are published on
`p1b-70-the-invocation-boundary` in seven repositories. The CPU computes and
certifies the answer; an owned persistent Python session echoes it over real
length-prefixed local pipes. No GPU computation, PyTorch dependency, CUDA
requirement or streaming screen is delivered. Operator acceptance remains
outstanding; test counts alone do not establish ticket success.

## Grounding and approved corrections

All twelve repositories began clean on main, and core's schemas-ref checkout
matched its recorded pointer. Fresh origin fetches confirmed P1B-69 merged to
main in UI, orchestrator and devshell at the ticket's required revisions.
No AGENTS.md added another workflow. Design, UI, brand, Quick UbU and
model-committee remain unchanged. No model-committee rank was run.

The operator approved corrections 1, 2, 3, 4 and 6, and explicitly authorized
one local pytest installation and its dependencies instead of correction 5.

1. **Actual implementation version:** kernel CONTRACT says “The schema version
   remains `planning-kernel-contract/0.1`.” Its 0.2 bump is tied to deferred
   split-policy. Preserving actual 0.1 avoids an unrequested breaking change
   across the read-only UI and other consumers. New frame/provenance additions
   cause no bump. The design's intended 0.2 remains a reported gap, not an edit.
2. **Legacy invocation profile:** current typed DTOs and required design 0.2
   objects differ substantially, including Unix coordinates. The wire adapter
   converts every serialized typed coordinate to whole-second RFC3339 UTC and
   back, adds replay envelope only, and explicitly names this legacy 0.1
   profile. It neither changes scoring inputs nor pretends to implement the
   missing policies and diagnostic object. Read-only design mentions the old
   advice pair as optional implementation envelopes; removal is permitted,
   but an all-document name-absence claim would be false.
3. **Golden comparison:** adding required persisted provenance changes the
   expanded record's bytes. A pre-ticket binary captured the complete old
   Plan-field projection over invented stored Tasks and a supplied stable
   request. The test normalizes only existing volatile Task/Plan IDs and three
   generation timestamps, excludes only new root engine_provenance and
   replay_metadata, and independently asserts those additions. Every other
   old field, including risks, quality, scores and alternatives, stays compared.
   This avoids either withholding provenance or falsely claiming expanded
   raw records are byte-identical.
4. **Response-level boundary:** “PlannerStrategy implementations generate
   candidates only.” Transporting a completed PlanningResponse as CandidateSet
   would repeat certification/scoring or invent candidate fields. The new
   wrapper runs the unchanged CPU pipeline once and sends two separately
   framed inputs, each carrying one semantic object: request, then reference
   response. Python echoes one final_response. Returned typed candidates are
   CPU-checked against the retained answer. Actual provenance remains
   cpu_reference / in_process_cpu; an echo is not a PyTorch/GPU computation.
   Device candidate production stays later work.
5. **Pytest exception instead of substitution:** installation succeeded in a
   local private virtual environment. Installed packages were pytest 9.1.1,
   iniconfig 2.3.0, packaging 26.3, pluggy 1.6.0 and pygments 2.21.0. Pytest ran
   eleven tests successfully. No torch/numpy, worker package, CUDA component
   or unrelated Python package was installed; pip was not upgraded. This
   satisfies the requested pytest run instead of silently substituting unittest.
6. **Pins:** devshell is one of seven changed repositories and has no self-pin.
   Exactly six upstream pins move; three read-only pins remain. Extra internal
   worker crate entries are named separately from the five original Git-source
   chain rows, rather than describing the whole lockfile as five changed lines.

## Governing sentences and sections

The following documents were read before the corresponding implementation.

| Section | Governing sentence | Result |
|---|---|---|
| All / envelope | Planning contract §1: “The frame envelope is allowed to carry process-management fields such as frame type, cancellation, error details, and telemetry, but planning semantics are only the typed contract objects in this file.” | Two inputs, one semantic object each; controls add no planning schema. |
| All / time | §1: “Timestamps crossing this contract use RFC 3339 / ISO 8601 UTC strings.” | Typed-path conversion, with round-trip and rejection tests. |
| All / provenance | §4: “The committed Plan records the response's `engine_provenance` together with the CPU certification result.” | Actual CPU provenance on responses and newly admitted Plans. |
| All / frames | §4: “A `final_response` frame carries exactly one complete `PlanningResponse`.” Also: “`engine_error` and `cancelled` frames are transport outcomes and do not certify a Plan.” | One batch final; separate transport failure/cancellation and retained CPU response. |
| All / streaming | §4: “The CPU may surface a streamed chunk only after CPU certification of that frame's partial response.” | Chunk type/codec implemented, no chunk surfaced. |
| A | schemas CONTRACT: “Cross-file `$ref` values must use absolute `$id` URIs.” P1B-67 A's schema/fixture work was the worked precedent. | Closed frame/provenance schemas, sequence extension, new fixtures; old pair removed. |
| B | core CODEGEN: “This crate uses the `schemas-ref/` submodule only for fixture compatibility tests.” CONTRACT: “Compatibility is checked by round-tripping canonical fixtures from `schemas-ref/fixtures` when the submodule is available.” | Whole fixture coverage of both new types and sequence; no runtime schema dependency. |
| C | Prompt: “Core `rev` only, one commit each.” Pin convention: “Push a branch before pinning it.” | Store/adapter manifest and lock source only; no source or migration changes. |
| D | kernel CONTRACT: “PlannerStrategy implementations generate candidates only.” ADVISORY: “The controller validates before enqueueing, even for injected transports.” | Unchanged candidate strategy; response wrapper, codec, stub, ownership and CPU checks. |
| E | kernel CONTRACT: “`ubu_planning_cpu` provides the default deterministic generator for Phase 1 fixture mode.” Design D0283: “The semantic contract remains a pure planning function over `PlanningRequest` and `PlanningResponse`.” | Python never computes a replacement Plan; only echoes the existing CPU response. |
| F | SETTINGS: “They are **not Preferences**: they express no pairwise value judgment and never enter Preference layering.” Orchestrator CONTRACT: “The orchestrator does not certify plans itself.” PLANNING_TIME: “Steps persist `start_at` and `end_at` as RFC 3339 UTC strings alongside numeric `start` and `end`.” | Ordinary boolean Setting, actual kernel provenance, JSON Plan metadata; old placement representation retained. |
| G | CONTRACT_CHECK: “The boundary: **anything assertable over HTTP is a scenario here, never a manual step there.**” BUILD_ENV: “Run Cargo invocations sequentially across repositories”. D0283: “Goldens include CPU-only fixtures so contributors and CI systems without a GPU can run the certification suite.” | Parity oracle, bounded process suite, scenario 36, unchanged rehearsal and one-job checks. |

Design §16.10–16.10.5 and D0283/D0284/D0285/D0289/D0290 were also read.
The grounding contradictions are resolved only through the approved corrections;
the canonical design contract is unchanged. The provenance enums and field set
agree with §4; framework is required as pytorch only for desktop gpu_worker.

Section E was committed before D so D's real-process tests could run the
repository's own **committed** module with a clean per-section commit. There
is still exactly one kernel commit per letter, one C commit per consumer and
one commit for each other section. No force-push or extra upstream commit was
needed. Only devshell's G commit carries Co-Authored-By.

## Published chain and submodule

| Repository | Before | Published upstream revision |
|---|---|---|
| ubu-schemas | `926636041ded437d101aa51bb123559f52bc155e` | `070d0a6f9a6ad7833dd523042925008316ce923b` |
| ubu-core | `46135fea0312bab3606e467c3012d7327096d400` | `fa26bf678977f5e077229eb97a39cc1b8b960c9b` |
| ubu-store | `b80787d86c235a754b285cb80c800fea2e178e54` | `83a099f55220b1286ffb2dee3c9d19006e2090b5` |
| ubu-github-adapter | `2a253029b8dea8a824aff970532face21a6c354e` | `e14a43b47aeb0a928f4dfdc83cd78ea9a2e044f6` |
| ubu-planning-kernel | `8413a270cd2525b515501563e78fde474f112f48` | `a2957a3f4edb1fec2b86b7f9fe632ded735820e5` |
| ubu-orchestrator | `f610d321219ab9f64150acc2191cecf8188f64a3` | `b42cadd9b3a6a010021a080e5a4f4af16ac2095a` |
| ubu-devshell | `d25cff72101f02f0e6ea3952b3010c0f97478ed6` | The G commit containing this report; intentionally no self-pin. |

Kernel E's intermediate Python commit is
`c116d1c0941e06f460b692124167fde8f5420071`; D is the final kernel revision above.
All six upstream branch commits are published before pinning. show-revs.sh
reports nine OK rows, with each pin present on origin.

| Read-only pin | Revision | State |
|---|---|---|
| ubu-ui | `698a15fde8244dca96a03b07ad144a4c2b65af15` | main; unchanged |
| ubu-design | `7313e82f7fb835965bc18521b10f897b238b65dc` | main; unchanged |
| ubu-brand | `faf2005a8bd9e64742dd76ee6d1f91f45223946b` | main; unchanged |

Core's schemas-ref gitlink moved from
`926636041ded437d101aa51bb123559f52bc155e` to
`070d0a6f9a6ad7833dd523042925008316ce923b`.
Its checkout matches the recorded new pointer. It is the non-Cargo chain link.
The schema version stayed planning-kernel-contract/0.1 throughout.

## Landed canonical frame and provenance, verbatim

These definitions are copied verbatim from core. Their serde attributes fix
wire spelling; kernel composes typed legacy request/response payloads into the
opaque object fields, avoiding a reverse dependency from core to kernel.

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BackendKind {
    CpuReference,
    GpuWorker,
    MobileCpu,
    MobileGpu,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum InvocationKind {
    InProcessCpu,
    PersistentPythonWorker,
    InProcessMobile,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CpuCertificationStatus {
    NotYetCertified,
    Certified,
    RejectedByCpu,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FrameType {
    ChunkResult,
    FinalResponse,
    EngineError,
    Cancelled,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct EngineProvenance {
    pub backend_kind: BackendKind,
    pub invocation_kind: InvocationKind,
    pub engine_version: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub framework: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub framework_version: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub device_summary: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tolerance_profile: Option<String>,
    pub cpu_certification_status: CpuCertificationStatus,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PlanningStreamFrame {
    pub schema_version: String,
    pub request_id: String,
    pub frame_index: u64,
    pub frame_type: FrameType,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub chunk_depth: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub chunk_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub partial_response: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}
```

Core validate checks version, nonempty identity, the variant's required and
forbidden payloads, positive chunk depth and nonempty provenance strings;
gpu_worker requires framework pytorch. Sequence validation requires index zero
first, strictly increasing indices, one request identity and exactly one final,
error or cancelled terminal at the end. Semantic validation is explicit after
serde decoding, not an automatic custom Deserialize implementation. Schemas
close additional properties and enum sets. The sequence schema uses the
validator's established extension style; it adds no schema-validator dependency.

The retired capacity/recommendation pair, both worker schema files, four
fixtures and their round-trip calls are removed. Old Rust protocol/no-op
process code, old Python module/no-op test and advisory fixture files are gone.
No executable or editable implementation imports or wire references remain.
Historical verification reports and read-only design can retain those names;
they are not active interfaces. The gpu-advisory directory/package basename
remains, as requested, with the new ubu_planning_worker module and P1B-70
session instructions. The torch extra stays empty, with an explicitly
unassigned later-stage follow-up to P1B-70; no future ticket number is invented.

## Precise remaining conformance gap

This is the approved legacy 0.1 profile, not a full implementation of the
canonical design's 0.2 PlanningRequest/PlanningResponse.

The internal PlanningRequest still uses optional schema_version, flattened
tasks/topological_order, u64 time_window start/end, per-Task dependency lists,
legacy window start/end and Static-anchor start. It has no mandatory typed
planner_version/effective_time/generated_at envelope; the wire adapter supplies
those replay fields. delivery_mode, planning_delta_seconds, max_planning_tasks,
n_candidates/k_candidates/max_wall_clock_ms budget shape, nested task_graph
with dependency_edges, universe_state_snapshot/payload_policy_summary,
constraint_policy, and privacy_and_provenance/payload_safety_proof are absent.
affect_profile remains optional. Internal prior_plan remains serde-skipped;
CPU computation already consumed it before any echo. Task split_policy and
piece metadata, explanation/debug request options and external assumptions
are not delivered by this ticket. Time **representation** is adapted on the
pipes, but those legacy field names/shapes are not silently renamed to 0.2.

PlanningResponse now carries planner_version, rng_seed_echo, effective_time,
generated_at and exact engine_provenance. The pure standalone kernel records
its supplied window's logical fixture time and reads no wall clock; live
orchestration supplies generation time through its clock. This explicit fixture
clock convention is not a claim that standalone calls discover wall-clock time.
Existing planning inputs, certification, ranking, scores, rollout and placements
are unchanged.

Its diagnostics remain Vec<Diagnostic>, and unplaced_tasks remain top-level.
The design requires a diagnostics object with candidate_counts_by_stage,
n_skeleton_candidates, n_after_affect_filter, n_after_value_scoring,
n_finalists_rollout, rejection_counts_by_reason, warnings,
skeleton_failure_diagnostics, nested unplaced_tasks and probability_quality.
Optional coverage/continuation/telemetry data likewise remain in current
candidate-local forms rather than being reshaped into that object. Legacy
skeleton diagnostic naming differs, including task_id vs task_ref, and the
complete design failure payload is not newly delivered. No deliberate waiver
for top-level unplaced_tasks flattening was found anywhere in ubu-design;
that unrecorded divergence is a finding. Its local kernel CONTRACT documents
partial current 0.1 behavior, but does not amend canonical design.

No GPU stage, tensor layout, streaming consumer, mobile execution profile,
split-policy, new duration model, coverage policy or provisional subject
ratification is added. Clarify prose/decomposition split-point decisions and
existing open coverage questions remain untouched.

## Transport, ownership and selection

PlanningTransport::exchange takes one typed PlanningRequest and the completed
CPU PlanningResponse and returns a PlanningStreamFrame. StubTransport uses the
same pure codec in memory. The response wrapper computes CPU once, decodes and
checks the returned typed answer against it, validates returned schedules and
retains the CPU reference. It never reinterprets a response as CandidateSet,
reruns scoring through another strategy, or surfaces an uncertified chunk.

The prefix is unsigned four-byte big-endian length, 1 through 1,048,576 UTF-8
JSON bytes. Both languages assert kernel's same golden-frames.json bytes.
Coordinate conversion names typed paths explicitly: request time_window,
Task window/Static anchor, affect observation times, response schedule
start/end and coverage boundary_start. Durations, indices, seeds and arbitrary
affect dimension names are untouched. Numeric/non-UTC/fractional/out-of-range
wire coordinates are refused; valid coordinates round-trip losslessly.

WorkerSession's real construction sites are kernel invocation tests' real
helper and missing-interpreter test, plus devshell's failing_owner example.
No orchestrator, UI or advisory test constructs it. It runs only kernel's own
committed local module, clears inherited environment, opens no socket, installs
nothing and owns stdin/stdout, Child and its reader thread. Drop kills and waits
for the child and joins the reader. Timeout is positive and capped at thirty
seconds; tests use three seconds or ten milliseconds for the timeout case.
Session persistence serves two requests on one PID; it is never a daemon.

Crash, timeout, failed certification or cancellation return a separate
transport_status engine_error and an engine_error/cancelled outcome frame,
then retain the real CPU answer and its actual CPU provenance. That answer's
own planning status stays authoritative; transport errors do not certify it.
The killed-child, cancelled-session reuse, caught owner panic and timeout
checks reap their children. G additionally runs an **uncaught** synthetic
owner panic: its process exits 101 and the recorded child PID no longer exists.
No orphan survived that failing run. Worker tests install no signal handler;
no signal handler is introduced anywhere. Existing runner cleanup is preserved.
The five-condition exemption is recorded in ACCEPTANCE.md and grants no new
advisory/orchestrator/UI process permission. Standing generator tests retain
only their prior local Cargo/Git fixture operations.

planning.gpu_enabled is an ordinary boolean Setting with absent/default false,
validated user admission and withdrawal through existing routes. Default off
performs no environment probe. Policy on locates Python files without running
them and reports missing GPU stage, unverified PyTorch/CUDA compatibility,
and unavailable GPU compute-budget justification. All three prerequisites
are required by the CPU gate; actual device compatibility and measured budget
justification are not invented before any device stage exists. CPU remains
selected. Environment detection downloads/installs nothing and starts no child.
Every live planning response and newly admitted Plan carries actual CPU
provenance/replay; old records retain absent metadata without fabricated
certification. Persisted JSON is tested against the returned Plan, including
both new additions. No HTTP route or UI control is introduced.

## Parity oracle, no-Python proof and standing guard correction

The governing §5 sentences are:

> Schema decoding, chunk partitioning, task-slot `validity_mask`, dependency
> feasibility, hard-constraint feasibility, rejection classes, and CPU-certified
> selected Plan validity must match exactly.

> Floating-point scores, rollout frequencies, probability intervals, and
> schedule-diversity scores match by documented absolute/relative tolerances or
> statistical acceptance tests tied to rollout count and seed.

The CPU-only oracle freezes four invented requests and actual reference
responses, plus structured snapshots from existing CPU functions. Stage keys
are skeleton_sampling, affect_legitimacy_filter, value_scoring and
monte_carlo_rollout. validity_mask, feasible_mask and top_k_indices are exact;
composite_scores and the other four numeric classes use boundary-v1:
abs(a-b) <= 1e-9 + 1e-9 * max(abs(a),abs(b)). Seed, effective rollout count,
profile identity, shape, masks, indices, missing/null values and booleans are
never fuzzed. Raw pass-through snapshots and full responses additionally
compare exactly. Every exact class is independently perturbed; numeric
fixtures within profile pass and beyond profile fail. Absolute/relative
bounds, shape, seed/count and all numeric classes are exercised. The profile
name travels on engine_provenance.tolerance_profile. No device tensor layout
or new GPU stage is claimed by these semantic snapshots.

The real-worker suite passed with Python available. Then check-all.sh passed
with a private executable allowlist containing no python/python3/pytest/nvcc,
an explicitly nonexistent UBU_WORKER_TEST_PYTHON path and CUDA devices disabled
for the trial. All mandatory CPU, codec/parity and standing hard-boundary
checks ran. Five interpreter-dependent kernel bodies and G's failing-owner
process check explicitly reported SKIP, rather than claiming a real worker ran.
The explicit missing interpreter avoids a platform's default executable-search
fallback to the host's installed Python. The host was not uninstalled or
reconfigured; this is an unavailable-environment trial. No worker code imports
torch/numpy or loads CUDA; no GPU device was required. The standing fixture-demo
quarantine remains visibly reported and unchanged.

The first no-Python trial exposed check-all.sh's pre-existing unconditional
Python patch-config guard. Removing this dependency was necessary **inside
G's explicit no-Python requirement**. The standing generator's manifest logic
is ported to an offline cached Rust helper using full TOML parsing; its fixture
suite is ported to Node built-ins. Both shell entry points and all eleven
original regression cases remain, with an added complete legacy-byte assertion.
Aliases, package directories, virtual workspaces, inheritance, target/dev/build
and workspace declarations, unused/absent siblings, stale marked removal,
tracked/unmarked refusal, missing-package refusal, relative paths, unchanged
bytes/mtime and ignore warnings retain their contracts. Actual constellation
patch files were never generated; all test Git indexes/configs are temporary.
This was chosen over skipping a standing guard or hand-parsing only a TOML
subset in Node. It installs no npm/Python package and changes no planner logic.
The final no-Python check ran the entire guard and passed.

## Pre-ticket golden and test corrections

The baseline capture used the unchanged P1B-69 binary before any kernel/core
consumer planning changes (schema editing had begun but that binary was still
the pre-ticket one). It created two invented stored Tasks and supplied fixed
request_id fixture-golden, seed 17, durations 300/420, dependency and time
window, with rollout disabled. Scenario 36 repeats that exact fixture.

The complete prior-field projection is byte-identical. Only two captured Task
IDs and the Plan ID are replaced by stable fixture IDs. The three explicitly
volatile timestamp paths are Plan.created_at, risk_report.generated_at and
human_complete_plan_quality.generated_at; valid UTC shape is checked before
normalization. Only newly added root engine_provenance/replay_metadata are
excluded; both are independently asserted on response and Plan. Placements,
all scores/probabilities, every alternative, risks and all other quality fields
remain in the byte comparison. Current Calendar also reads the admitted Plan;
policy-on preserves its selected candidate and withdrawal restores default off.

Two new-test mistakes were corrected and are reported explicitly. The first
full walk passed the old 35 scenarios but exposed that the golden initially
normalized only created_at; recursive comparison found **only** the two old
report generated_at timestamps differed. The approved volatile-timestamp
normalization was completed without excluding or changing semantic fields.
The next walk reached withdrawal and caught my default expected-200 mistake:
Setting DELETE has always returned 204. The new test now expects its established
204 response. No implementation or pre-existing test was changed for either.
The final complete walk passed all 36 scenarios.

## Verification and unchanged rehearsal

| Repository / check | Final result |
|---|---|
| schemas A | 2 Rust tests, 1 Node regression; 98 valid and 118 invalid fixtures, 216 total; 84 schemas generated/casing checked; fmt and Clippy pass. Generated TypeScript is locally regenerated but ignored, not falsely listed as a committed artifact. |
| core B | 166 tests, including whole new frame/provenance/sequence fixtures and optional-field coverage. |
| store C | 110 tests; core manifest/lock source only. |
| adapter C | 23 tests; core manifest/lock source only. |
| kernel D | 96 Rust tests; Clippy clean after fixing two new test-only warnings before commit. |
| kernel E | 11 pytest tests; real session persistence/lifetime additionally tested by D/G. E's unchanged Rust baseline was 83 tests before its clean commit. |
| orchestrator F | 633 tests, up from 628; Clippy identical at 8 unique warnings before/after. |
| UI, read only | 212 tests in 25 files; no source, endpoint constants or generated-client edit. |
| devshell G | 5 parity tests, 11 preserved patch-config fixture cases, reused 8-test worker invocation suite, uncaught failing-owner lifetime check, full scenario walk and no-Python check-all pass. |
| Acceptance staging | 11 seeds staged and checked for the existing 1 harness step; throwaway store removed. No operator acceptance performed. |
| HTTP inventory | 56 OpenAPI paths, 43 endpoint *_PATH constants; no path/constant/kind/predicate added. |

```text
RESULT: 36 of 36 scenarios passed, 0 failed, 2 skipped, 667 requests, all to 127.0.0.1
```

The two skipped live scenarios are explicitly unrun Google and Ollama checks,
not successes. No real Google, Ollama, Quick data, editor or operator store was
reached. The live rehearsal is byte-identical to P1B-69, including its existing
fourteen steps and nine copy-back items; no step is added or revised. SHA256:
`695d924f0c765db6d9671f93241d4ace2761ed2248c6a3f4d02fd40885ed375a`.
Anything differing in that unchanged operator rehearsal is this ticket's defect.

## Dependencies, lockfiles and runtime constraints

New internal Rust crates are ubu_planning_worker_protocol (replacing retired
ubu_planning_advisory_protocol) and ubu_planning_worker (response wrapper).
Kernel promotes already-resolved time 0.3.47 to direct use for wire timestamps;
no new time version is introduced. Orchestrator adds direct
ubu_planning_worker and transitive ubu_planning_worker_protocol. Its five
original Git-source rows move solely with core/store/adapter/kernel pins;
two additional internal worker rows and their dependencies are named below.
Registry package versions in committed upstream lockfiles do not change.

```text
ubu_core
source = "git+https://github.com/UbU-project/ubu-core?rev=fa26bf678977f5e077229eb97a39cc1b8b960c9b#fa26bf678977f5e077229eb97a39cc1b8b960c9b"

ubu_github_adapter
source = "git+https://github.com/UbU-project/ubu-github-adapter?rev=e14a43b47aeb0a928f4dfdc83cd78ea9a2e044f6#e14a43b47aeb0a928f4dfdc83cd78ea9a2e044f6"

ubu_planning_core
source = "git+https://github.com/UbU-project/ubu-planning-kernel?rev=a2957a3f4edb1fec2b86b7f9fe632ded735820e5#a2957a3f4edb1fec2b86b7f9fe632ded735820e5"

ubu_planning_cpu
source = "git+https://github.com/UbU-project/ubu-planning-kernel?rev=a2957a3f4edb1fec2b86b7f9fe632ded735820e5#a2957a3f4edb1fec2b86b7f9fe632ded735820e5"

ubu_planning_worker
source = "git+https://github.com/UbU-project/ubu-planning-kernel?rev=a2957a3f4edb1fec2b86b7f9fe632ded735820e5#a2957a3f4edb1fec2b86b7f9fe632ded735820e5"

ubu_planning_worker_protocol
source = "git+https://github.com/UbU-project/ubu-planning-kernel?rev=a2957a3f4edb1fec2b86b7f9fe632ded735820e5#a2957a3f4edb1fec2b86b7f9fe632ded735820e5"

ubu_store
source = "git+https://github.com/UbU-project/ubu-store?rev=83a099f55220b1286ffb2dee3c9d19006e2090b5#83a099f55220b1286ffb2dee3c9d19006e2090b5"
```

Devshell's temporary parity crate reuses serde_json and the four published
kernel crates. Its transient lockfile starts from kernel's committed versions.
The Python-free patch helper adds toml 0.8.2 and uses cached serde_json 1.0.151
and tempfile 3.27.0; parser dependencies include serde_spanned 0.6.9,
toml_datetime 0.6.3, toml_edit 0.20.2 and winnow 0.5.40. These helper manifests
and locks exist only in ignored local cache/temporary directories. There is
no new committed devshell Cargo.lock, no dependency download, no patch override
and no machine-specific path in a commit. These are development tooling,
not a new planning dependency or semantic input. The complete helper-only
cached registry graph (also naming transitive versions) is: bitflags 2.13.2, cfg-if 1.0.5, equivalent 1.0.2, errno 0.3.14, fastrand 2.5.0, getrandom 0.4.3, hashbrown 0.17.1, indexmap 2.14.2, itoa 1.0.18, libc 0.2.189, linux-raw-sys 0.12.1, memchr 2.8.3, once_cell 1.21.4, proc-macro2 1.0.107, quote 1.0.47, r-efi 6.0.0, rustix 1.1.5, serde 1.0.229, serde_core 1.0.229, serde_derive 1.0.229, serde_json 1.0.151, serde_spanned 0.6.9, syn 3.0.6, tempfile 3.27.0, toml 0.8.2, toml_datetime 0.6.3, toml_edit 0.20.2, unicode-ident 1.0.26, windows-link 0.2.1, windows-sys 0.61.2, winnow 0.5.40, zmij 1.0.23.

Source env.sh before Cargo, one Cargo job, sequential across repositories:
**no env.sh constraint was relaxed, no two-job trial was used, and no OOM
occurred.** env.sh itself is unchanged. The only package-install/network
exception beyond Git was the operator's one-time pytest/dependency permission.
An initial store test could not create the new Git checkout in the sandbox,
then offline Cargo lacked its schema submodule revision; importing already
committed revisions from local repositories into the normal Cargo caches and
rerunning resolved it. No registry fetch or configuration patch was needed.

Clippy's orchestrator unique-warning set is the unchanged eight: clone_on_copy,
cloned_ref_to_slice_refs, collapsible_match, filter_map_bool_then,
needless_question_mark, useless_vec, and too_many_arguments at 8/7 and 11/7.
No new warning is concealed or added. Full native/new-tool checks and privacy
review precede the G commit; final inventory is checked again after publication.

## Privacy and acceptance boundary

All fixtures are invented. Local acceptance artifacts remain excluded through
local Git metadata only; neither their names nor contents are included in
outgoing commits. Their contents were never opened. The audit checked outgoing
commits, staged additions, operator-protected keys and machine-specific paths
without printing those names/keys or committing exclusions. No credential,
OAuth pickle, real calendar id/title, Task description, private fact key/value
or real Quick data was committed. All twelve final working trees are clean,
and schemas-ref matches its recorded gitlink; read-only repositories retain
their original heads. No Co-Authored-By exists outside devshell.

Operator acceptance has not been performed; the step under test is the unchanged rehearsal producing exactly what P1B-69 produced.
