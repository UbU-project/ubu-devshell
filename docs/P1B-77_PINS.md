# P1B-77: interpreter provenance and precise environment faults

## Grounding and governing sentences

All twelve repositories began clean on main. P1B-76 was merged at the stated
orchestrator, UI and devshell heads. The nine read-only repositories remain
unchanged. The operator approved three grounding corrections before editing:

1. The P1B-74 driver reference already said “The executable may use
   UBU_PLANNING_WORKER_PYTHON to select an installed interpreter.” The claim of
   total documentation absence is withdrawn. Prerequisite/configuration-table
   entries, absolute-path guidance and the new probe budget are added instead.
   Removing the existing mention or pretending to introduce selection would
   misdescribe the implementation and obscure the actual usability gap.
2. liveConfig had five invalid_private_inputs throw sites; the sixth was in
   runActions. validAuthoringInputs had six return-false sites, including loops
   and combined conditions. The report inventories actual field/rule refusals,
   rather than forcing fifteen. Splitting shared conditions preserves admission
   rules while making the cause visible; weakening or arbitrarily counting them
   would not meet the ticket's diagnostic intent.
3. Cargo advances only the three specified kernel dependencies. The kernel and
   orchestrator inventory entries also advance to their published heads under
   the standing inventory policy. Leaving inventories stale would fail HEAD
   equality; changing unrelated consumer dependencies would exceed scope.

The ticket's thesis is quoted in ACCEPTANCE.md's historical P1B-72 section:
**“An acceptance instrument that asks a human to transcribe will grow a branch
for every absence, and the branches are a sign the wrong party is reading.”**
P1B-73 makes its operational constraint explicit in rules 10/11. The thesis is
historical wording, not a revival of P1B-72's withdrawn comparison procedure.
No extra invocation, tally, transcription, absence phrase or human diagnostic
branch is added. P1B-77's corollary governs the implementation: “a reason code
that names a condition without naming what was tested asks the operator to
guess, and the guessing is a sign the wrong party is diagnosing.”

| Section | Governing quotation from the required reading | Constraint |
|---|---|---|
| All | ACCEPTANCE.md: “A manual step exists only for rendering.” / “A manual instrument has one line of execution.” | Diagnose deterministic facts in code; preserve consent, approval and three judgments. |
| A | worker lib.rs: “Verified by a bounded owned interpreter, never imported into Rust.” | Retain the selected interpreter command and closed source in the existing owned probe. |
| B | session.rs: “The only executable is a caller-selected Python interpreter; its module and import root are fixed to this repository. No shell or user payload.” | No new executable, payload or spawn permission; timeout remains inside the existing ceiling. |
| C | session.rs: “its module and import root are fixed to this repository.” | Validate the same compiled root that is passed to the child, including the current package directory. |
| D | stage1.rs: “Never widen a numeric tolerance here.” | Preserve assemble byte-for-byte and CpuStrategy fallback authority. main.py: “No warning text/path is serialized; the owned check must reject any warning.” preserves the existing bounded probe response and warning check. |
| E | planning_worker_runtime.rs: “No orchestrator test can reach this probe or instantiate the owned worker transport through application state defaults.” | Executable supplies held facts; library/API tests inject facts and never spawn. live-rehearsal-report.mjs: “Public projection: never serialize an API object, arbitrary string, or key.” keeps diagnostic messages private. |
| F | LIVE_REHEARSAL_DRIVER.md: “Screen: private operator content. File: public copy-back.” | Document private environment selection; keep command/path and observed version off the public artifact. |
| G | live-rehearsal-contract.mjs: “The source agreement check asserts these against Rust.” | Preserve name/value/root/pair validation and return only safe structural fields and closed rules. |
| H | setting_authoring.rs: `pub const DEFAULT_ADVISORY_TIMEOUT_MS: u64 = 120_000;` / “A zero would fail every run at once; no ceiling would let one run hold the advisory path.” | Keep the existing default and bounds; document the larger-model requirement explicitly. |
| I | pinned-revs.toml: “Record the expected HEAD SHA here each time an upstream repo lands.” / “Push a branch before pinning it.” | Inventory records published kernel/orchestrator heads; unrelated pins remain unchanged. |

## A–D: environment facts

LocalEnvironment retains the interpreter command exactly as selected, its closed
InterpreterSource, a closed ProbeFailure, Python-found status, Stage 1 status,
PyTorch importability and the privately observed version. The executable uses
LocalEnvironment::detect to preserve the already-existing environment-variable
selection and python3 fallback. An explicit variable equal to python3 still has
named provenance; source is not guessed from the command's spelling.

The source diagnostics are planning_worker_python_environment_variable and
planning_worker_python3_fallback. Only closed source and reason codes enter the
public histogram. The selected command and observed version travel in a private
message, on success as well as failure. Unsupported strategy or missing factory
still returns before a probe and does not fabricate a source observation.
The recorded command is what was asked, not an inferred resolved executable.

| LocalEnvironment fault | Public planning code |
|---|---|
| Interpreter executable not found | planning_gpu_fallback_python_unavailable |
| Interpreter could not start for another OS error | planning_gpu_fallback_interpreter_start_failed |
| Compiled module root absent or not a directory | planning_gpu_fallback_module_root_unavailable |
| Root exists without the current worker package directory | planning_gpu_fallback_module_package_unavailable |
| Invalid operator probe budget | planning_gpu_fallback_probe_budget_invalid |
| Environment response timed out | planning_gpu_fallback_probe_timed_out |
| Send/read/EOF/frame failure or malformed environment reply | planning_gpu_fallback_probe_failed |
| PyTorch unavailable or broken at import | planning_gpu_fallback_torch_unavailable |
| Observed PyTorch version differs from the pinned version | planning_gpu_fallback_torch_version_mismatch |
| Tensor stage marked unimplemented | planning_gpu_fallback_stage_unimplemented |

The existing Python response combines missing and broken imports as unavailable;
this report does not claim to distinguish those two causes. A wrong version is
retained privately even when Python reports importable=false. A timeout produces
only its own missing() fact, not an invented Python/PyTorch absence. A reader
channel disconnect reports EOF rather than timeout. Existing policy, budget,
lock, input, transport, reply and certification reasons retain their closed codes.

The default probe budget is **30000 ms**, raised from 5000 ms to accommodate
cold imports on a machine holding a large local model. Operator warm timing does
not establish a cold-load bound. UBU_PLANNING_WORKER_PROBE_TIMEOUT_MS accepts an
integer **1–30000 ms**, within WorkerSession's existing (0, 30s] ceiling. Invalid
values refuse with a named budget fact instead of silent clamping or an unlimited
wait. The compute transport remains 30 seconds. The no-compute probe never
acquires the compute lock.

session::module_root supplies the identical compile-time relative root to both
validation and PYTHONPATH. validate_module_root requires root.is_dir() and
root.join("ubu_planning_worker").is_dir(). A legacy ubu_gpu_advisory-only layout
therefore returns module_package_unavailable, separately from an absent root.
No actual checkout, venv or default absolute path is committed.

## E: diagnostics and privacy

PlanningWorkerResult is an internal executable-to-library seam, not an API
field. The adapter appends the source diagnostic and the existing generic plus
reason-specific fallback diagnostics. planning_service forwards them through
its existing diagnostic array. No new route, API field or schema version exists.
The driver vocabulary is regenerated by the unchanged lexical source extractor:
**257 → 266 codes**, with seven additional fallback codes and two source codes.
All environment facts/sources project under their own names, never withheld_unknown.

Diagnostic messages are formatted with escaped private command/version text.
The existing private renderer prints messages; the unchanged public projector
reads only whitelisted codes and counts. Independent interpreter/version canaries
appear privately and remain absent publicly. No path or observed version reaches
a public code or the copy-back artifact. Diagnostic counts remain entry counts,
not Task counts.

## F–H: documentation and input remedies

LIVE_REHEARSAL.md prerequisites and its private-variable table now name both
worker variables; LIVE_REHEARSAL_DRIVER.md has corresponding private-configuration
entries. The prerequisite sentence is: **“Set UBU_PLANNING_WORKER_PYTHON to its
interpreter by absolute path; that is the reliable form because the bare python3
fallback depends on the PATH available to the launcher.”** The reference says:
**“An absolute interpreter path is the reliable form because the bare python3
fallback depends on the PATH available to the launcher.”** Activation alone does
not name the worker interpreter. No operator-specific path appears in either file.

validAuthoringInputs now returns null for success or {field, rule} for refusal.
Setting rules are shared with validSetting rather than duplicated. Both liveConfig
and runActions propagate the refusal before effects. JSON errors, live single-root
requirements and the required mutation write have their own contexts. Public
failureLine accepts only the closed rule set and structural field grammar; no
supplied Setting name, category, root, mutation target or value is echoed.
Indices are zero-based. Every refusal has the existing one-fault/one-remedy artifact.

There are **19 closed rule identities and 23 field-pattern/rule combinations**,
including the three array fields and the two applicable locations for root and
duplicate validation. This is the actual inventory replacing the inaccurate
fifteen-fault claim:

| Rule | Public field pattern | Remedy requirement |
|---|---|---|
| json_required | inputs | Parseable JSON. |
| object_required | inputs | JSON object. |
| array_required | settings | Array when supplied. |
| array_required | subjects | Array when supplied. |
| array_required | mutations | Array when supplied. |
| setting_object_required | settings[i] | Setting object. |
| setting_name_required | settings[i].name | String name. |
| setting_name_supported | settings[i].name | Supported Setting name/prefix. |
| subject_root_valid | settings[i].name | Valid provisional root, excluding reserved/governed roots. |
| subject_root_valid | subjects[i] | Valid provisional root, excluding reserved/governed roots. |
| subject_true_required | settings[i].value | Literal true for a provisional root. |
| colour_category_nonblank | settings[i].name | Nonblank category suffix. |
| colour_id_1_to_11 | settings[i].value | String colour id 1–11. |
| boolean_required | settings[i].value | Boolean for planning.gpu_enabled. |
| timeout_ms_5000_to_3600000 | settings[i].value | Integer in the advisory timeout range. |
| review_days_1_to_365 | settings[i].value | Integer in the review-day range. |
| text_nonblank | settings[i].value | Nonblank string for model/endpoint. |
| loopback_origin | settings[i].value | Literal loopback origin with port 1–65535. |
| review_seed_le_ceiling | settings[i].value | Keep seed <= currently effective ceiling in supplied order. |
| subject_unique | settings[i].name | Root appears once across supplied Settings/subjects. |
| subject_unique | subjects[i] | Root appears once across supplied Settings/subjects. |
| one_subject_required | subjects | Exactly one live rehearsal root. |
| subject_mutation_write_required | mutations | A supported state write under the supplied root. |

The generic remedy says: “Correct the named field in UBU_REHEARSAL_INPUTS privately
to satisfy the named rule; see LIVE_REHEARSAL_DRIVER.md.” The reference contains
a rule/field/requirement table, so a refusal is actionable without exposing values.
No accepted input class or the existing subject/mutation requirement is relaxed.

**DEFAULT_ADVISORY_TIMEOUT_MS stays 120000.** The reference explicitly documents
it as a small-model default and requires larger models to supply advisory.timeout_ms;
300000 succeeded for the operator's 27-billion-parameter model. Preserving the
shorter unconfigured wait avoids imposing that model-specific latency on all
requests. The allowed 5000–3600000 range and Rust validator fingerprints remain
unchanged. The probe budget is independent of advisory timeouts.

## Verification

| Check | Accepted baseline | After |
|---|---|---|
| Kernel Rust, locked/offline all targets | 111 passed | 118 passed |
| Orchestrator Rust, locked/offline all targets | 642 passed | 644 passed |
| Pure driver tests | 53 passed | 59 passed |
| Read-only UI tests | 220 passed | 220 passed; build passed |
| Scenario runner | 36/36, 669 requests | 36/36, 669 synthetic loopback requests; live Google and ollama each intentionally skipped |
| Kernel Clippy | 0 warnings | 0 warnings with -D warnings |
| Orchestrator Clippy | 8 distinct warnings | 8 distinct / 9 occurrences, unchanged |
| Closed driver code vocabulary | 257 codes | 266 codes; source agreement passed |
| OpenAPI paths / endpoint path constants | 56 / 43 | 56 / 43; generated OpenAPI byte-identical |
| Standing check-all.sh | required | passed, including build exclusion and CPU parity/owned-worker boundary; existing fixture-demo quarantine retained |
| Owned worker tests outside build lock | existing exemption | 30 passed, no skips, with pinned CPU-only PyTorch |
| Python with pinned CPU-only PyTorch | existing 50 checks | 50 passed, no skips |
| Python without PyTorch | existing 50 checks | 35 passed, 15 explicit skips |

The initial new timeout missing-text test also used an unimplemented-stage
fixture. Its fixture was corrected to represent an implemented stage; production
gating and CPU authority were not changed to satisfy the assertion. Four existing
driver assertions were adapted to the approved null-or-rule return contract;
their admission expectations remain unchanged. Existing kernel/consumer synthetic
ready fixtures were extended for the new held fields, without spawning.

The actual owned-worker suite runs outside Cargo's build lock, with the existing
private pinned CPU-only interpreter and serial test execution. Its 30 tests pass
without skips, including the quiet framework probe and certified CPU tensor
worker checks. Python tests pass 50/50 with this environment. The separate
torch-absent environment passes 35 and skips 15 framework-dependent checks;
those skips are absence evidence, not GPU parity. No CUDA parity is claimed.
No interpreter/package installation, real ollama/Google/editor call, operator
acceptance invocation, new test signal handler or model-committee rank occurs.
The runner retains only its standing owned synthetic loopback exemption. Its
two live Google/ollama scenarios were intentionally skipped. check-all also
reported framework-dependent worker skips in its default torch-absent interpreter;
the separate pinned CPU-only run above exercises those checks without skips.

Byte comparisons verify StageOutput::assemble and exact padded comparison,
including the tolerance comment; compute_lock.rs, spawn_compute and stop/Drop;
all build/test/owned-worker wrappers; planning API/OpenAPI and endpoint module;
and all unrelated Cargo/schema refs. CpuStrategy remains the fallback authority.
One Cargo job, shared nonblocking flock, MemoryHigh=16G/MemoryMax=20G where
available, and P1B-70's five spawn conditions remain unchanged. The probe calls
spawn, never spawn_compute. OpenAPI stays **56 paths**, endpoints.ts **43 path
constants**. Nine read-only repositories remain at their baselines.

Outgoing commit and added-line audits check protected local artifact exclusion,
operator-key canaries and machine-specific paths without opening the excluded
artifacts or printing their names. Final tracked worktrees and remote tracking
are checked after publication. Baseline counts are the accepted ticket counts;
after counts come from this execution's logs.

## I: publication and every pin

All changes publish on p1b-77-worker-probe-diagnostics, with no force-push or merge.
Kernel publishes before consumer resolution, and orchestrator before its inventory
update. The three Cargo.toml dependencies that advance together are
**ubu_planning_core, ubu_planning_cpu and ubu_planning_worker**:
3da928be0d6d8cc6527e616a92d11dbc41d61d35 →
1c0d1b2ba776deae004ab93177983d733d8e020d.
Cargo.lock changes only the four corresponding kernel source URLs, including
the transitive ubu_planning_worker_protocol. No unrelated package version changes.

| Inventory | Full published revision | Disposition |
|---|---|---|
| ubu_schemas | 070d0a6f9a6ad7833dd523042925008316ce923b | unchanged |
| ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b | unchanged |
| ubu_store | 83a099f55220b1286ffb2dee3c9d19006e2090b5 | unchanged |
| ubu_planning_kernel | 1c0d1b2ba776deae004ab93177983d733d8e020d | advanced from 3da928be0d6d8cc6527e616a92d11dbc41d61d35 |
| ubu_github_adapter | e14a43b47aeb0a928f4dfdc83cd78ea9a2e044f6 | unchanged |
| ubu_orchestrator | 755fc131e62759831d209e0f6e0b742e3eb48965 | advanced from a83284a00119d2b2036c2e38f23bfec604c63d1c |
| ubu_ui | 649f8e117a3eec08b5f8581885b06999d187f8a3 | unchanged |
| ubu_design | 9e57b4959fecc39e852b84d2391deb95a93da446 | unchanged |
| ubu_brand | faf2005a8bd9e64742dd76ee6d1f91f45223946b | unchanged |


Every committed Cargo Git pin is recorded here:

| Cargo consumer | Dependency | Full revision |
|---|---|---|
| ubu-github-adapter | ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b |
| ubu-orchestrator | ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b |
| ubu-orchestrator | ubu_store | 83a099f55220b1286ffb2dee3c9d19006e2090b5 |
| ubu-orchestrator | ubu_github_adapter | e14a43b47aeb0a928f4dfdc83cd78ea9a2e044f6 |
| ubu-orchestrator | ubu_planning_core | 1c0d1b2ba776deae004ab93177983d733d8e020d |
| ubu-orchestrator | ubu_planning_cpu | 1c0d1b2ba776deae004ab93177983d733d8e020d |
| ubu-orchestrator | ubu_planning_worker | 1c0d1b2ba776deae004ab93177983d733d8e020d |
| ubu-planning-kernel | ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b |
| ubu-store | ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b |

Core's schemas-ref stays at 070d0a6f9a6ad7833dd523042925008316ce923b. The devshell parity harness template still
uses the inventory placeholder; it gains no literal dependency revision.
No devshell self pin exists. The two remaining non-inventory read-only heads are
quick-ubu 9ccc8b8e302d4e39207b749fb00bc449dc172cf0 and model-committee
4359c557fc8b6228f9da6bbdcd62a4cdf9f26260. Kernel commit
1c0d1b2ba776deae004ab93177983d733d8e020d and orchestrator commit
755fc131e62759831d209e0f6e0b742e3eb48965 are published. The devshell change set
contains the final report, prerequisites/reference/remedies, actual field/rule
validation, closed code vocabulary and inventory; its final commit is reported
by the completion response rather than a circular self pin.

Operator acceptance has not been performed; it is one invocation, and what is under test is whether a failing environment names both which fact failed and which interpreter was asked.
