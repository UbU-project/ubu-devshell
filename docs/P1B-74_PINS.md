# P1B-74 — the gate admits what the validator admits, and the switch does something

Implementation and automated verification are complete. Operator acceptance is
not claimed. P1B-74's opening confirms P1B-73 passed on one invocation; that is
operator evidence supplied by the ticket, not a live run performed here.

## Governing sentences and grounding

**“The CPU kernel must validate any returned candidate before canonical Plan commit.”**
PLANNING_KERNEL_CONTRACT.md §4 governs the authority and persisted provenance:
worker results remain proposals until exact Stage 1 comparison and the unchanged
CPU planning pipeline validate them. No mutation or certification moves to Python.

**“Exact comparison covers every padded value, code, mask and omission, not only the final schedule. Never widen a numeric tolerance here.”**
The stage1.rs sentence governs all padded values and certification. The entire
StageOutput::assemble implementation and its comment were compared as bytes to
baseline ea6b453 and are identical. No numeric tolerance changed.

All required documents and sources were read before editing: ACCEPTANCE.md in
full, P1B-73_PINS.md, driver/report/tests, setting and subject validators, routine
form/client, full stage1.rs and kernel Legacy 0.1 contract, design contract §4/5
and planning_service. CONTRACT_CHECK.md permits the existing sibling-source
contract checks; its endpoint checks already read UI constants. No boundary
contradiction blocks A/C. Twelve repos started clean. P1B-73 5091bf3, 825e98c and
ea6b453 were verified ancestors of both local main and fetched origin/main.

| section | governing sentence quoted | constraint |
|---|---|---|
| A | setting_authoring.rs: “Accept only a literal loopback HTTP origin with an explicit nonzero port.” | the abbreviated nonblank endpoint rule cannot admit off-host or malformed origins |
| B | RoutineFields.tsx: “The category is always one of the tags, as the importer writes it.” | evergreen/category/title/list composition; genuine routine inputs remain operator-owned |
| C | live-rehearsal-report.mjs: “Public projection: never serialize an API object, arbitrary string, or key.” | only source-derived closed codes, never diagnostic messages |
| D | ACCEPTANCE.md: “A figure the operator is shown must be computed over the span it is named after, and a value UbU manufactured in place of a measurement is never presented as one.” | no inferred zeros from omitted fields; selected[] Tasks and actual request limit are named |
| E | stage1.rs: “Never widen a numeric tolerance here.” | all existing CPU fallback conditions and assemble bytes remain unchanged |
| F | PLANNING_KERNEL_CONTRACT.md: “The CPU kernel must validate any returned candidate before canonical Plan commit.” | compatible strategy only; validated response provenance passes through and persists |
| G | pinned-revs.toml: “Record the expected HEAD SHA here each time an upstream repo lands.” | approved two inventory advances match published final heads |

The five concrete corrections were explicitly approved. Their reasons and
alternatives are recorded in ACCEPTANCE.md: the complete established setting
rules; final kernel API and inventory revisions; ten rather than nine reasons;
Greedy compatibility instead of silently changing default ChunkedSweep; and a
separate public reason code instead of exposing messages or adding an API field.
The subsequent explicit torch/numpy installation authorization overrides the
prompt's compute-install prohibition for this execution only. Checks/runtime
still install nothing. No two-job trial or relaxation of env.sh occurred.

## A — one settings allowlist and source agreement

The old finite-name regex admitted advisory.enabled, which Rust refuses: **one
extra finite name**. It omitted **three finite names** accepted by Rust:
advisory.review_seed_days, advisory.review_ceiling_days and planning.gpu_enabled.
It also omitted the entire universe.subject.<root> family and unnecessarily
restricted calendar.color.<nonblank> to lowercase letters/underscores. Thus four
finite names diverged, plus two prefix-family differences; a prefix family is
not misleadingly counted as one concrete name.

SETTING_NAMES is the single finite allowlist, with two named prefixes.
check-live-rehearsal-contract.mjs extracts validate_name match arms, resolves
Rust constant aliases and both prefixes, and compares them with the driver.
Reserved and governed subjects, numeric bounds, defaults and colour IDs are
asserted from source. Lexical fingerprints additionally detect changes to value,
endpoint, pair and root validators without depending on source formatting.
Both check-all.sh and test-all.sh execute the assertion through driver tests.
Deliberate source additions/removals, alias/prefix/root changes fail agreement.

Review intervals are whole days 1–365, with seed <= the currently effective
ceiling; supplied order and fresh-store defaults 7/365 are checked before any
action. The GPU setting is boolean; timeout is 5000–3600000; model is a nonblank
string; endpoint is literal http://127.0.0.1:<nonzero u16> without extra URL
parts; colours are strings 1–11. Subject roots are ASCII lowercase snake_case,
<=64 bytes, exclude reserved and governed roots, require value true, and cannot
be minted twice. Unicode blank handling matches Rust White_Space rather than
JS trim. Unsupported supplied settings fault before effects, rather than
silently skipping an intended GPU opt-in. Rust admission rules are unchanged.

## B — composed routine body and the third field

The driver composes schema_version, mode evergreen and category membership in
tags, selecting the UI's creation fields instead of passing arbitrary root
fields. A **third composed field exists**: the occurrence template title falls
back to the routine title when the form's occurrence-title field is blank.
The driver now composes that too, plus empty tags/reminder lists. Supplied hours,
timezone, recurrence, duration, placement, capacity and template semantics stay
as genuine wire inputs; no clock/timezone/observation is fabricated.

The remaining UI transformations are form-to-wire conversions: HH:MM to
HH:MM:SS, minutes to fixed seconds, ordered weekdays/month days, comma-separated
lists and trimmed text. Private inputs already carry API wire units/arrays.
The report names these rather than treating a form conversion as a missing
server field. The server controls identity, status and version counters.

## C — every current emitted code is known

The vocabulary moves **43 → 256**: **220 previously missing**, **7 stale removed**,
**36 retained**. This includes 17 forwarded kernel Debug enum members, six
NextAction serde enum members and 12 new reason-specific codes. It does not
claim which code produced each of the operator's six unknown entries: no private
response was supplied here. Every currently extracted emitted code is named.

The offline lexical extractor scans only production src Rust, skipping test-only
items. It handles direct diagnostic fields/JSON, constants, code-parameter
helpers/closures, code variables/batches, code-returning functions and forwarded
closed enums. Ambiguous imported constants, new dynamic code formats or changed
enum representations fail rather than silently escaping the extractor. The
committed generated JSON must equal source in both directions. Future source
codes or stale report names fail both standing checks. --write is an explicit
review/regeneration operation, never part of checks or runtime. Value/name
assertions cannot be bypassed by refreshing hashes.

withheld_unknown remains for genuinely unforeseen runtime codes. Every message,
key, title, row, value and private exception remains withheld. New regression
canaries, messages and unregistered codes cannot enter public output.

Previously missing code names (including the new F codes):

CyclicDependency, DependencyOrderViolation, DuplicatePlanTask, DuplicateTaskId, EmptyPlan,
EmptyRequest, ImpossibleWindow, InvalidCandidateTransition, MissingDependency,
MissingSchemaVersion, NotYetImplemented, PlanMissingTask, PreconditionFailed, RolloutDegraded,
RolloutValidation, SkeletonFailure, StaleAffect, StaticAnchorViolation, TargetNotFound,
UnknownSchemaVersion, UnsupportedProposal, advisory_answer_required, advisory_category_changed,
advisory_endpoint_invalid, advisory_force_unsupported, advisory_invalid_limit,
advisory_invalid_result, advisory_invalid_snooze, advisory_limit_unsupported,
advisory_not_a_clarification, advisory_precondition_changed, advisory_precondition_invalid,
advisory_precondition_stale, advisory_proposal_already_queued, advisory_proposal_suppressed,
advisory_target_inactive, advisory_task_id_unsupported, advisory_unknown_producer,
advisory_value_unsupported, all_candidates_blocked_on_preconditions,
all_candidates_blocked_on_unmet_dependencies, bootstrap_already_seeded, bootstrap_seeded,
calendar_event_id_unmappable, calendar_event_skipped, calendar_export_rejected,
calendar_gesture_on_inactive_task, calendar_insert_converted_to_patch,
calendar_live_export_not_enabled, calendar_live_export_unconfigured,
calendar_mock_seed_with_live_export, calendar_move_before_creation,
calendar_move_beyond_horizon, calendar_move_invalid_creation, calendar_move_invalid_window,
calendar_move_not_static, calendar_operation_failed, calendar_projection_conflict,
calendar_reconciliation_already_repaired, calendar_resize_invalid_window,
calendar_resize_not_dynamic, capture_description_too_large, capture_interaction_invalid_window,
capture_interaction_not_dynamic, capture_source_removed, capture_static_required,
clarify_already_queued, clarify_description_too_large, clarify_invalid_answer,
clarify_invalid_task_id, clarify_no_answers, clarify_no_questions, clarify_no_task,
clarify_unknown_question, container_already_superseded, container_segment_partial,
container_segment_scattered, container_segment_uncompilable, cyclic_dependency_graph,
decompose_child_order_conflict, decompose_inactive_task,
decompose_interior_precondition_needs_boundary, decompose_invalid_split_points,
decompose_needs_children, decompose_nested_unsupported,
decompose_routine_occurrence_unsupported, decompose_segment_bounds_disjoint,
decompose_static_child_needs_boundary, dependency_outside_horizon, duration_model_observed,
github_projection_transport_aborted, idempotency_key_conflict, invalid_calendar_window,
invalid_child, invalid_correlation_groups, invalid_duration_estimate, invalid_expected_version,
invalid_horizon, invalid_planning_horizon_days, invalid_quick_ubu_snapshot,
invalid_schedule_timestamp, invalid_task_state, invalid_task_value, invalid_timestamp,
invalid_timezone, invalid_triggered_at, mandatory_occurrence_unplaceable,
missing_github_session_token, missing_github_token, missing_primary_objective,
missing_prior_plan, missing_projection_issue_target, missing_rank_one_candidate,
missing_selected_repo, missing_title, no_active_tasks, no_admitted_tasks,
no_capacity_tasks_to_plan, no_ready_task, non_capacity_dynamic_task_unsupported,
not_a_routine_occurrence, not_a_task, objective_invalid, objective_missing_title,
objective_routine_fields_incomplete, objective_routine_overlap,
objective_routine_requires_evergreen, overlapping_routines,
planning_gpu_fallback_budget_unjustified, planning_gpu_fallback_certification_failed,
planning_gpu_fallback_compute_lock_unavailable, planning_gpu_fallback_input_unsupported,
planning_gpu_fallback_policy_disabled, planning_gpu_fallback_python_unavailable,
planning_gpu_fallback_reply_mismatch, planning_gpu_fallback_stage_unimplemented,
planning_gpu_fallback_torch_unavailable, planning_gpu_fallback_transport_failed,
planning_gpu_fallback_transport_unavailable, planning_gpu_fallback_unsupported_strategy,
planning_gpu_unavailable, precondition_review_changed, precondition_review_resurfaced,
precondition_review_sound, precondition_task_skipped, preference_contradiction,
preference_cycle, preference_cycle_rejected, preference_duplicate_pair,
preference_ignored_unknown_task, preference_objective_pair_unsupported,
preference_self_reference, preference_unknown_task, prerequisite_unplaceable,
projection_conflict, projection_denied, reopen_effects_not_reversed, reopen_no_completion,
reopen_not_completed, reopen_stale_completion, routine_after_cycle, routine_after_infeasible,
routine_after_maximum_infeasible, routine_after_unmatched, routine_no_free_time,
routine_objective_invalid, routine_occurrence_ambiguous_local_time,
routine_occurrence_edge_dropped, routine_occurrence_edit_conflict,
routine_occurrence_nonexistent_local_time, routine_occurrence_not_editable,
routine_occurrence_write_failed, routine_occurrences_overlap, routine_override_invalid_date,
routine_override_invalid_window, routine_override_no_occurrence,
routine_override_occurrence_changed, routine_override_outside_allowed_range,
routine_override_unknown_routine, routine_override_violates_after_bounds,
routine_override_window_too_far, routine_timezone_unknown, setting_duplicate_name,
setting_invalid_advisory, setting_invalid_advisory_endpoint, setting_invalid_advisory_timeout,
setting_invalid_color, setting_invalid_planning_gpu, setting_invalid_review_interval,
setting_unknown_name, snooze_readiness_deferred, stale_calendar,
static_tasks_share_committed_time, subject_already_registered, subject_governed,
subject_invalid, subject_invalid_value, subject_reserved, suggest_tags_occurrence_skipped,
task_effect_application_failed, task_effect_mode_invalid, task_effects_already_applied,
task_precondition_blocked, task_precondition_invalid, task_unplaceable,
time_by_category_invalid_bound, time_by_category_invalid_range, universe_mutation_mode_invalid,
universe_target_grammar_invalid, universe_target_namespace_invalid,
universe_target_subject_unknown, unknown_objective, unknown_projection_conflict, unknown_task,
unknown_task_status, unmanaged_projection_label, unsupported_capture_field,
unsupported_objective_field, unsupported_projection_operation, use_recorded_action

Stale report-only code names removed:

advisory_http_error, calendar_preview_missing, calendar_preview_stale, calendar_session_disabled, capture_colour_collision, capture_recurring_unsupported, precondition_no_task.

## D — truthful collection absence and producer caps

PlanningResponseBody always serializes unplaced_tasks, including []. In contrast,
blocked_tasks and invalid_tasks both have serde(default, skip_serializing_if =
Vec::is_empty), so zero-length collections are intentionally absent on the wire.
This explains the accepted block's unavailable readings. **This is the requested
orchestrator finding; no serializer change was made.** Empty arrays project 0,
missing fields project missing_blocked_tasks / missing_invalid_tasks (and a
missing_unplaced_tasks fault when appropriate), malformed fields project named
invalid_<field>. Missing wire data is not converted into an invented zero.

Both producers now label selected_tasks as the cardinality of selected[] Tasks,
with request.limit read from the actual action record beside it. The driver's
limit remains 25; candidates_enqueued remains an independent API counter bounded
by producer behavior. Diagnostic-entry histograms are still labelled as such,
including aggregate notes; they are never presented as Task counts.

## E — ten named, unchanged CPU fallback paths

The prompt enumerates ten paths, notwithstanding its nine-path label. The closed
Stage1FallbackReason is available through fallback_reason() alongside the latest
CandidateSet, without refactoring the PlannerStrategy trait. The caller carries
it alongside the PlanningResponse. Success resets it, as does plan_stage1 before
core validation; a core refusal before generation fabricates no Stage 1 reason.

| existing path | closed reason name |
|---|---|
| policy off | policy_disabled |
| budget absent | budget_unjustified |
| Python absent | python_unavailable |
| stage unimplemented | stage_unimplemented |
| torch not importable | torch_unavailable |
| neither owned lock nor eligible free compute lock | compute_lock_unavailable |
| StageInput error | input_unsupported |
| transport error | transport_failed |
| profile / request_id / framework-version mismatch | reply_mismatch |
| exact certification failure | certification_failed |

All still return CpuStrategy candidates. Gate order and short-circuit behavior
remain the same. A lock race after eligibility still follows the existing
transport-failure path; it is not reclassified or allowed to compute. Exact
assemble bytes, all padded comparisons and tolerances are unchanged. New tests
cover every reason, all three mismatches, forged padding, CPU response equality,
occupied-lock refusal and reason reset after success. No new spawning path.

## F — compatible opt-in, CPU authority and owned lifecycle

planning.gpu_enabled=true is the approved local compute-budget justification.
The executable injects a factory that detects the pinned local framework,
constructs Stage1Strategy over LocalStageTransport and calls plan_stage1.
UBU_PLANNING_WORKER_PYTHON may select an installed interpreter; no machine path
is committed. A per-attempt session drops/reaps before canonical persistence.
No compute lock is bypassed or acquired while a build holds it; an occupied
lock falls back immediately. The env.sh lock/scope and single job remain intact.

Only explicitly selected Greedy is compatible. Default ChunkedSweep stays
unchanged and emits planning_gpu_fallback_unsupported_strategy without consulting
the factory. Library/test state has no executable transport and names
planning_gpu_fallback_transport_unavailable for an enabled Greedy request.
These two caller reasons are separate from the ten kernel fallback paths.
Empty stores retain the service's existing no-kernel-generation path. Repair,
Stages 2–4, deterministic durations and all strategies are unchanged.

Each kernel fallback privately names its enum in planning_gpu_unavailable and
also emits planning_gpu_fallback_<reason> as a public closed diagnostic code.
The extra entry is counted as a diagnostic entry. Success retains the kernel's
actual gpu_worker / persistent_python_worker / pytorch / 2.6.0+cpu provenance,
with device_summary cpu, and existing response/persistence plumbing records it.
Stub transports retain CPU provenance; policy flags never manufacture execution.
No route, schema, UI or canonical frame changes. The Plan cannot change within
the selected compatible strategy: every worker candidate must exactly equal its
CPU reference before the unchanged downstream CPU validation/scoring pipeline.
ChunkedSweep is not replaced with that reference.

**No orchestrator test spawns a child or probes Python.** Runtime construction is
cfg(not(test)) in the executable; AppState library defaults have no factory.
New tests use only in-memory frames and synthetic stores/in-process routing.
Policy-off/default-Chunked tests panic if the factory is consulted; Greedy tests
exercise certified stubs and forged-padding refusal through generation and
persistence. The kernel owns real process/parity checks under the unchanged
five conditions. New orchestrator/driver tests install no handlers and reach no real HTTP,
Google, ollama, editors or signals. Existing kernel-owned lifetime tests retain
their bounded kill/reap paths. The runner's owned loopback exemption is unchanged.

Two existing checks were updated to assert the approved named unsupported-strategy
behavior instead of the removed fixed refusal sentence: planning_worker.rs and
scenario 36. Their unchanged CPU selected-candidate comparisons remain. Existing
driver flow fixtures use valid invented snake_case subjects, and projection
assertions use the new selected_tasks label. No fixture contains operator data.

## Verification and explicit framework installation

| check | before | after |
|---|---:|---:|
| devshell driver tests | 37 | 47 passed, 0 skips |
| kernel Rust | 107 | 111 passed |
| kernel pytest, original torch-absent environment | 35 pass / 15 skip | 35 pass / 15 skip |
| kernel pytest, explicitly authorized pinned CPU environment | unavailable | 50 passed / 0 skips |
| orchestrator Rust | 633 | 637 passed |
| UI | 212 | 212 passed, unchanged |
| scenario runner | 36/36, 667 requests | 36/36, 0 failed, 2 explicit live skips, 667 requests |
| kernel Clippy | 0 warnings | 0 warnings (-D warnings) |
| orchestrator Clippy | 8 distinct / 9 occurrences | 8 distinct / 9 occurrences |
| LIVE_REHEARSAL.md | 108 lines | 108 lines |

check-all and the runner passed before each implementation commit. test-all
passed across the constellation; schemas/core/store/adapter remain 2/166/110/23.
The final devshell check and runner include both updated published inventories.
All nine pin rows match published heads. Syntax/whitespace/privacy/path checks
passed. The existing fixture-demo quarantine is unchanged and explicitly printed.
No model-committee rank, operator live CLI, Google or real model run occurred.

Both previously checked interpreters still lack torch/NumPy. The user explicitly
authorized a private installation if useful: numpy 2.2.6 and pytest from PyPI,
then CPU-only torch 2.6.0+cpu and its dependencies from the official CPU index.
The selected environment passed all 50 pytest checks and the existing owned
framework-import quietness and real Stage 1 tensor/reuse/provenance tests outside
Cargo's lock, with no interpreter/tensor skips in that worker suite. The original
absent environment separately passed 35 with 15 explicit torch skips. This is
**CPU tensor parity**, not CUDA/GPU parity or operator acceptance. No dependency
is installed by a check or at runtime; no environment path enters Git.

Final source-extractor review caught a code-looking short message in a batch:
returned-value and tuple-position extraction now excludes even valid-looking
private names and nested message tuples. The regression uses that concrete
witness and hyphen/dot code syntax; all 256 real emitted codes remain recognized.

A missing Cell import and a new test incorrectly expecting core repair validation
to invoke Stage 1 were fixed before verification. The latter now directly exercises
the unsupported-input generation seam. An unused test import was removed to restore
the Clippy baseline; trailing EOF whitespace was corrected. No existing CPU
behavior was changed to make these checks pass. An initial Node isolated runner
could not open sandbox stream descriptors; direct injected-effects execution
verified all individual test counts. No failed/partial invocation is reported as
an acceptance pass.

**env.sh relaxed: no. Two Cargo jobs: no. OOM: no.** All Cargo commands sourced
it, ran sequentially with one job and retained flock plus the available
MemoryHigh=16G/MemoryMax=20G scope. CPU tensor checks ran outside active builds.
Protected acceptance artifacts were neither opened nor uploaded; their names
never appear in published content or tool output.

## G — every revision pin

Three changed repositories have published p1b-74 branches. Kernel E is
3da928be0d6d8cc6527e616a92d11dbc41d61d35; orchestrator F is
cefdc426f0461a1403aab929f1a45c700d08d053. The report's containing devshell commit
completes A–D/G documentation; there is no self inventory pin.

Only the approved three consumer revisions and two inventory rows advance.
Cargo.lock additionally tracks the same new source on transitive
ubu_planning_worker_protocol and the worker's existing serde/cpu dependencies;
no unrelated package revision or lockfile changed. The Cargo Git cache was seeded
from the published local kernel branch for fully offline resolution.

| inventory | full revision | disposition |
|---|---|---|
| ubu_schemas | 070d0a6f9a6ad7833dd523042925008316ce923b | unchanged |
| ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b | unchanged |
| ubu_store | 83a099f55220b1286ffb2dee3c9d19006e2090b5 | unchanged |
| ubu_planning_kernel | 3da928be0d6d8cc6527e616a92d11dbc41d61d35 | approved advance |
| ubu_github_adapter | e14a43b47aeb0a928f4dfdc83cd78ea9a2e044f6 | unchanged |
| ubu_orchestrator | cefdc426f0461a1403aab929f1a45c700d08d053 | approved advance |
| ubu_ui | 698a15fde8244dca96a03b07ad144a4c2b65af15 | unchanged |
| ubu_design | 7313e82f7fb835965bc18521b10f897b238b65dc | unchanged |
| ubu_brand | faf2005a8bd9e64742dd76ee6d1f91f45223946b | unchanged |

The three advanced consumers in ubu-orchestrator/Cargo.toml:

- ubu_planning_core: a2957a3f4edb1fec2b86b7f9fe632ded735820e5 → 3da928be0d6d8cc6527e616a92d11dbc41d61d35.
- ubu_planning_cpu: a2957a3f4edb1fec2b86b7f9fe632ded735820e5 → 3da928be0d6d8cc6527e616a92d11dbc41d61d35.
- ubu_planning_worker: a2957a3f4edb1fec2b86b7f9fe632ded735820e5 → 3da928be0d6d8cc6527e616a92d11dbc41d61d35.

All other Cargo Git revision pins remain:

| manifest | dependency | revision |
|---|---|---|
| ubu-github-adapter/Cargo.toml | ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b |
| ubu-orchestrator/Cargo.toml | ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b |
| ubu-orchestrator/Cargo.toml | ubu_store | 83a099f55220b1286ffb2dee3c9d19006e2090b5 |
| ubu-orchestrator/Cargo.toml | ubu_github_adapter | e14a43b47aeb0a928f4dfdc83cd78ea9a2e044f6 |
| ubu-planning-kernel/Cargo.toml | ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b |
| ubu-store/Cargo.toml | ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b |

Core schemas-ref remains 070d0a6f9a6ad7833dd523042925008316ce923b.
The remaining readonly heads stay:

- quick-ubu: 9ccc8b8e302d4e39207b749fb00bc449dc172cf0.
- model-committee: 4359c557fc8b6228f9da6bbdcd62a4cdf9f26260.

All twelve repositories finish clean, the three changed branches are published,
and the other nine repositories retain their baseline revisions. No force push,
merge, protected content/name upload, or machine-path commit was performed.

Operator acceptance has not been performed; it is one invocation, and the thing under test is whether a diagnostic that used to be a silent count now names itself.
