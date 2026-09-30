# The acceptance harness

`scripts/acceptance.sh` stages the store the operator's acceptance steps
need, checks every staged precondition over HTTP, prints the steps with the
staged objects named in them, and holds one orchestrator up on the app's
default port until Ctrl-C. The operator starts the app and follows the steps.

It exists because four acceptance runs in a row stalled on a precondition
that was assumed rather than staged:

| ticket | step | what was assumed |
|---|---|---|
| P1B-41 | all | a populated store |
| P1B-43 | capture | that reconcile had already seen the event |
| P1B-47 | 3 | a generated Plan and a category on the Task |
| P1B-48 | 2 | that an active Task existed |

Four for four were preconditions, not rendering. The operator's own store
is empty by decision, since mainline bootstraps from Google Calendar and that
bootstrap has not happened, so every step that needs data must bring its own.

## What it is for, and what it is not

The scenario runner, `check-ui-contract.sh`, covers the HTTP layer and
asserts behaviour. Three things it cannot see remain for a human: the Tauri
HTTP plugin transport, the capability scope, and anything rendered. The first
two are the self-check card in Setup. The third is the only reason a human
opens the app, and it is what the steps this harness prints are for.

The harness:

- **stages**: it creates the Tasks and Settings the steps rely on, in a
  throwaway store, through the same routes the app uses;
- **checks**: every seed asserts over HTTP that the state it promises
  actually holds, not that a request was accepted;
- **prints**: the numbered steps, with each staged object named by title
  and id, so a step never says "a Task" when it means a particular one;
- **holds**: one orchestrator on the app's default port, so
  `npm run tauri:dev` reaches the staged store with no configuration.

It does not assert behaviour, it does not drive the app, and it never opens
the operator's own store.

## The seed-and-step contract

Both live in `scripts/acceptance.mjs`, beside each other.

A **seed** has three parts:

```js
interview: {
  what: "an active Task with no description, which Clarify picks on its default",
  async make() { /* create it through the API; return what was made */ },
  async check(made) { /* assert over HTTP that the state holds; return a name for it */ }
}
```

- `what` says in one line what the seed is for. It is printed.
- `make` stages it and returns whatever `check` needs.
- `check` asserts, over HTTP, that the API now agrees the state holds. It
  throws when it does not, naming what is wrong. It returns the text that
  names the object in the steps, by title and id.

A **step** names the seeds it needs and interpolates them:

```js
{
  needs: ["interview", "described", "advisory"],
  title: "Review → Clarify → Run, with the selector left on its default",
  expect: "The selected Task is {interview}, not {described}. A proposal appears with its questions."
}
```

`{interview}` is replaced by what the seed's `check` returned. A step with
`needs: []` is one whose precondition is genuinely the empty store or the
app alone.

Two things are checked before anything is built:

- a step that names a seed that does not exist is a failure, so a
  precondition nobody stages cannot be quietly referenced;
- a seed that no step names is reported, so a stale seed is visible.

Every seed's `check` runs after every seed is made, so a check can see the
whole staged store. That matters when two steps could collide: the check
that Clarify's default picks the interview Task re-implements the selection
predicate, first active non-occurrence Task with a blank description ordered
by id, rather than trusting that creating it first made it first.

## How to add a step

1. Write the step in `STEPS`, in order, with `needs` naming every seed it
   relies on. If the precondition does not exist yet, write the seed in
   `SEEDS` with a `what`, a `make` and a `check`.
2. Make the `check` assert the thing the step actually depends on. If the
   step depends on what Next Task recommends, the check asks `/next-action`.
   If it depends on which Task Clarify picks, the check computes the pick.
3. Run `./scripts/acceptance.sh --stage-only` until every seed prints `OK`
   and every step prints with its objects named. A `FAIL` names the seed
   and the reason.
4. Only then hand the steps over. The operator runs the same command
   without `--stage-only` and follows what it prints.

One step list at a time. A ticket replaces the list; git history keeps the
old ones.

## What belongs in the runner instead

**Anything assertable over HTTP belongs in `check-ui-contract.mjs`, as a
scenario, not here.** If a step's outcome can be checked by a request, it is
not a manual step: write the scenario, and let the runner assert it every
time. The harness stages; it never asserts behaviour. That is the boundary,
and it is what keeps the manual list short.

## Running it

```sh
./scripts/acceptance.sh                # stage, print the steps, hold until Ctrl-C
./scripts/acceptance.sh --stage-only   # stage, check, print, exit
```

Then, in another terminal:

```sh
cd ../ubu-ui && npm run tauri:dev
```

Requirements: `cargo`, Node 22 or newer, and the `ubu-orchestrator` and
`ubu-ui` checkouts beside `ubu-devshell`. There is no `package.json` and
nothing to install. The build is `cargo build --locked --offline`.

| Variable | Default | Description |
|---|---|---|
| `UBU_ACCEPTANCE_MODEL` | unset | `advisory.model` to stage. Unset, the operator chooses it in Setup, and the staging output says so. |
| `UBU_ACCEPTANCE_ENDPOINT` | `http://127.0.0.1:11434` | `advisory.endpoint` to stage. |
| `UBU_ACCEPTANCE_TIMEOUT_MS` | `600000` | `advisory.timeout_ms` to stage. |
| `REPOS_DIR` | `../` relative to devshell | Parent directory of all repos |
| `ORCHESTRATOR_DIR` | `$REPOS_DIR/ubu-orchestrator` | Path to orchestrator checkout |
| `UI_DIR` | `$REPOS_DIR/ubu-ui` | Path to UI checkout |
| `STARTUP_TIMEOUT_SECONDS` | `60` | How long to wait for `/health` |

The model is the operator's to choose: the endpoint and the timeout are
plumbing, the model is what a real-model step exists to vary.

### The default port

The harness starts its orchestrator on the app's default port, and **refuses
to start if something already answers there**. Otherwise the app might be
talking to the operator's real orchestrator while the operator follows steps
written for a staged one. The refusal says what to do: stop the orchestrator
you have running.

### The operator's store is unreachable

The staged orchestrator runs with `HOME` and `UBU_DB_PATH` both inside the
harness's temp directory, `UBU_DEVICE_REGISTRATION` there too, mock GitHub
modes, and nothing else in its environment: no token and no Google path. Its
working directory is the temp directory. The first line the harness prints
is the store path, so it can be seen to be a temp one. `ubu-orchestrator.db`
in the repo is not opened.

### Ending

Ctrl-C is how a session ends, so the interrupt path is the normal path. The
harness stops the orchestrator and `acceptance.sh` removes the temp
directory, on Ctrl-C, on `SIGTERM`, on a failed seed and on `--stage-only`.
The last line says the store is gone.
