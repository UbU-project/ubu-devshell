# P1B-80: retained failure evidence, readiness and bounded producer formats

## Grounding and approved corrections

All twelve repositories began clean on main at the stated heads. P1B-79 is
merged to main and origin/main in all four changed repositories. Eight remain
read only. The operator approved six grounding corrections before editing:

1. Empty judgment answers rendered no answer lines. Failed blocks now explicitly
   print three unavailable answers rather than claiming they already did so.
2. --check-inputs did not exist. It is added as a separate read-only pre-flight,
   reading the advisory Settings the private inputs will stage into a fresh
   store. It builds nothing and starts no server.
3. The unbounded grammar belongs to SuggestTags, not Vocabulary. Vocabulary
   already limits proposals to three and target strings to 128. All five
   delegated producer formats are audited; the reported Vocabulary abort is
   not attributed to the separate SuggestTags finding.
4. PlanningRequestBody is different from the CLI's kernel input and contains
   affect_warning prose. The private dump is the actual converted kernel
   request for store-built generation, with necessary Task/request IDs retained.
5. Quality enums belong to planning/generate's human_complete_plan_quality,
   while the three GET routes have their own response types. Each is projected
   from its actual source.
6. No dedicated stand-in flag is returned. Only an exact source-checked fixed
   producer marker is classified; no revision-suggestion text is emitted.

The operator additionally required complete affect_profile and
affect_observation data in plaintext replay, exact file mode 0600 and a default
outside every repository working tree. Those conditions are implemented and
tested. The dump remains opt-in, private and outside the public copy-back block.

The governing sentence is:

> A manual instrument has one line of execution.

The rehearsal still completes or stops with one named reason and remedy; no
readiness skip, comparison branch or additional judgment is offered. The
separate pre-flight is readiness, not a rehearsal. Human consent and calendar
approval remain deliberate choices. No operator acceptance was performed.

| Section | Governing sentence from required reading | Application |
|---|---|---|
| All | ACCEPTANCE rule 1: “A manual step may not verify what the runner or a ubu-ui test already asserts.” | All deterministic verification uses injected tests and the existing runner. |
| All | ACCEPTANCE rule 10: “A manual step exists only for rendering.” | No new manual verification/transcription step. |
| A–C | live-rehearsal: “Real operator instrument, never executed by checks. Tests inject all effects.” | Test the failure, cause and readiness seams without running the real CLI. |
| A | live-rehearsal: “Establish the public sink before any live effect; replace it on every exit.” | Keep the in-progress placeholder, then preserve a partial block before the fault. |
| B/H | live-rehearsal-report: “Public projection: never serialize an API object, arbitrary string, or key.” | Emit only fresh whitelisted enum/code/count objects; keep all other content private. |
| C | ACCEPTANCE rule 11's governing sentence quoted above | Linear readiness checks pass or stop; no skip and no retry. |
| D | planning.rs: “Store-built coordinates and durations use Unix seconds; supplied requests retain the caller's unit-agnostic kernel coordinates.” | Change only empty response collection serialization; preserve request/schema meanings. |
| E | config.rs: “Unset, it is one week: the operator's decision for the switch (P1B-53).” | Exported-empty optional values become absent and regain their defaults. |
| F/J | UBU-D0299: “Keep the validator authoritative and test grammar membership independently against validation.” | Bound producer formats without changing admission or adding decode controls. |
| G | advisory_wire: “Generated text is untrusted content and is never echoed; this reads no other field.” | Preserve bounded upstream error text and remove unjustified model-pull advice. |
| H | UBU-D0301: “Preserve the comparison's authority; record the semantics before bringing implementations into agreement, rather than choosing a predicate by matching one implementation to the other.” | Serialize the exact effective kernel input including affect data, without rewriting its semantics. |
| I | candidate_generation: “Integer interpolation makes the bound independent of the size of the schedule window.” | Replace lookup only; interpolation, ordering, count, dedupe and outputs stay unchanged. |
| K | pinned-revs.toml: “Record the expected HEAD SHA here each time an upstream repo lands.” / “Push a branch before pinning it.” | Update inventory to published heads; no consumer revision needs to advance. |

## A/B: a failure is partial evidence with a closed cause

finishFailure writes report.render(), then the fault line and its remedy. cli
retains the report through its catch and does not hand a handled late failure
back to the outer fault-only writer. Unobserved actions remain unavailable;
all three judgments remain unavailable when no completed answers exist. A run
that dies abruptly before completion still leaves rehearsal_in_progress. An
early handled fault before a report exists retains its named refusal behavior.

The test “P80 a late failure preserves completed capture, planning and approval
before the fault” completes those injected steps, fails Vocabulary, and verifies
the capture count, Plan placements, approval outcomes, failed producer and
unavailable later actions/judgments survive before the fault. Neither API
diagnostic messages nor canaries enter the fault context or file.

| Original sibling refusal site | Closed cause retained |
|---|---|
| Session disabled | HTTP status, recognized body status when present, diagnostic-code counts |
| Vocabulary/Precondition status not ok | HTTP status, recognized body status, diagnostic-code counts |
| Preview absent/stale | Preview response HTTP status and diagnostic-code counts; no private preview ID |
| Approval callback exception | No API response exists; action/code only, with no invented status or diagnostic |
| Selected Task unavailable/routine/invalid version | Task-read response HTTP status, recognized lifecycle status and diagnostic-code counts |
| Task selector missing/ambiguous | Task-list response HTTP status and diagnostic-code counts; no selector/id/title |
| Subject registry incomplete | Settings-list response HTTP status and diagnostic-code counts; no root/key/value |

The generic request-failure site also retains closed causes. responseCause
constructs fresh metadata; unknown codes become a withheld_unknown count and
unknown status text is omitted. failureLine rechecks status names and histogram
keys/counts. AdvisoryRunResponse.status is a String populated from controller
enum values and fixed statuses, so the existing closed projection is used
rather than changing the DTO or trusting arbitrary strings.

“P80 all response-backed sibling refusals retain HTTP and diagnostic counts;
approval exceptions invent none” exercises all seven sites, including both
advisory producers, with injected responses. The standalone cause test verifies
unknown status/code/message canaries never become public.

## C: one read-only pre-flight, rechecked before the rehearsal

The required non-empty operator variables are UBU_DB_PATH,
UBU_GOOGLE_CALENDAR_ID, UBU_GOOGLE_CREDENTIALS_PATH,
UBU_GOOGLE_TOKEN_CACHE_PATH, UBU_REHEARSAL_INPUTS,
UBU_PLANNING_WORKER_PYTHON and UBU_PLANNER_STRATEGY. Required paths are absolute;
strategy is greedy or chunked, with greedy selected for the atomic worker run.
The normal launcher supplies/builds UBU_REHEARSAL_BINARY; when explicitly
provided it is also validated during pre-flight.

Checks run in one fixed sequence:

1. Parse and validate private inputs, one subject and its mutation, required
   variables/paths, strategy, port, mock refusal and the optional 1–30000 ms
   worker-probe budget.
2. Check readable credentials, executable interpreter and any supplied binary;
   token read/write permissions or a writable parent; absent store/WAL/SHM and
   a writable store parent. Secret file contents are never opened.
3. Require advisory.endpoint and advisory.model in inputs.settings, using the
   final value as sequential admission does. Query only the configured literal
   loopback endpoint's model list, with redirects refused and a bounded timeout;
   accept exact model names and the runtime's default :latest tag.
4. Import the repository-owned worker module using the absolute interpreter and
   existing probe budget. Require quiet import, no warnings and compatible
   pinned CPU Torch 2.6.0+cpu; report the version privately. Bytecode writes are
   disabled and no device search or CUDA planning occurs.

The check passes or names one failed check, without a skip, retry, build, server
startup, state/calendar write, prediction or copy-back replacement. Help is also
read-only. The rehearsal rechecks readiness before consent/startup and actions,
after establishing its in-progress sink. A present model is not proof of usable
inference; future model failures still produce retained partial evidence.

Four injected pre-flight tests cover final-setting selection/default tags,
every absent/exported-empty required variable, endpoint/model failures,
incompatible/noisy worker facts, probe budgets and store freshness. They perform
no real process, HTTP, model, Google, editor or signal operation. The real CLI is
never executed by checks. Existing kernel-owned worker tests remain the only
actual framework boundary tests under P1B-70's unchanged five conditions.

## D/E: empty collections and optional environment values

blocked_tasks and invalid_tasks now serialize empty arrays, like unplaced_tasks.
Removing their two skip_serializing_if attributes preserves real zero counts;
adding an omission to unplaced_tasks would retain the ambiguity. serde(default)
remains, so the generated OpenAPI is byte-identical. The replay test verifies all
three empty sibling collections are present.

Every optional var_os in ServerConfig::from_env passes through nonempty before
mapping. Empty is absent, while whitespace and non-UTF8 path bytes are not
silently trimmed. The seven existing variables changed are:

- UBU_DEVICE_REGISTRATION
- UBU_CATEGORY_PALETTE_PATH
- UBU_CALENDAR_MOCK_EVENTS
- UBU_GOOGLE_CREDENTIALS_PATH
- UBU_GOOGLE_TOKEN_CACHE_PATH
- UBU_PLANNER_STRATEGY
- UBU_PLANNING_HORIZON_SECONDS

The new UBU_PLANNING_REQUEST_DUMP follows the same rule and is disabled when
unset or exported empty. None of these optional variables retains an empty-value
refusal. Required rehearsal variables intentionally refuse empty values before
effects. Invalid non-empty strategy/horizon values still refuse as before.

empty_optional_environment_values_are_absent_without_trimming_paths verifies
empty absence, whitespace preservation and restored week/Chunked defaults.
The existing horizon_environment_is_validated_without_global_test_env_races
changes exactly one expectation: Some("") now expects Some(604800), rather than
invalid. All numeric bounds and invalid non-empty cases remain exact. The test's
existing isolated child mechanism is unchanged; no new signal handler is added.

## F/G/J: bounded formats, truthful failure class and an unanswered question

| Producer | Structural bound after audit | Other relevant bounds |
|---|---|---|
| SuggestTags | proposals.maxItems = selected Task count (new) | id enum = selected IDs (new); category_tag enum = eleven existing names (new); confidence remains 0–1 |
| Clarify | questions.maxItems = 8 (unchanged); depends_on exactly two entries | text.maxLength = existing validator limit 400 (new) |
| Precondition | proposals.maxItems = min(selected Tasks, 3) (unchanged) | groups 1–10 entries, three levels, at most 111 nodes; existing targets/predicates and scalar expectations |
| Vocabulary | proposals.maxItems = 3 (already present) | selected-ID enum; target pattern and maxLength 128 already present |
| PreconditionReview | reviews.minItems/maxItems = selected Task count (already present) | reuses bounded precondition tree; sound/replace/remove verdicts |

The category enum is personal, relationship, business, committed, sleep,
entertainment, grocery, commute, undefined, education_house and work. The existing
undefined category supplies the unknown-category choice; unsure Tasks may still
be omitted. This is a conservative producer subset, not a restriction on human
category authoring or a change to the interpreter/admission validator.

all_five_producer_grammars_have_explicit_structural_bounds_without_sampler_options
verifies every delegated grammar, selected identities and the unchanged six
request-envelope keys. The prior exact tag-body test is renamed
request_body_preserves_envelope_and_uses_bounded_tag_grammar and updates only its
expected format. The existing Clarify schema test adds the exact 400 text bound.
No repeat_penalty, temperature, options, sampler change or decode Setting is added.

Relayed HTTP errors keep the same bounded, control-scrubbed upstream error field
and no generated text. Both the relayed and generic messages drop the blanket
model-pull advice. The existing refusal tests update their exact message/suffix
expectations; error-code, 200-character limit, no-candidate and privacy assertions
remain. They use fake replies and establish no real model result.

UBU-D0302 records that repeated structures must be bounded as well as safe and
that a permitted unbounded repetition can abort upstream before validation.
The live Vocabulary abort triggered the audit, not a real-model test. It does
not establish that the separately unbounded SuggestTags grammar caused that
abort. These are structural bounds, not a guarantee that scalar/text generation
or a model runtime can never fail.

UBU-Q0185 asks whether the advisory boundary should expose decode parameters or
leave generation behavior to the operator's runtime. It remains Open, Human
only, unscored and unanswered. The grammar finding favors correcting formats
before changing samplers; it is not a proven cause of the Vocabulary abort or a
resolution of the question. The five existing advisory Settings remain unchanged.

## H: private exact replay and closed report fields

UBU_PLANNING_REQUEST_DUMP is off by default. Value 1 enables the default
system-temporary file ubu-planning-request-<orchestrator-pid>.json. The resolved
default parent is checked for any ancestor Git working-tree marker and refused
if inside a repository. An explicit alternative must be an absolute path with
an existing parent. Credential, token, registration and database destinations
are refused. The file is plaintext JSON, written through a fresh temporary file
with exact 0600 permissions and atomically renamed. Unsupported non-POSIX
permissions refuse rather than produce an unprotected file. No captured data or
machine-specific path is committed.

Only store-built generation is captured, after conversion and effective seed/ID
assignment and before backend execution. Supplied requests are not copied.
The dump is the actual PlanningRequest the planner receives, not the incompatible
HTTP PlanningRequestBody. All affect_profile and affect_observation dimensions,
values, observation timestamps and source kinds are retained without hashing,
defaulting, reduction or anonymization. Necessary private Task/request IDs remain
for dependencies, candidate identities and exact deterministic rollout streams.

The serialized field list for store-built requests is:

- horizon_policy: reactive_horizon_seconds and branch_coverage_target;
- schema_version, request_id, mode, rng_seed, n_rollouts, top_k and strict_validation;
- time_window: start and end (the effective Unix-second coordinates);
- tasks when non-empty: id, tagged duration model, value, priority; non-empty
  correlation_groups (group/strength), mandatory when true, non-empty depends_on,
  and declared window (start/end) or static_anchor (start);
- topological_order when non-empty;
- affect_profile: mode and dimension map with direction, location, scale and threshold;
- affect_observation: dimension map with value, observed_at and source_kind;
- scoring_policy: utility_weight, robustness_weight, affect_margin_weight and
  schedule_diversity_weight.

Store-built generation is fresh, so repair_context is absent. prior_plan is
serde-skipped. Task title, calendar summary/event ID, description, fact key,
precondition target and affect_warning/display prose are not fields in this
payload. Private structural IDs and correlation/observation provenance remain
as required for faithful replay. The dump is not a public block or fixture.

store_dump_replays_exact_effective_input_affect_and_legitimization creates only
synthetic state with recorded, non-integer affect dimensions. It deserializes
using the CLI's PlanningRequest type, checks full equality to the effective
server input, verifies 0600, and reproduces the selected candidate and the whole
server legitimization projection, including the same separately retained
display-only warning. dump_is_disabled_by_default_and_does_not_copy_supplied_requests
verifies off/supplied behavior. The private-writer unit test checks atomic
replacement, 0600 even after an old 0644 file, reserved-state protection and
default rejection inside a synthetic Git working tree. No CLI process or live
service is launched by those tests.

Public report additions are sourced correctly:

| Source | Closed fields projected |
|---|---|
| planning/generate human_complete_plan_quality | checkpoint_coverage and failure_pattern enum names; violated_dimensions count; stand_in/not_marked_as_stand_in/unavailable classification |
| GET /reports/risk | risk level; findings count; category/severity enum and blocking flag by index |
| GET /reports/human-complete | completed_tasks; task_statuses count and lifecycle enum/count by index |
| GET /reports/time-by-category | total_seconds; category/unmeasured cardinalities; seconds/static_seconds/completed_seconds/task_count by index |

No category name, Task/event identifier/title, subject/key/target, note, reason,
revision suggestion or numeric affect value is emitted. The exact fixed
stand-in marker is compared only for classification and independently checked
against its Rust producer and first-suggestion placement. Absence does not claim
a measurement. No route or endpoint constant is added; the two report paths
without UI constants remain closed driver literals verified against OpenAPI.

## I/K and verification

The occupancy lookup uses filter/map/min over the set's contents. Only that
lookup differs in the kernel; all interpolation, proposal ordering, dedupe,
placement behavior, Python, worker comparison, protocol and CLI remain
byte-identical. Every kernel fixture and golden remains byte-identical after
rerunning the existing freezer, and no candidate count or test expectation moves.

| Check | P1B-79 baseline | After |
|---|---|---|
| Design | no executable suite | register uniqueness/metadata checks; Q0185 remains Open |
| Kernel Rust, locked/offline all targets | 125 | 125 passed |
| Orchestrator Rust, locked/offline all targets | 645 | 650 passed; measured replay 2/2 after fixture strengthening |
| Read-only UI | 220 | 220 passed; build passed |
| Pure driver | 64 | 73 passed |
| Runner | 36/36, 669 requests | 36/36, 669 loopback requests; two live scenarios skipped |
| Kernel Clippy | 0 | 0 with -D warnings |
| Orchestrator Clippy | 8 distinct / 9 occurrences | 8 distinct / 9 occurrences, unchanged |
| Closed vocabulary | 279 | 279, source agreement passed |
| OpenAPI / endpoint constants | 56 / 43 | 56 / 43; OpenAPI byte-identical |
| Actual owned worker, pinned CPU Torch outside Cargo lock | 35 | 35 passed, no skips |
| Pytest with Torch 2.6.0+cpu | 58 | 58 passed, no skips |
| Pytest without Torch | 39 passed / 19 skipped | 39 passed / 19 skipped |
| Standing check-all.sh | required | passed; unchanged fixture-demo quarantine |

Five new Rust tests explain 645 → 650; nine new injected driver tests explain
64 → 73. Kernel and Python expectations remain unchanged. The only modified old
assertions are the bounded tag-format snapshot, exact HTTP wording/suffix,
400-character Clarify limit, explicit three-report action order, extra required
environment fixture fields and exported-empty horizon week expectation. No
assertion is relaxed and no tolerance is widened.

One Cargo job per invocation, sequential Cargo repositories, nonblocking flock,
MemoryHigh=16G/MemoryMax=20G scope and build/compute exclusion remain unchanged.
No two-job trial, installation or download occurs. No unit test or runner gains
real Ollama, Google, editor or signal-handler access. The existing runner retains
its synthetic loopback exemption and skips its two live integrations; the old
fixture-demo quarantine is unchanged. No model-committee rank or operator
acceptance occurs. Privacy audits keep protected local contents and filenames
out of outgoing commits without opening or printing those artifacts.

Changes publish on p1b-80-evidence-readiness without force-push or merge. Cargo
revisions and every lockfile are unchanged: the three orchestrator consumers
ubu_planning_core, ubu_planning_cpu and ubu_planning_worker remain pinned to
8653cf2bbe96cd7cf0337fd857881be6665d1ceb. I changes no consumer behavior, so no
consumer bump is needed. Published design/kernel/orchestrator inventory advances:

| Inventory key | Full published revision | Disposition |
|---|---|---|
| ubu_schemas | 070d0a6f9a6ad7833dd523042925008316ce923b | unchanged |
| ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b | unchanged |
| ubu_store | 83a099f55220b1286ffb2dee3c9d19006e2090b5 | unchanged |
| ubu_planning_kernel | 464b4924cd114c64dd1e2fc8ae98bae3e5bba04d | advanced from 8653cf2bbe96cd7cf0337fd857881be6665d1ceb |
| ubu_github_adapter | e14a43b47aeb0a928f4dfdc83cd78ea9a2e044f6 | unchanged |
| ubu_orchestrator | 164f6c4db27462e10c399d4406d0f2bd2c4e71c0 | advanced from c140f80be90e1bb78c899eb6fb3e834dc09d1f5d |
| ubu_ui | 649f8e117a3eec08b5f8581885b06999d187f8a3 | unchanged |
| ubu_design | 63cd428eaf896755ccb9b7ab6de0a9b894b24d76 | advanced from ecb1c2654dc8445a04ae403fa4fc33652b6383ce |
| ubu_brand | faf2005a8bd9e64742dd76ee6d1f91f45223946b | unchanged |

Final audits confirm all twelve repository working trees are clean, all four
changed branch heads equal their published upstreams, and all nine inventory
entries match published heads. The eight read-only heads, every Cargo revision
and lockfile, 279-code vocabulary, 56 OpenAPI paths and 43 endpoint constants
remain unchanged. Outgoing commits pass the protected-artifact and
machine-specific-path audit.

Operator acceptance has not been performed; it is one pre-flight plus one rehearsal, and what is under test is whether a failed rehearsal still reports what it observed.
