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
  expect: "The selected Task is {interview}, not {described}. A proposal appears with its questions.",
  codes: [
    "candidates_enqueued: 1 and no diagnostic: the run happened and there is a proposal to answer",
    "clarify_already_queued: a proposal for it is already waiting below; answer that one, this run did not ask the model"
  ]
}
```

`{interview}` is replaced by what the seed's `check` returned. `codes` lists
every diagnostic the step can meet, each with what it means and whether the
run happened; it is printed under `expect:`. A step with
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

## Whether a step belongs in the list at all

From P1B-50, three rules decide it, and from P1B-51 a fourth. A step that
fails any one of them is not written; it is moved to the runner, dropped, or
moved to where it breaks nothing.

1. **A manual step may not verify what the runner or a `ubu-ui` test already
   asserts.** P1B-48's dependent-question check broke this rule: that a
   dependent question shows only when its dependency is answered is asserted
   by the runner's clarify scenario and by `ubu-ui` test 66, so it is gone.
2. **A step's expected outcomes must name the diagnostic codes, and must
   include the "it did not run" outcome.** Every step carries a `codes`
   field, one line per code with what it means, and the harness prints them
   under `expect:`. P1B-48's second-round step broke this rule: it did not
   say that `clarify_no_task` means the selector was left on its default and
   the run did not happen, and that outcome was read as a result of a run.
3. **A step must not depend on what a model chooses to emit.** If a behaviour
   is deterministic given a question set, it belongs in the runner against
   the stub model. A real-model step may only check that a real model
   answers at all, and every one of its outcomes is a result to report.

4. **Deterministic steps come first and model-dependent steps come last, and
   no step may be a prerequisite of a later step unless it is deterministic.**
   P1B-50's list broke this rule. Its third step was answered by a model, its
   fourth read what the model's questions had produced, and the time-by-category
   panel and two more came after. The model answered `done` on round one, so
   there were no answers, the fourth step had nothing to show, and the three
   steps after it were abandoned: the whole of the time-by-category panel
   went unlooked at. Under this rule:
   - a step whose outcome depends on a model is placed after every step that
     does not;
   - a step that follows a model-dependent step must be runnable whatever that
     step's outcome was, and its `codes` name each case;
   - what a later step needs is staged by the harness, never produced by an
     earlier step that could fail. The notes step reads a description the
     harness staged itself, not one an interview wrote.

A model that declines to ask is a result to report, not a reason to stop.
The harness prints, under the list: **a step that cannot be completed is
reported as such, and the steps after it are still run.**

A step with no diagnostic to meet says so: its `codes` is `[]` and the
harness prints `none`.

### The list from P1B-51

| # | step | depends on a model | staged by |
|---|---|---|---|
| 1 | Setup → Run self-check | no | nothing |
| 2 | Tasks → Notes for the described Task | no | `described` |
| 3 | Today → Time by category | no | `spent` |
| 4 | Next Task → Complete, then Undo | no | `completable` |
| 5 | Today → Generate Plan, over the staged week | no | `week_calendar`, `week_routine`, `week_night`, `week_backlog` |
| 6 | Calendar → Take preview | no | `week_calendar`, `week_colours` |
| 7 | Review → Clarify → Run on the default; answer what it asks | **yes** | `interview`, `described`, `advisory` |
| 8 | Review → Clarify → Run again, selector set | **yes** | `interview`, `advisory` |

Steps 2 and 3 are the two parts of P1B-50 that were never looked at, and they
are now first after the self-check. Step 4 comes before step 5 on purpose:
both are deterministic, and once a Plan exists Next Task recommends the
Plan's first placement and not the Task step 4 is staged for. Step 8 can be
run whatever step 7 did; its codes name the round-one decline, the finished
interview, and the run that interviewed another Task because the selector
was left on its default.

Steps 5 and 6 check rendering only. That the week's Plan accounts for every
Task, that nothing overlaps an occupied window and that no preview names an
event UbU does not own are asserted by the runner's rehearsal scenario. What
is left for a human is how Today and Calendar show it. From P1B-52 that
means three things in particular: that Generate Plan reads as a Plan with one
Task that did not fit and not as an error, with the Task named by title under
**Not in this Plan**; that no work is placed in the night; and that Take
preview reports the skipped occupancy window quietly, as a status.

## The staged week

From P1B-51 the harness also stages the switch rehearsal's week, the one
`check-ui-contract.sh` walks and asserts in its scenario 19. It is
`scripts/rehearsal-week.mjs`, imported by both, so what the runner proves is
what the operator looks at. Every title in it is invented and says so.

| seed | what it stages | what its check asserts |
|---|---|---|
| `week_colours` | `calendar.color.*` for the three categories the week uses, and one colour left mapped to nothing | each is a Setting, and colour 1 maps to no category |
| `week_calendar` | the week's calendar, captured in Mock | every event inside the horizon is one Static Task with its colour's category; the unowned instances were reported once, as one `capture_occupancy_only`; a second capture admits nothing |
| `week_routine` | one daily routine, at noon | it is listed |
| `week_night` | the **Asleep** routine: daily, 23:00, 480 minutes, category `sleep` | read back from the store: this computer's timezone, daily, `nominal_start` 23:00:00, 28800 seconds, Static, occupying capacity, category `sleep` |
| `week_sleep_colour` | `calendar.color.sleep = "8"`, the operator's own Setting | the palette has it as a Setting, and the inverse table reports colour 8 as a `collision` between `location` and `sleep` |
| `week_backlog` | six Dynamic Tasks, one too long to fit anywhere, and a Preference | all six are active and Dynamic, and the Preference is listed |

The week's calendar is a file the mock Calendar observes, written before the
orchestrator starts and named by `UBU_CALENDAR_MOCK_EVENTS`. With that set, a
Live calendar request is refused before any client exists, so the app cannot
reach a real calendar from the staged orchestrator.

**The horizon** is the orchestrator's default, which from P1B-53 is one week.
Export `UBU_PLANNING_HORIZON_SECONDS=86400` before running the harness to
stage one day; the harness passes it through and prints which horizon is
staged. At one week, all seven recurring instances are inside the horizon; at
one day, one of them is.

**Each instance is its own Task.** Capture records occupied time; it does
not reconstruct recurrence. The staged calendar holds one recurring
commitment, and the staged store holds one unrelated Static Task for each
instance inside the horizon. Nothing in UbU knows they are one commitment,
and the harness says so in the line it prints for `week_calendar`.

**The week has a night in it.** The harness stages the week in this
computer's own timezone, with its events at local wall-clock hours, and an
Asleep routine from 23:00 to 07:00. UbU has no working-hours setting; a
capacity-occupying Static routine is how it is told when no work may be
placed. See [availability](AVAILABILITY.md). The night block is why a Plan
generated in the evening starts the rest of the work the next morning and
not at midnight, and the Generate Plan step says so. Take preview shows each
night as an event to create: Asleep is exported to the calendar as a Busy
block, on purpose.

**No Plan is staged.** With no Plan, Next Task recommends the earliest ready
Task, which is what the `completable` seed promises and checks. With a Plan it
recommends the Plan's first placement, which is a different Task. So the step
that completes and undoes comes before the step in which the operator
generates the Plan.

**Checks run after every seed is made**, in a second pass. That was always the
documented contract and from P1B-51 it is what the code does: what Next Task
recommends and which Task Clarify picks depend on every Task in the store,
not only on the ones made before that seed.

## How to add a step

1. Check the step against the four rules above, and decide where in the
   order it goes: before the first model-dependent step unless it is one.
2. Write the step in `STEPS`, in order, with `needs` naming every seed it
   relies on and `codes` naming every diagnostic it can meet. If the
   precondition does not exist yet, write the seed in `SEEDS` with a `what`,
   a `make` and a `check`.
3. Make the `check` assert the thing the step actually depends on. If the
   step depends on what Next Task recommends, the check asks `/next-action`.
   If it depends on which Task Clarify picks, the check computes the pick.
4. Run `./scripts/acceptance.sh --stage-only` until every seed prints `OK`
   and every step prints with its objects named. A `FAIL` names the seed
   and the reason.
5. Only then hand the steps over. The operator runs the same command
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
