# The live rehearsal driver

This is an operator instrument. Checks import its pure functions with injected
responses; they never invoke its CLI, start its proxy or reach Google or a model.
The instrument uses Node 22 or newer and the existing UI endpoint constants.
There is nothing to install. The launcher sources `scripts/env.sh` and builds
with the same offline Cargo wrapper, exclusion lock and available memory scope.
Build output stays in a private temporary directory which is removed before
Node starts, including on failure. The build lock is released before any human
confirmation. A prebuilt `UBU_REHEARSAL_BINARY` skips compilation.

The driver owns startup, rather than attaching. No existing route can attest
which store and calendar an attached process actually opened. An owned process
receives the selected environment. A local forwarding listener takes the UI's
configured port; the orchestrator takes an ephemeral owned loopback port. Every
script request stays on that owned port, refuses redirects and carries the
schema constant imported from `ubu-ui/src/api/endpoints.ts`. The proxy forwards
existing requests and responses; it adds no backend route or UI feature.

## Private configuration

Set `UBU_DB_PATH` to an absolute path for a **fresh rehearsal store** and
`UBU_GOOGLE_CALENDAR_ID` to the intended rehearsal calendar. Neither has a
default. Set absolute `UBU_GOOGLE_CREDENTIALS_PATH` and
`UBU_GOOGLE_TOKEN_CACHE_PATH`; credentials must be readable, the token cache
readable/writable or its parent writable. Existing stores and mock calendar
configuration are refused. No calendar deletion or reset is performed.

The optional `UBU_REHEARSAL_INPUTS` environment variable contains a private JSON
object. Prepare it privately; do not paste it into a report, commit it or enter
it in a shell command that records its contents in history. Unset it afterwards.
The object has these optional fields, with **no inferred authoring defaults**:

| field | meaning |
|---|---|
| `routine` | operator-authored existing Objective creation body, including genuine local hours/timezone; the driver supplies `OBJECTIVE_SCHEMA_VERSION` |
| `settings` | array of `{name,value}` for explicit `calendar.color.*` or `advisory.enabled`, `advisory.endpoint`, `advisory.model`, `advisory.timeout_ms` settings; existing Setting PUT only |
| `subjects` | explicitly chosen provisional subject strings; each is minted through the existing setting namespace, never inferred from a mutation |
| `mutations` | genuine operator-authored UniverseState mutation array, in the existing PATCH shape; no fabricated value or default |
| `task` | unique ordinary active Task selector: `id`, or a privately provided `title`; no routine occurrence is selected |
| `precondition` | explicit operator-authored condition AST; existing compound requirements are preserved and reported skipped |

Missing routine, mutations or requirement inputs are reported skipped. The
driver follows the existing document order; it does not silently clear an
existing requirement tree or retry writes. Versioned Task PATCH sends only
`schema_version`, `expected_version` and `preconditions`, followed by readback.
Settings for the model must be provided privately or configured deliberately
in Setup before the advisory run; an unconfigured producer is a recorded result.
Vocabulary and Precondition remain separate runs. The automatic Precondition
run sees the supplied facts, not a vocabulary admission made later in the visual
pass. Any such later admission is deliberate operator work; no producer is
rerun to obtain a preferred result.

HTTP/status/transport failures are recorded and later actions proceed where
possible. Response size bounds and generic errors prevent raw error content
from entering stdout. Arbitrary response strings, including unknown diagnostic
codes, are withheld. Known codes use a closed vocabulary; unknown codes are
counted under `withheld_unknown`. This limits diagnosis in the public report,
so remedies and content are read privately in the app.

## What stays with the operator

**Startup consent** is a literal typed `live`, after the selected store and
calendar are displayed. A startup flag cannot supply it. Running twice is a
second rehearsal; fresh-store refusal does not make calendar actions idempotent.
Reset with your own copy tool before startup. Stamped leftovers and collision
codes are observable; unstamped leftovers cannot be distinguished from your
original events. The driver explicitly cannot certify a complete reset.

**Approval** stays manual because it authorizes a write to the real calendar.
After preview the driver prints operation fields with private identities and
summaries withheld. Inspect the current Plan in Calendar, then type `approve`
or decline. No startup flag, timeout, default or API success authorizes it.
A stale or absent preview is never offered for approval. The UI's preview is
local React state and is not populated by a script's request: in ordinary mode,
inspect the Plan, rather than re-running preview or producers to manufacture
matching result panels. In comparison mode the UI's own Approve click is the
explicit decision, after its own visible preview.

**One visual pass** covers Today, Calendar, Tasks and Review. The first two
show the operator's actual week and layout; the latter two let the operator
read saved requirements and proposal/replacement words privately. Fixture
rendering tests cannot cover the lengths, collisions and usefulness of the
operator's own data. The script has no DOM or human-word renderer and cannot
judge whether those words express the operator's requirement.

**Genuine authoring and candidate decisions** remain operator-owned. Private
inputs supply the routine and observations; the script supplies no meaning or
value. Vocabulary admissions need the operator's selected name and real value.
Proposal rejection needs the operator's assessment and reason. Those optional
UI actions are observed for safe route/status outcomes, never chosen by the
script. Durable rejection and finite snooze are distinct; nothing reruns a
producer or admits a proposal just to exercise either path.

**Four judgments** remain human because scheduling preference, requirement
meaning, name usefulness and visual correctness are the acceptance result.
They are asked at the end and collected as deliberately public sentences in
one block. This is the approved exception for operator-authored judgments,
not permission to echo API content. Do not quote names, requirements or values
in these answers. Known private configuration strings in an answer are withheld;
that limited filter cannot recognize arbitrary secrets someone types. No
password-hygiene agent consumes responses or answers. Answers live in memory,
never in a file written by the driver.

## Report provenance and comparison

The block prints existing API scalar counters and fixed enum/boolean fields.
Generic cardinalities and histograms are labelled **client-computed**, with the
source route and field. They count entries, not inferred facts: for example
`advisory_task_skipped` diagnostic entries include an aggregate note, so the
number is not a skipped-Task count. UniverseState counts keys for each of its
four collections, never members within a set. No keys, values or rows leave it.
The report does not reproduce UI sentences or business rules about gestures.

`--compare` forwards the appendix UI actions once and records their **same
responses**. It performs no duplicate capture, plan, preview, approval or
producer run. UI-local result panels therefore show the actual responses being
compared. The two advisory producer snapshots remain distinct; UniverseState
counts freeze before authoring. Normal mode ignores later visual reads when
recording automatic snapshots, but records deliberate admission/rejection
route/status outcomes. Unexpected repetition is visible in the attempts list;
the operator should flag it, not run until figures agree.

Read the appendix privately. In this one comparison cycle, record disagreements
as item number, route/field and expected/observed count or absence. Never paste
private proposal words, names or risk prose just because the older appendix
requests them. The original wording remains for fallback context; the P1B-72
public-content policy governs what is sent back. The new instrument and its
ledger retirements remain pending until this cycle agrees.
