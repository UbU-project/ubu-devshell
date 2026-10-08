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

UBU_REHEARSAL_INPUTS is a private JSON object. Prepare it outside command history
and repository content. No observation, requirement or routine hour is inferred:

| field | existing API input |
|---|---|
| routine | your routine creation fields; the driver supplies schema, evergreen mode, category-in-tags, occurrence-title fallback and empty reminder list |
| settings | validated name/value Settings: calendar.color.*, universe.subject.*, advisory.model/endpoint/timeout_ms/review_seed_days/review_ceiling_days, planning.gpu_enabled |
| subjects | explicitly chosen provisional subject strings, separately minted through Settings |
| mutations | your genuine UniverseState PATCH mutation array |
| task | unique ordinary active Task selector, id or privately supplied title |
| precondition | explicit condition AST; a useful existing tree is preserved |

Omitted optional authoring inputs are recorded as skipped automatically. Invalid
supplied selectors or failed requests stop with a named fault. The versioned Task
PATCH changes only preconditions and reads it back. Vocabulary and Precondition
run separately after deterministic authoring. Zero candidates is a legitimate
result; no producer is rerun to force agreement. No automatic candidate admission
or rejection occurs. The optional app remains available for deliberate decisions.

## One execution and two sinks

Type live after checking the displayed store/calendar. The action order is routine,
settings, session, capture, Plan, preview, approval decision, pre-authoring
UniverseState counts, explicit subject/mutation authoring, Task requirement,
Vocabulary, Precondition and queue. The script does not reset the calendar.
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
