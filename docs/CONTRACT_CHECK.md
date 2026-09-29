# The scenario runner

`scripts/check-ui-contract.sh` builds the real `ubu-orchestrator` and walks
the daily loop against it over HTTP, in fourteen scenarios. It needs no
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

## The fourteen scenarios

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
| 10 | recurring refusal | *Seeded.* The calendar shows an event whose id has the `{base32hex}_{timestamp}` shape. It parses, classifies `foreign`, is refused by capture with `capture_event_not_ownable`, creates no Task, and is not in the applied record. |
| 11 | preferences | Two Preferences are created. A third that closes a cycle is refused naming the members in order. One is deleted, and the refused one is then accepted. |
| 12 | decomposition | A Task is decomposed into three children held as one segment. In the Plan each child starts when the one before it ends. Undo restores the Task under a new handle and moots the children. |
| 13 | settings reach planning | A category colour changed through `PUT /setting/:name` is carried by the next preview, with no restart and no new Plan. Reverting returns the default. |
| 14 | advisory | Against the stub model: unconfigured names both Settings and asks the model nothing; a 404 body reaches `advisory_http_failed`; an empty answer reports `advisory_empty_response` and whether thinking was present; a slow answer trips `advisory_timeout` at the budget; a good answer enqueues candidates, and admitting one sets the category. |

The seeded scenarios first apply a day with no seed, then restart the
orchestrator on the same store with a fixture built from the events that
were applied. The seed is read at startup, so changing it means a restart.

The paths and schema versions are imported from `endpoints.ts` wherever
`ubu-ui` has a constant. Four routes have none and are named in the script:
`/openapi.json`, `/task/{task_id}/decompose`, `/container/{container_id}/undo`
and `/containers`. Scenario 1 asserts the orchestrator serves them.

### The stub model

Scenario 14 starts a `node:http` server on its own ephemeral loopback port
and sets `advisory.endpoint` to it. The stub serves `POST /api/generate` with
one of four canned answers: success, a 404 with an `error` body, a delay
beyond the budget, and an empty `response`. It can assert the 404, the
timeout and the empty answer every time, which a real model cannot. The
orchestrator's own transport makes the request, so the real request body is
checked too.

The timeout step takes five seconds, because five seconds is the floor of
`advisory.timeout_ms`.

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
scenario 7 of 14: colour means done (seeded mock calendar)
  ok: before capture the Dynamic Task is active: true
  ok: capture changed one Task and left the Static one unchanged: {"captured":0,"skipped":0,"unchanged":1,"updated":1}
  ok: the Dynamic Task whose event was coloured is completed: "completed"
  ...
PASS  7 colour means done: a colour on an applied Dynamic event completes its Task at capture, and only that Task
```

A complete walk ends with fourteen `PASS` lines, two `SKIP` lines and:

```text
RESULT: 14 of 14 scenarios passed, 0 failed, 2 skipped, 120 requests, all to 127.0.0.1
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

## Acceptance from here

**An operator acceptance step is reserved for what only a human at a webview
can see.** Anything a scenario can assert belongs in the runner, as a
scenario, in the ticket that adds the behaviour.

So an acceptance list is short. It says: run the runner; press the
self-check; and look at whatever this ticket put on a screen. A step that
could have been a scenario is a scenario that was not written.
