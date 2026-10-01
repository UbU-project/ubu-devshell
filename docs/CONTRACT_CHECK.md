# The scenario runner

`scripts/check-ui-contract.sh` builds the real `ubu-orchestrator` and walks
the daily loop against it over HTTP, in nineteen scenarios. It needs no
webview, no Google account and no model. A full walk takes about ten seconds
once the orchestrator is built.

## Why it exists

> Across P1B-39 through P1B-46 the operator's acceptance runs found seven real
> failures: CORS, the three-way port disagreement, an empty store producing an
> empty preview, the Calendar export authority mismatch, the recurring-event
> skip, the ollama 404 and timeout, and a missing UI control. **Exactly one —
> CORS — could only have been found in a webview.** The other six were
> HTTP-layer, scriptable, and cost whole evenings because nothing was
> asserting them.

Seven failures, one of them webview-only. Each of the other six was found by
one person clicking a button in the evening. The runner asserts them.

### What the mock seed made reachable

In Mock mode the orchestrator's calendar used to be built from UbU's own
applied record, so what it observed always equalled what it had applied.
Four behaviours could not be reached over HTTP at all: colour means done, a
drag moves the window, an unknown event is foreign, and a recurring instance
is refused. They had only ever been checked by hand against a real account.

P1B-47 added `UBU_CALENDAR_MOCK_EVENTS`, a fixture for what the mock calendar
observes. Scenarios 7 to 10 use it. Run against the orchestrator as it was
before that ticket, scenarios 1 to 6 and 11 to 14 pass and 7 to 10 fail.

### The first version, and the three ports

The check began in P1B-40 as two assertions, after the P1B-39 acceptance
failed three times in a row on an address. Measured across the constellation
at that time:

| where | value |
|---|---|
| `ubu-orchestrator/src/config.rs` | `UBU_ORCHESTRATOR_PORT` → `unwrap_or(7878)` |
| `ubu-ui/src/api/client.ts` | `DEFAULT_ORCHESTRATOR_PORT = "17890"` |
| `ubu-ui/README.md` | instructs `VITE_UBU_ORCHESTRATOR_URL=http://127.0.0.1:17890` |
| `ubu-devshell/scripts/generate-ui-api-client.sh` | `ORCHESTRATOR_URL` default `http://127.0.0.1:8080` |
| `ubu-devshell/scripts/run-orchestrator.sh` | sets `HOST` and `BIND_ADDR`, never sets the port |

Those two assertions are still scenario 1, and still run first.

## The nineteen scenarios

Every scenario starts its own orchestrator on its own ephemeral loopback
port with its own empty store. Nothing is carried from one to the next. All
calendar requests ask for `export_mode: "mock"`.

| # | Scenario | What it asserts |
|---|---|---|
| 1 | contract | `ubu-ui`'s default port equals the orchestrator's. Planning and next-action answer the schema versions `ubu-ui` sends. Every `*_PATH` constant in `endpoints.ts` is a path in the live `/openapi.json`. |
| 2 | task loop | Capture, list and edit a Task. An edit with a stale `expected_version` is refused with 409 `version_conflict` and changes nothing. |
| 3 | static window | A `static_window` set through `PATCH` is stored, makes the Task Static, and the Plan places it as a Static anchor at exactly that window. A window that ends before it starts is refused. |
| 4 | routines | A Static routine is created. An overlapping one is refused with `objective_routine_overlap` naming both routines and the first colliding date, and nothing is written. The Plan contains the occurrence. |
| 5 | colour partition | In the preview the Static event carries its category's colour. The Dynamic event carries none, though its Task has a category. |
| 6 | apply | The applied record is empty, a Mock approve grows it to two events, and a second preview proposes nothing. The superseded preview cannot be applied again. |
| 7 | colour means done | *Seeded.* The calendar shows the applied Dynamic event with a colour. Capture completes that Task and only that Task. A second capture completes nothing again. |
| 8 | drag means move | *Seeded.* The calendar shows the applied Static event at a later window. Capture moves the Task's `static_window` to it, and the next Plan places it there. |
| 9 | foreign | *Seeded.* The calendar shows an event UbU never applied. Reconcile classifies it `foreign`. Repair leaves the applied record as it was, creates no Task, and the event is still foreign afterwards. |
| 10 | recurring occupancy | *Seeded.* The calendar shows an event whose id has the `{base32hex}_{timestamp}` shape. It parses and classifies `foreign`, with `capture_event_not_ownable` from reconcile. Capture records it as occupied time: one Static Task under a minted handle, the Google id in `provenance.source`, and `capture_occupancy_only` naming the id. A second capture admits nothing. It is still `foreign` afterwards, it is not in the applied record, and the next preview neither desires nor operates on it. |
| 11 | preferences | Two Preferences are created. A third that closes a cycle is refused naming the members in order. One is deleted, and the refused one is then accepted. |
| 12 | decomposition | A Task is decomposed into three children held as one segment. In the Plan each child starts when the one before it ends. Undo restores the Task under a new handle and moots the children. |
| 13 | settings reach planning | A category colour changed through `PUT /setting/:name` is carried by the next preview, with no restart and no new Plan. Reverting returns the default. |
| 14 | advisory | Against the stub model: unconfigured names both Settings and asks the model nothing; a 404 body reaches `advisory_http_failed`; an empty answer reports `advisory_empty_response` and whether thinking was present; a slow answer trips `advisory_timeout` at the budget; a good answer enqueues candidates, and admitting one sets the category. |
| 15 | clarify | Against the stub model: a run with no Task named interviews the Task with no description, and the prompt carries its id, title and round 1 and no description. A second run is refused with `clarify_already_queued` and the model receives no request. Plain Admit is refused with `advisory_answer_required`, and a yes/no answered `maybe` with `clarify_invalid_answer`. A proper answer admits the candidate and the Task's `description` is exactly the expected `Q:`/`A:` text, in question order, with the blank and the inapplicable answer dropped. Round two must name the Task; its prompt carries round 2 and that description; answering it makes the description grow. A third run reports `clarify_no_questions`, and `round: 3`. |
| 16 | reopen | A Task is completed. Reopening with another Task's completion id is refused with 409 `reopen_stale_completion`. Reopening with the right id returns it to `active`. Reopening again is refused with 409 `reopen_not_completed`. The Task can be completed again. |
| 17 | description | A Task is captured with a multi-line `Q:`/`A:` description and read back byte for byte. A PATCH to a longer narrative reads back exactly; a PATCH of `description` to `null` removes it; a description of blank lines, tabs and non-ASCII text is accepted and returned unchanged. |
| 18 | time by category | Six Tasks are staged: a Static Task overlapping the range's start, a completed Dynamic Task with an observed window from a coloured event, one with a Fixed estimate and no observed window, one with a stochastic estimate, one with neither, and one with no category. `GET /reports/time-by-category` returns every row with the expected seconds, the `unmeasured` entry with its title, rows in seconds-descending then category-ascending order, the total, an `Uncategorized` row, the seven-day default range, and a 400 `time_by_category_invalid_range` when `from` is after `to`. A Task completed, reopened and completed again contributes its seconds once. |
| 19 | a realistic week | *Seeded.* The switch rehearsal. One invented week, `scripts/rehearsal-week.mjs`: seven daily instances of a recurring commitment UbU cannot own, two one-off events it can, one with a colour mapped to nothing, a daily routine, an Asleep routine for the night, a Dynamic backlog of six Tasks across three categories with one too long to fit anywhere, a Preference, and `calendar.color.*` Settings. The whole loop is walked on its own store at each of two planning horizons, one day and one week: capture, generate, the no-overlap and night checks, preview, a Mock approve, reconcile, Next Task and a completion, the time-by-category report, and a second full pass. See [the rehearsal](#the-rehearsal). |

The seeded scenarios first apply a day with no seed, then restart the
orchestrator on the same store with a fixture built from the events that
were applied. The seed is read at startup, so changing it means a restart.

The paths and schema versions are imported from `endpoints.ts` wherever
`ubu-ui` has a constant. Four routes have none and are named in the script:
`/openapi.json`, `/task/{task_id}/decompose`, `/container/{container_id}/undo`
and `/containers`. Scenario 1 asserts the orchestrator serves them.

### The stub model

Scenarios 14 and 15 each start a `node:http` server on its own ephemeral
loopback port and set `advisory.endpoint` to it. The stub serves
`POST /api/generate` with one of five canned answers: success, a 404 with an
`error` body, a delay beyond the budget, an empty `response`, and, in
`clarify` mode, a question set. The clarify answer is made from the request:
the round the prompt carries picks the questions, and at round 3 the stub says
it is done. Every request the stub receives is kept, so a scenario asserts
what the prompt carried. It can assert the 404, the
timeout and the empty answer every time, which a real model cannot. The
orchestrator's own transport makes the request, so the real request body is
checked too.

The timeout step takes five seconds, because five seconds is the floor of
`advisory.timeout_ms`.

## The rehearsal

Scenario 19 is the rehearsal for the switch to mainline planning. It answers
one question the other eighteen do not: what does a week that looks like a
real one do to the whole loop, end to end, on one store?

**The week is invented and says so.** It is `scripts/rehearsal-week.mjs`. It
is not the operator's calendar and not an imitation of it. Its shape is
realistic and every title is obviously synthetic:

| | |
|---|---|
| recurring commitment | seven daily instances at 14:00 local, a week of it, ids shaped `{invented base32hex}_{timestamp}`, coloured for `work` |
| one-off events | two with ids UbU can own: one at 16:00 coloured for `personal`, one at 18:00 with colour 1, which the Settings leave mapped to nothing |
| routine | one daily Static routine of half an hour at noon, category `personal` |
| night | an **Asleep** routine: daily, 23:00 local, 480 minutes, Static, occupying capacity, category `sleep` |
| backlog | six Dynamic Tasks across `work`, `grocery` and `personal`, three Fixed and two stochastic, and one Fixed at thirty hours that cannot fit any free interval |
| Preference | one, ordering two of the backlog |
| Settings | `calendar.color.*` for the three categories used, and one that moves `entertainment` off colour 1. `calendar.color.sleep` is not among them: the scenario sets and removes it |

The last Setting is there because every one of Google's eleven colours is
mapped to a category by default. A colour is only ever unmapped after the
operator has moved a category off it.

**The week lives in a timezone**, because a night does. Its events are at
local wall-clock hours. The runner stages it in a fixed-offset zone in which
the top of the current hour is 21:00, so every walk is the same evening: two
hours before Asleep, with a backlog longer than those two hours. Some of the
work has to cross the night, which is what makes the night's assertions mean
something. The acceptance harness stages the same week in the computer's own
zone, so the night on screen is the operator's night.

**Capture records occupied time; it does not reconstruct recurrence.** The
calendar holds one recurring commitment. The store, after capture, holds one
unrelated Static Task for each instance inside the horizon. Nothing in UbU
knows they are the same commitment: there is no series, no rule, and an
instance beyond the horizon is not seen until the horizon reaches it.

**What is walked, and asserted, on each store:**

1. **capture**: every event inside the horizon is captured and none is
   skipped; the unowned instances are reported once, in one
   `capture_occupancy_only` that names a single id, or the count and the
   first three; the unmapped colour is diagnosed; no diagnostic carries a
   title; a second capture admits nothing.
2. **generate**: every backlog Task is in the Plan or named in
   `unplaced_tasks`, and the two sets together are the whole backlog, each
   Task once. The Task left out has a reason, an explanation and alternatives.
3. **no overlap**: no planned Dynamic step overlaps any Static window that
   occupies capacity, the unowned ones included.
   **The night**: Asleep materialises once for each day of the horizon; each
   occurrence is Static, occupies capacity, begins at 23:00 local, lasts
   eight hours, spans midnight and is in the `sleep` category; **no Dynamic placement falls inside any
   Asleep window**; and at least one placement waits for the morning,
   beginning no earlier than 07:00.
4. **preview**: the desired set holds both events UbU can own, every placed
   Task and every routine occurrence, and no unowned Task; no operation names
   an unowned event. **Each Asleep occurrence is created as an event with
   `transparent: false`**, a Busy block. That export is a decision on record,
   see [availability](AVAILABILITY.md), and is asserted so that it is not a
   surprise. Each create says what its placement is: `static_anchor` is true
   for a night, though it has no colour, and false for a placed backlog Task.
   **Sleep's colour is the operator's own Setting.** With
   `calendar.color.sleep` unset the nights export with no colour. Set to `8`
   they export in it, and the Settings inverse table reports colour `8` as a
   `collision` with `location`, which has it by default. Removed, the colour
   is none again.
5. **approve in Mock**: applied, with no operation result and no applied event
   naming an unowned event or its Task.
   **Two Plans back to back**: the Plan starts on a whole minute, and an
   unchanged store planned twice in one minute is one Plan. Two Plans are
   generated with nothing changed between them: they have identical Dynamic
   windows, and the preview between them proposes no operations. Whether they
   fell in the same minute is read from the clock around each request. If the
   clock crossed a minute the windows moved, and the scenario asserts updates
   only and says which case it was.
6. **reconcile**: the only conflicts are the unowned instances, each
   `foreign`; the status is `observed`, not `drifted`.
7. **next action, then complete**: the recommendation is a placed backlog
   Task, and completing it transitions it.
8. **report**: `time-by-category` is the Static windows plus the one
   completion. The `sleep` row carries eight hours for every night, and
   `Uncategorized` is only the unmapped-colour Task.
9. **repeat**: a second full pass. Capture admits nothing, the same Tasks are
   placed and left out, the preview creates nothing, deletes nothing and
   names no unowned event, a preview straight after the approve proposes
   nothing, reconcile is unchanged and the report is unchanged. **The
   completed Task's event is frozen**: it is in no operation, the preview
   says so once with `calendar_event_retained`, and it is still in the
   applied record after the approve.

The mock Calendar observes a file read at startup, so the scenario restarts
the orchestrator on the same store after each approve, observing the
operator's events and what UbU applied. That is what a calendar holds after
an approve.

**Two horizons.** `UBU_PLANNING_HORIZON_SECONDS` defaults to 604800, one
week, from P1B-53; it was 86400, one day, and may be up to 2678400. Both are
set explicitly here, so neither depends on the default. The walk runs at 86400 and at 604800, each on its
own store. Where the two legitimately differ, the difference is asserted and
not the value: one day sees one instance of the recurring commitment and one
week sees all seven; one day holds one night and one week holds seven; one
week holds more routine occurrences and so more Static time; and the Task
that fits nowhere is left out for a different stated reason at each. At
both, the same five Tasks are placed, three before the night and two the
next morning.

The scenario prints, for each horizon, how long `POST /planning/generate`
took, the capture diagnostics, the Plan, the
placements in the week's local time with each night marked `ASLEEP`, the
unplaced Tasks, the planning diagnostics, the risk report, the preview
diagnostics, the reconcile conflicts and the time-by-category response, and
then one line comparing the two.

**The rehearsal reports; it does not fix.** What it shows that nobody
anticipated is written down as a gap, in the ticket's report, and is not
patched in the scenario. `acceptance.sh` stages the same week for the app.

## What the runner cannot cover

- **The Tauri HTTP plugin transport.** Requests here are made by Node's
  `fetch`. The app's requests are made in Rust by the plugin.
- **The capability scope** in `ubu-ui/src-tauri/capabilities`.
- **Anything rendered.** No webview, no React and no screen is involved.

The self-check card in the app's Setup screen is for the first two. It makes
three read-only requests through the real transport.

The runner also does not cover the live Calendar or a live model unless
asked to, and there is no CI: it runs when someone runs it.

## The two live flags. Skipped is not passed.

| Flag | Adds | Also needs |
|---|---|---|
| `UBU_E2E_GOOGLE=1` | One read-only live reconcile against the configured calendar. It approves, captures and repairs nothing. | `UBU_GOOGLE_CREDENTIALS_PATH` and `UBU_GOOGLE_TOKEN_CACHE_PATH`. `UBU_GOOGLE_CALENDAR_ID` is passed through when set. |
| `UBU_E2E_OLLAMA=1` | One live advisory run for one synthetic Task. | `UBU_E2E_OLLAMA_MODEL`. `UBU_E2E_OLLAMA_ENDPOINT` defaults to `http://127.0.0.1:11434`, and `UBU_E2E_OLLAMA_TIMEOUT_MS` to 600000. |

Both are off by default. With a flag unset its scenario prints a `SKIP` line
saying it did not run and proves nothing. A skip is never counted as a pass,
and the `RESULT` line counts skips separately.

With both unset, nothing the runner starts can reach past this machine:
every orchestrator runs with an emptied environment that holds no credential
and no Google path, the only model endpoint configured is the stub's, and
every request the script makes is refused unless it is to `127.0.0.1` on a
port the run opened itself.

**Neither live scenario has been run by the agent that wrote it.** They are
untested until the operator runs them.

## How to run it

```sh
./scripts/check-ui-contract.sh
```

Requirements: `cargo`, Node 22 or newer, and the `ubu-orchestrator` and
`ubu-ui` checkouts beside `ubu-devshell`. There is no `package.json` and
nothing to install. The build is `cargo build --locked --offline`.

| Variable | Default | Description |
|---|---|---|
| `REPOS_DIR` | `../` relative to devshell | Parent directory of all repos |
| `ORCHESTRATOR_DIR` | `$REPOS_DIR/ubu-orchestrator` | Path to orchestrator checkout |
| `UI_DIR` | `$REPOS_DIR/ubu-ui` | Path to UI checkout |
| `STARTUP_TIMEOUT_SECONDS` | `60` | How long to wait for `/health` |
| `UBU_CHECK_VERBOSE` | unset | `1` also prints every request and its status |
| `UBU_CHECK_ONLY` | unset | Such as `7,8`: walk only those scenarios. The result says the walk was partial. |

The runner does not use the operator's store. Everything it writes is under
one `mktemp -d` directory, which is removed on every exit path: success,
failure, Ctrl-C and `SIGTERM`. Every orchestrator and the stub are stopped
on the same paths.

## How to read the output

Each scenario prints its name, one `ok:` line for each thing it checked with
the value it saw, and then one `PASS` line saying what was established:

```text
scenario 7 of 16: colour means done (seeded mock calendar)
  ok: before capture the Dynamic Task is active: true
  ok: capture changed one Task and left the Static one unchanged: {"captured":0,"skipped":0,"unchanged":1,"updated":1}
  ok: the Dynamic Task whose event was coloured is completed: "completed"
  ...
PASS  7 colour means done: a colour on an applied Dynamic event completes its Task at capture, and only that Task
```

A complete walk ends with nineteen `PASS` lines, two `SKIP` lines and:

```text
RESULT: 19 of 19 scenarios passed, 0 failed, 2 skipped, 312 requests, all to 127.0.0.1
```

The walk stops at the first failure. The `FAIL` line names the scenario and
the assertion, with what was expected and what was seen, followed by the last
request, what was sent, the status, the body, and the end of that
orchestrator's log. The exit status is 1. An interrupted walk exits 130 and
is not a pass.

| The `FAIL` line says | What happened | Where to look |
|---|---|---|
| `DEFAULT PORTS DIFFER` | One default was changed without the other. | `ubu-ui/src/api/endpoints.ts` and `ubu-orchestrator/src/config.rs`. The orchestrator's value wins. |
| `N path constant(s) in endpoints.ts are not served` | A route was renamed or removed on the server. The `MISSING` lines name each one. | Regenerate the OpenAPI document and update `endpoints.ts`. |
| `returned 404, expected 200` | The UI calls a path the orchestrator does not serve. | The path constant, and the orchestrator's router. |
| `returned 400`, with a body naming `unknown_schema_version` | A schema-version constant is out of date. | The `*_SCHEMA_VERSION` constant in `endpoints.ts`. |
| `returned 400` or `422`, with another body | A request shape no longer matches. | The body printed after the status, and the wrapper in `client.ts`. |
| `assertion failed: …` | The orchestrator answered, and the answer is not what the daily loop needs. | The expected and actual values on the next two lines. |
| `the orchestrator exited before it answered /health` | It did not start. | The orchestrator log printed below the line. |

## The runner and the acceptance harness

Two scripts, one boundary.

| | `check-ui-contract.sh` | `acceptance.sh` |
|---|---|---|
| Covers | The HTTP layer: what the orchestrator does with a request. | The rendered layer: what a human sees in the app. |
| Asserts | Everything it checks, in nineteen scenarios, each on its own store. | Nothing about behaviour. It stages a store and prints steps. |
| Store | One throwaway store per scenario, and two for the rehearsal, on ephemeral ports. | One throwaway store on the app's default port, held until Ctrl-C. |
| Preconditions | Each scenario stages exactly what it asserts. | Each step declares the seeds it needs; each seed checks itself over HTTP. |
| A human | Reads PASS and FAIL lines. | Opens the app and follows the steps. |

The boundary: **anything assertable over HTTP is a scenario here, never a
manual step there.** The harness exists for what only a human at a webview
can see, and it makes sure the store that human looks at holds what the
steps assume. See [the acceptance harness](ACCEPTANCE.md).

## Acceptance from here

**An operator acceptance step is reserved for what only a human at a webview
can see.** Anything a scenario can assert belongs in the runner, as a
scenario, in the ticket that adds the behaviour.

So an acceptance list is short. It says: run the runner; press the
self-check; and look at whatever this ticket put on a screen. A step that
could have been a scenario is a scenario that was not written.

After the scripted checks and the staged acceptance steps comes the one thing
no script here does: [the live rehearsal](LIVE_REHEARSAL.md), against the
operator's own store and real calendar, started with `scripts/run-live.sh`.
