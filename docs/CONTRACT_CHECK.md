# Contract check

`scripts/check-ui-contract.sh` checks `ubu-ui`'s idea of the orchestrator
against a real, running `ubu-orchestrator`. It needs no webview and takes a
few seconds once the orchestrator is built.

## Why it exists

The P1B-39 acceptance failed three times in a row, and every failure was an
address, not a defect. Measured across the constellation at that time:

| where | value |
|---|---|
| `ubu-orchestrator/src/config.rs` | `UBU_ORCHESTRATOR_PORT` → `unwrap_or(7878)` |
| `ubu-ui/src/api/client.ts` | `DEFAULT_ORCHESTRATOR_PORT = "17890"` |
| `ubu-ui/README.md` | instructs `VITE_UBU_ORCHESTRATOR_URL=http://127.0.0.1:17890` |
| `ubu-devshell/scripts/generate-ui-api-client.sh` | `ORCHESTRATOR_URL` default `http://127.0.0.1:8080` |
| `ubu-devshell/scripts/run-orchestrator.sh` | sets `HOST` and `BIND_ADDR`, never sets the port |

Three ports and no source of truth. `17890` appeared nowhere in
`ubu-orchestrator`. Nobody noticed, because no request had ever succeeded.
Each failure was found by a person clicking a button.

P1B-40 made `7878` the value everywhere, because it is the only one that is
executable: it is in the orchestrator's code. The two defaults are still two
literals in two repos. Nothing generates one from the other. This check is
what fails when they drift.

## What it covers

1. **The two default ports agree.** It reads `DEFAULT_ORCHESTRATOR_PORT` from
   `ubu-ui/src/api/endpoints.ts` and the `unwrap_or(…)` default from
   `ubu-orchestrator/src/config.rs`, and fails with both values when they
   differ. This is a comparison of values. The traffic runs on a different,
   ephemeral port, so a port that happens to be busy cannot hide a mismatch.
2. **The routes answer.** In order: `GET /health`, `POST /task` with a
   synthetic Task, `GET /tasks` asserting the Task is listed,
   `PATCH /task/:id` editing it, `POST /planning/generate`,
   `GET /next-action`. Any status outside 2xx fails the run.
3. **The schema versions are accepted and echoed.** The requests carry the
   schema-version constants from `endpoints.ts`, and the responses that carry
   a `schema_version` must carry the one `ubu-ui` expects.
4. **Every path constant is served.** Each exported `*_PATH` constant in
   `endpoints.ts` must be a path in the orchestrator's live `/openapi.json`.
   A route renamed on the server fails here.

The paths and schema versions are imported from `endpoints.ts`. They are not
copied into the script. The request bodies are the shapes `client.ts` sends;
`client.ts` cannot be imported outside the Tauri shell, which is why
`endpoints.ts` was split from it.

The orchestrator is the real binary, built from the checkout. It is not a
mock: a mock would agree with whatever the client believes.

## What it does not cover

- **The Tauri HTTP plugin transport.** Requests here are made by Node's
  `fetch`. The app's requests are made in Rust by the plugin.
- **The capability scope** in `ubu-ui/src-tauri/capabilities`.
- **Anything rendered.** No webview, no React and no screen is involved.
- **Routes the script does not call.** Step 4 proves every path exists. Only
  the six requests in step 2 prove a request shape.
- **CI.** There is none in this constellation. The check runs when someone
  runs it.

The operator acceptance surface is now only the webview: the three items at
the top of this list, in `npm run tauri:dev`. Everything underneath is this
script's job.

## How to run it

```sh
./scripts/check-ui-contract.sh
```

Requirements: `cargo`, Node 22 or newer, and the `ubu-orchestrator` and
`ubu-ui` checkouts beside `ubu-devshell`. There is no `package.json` and
nothing to install. The build is `cargo build --locked --offline`, so the
orchestrator's dependencies must already be fetched.

| Variable | Default | Description |
|---|---|---|
| `REPOS_DIR` | `../` relative to devshell | Parent directory of all repos |
| `ORCHESTRATOR_DIR` | `$REPOS_DIR/ubu-orchestrator` | Path to orchestrator checkout |
| `UI_DIR` | `$REPOS_DIR/ubu-ui` | Path to UI checkout |
| `STARTUP_TIMEOUT_SECONDS` | `60` | How long to wait for `/health` |

The script does not use the operator's store. The orchestrator it starts
runs in a fresh temporary directory, with a temporary database and device
registration, in an environment that carries no token and no Google
credential, in mock GitHub modes. It binds `127.0.0.1` and the script refuses
any other host. The temporary directory is removed and the orchestrator is
stopped on every exit path, including failure, Ctrl-C and `SIGTERM`.

## How to read the output

A passing run ends with one line:

```text
PASS: ubu-ui contract check: defaults agree on 7878, 7 requests succeeded, 18 of 18 path constants are live
```

A failing run ends with one `FAIL:` line that names the cause, followed by
the last lines of the orchestrator's log. The exit status is 1. An
interrupted run exits 130.

| The `FAIL:` line says | What happened | Where to look |
|---|---|---|
| `DEFAULT PORTS DIFFER: ubu-ui defaults to X but ubu-orchestrator defaults to Y` | One default was changed without the other. | `ubu-ui/src/api/endpoints.ts` and `ubu-orchestrator/src/config.rs`. The orchestrator's value wins. |
| `GET http://127.0.0.1:…/… returned 404`, with the body | The UI calls a path the orchestrator does not serve. | The path constant in `endpoints.ts`, and the orchestrator's router. |
| `… returned 400`, with a body naming `unknown_schema_version` | A schema-version constant is out of date. | The `*_SCHEMA_VERSION` constant in `endpoints.ts`. |
| `… returned 400` or `422`, with another body | The request shape no longer matches. | The body printed after the status, and the wrapper in `client.ts`. |
| `N path constant(s) in endpoints.ts are not served by this orchestrator` | A route was renamed or removed on the server. The lines marked `MISSING` above it name each one. | Regenerate the OpenAPI document and update `endpoints.ts`. |
| `… answered schema_version A, ubu-ui expects B` | The orchestrator moved to a new response version. | The constant, then the types in `client.ts`. |
| `the orchestrator exited before it answered /health` | It did not start. | The orchestrator log printed below the line. |
| `ubu-orchestrator did not build` | The check cannot run without the real binary. | The compiler output above the line. |

Each request is printed as it is made, with its status, so the last line
before `FAIL:` is the request that failed.
