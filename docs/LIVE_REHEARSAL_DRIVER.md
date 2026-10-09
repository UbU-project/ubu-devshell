# The live rehearsal driver

One mode performs the actions. It starts and owns an orchestrator because no
existing route attests an attached process's store/calendar identity. A loopback
forwarder keeps optional app access possible; forwarded reads never replace
automatic report snapshots. Only explicit app admission/rejection route/status
outcomes are recorded. The app is optional, and visual checking is pre-release.
The comparison mode and manual fallback have been removed.

## Configuration and genuine authoring

Set absolute UBU_DB_PATH, UBU_GOOGLE_CREDENTIALS_PATH and
UBU_GOOGLE_TOKEN_CACHE_PATH, plus explicit UBU_GOOGLE_CALENDAR_ID.
The store and its WAL/SHM siblings must be absent. The launcher uses a prebuilt
UBU_REHEARSAL_BINARY or sources env.sh and builds offline, under the shared
lock and available memory scope. It removes build scratch and releases the lock
before prompts. No default store/calendar, automatic cleanup or reset exists.
UBU_REHEARSAL_OUTPUT selects the public output file; the default is
./live-rehearsal-copy-back.txt, ignored by Git. Keep custom output files outside
tracked content. Node and a writable output destination are prerequisites.
The writer refuses credential, token, binary and state destinations and symlinks.

Worker configuration is private environment, read by the executable:

| variable | purpose |
|---|---|
| UBU_PLANNING_WORKER_PYTHON | interpreter to probe and use for computation; supply your virtual environment's interpreter by absolute path |
| UBU_PLANNING_WORKER_PROBE_TIMEOUT_MS | optional integer from 1 to 30000 milliseconds; default 30000, within the owned transport's 30-second ceiling |

An absolute interpreter path is the reliable form because the bare python3
fallback depends on the PATH available to the launcher. Activating a venv alone
does not name the interpreter to the worker. The probe does not reserve compute;
its default budget accommodates cold PyTorch imports on a loaded machine.
Invalid budgets refuse with planning_gpu_fallback_probe_budget_invalid; timeouts
report planning_gpu_fallback_probe_timed_out rather than claiming PyTorch absence.
The public planning codes record whether UBU_PLANNING_WORKER_PYTHON was supplied
or python3 defaulted. Interpreter spelling and observed version stay in diagnostic
messages on the private screen, including when the probe succeeds.

The advisory default remains 120000 milliseconds, intended for small local
models. Larger models require an explicit advisory.timeout_ms Setting in private
settings; 300000 milliseconds succeeded for the operator's 27-billion-parameter
model. The allowed range remains 5000–3600000 milliseconds. This documents the
required model-specific budget without lengthening every unconfigured request;
the worker probe budget is a separate setting and does not change advisory timeouts.

UBU_REHEARSAL_INPUTS is a private JSON object. Prepare it outside command history
and repository content. No observation, requirement or routine hour is inferred:

| field | existing API input |
|---|---|
| routine | your routine creation fields; the driver supplies schema, evergreen mode, category-in-tags, occurrence-title fallback and empty reminder list |
| settings | validated name/value Settings: calendar.color.*, universe.subject.*, advisory.model/endpoint/timeout_ms/review_seed_days/review_ceiling_days, planning.gpu_enabled |
| subjects | exactly one explicitly chosen provisional root, separately minted through Settings; the live configuration requires subsequent mutation authoring under it |
| mutations | your genuine UniverseState PATCH mutation array |
| task | unique ordinary active Task selector, id or privately supplied title |
| precondition | explicit condition AST; a useful existing tree is preserved |

Omitted optional authoring inputs are recorded as skipped automatically. Invalid
supplied selectors or failed requests stop with a named fault. The versioned Task
PATCH changes only preconditions and reads it back. Vocabulary and Precondition
run separately after deterministic authoring. Zero candidates is a legitimate
result; no producer is rerun to force agreement. No automatic candidate admission
or rejection occurs. The optional app remains available for deliberate decisions.

For this rehearsal, `subjects` and a following mutation write under its chosen
root are required private inputs. No root is inferred. The generic injected
action seam retains omitted-input outcomes for its tests; the live configuration
refuses a missing/multiple root or unrelated/clear-only mutation authoring before
any action. A supplied existing Task tree remains preserved, so its new-root
precondition count may legitimately be zero rather than a manufactured requirement.

Input refusals name the structural field and a closed rule. No supplied name or
value is printed. settings and subjects indices are zero-based; for example,
settings[2].value identifies the third Setting's value. Correct that field to
meet the named rule before starting another fresh rehearsal:

| rule | field | requirement |
|---|---|---|
| json_required | inputs | parseable JSON |
| object_required | inputs | JSON object |
| array_required | settings, subjects or mutations | array when supplied |
| setting_object_required | settings[i] | Setting object with name/value |
| setting_name_required | settings[i].name | string name |
| setting_name_supported | settings[i].name | one of the documented names/prefixes |
| subject_root_valid | settings[i].name or subjects[i] | valid provisional root, excluding reserved/governed roots |
| subject_true_required | settings[i].value | literal true for a provisional root |
| colour_category_nonblank | settings[i].name | nonblank category suffix |
| colour_id_1_to_11 | settings[i].value | string colour id 1 through 11 |
| boolean_required | settings[i].value | boolean for planning.gpu_enabled |
| timeout_ms_5000_to_3600000 | settings[i].value | integer within the advisory budget range |
| review_days_1_to_365 | settings[i].value | integer within the review-day range |
| text_nonblank | settings[i].value | nonblank string for model/endpoint |
| loopback_origin | settings[i].value | literal http loopback origin with nonzero port at most 65535 |
| review_seed_le_ceiling | settings[i].value | supplied order keeps seed at or below the current ceiling |
| subject_unique | settings[i].name or subjects[i] | root appears once across supplied Setting and subject entries |
| one_subject_required | subjects | exactly one operator-chosen root for the live rehearsal |
| subject_mutation_write_required | mutations | at least one supported state write under the supplied root |

## One execution and two sinks

Type live after checking the displayed store/calendar. The action order is routine,
settings, session, capture, Plan, preview, approval decision, pre-authoring
UniverseState counts, explicit subject/mutation authoring, Task requirement,
registry readback, Vocabulary, Precondition and queue. The script does not reset the calendar.
Stamped leftovers/collisions are observations; unstamped reset completeness
cannot be certified. A repeated invocation is another rehearsal.

**Screen: private operator content. File: public copy-back.** A separate private
module prints placements with titles/windows/Static or Dynamic, excluded-work
reasons, exact preview operations, saved condition words, queued names/requirements,
diagnostic messages and risk detail when their responses arrive. Its output has
no connection to PublicReport. Credential/token paths are scrubbed, including
from bounded startup stderr, which stops being captured at successful health.
No private response, terminal transcript or answer log is written by the driver.
The orchestrator persists authorized authoring in the selected store as usual.

The registry readback uses existing `SETTINGS_LIST_PATH`, after deterministic
authoring and before advisory runs. The screen privately names governed and
provisional roots and their minting metadata/version/counts. The file contains
two client-computed tier cardinalities, the supplied root's three server-computed
reference counts and computed `satisfied_for_now`/`outstanding` status. Root,
Setting name/value, key and target strings are withheld. Missing, duplicate or
invalid reference metadata stops with `subject_registry_unavailable` and its
remedy; it never becomes invented zeros. The condition is evaluated at the
switch, not banked; no switch lock or ratification operation is introduced.

Each Setting family has its own action/public label: `colour_setting` for
calendar colours, `advisory_setting`, `planning_setting`, and `subject_setting`
for subject Settings supplied through `settings`. Explicit `subjects` minting
retains the separate `subject` action. Dynamic names/values are never published.

Human words are not an HTTP field. The approved terminal formatter consumes the
existing AST, reuses the existing numeric-word helper and preserves nested logic.
This is terminal presentation, not a new route or a claim about UI rendering.

Read the private Plan and exact preview operations, then decide at the approval
prompt. Only literal approve writes; flags/defaults/timeouts cannot authorize it.
Stale/missing preview stops. The three public judgment sentences follow all actions.
No visual-pass prompt or fourth judgment remains. Known private content in a
judgment stops with a privacy fault rather than entering the public file.

The public writer atomically replaces one file with mode 0600: the BEGIN/END block
on completion, or a single named reason/remedy on refusal. Selection boundaries
are no longer the operator's task. Interrupted/startup/launcher failures use the
same artifact. An unwritable sink cannot be fabricated: copy_back_unwritable
names UBU_REHEARSAL_OUTPUT and the remedy on screen; select a writable destination.
No private content is redirected into a fallback file. See LIVE_REHEARSAL.md for
the complete reason/remedy lookup.

## Verification and boundaries

PublicReport accepts original action records, never private rendered text. Its
closed code vocabulary is generated from emitted source and asserted on every check; genuinely unknown strings are withheld and counted.
Every generic cardinality/histogram is labelled client-computed with its route/field.
UniverseState entries count collection keys, never values or set members. Failed,
skipped and unreached actions retain explicit unavailable rows. Selection-note
counts are diagnostic-entry counts, including aggregate notes, not Task counts.

Projection tests replace the withdrawn operator comparison: every count, enum,
cardinality and histogram is checked against injected flow responses field by
field, and one-field mutations must change only the lines they feed. No whole
block golden is used. Unique title/word/message/risk canaries appear on the private
screen and never in render(). Tests inject effects: no listener, real HTTP,
Google/ollama/editor, child spawn or signal handler is introduced. check-all.sh
and test-all.sh execute these pure tests, never the live CLI. The existing
owned worker and runner exemptions are unchanged.

## P1B-74 gate and reporting agreement

The settings name allowlist is one named constant plus two prefixes, asserted
against Rust validate_name match arms/constants/prefixes and subject validators.
Value bounds, defaults, colours and subject lists are asserted from source;
lexical fingerprints additionally detect changes to the endpoint/value/pair/root
validation functions. Unsupported supplied settings stop before any action with
invalid_private_inputs, instead of quietly skipping an intended GPU opt-in.
The endpoint is a literal loopback HTTP origin with a nonzero port; subjects
require true and forbid both reserved and governed roots. Review settings follow
the operator's supplied order against fresh-store defaults 7/365; seed cannot
exceed the currently effective ceiling. No script changes their order.

Routine composition supplies evergreen mode and category membership, preserves
genuine hours/durations/recurrence, and defaults an omitted occurrence title to
the routine title, as the UI does. Empty tags and reminder lists are composed.
The UI also converts its form's HH:MM to HH:MM:SS, whole minutes to fixed seconds,
orders selected weekdays/days and trims form text; these are form-to-wire
conversions. Private inputs already use API wire units and arrays. The driver
does not invent an operator timezone, hours, duration, placement or capacity.

check-live-rehearsal-contract.mjs lexically extracts production diagnostic
constructors, code-parameter helpers/closures, constants, code variables/batches
and code-returning functions. Forwarded kernel Debug and NextAction serde enum
codes derive from their enum bodies. Test-only items and messages are excluded.
The generated live-rehearsal-codes.json must equal this vocabulary in both
directions. Unknown dynamic code formats fail extraction; unforeseen runtime
codes remain withheld_unknown. Use --write only after reviewing source/rules
and their witnesses; it cannot bypass names, roots or numeric assertions.
Both standing check-all/test-all execute this assertion through driver tests.

Empty JSON arrays project 0; absent collections project missing_<field>, and
malformed collections invalid_<field>. The response intentionally omits empty
blocked_tasks and invalid_tasks by skip_serializing_if, unlike unplaced_tasks.
This remains an orchestrator finding: no zero is inferred from missing wire
data and no serializer is repaired here. Producers print selected_tasks as the
cardinality of selected[] Tasks, with the actual request.limit beside it.

For P1B-74, include planning.gpu_enabled=true in private settings. Default
ChunkedSweep reports planning_gpu_fallback_unsupported_strategy while retaining
its Plan. An already-chosen UBU_PLANNER_STRATEGY=greedy can exercise the certified
CPU tensor worker; the script never changes strategies. The executable may use
UBU_PLANNING_WORKER_PYTHON to select an installed interpreter. The public file
retains closed reason-specific codes, while messages stay on the private screen.
This does not certify CUDA parity or add a human acceptance step.


## P1B-78 certification location

A refused Stage 1 certificate retains planning_gpu_fallback_certification_failed
and adds one closed field-specific code. The block reports that field, zero-based
candidate/slot indices where applicable, and the number of differing fields.
It validates those four metadata values from the corresponding diagnostic
message and constructs a fresh public object. Actual/expected values and
arbitrary message text remain on the private screen. Global omissions/failure
use null indices; a missing candidate row has no slot index. Invalid metadata
is labelled unavailable rather than replaced with zeros.

The existing engine_provenance.backend_kind is also projected as a closed value.
A successful worker result reads gpu_worker, the serialized form of GpuWorker;
CPU reference reads cpu_reference. This CPU tensor profile does not certify
CUDA. Framework/device/version strings remain withheld from the public block.
The three synthetic week cases agree with the CPU, so they have not reproduced
the operator's live divergence and no Python repair is claimed. The live
procedure remains solely LIVE_REHEARSAL.md with one invocation.
