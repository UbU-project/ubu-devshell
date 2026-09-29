# P1B-47 verification

## What the agent did not verify

- **Nothing rendered in the Tauri shell.** The fixed window on Tasks, the
  Clear button on Routines, the reworded approve result and the self-check
  card were tested in Vitest with the Tauri HTTP plugin mocked. None has been
  seen in a webview.
- **The self-check has never run through the real transport.** That is what
  it is for, and only the operator can do it.
- **Neither live scenario has been run.** `UBU_E2E_GOOGLE=1` and
  `UBU_E2E_OLLAMA=1` were never set. The code behind them is untested.

The four operator acceptance steps are outstanding.

## Things to know first

Each of these differs from what the ticket says. None needed a repository
the ticket does not change.

1. **The self-check does not call the Calendar preview.**
   `GET /projection/calendar/preview` stores a preview record every time it
   is called: one row in `projection_previews`, measured. Judgment call 10
   requires the self-check to make no write of any kind, and section H lists
   the preview as one of its three reads. Both cannot hold. The third read is
   `GET /calendar/current` instead, the current Plan, which leaves every
   table as it was. The card's statement that it writes nothing is therefore
   true.
2. **Section H adds no route and no client method.** `health`, `listTasks`
   and `currentCalendar` already existed. The path-constant count is 39
   before and 39 after.
3. **The clear-override method reuses `ROUTINE_OVERRIDE_PATH`.** A constant
   of its own, as `SETTING_DELETE_PATH` has, would have raised the count by
   one for a route section G uses, which the workflow forbids.
4. **Preview does not observe the calendar, so the seed does not reach it.**
   Orchestrator test 2 is specified as "`preview` and `reconcile` observe the
   seeded events". Preview makes no Calendar call; it diffs the desired set
   against the applied record. Test 2 asserts that reconcile and capture
   observe the seed, and that preview is unchanged by it, which is what
   judgment call 3 requires.
5. **Skipped occurrences are named up to 25, then counted.** Section B says
   each one is reported. A routine produces an occurrence every day, so the
   list has no natural bound. The first 25 are named one by one and any
   beyond are reported in one further diagnostic with the same code.
6. **The orchestrator's refusal of a backwards window has no diagnostic.** It
   is HTTP 400 with `error` set to `bad request: Task static_window.end must
   be strictly after start` and an empty `diagnostics`. The Tasks screen
   shows that text. It also checks the window itself and sends nothing when
   the end is not after the start.
7. **Two commits were added after a push, to correct the agent's own work.**
   See "History" below. Nothing was rewritten or force-pushed.

## Pushed revisions, in landing order

Baseline: `ubu-orchestrator` `5b2b5ac`, `ubu-ui` `9bed3a3`, `ubu-devshell`
`616dfc8`, each on `main` with a clean tree, as was every sibling
repository. Work is on `p1b-47-scenario-runner` in the three that change.

| Order | Repository | Sections | Pushed revision |
| --- | --- | --- | --- |
| 1 | `ubu-orchestrator` | A–C | `0315910269e3373c1de6ac9073c8a7c0f2cc9ed8` |
| 2 | `ubu-ui` | G–I | `6cea64d0beb521cff4e25fddac36f4df75cdb58b` |
| 3 | `ubu-orchestrator` | documents | `a84229dbd47224062df867764c678bf7a37afa39` |
| 4 | `ubu-devshell` | D–F, J | the commit that carries this file |

Track B landed first, as the ticket asks. The runner was written against it.

| Section | Repository | Commit | Change |
| --- | --- | --- | --- |
| A | `ubu-orchestrator` | `2cf5598` | `UBU_CALENDAR_MOCK_EVENTS`, the seed loader, the three Mock paths, the refusal beside `live`. |
| B | `ubu-orchestrator` | `227e4f4` | `suggest_tags` excludes occurrences and reports them. |
| C | `ubu-orchestrator` | `5ffbe7b` | Six tests. |
| C | `ubu-orchestrator` | `0315910` | One test released a lock before awaiting, for clippy. |
| C | `ubu-orchestrator` | `a84229d` | `docs/CALENDAR_MOCK_SEED.md`, and two documents corrected. |
| D | `ubu-devshell` | `4b331c9` | The walk, thirteen scenarios. |
| E | `ubu-devshell` | `f636185` | The stub model, scenario 14, the two live scenarios. |
| F | `ubu-devshell` | `f8857aa` | `docs/CONTRACT_CHECK.md`. |
| G | `ubu-ui` | `41cb504` | The fixed window, the Clear button, the reworded result, the skipped-occurrence line. |
| G | `ubu-ui` | `9612026` | "1 event", not "1 events". |
| H | `ubu-ui` | `e7348b0` | The self-check card. |
| I | `ubu-ui` | `679daee` | Five tests. |
| I | `ubu-ui` | `6cea64d` | `docs/NAVIGATION.md` and `docs/ROUTINES.md`. |
| J | `ubu-devshell` | This commit | The two pins and this record. |

**No dependency pin moved.** No `Cargo.toml`, `Cargo.lock`, `package.json` or
`package-lock.json` changed in any repository, and `ubu-devshell` gained no
`package.json`. The pins that change are `ubu_orchestrator` and `ubu_ui` in
`pinned-revs.toml`.

`ubu-core` `c77c0a2`, `ubu-store` `7b24cd8`, `ubu-schemas` `4974166`,
`ubu-planning-kernel` `84b6d0d`, `ubu-github-adapter` `4c7e3b6`, `quick-ubu`
`9ccc8b8` and `ubu-design` `f7c4a1d` are at their initial heads with clean
trees. The OpenAPI document did not change: no route, request or response
changed, and `ubu-ui`'s copy is byte-identical to the orchestrator's.

### History

Three commits are corrections of the agent's own work in this ticket:

- `0315910`: the new test 5 held a mutex guard across an `await`, which
  clippy reports. It was found after `5ffbe7b` had been pushed, because the
  push was not made to wait for clippy. It was fixed in a further commit.
- `9612026`: the reworded approve result read "1 events".
- `a84229d` and `6cea64d` are documents the ticket does not list, written
  because the behaviour they describe changed.

So sections C, G and I have more than one commit each. Tests were green and
the trees clean at every one.

## Gates

| Repository | Tests before | Tests after |
| --- | --- | --- |
| `ubu-orchestrator` | **378** | **384** |
| `ubu-ui` | **57** | **62** |
| `ubu-devshell` | none | none; the runner and `show-revs.sh` are the checks |

`npx tsc --noEmit` is clean at every UI commit. `npx vite build` succeeds.
The orchestrator suite ran under a seccomp filter that refuses every
`AF_INET` and `AF_INET6` socket, with `GITHUB_TOKEN` and both Google paths
removed from its environment. The UI suite ran under a Node preload that
refuses every socket connect, DNS lookup and real `fetch`, and recorded 0
attempts at every commit.

### Clippy

| | Emitted warnings | Unique warnings |
| --- | --- | --- |
| Before, `5b2b5ac` | 16 | 9 |
| At `5ffbe7b` | 17 | 10 |
| After, `0315910` and `a84229d` | 16 | 9 |

Delta: **0**. The nine unique warnings are the same nine lints in the same
files. At `5ffbe7b` there was one more, `clippy::await_holding_lock` in the
new test, removed by `0315910`.

Method: `cargo clippy --locked --offline --all-targets --message-format=json`,
after touching `src/lib.rs` so the crate is recompiled. "Emitted" counts JSON
lines with level `warning`. "Unique" deduplicates compiler messages on lint
code, message, file, line and column, because `--all-targets` reports a
warning once for each target that compiles the file. The before and after
sets were compared with line and column removed, since lines moved.

### Lock files

All three are byte-identical. SHA-256 at the baseline and at the final
commits:

```text
e7a0ecf2a14949e5d106ffc3d744605225c56c6ca9d049ff5e698790c6641a15  ubu-orchestrator/Cargo.lock
f17aa89a8b2770b7c28e1aa38fe5a9a1b71c938f58a6bd87cb3666fd448d330f  ubu-ui/package-lock.json
4225e62a5930e8d9347d34b2454eaccf39d2738a7a129cba3f2c5bdfce3d5f56  ubu-ui/src-tauri/Cargo.lock
```

### The path-constant count

```text
before  PASS: ubu-ui contract check: defaults agree on 7878, 7 requests succeeded, 39 of 39 path constants are live
after   PASS  1 contract: defaults agree on 7878, 39 of 39 path constants are live
```

39 and 39. Section H adds no route, so the count rises by nothing.

## The full scenario runner output

`scripts/check-ui-contract.sh`, run once after the pins, with
`UBU_E2E_GOOGLE`, `UBU_E2E_OLLAMA`, `UBU_CHECK_ONLY` and `UBU_CHECK_VERBOSE`
unset. Exit status 0. It took 8 seconds. The temp directory's name is
replaced by `XXXXXX`; nothing else is altered.

```text
build: cargo build --locked --offline in /home/sean/ubu-phase1b/ubu-orchestrator
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.12s
built: /home/sean/ubu-phase1b/ubu-orchestrator/target/debug/ubu_orchestrator
walk: every scenario gets its own store and orchestrator under /tmp/ubu-contract-check.XXXXXX
scenario 1 of 14: contract
  ok: ubu-ui exports DEFAULT_ORCHESTRATOR_PORT
  ok: ubu-orchestrator's config.rs states its UBU_ORCHESTRATOR_PORT default
  ubu-ui            DEFAULT_ORCHESTRATOR_PORT = 7878
  ubu-orchestrator  UBU_ORCHESTRATOR_PORT unwrap_or = 7878
  ok: the two defaults agree
  ok: GET /health reports a status
  ok: planning answers the schema version ubu-ui sends: "planning-kernel-contract/0.1"
  ok: next-action answers the schema version ubu-ui sends: "ubu.orchestrator.next_action.v1"
  ok: endpoints.ts exports path constants
  ok      ADVISORY_ADMIT_PATH = /advisory/candidate/{candidate_id}/admit
  ok      ADVISORY_DEFER_PATH = /advisory/candidate/{candidate_id}/defer
  ok      ADVISORY_QUEUE_PATH = /advisory/queue
  ok      ADVISORY_REJECT_PATH = /advisory/candidate/{candidate_id}/reject
  ok      ADVISORY_RESURFACE_PATH = /advisory/candidate/{candidate_id}/resurface
  ok      ADVISORY_RUN_PATH = /advisory/run
  ok      BOOTSTRAP_SEED_PATH = /bootstrap/seed
  ok      CALENDAR_APPROVE_PATH = /projection/calendar/approve
  ok      CALENDAR_CAPTURE_PATH = /projection/calendar/capture
  ok      CALENDAR_CURRENT_PATH = /calendar/current
  ok      CALENDAR_PREVIEW_PATH = /projection/calendar/preview
  ok      CALENDAR_RECONCILE_PATH = /projection/calendar/reconcile
  ok      CALENDAR_REPAIR_PATH = /projection/calendar/reconcile/{reconciliation_id}/repair
  ok      DESKTOP_TOKEN_PATH = /desktop/session/github-token
  ok      GOOGLE_CALENDAR_SESSION_PATH = /desktop/session/google-calendar
  ok      HEALTH_PATH = /health
  ok      NEXT_ACTION_PATH = /next-action
  ok      OBJECTIVE_CREATE_PATH = /objective
  ok      OBJECTIVE_EDIT_PATH = /objective/{objective_id}
  ok      OBJECTIVE_LIST_PATH = /objectives
  ok      OBJECTIVE_READ_PATH = /objective/{objective_id}
  ok      PLANNING_GENERATE_PATH = /planning/generate
  ok      PLANNING_RECALCULATE_PATH = /planning/recalculate
  ok      PREFERENCE_CREATE_PATH = /preference
  ok      PREFERENCE_LIST_PATH = /preferences
  ok      PREFERENCE_PATH = /preference/{preference_id}
  ok      PROJECTION_ACCEPT_EXTERNAL_PATH = /projection/reconciliation/accept-external
  ok      PROJECTION_APPROVE_PATH = /projection/approve
  ok      PROJECTION_PREVIEW_PATH = /projection/preview
  ok      PROJECTION_RECONCILE_PATH = /projection/reconcile
  ok      RECORD_TASK_ACTION_PATH = /task/{task_id}/action
  ok      ROUTINE_LIST_PATH = /routines
  ok      ROUTINE_OVERRIDE_PATH = /routine/{objective_id}/override/{local_date}
  ok      SETTINGS_LIST_PATH = /settings
  ok      SETTING_DELETE_PATH = /setting/{name}
  ok      SETTING_PUT_PATH = /setting/{name}
  ok      TASK_CAPTURE_PATH = /task
  ok      TASK_LIST_PATH = /tasks
  ok      TASK_PATH = /task/{task_id}
  ok: the orchestrator serves /task/{task_id}/decompose, which later scenarios use
  ok: the orchestrator serves /container/{container_id}/undo, which later scenarios use
  ok: the orchestrator serves /containers, which later scenarios use
PASS  1 contract: defaults agree on 7878, 39 of 39 path constants are live
scenario 2 of 14: task loop
  ok: capture answers the schema version ubu-ui sends: "ubu.orchestrator.task_capture.v1"
  ok: the captured Task is listed as active
  ok: it is listed under its title: "Synthetic contract-check Task"
  ok: an edit with the listed version advances the version: 2
  ok: an edit with a stale expected_version is refused with 409: "version_conflict"
  ok: the refused edit changed nothing: "Synthetic contract-check Task, edited"
PASS  2 task loop: capture, list, edit, and a stale expected_version is refused with 409 version_conflict
scenario 3 of 14: static window
  ok: a Task captured without a window is Dynamic: "planned"
  ok: PATCH stored the static window: {"end":"2026-09-29T21:45:00Z","start":"2026-09-29T21:00:00Z"}
  ok: the Task is now listed as Static: "static"
  ok: the Task is in the Plan
  ok: it plans as a Static anchor at exactly its window: {"end_at":"2026-09-29T21:45:00Z","start_at":"2026-09-29T21:00:00Z","static_anchor":true}
  ok: a window that ends before it starts is refused: "bad request: Task static_window.end must be strictly after start"
  ok: and the stored window is unchanged: {"end":"2026-09-29T21:45:00Z","start":"2026-09-29T21:00:00Z"}
PASS  3 static window: a static_window set through PATCH makes the Task plan as Static at that window
scenario 4 of 14: routines
  ok: the overlapping routine is refused with one diagnostic: 1
  ok: its code: "objective_routine_overlap"
  ok: the refusal names both routines
  ok: it names the existing routine by id
  ok: it names the first colliding date: 2026-09-29
  ok: nothing was written for the refused routine: ["Synthetic morning review"]
  ok: the generated Plan contains the routine's occurrence
  ok: the occurrence is Static at the routine's nominal start: {"static_anchor":true,"time_of_day":"20:00:00"}
  ok: the Task behind it is a routine occurrence: true
PASS  4 routines: a Static routine is created, an overlapping one is refused naming both and the date, and the occurrence is planned
scenario 5 of 14: colour partition
  ok: the Static event carries its category's colour: "3"
  ok: the Dynamic event carries no colour, though its Task has a category: null
PASS  5 colour partition: in the preview the Static step carries a color_id and the Dynamic step does not
scenario 6 of 14: apply
  ok: before the apply the applied record is empty: 0
  ok: the preview proposes two creates: ["create","create"]
  ok: the Mock approve applies: "applied"
  ok: the applied record grew to two events: 2
  ok: a second preview proposes nothing: []
  ok: the superseded preview cannot be applied again: "calendar_projection_conflict"
PASS  6 apply: a Mock approve grows the applied record from 0 to 2, and a second preview proposes nothing
scenario 7 of 14: colour means done (seeded mock calendar)
  ok: before capture the Dynamic Task is active: true
  ok: capture changed one Task and left the Static one unchanged: {"captured":0,"skipped":0,"unchanged":1,"updated":1}
  ok: the Dynamic Task whose event was coloured is completed: "completed"
  ok: the Static Task, whose colour is its category, is still active: ["task_01a0ee2d520978b38ce76892d5da9a52"]
  ok: a second capture of the same calendar completes nothing again: {"unchanged":2,"updated":0}
PASS  7 colour means done: a colour on an applied Dynamic event completes its Task at capture, and only that Task
scenario 8 of 14: drag means move (seeded mock calendar)
  ok: before the drag the Static Task's window is as captured: {"end":"2026-09-29T20:30:00Z","start":"2026-09-29T20:00:00Z"}
  ok: capture reports one move: {"moved":1,"resized":0,"updated":1}
  ok: the Task's static_window followed the event: {"end":"2026-09-29T22:30:00Z","start":"2026-09-29T22:00:00Z"}
  ok: the next Plan places it at the moved window: {"end_at":"2026-09-29T22:30:00Z","start_at":"2026-09-29T22:00:00Z"}
  ok: the next preview proposes no write to the moved event: the calendar already has it there: []
PASS  8 drag means move: a moved window on an applied Static event moves the Task's static_window at capture
scenario 9 of 14: foreign (seeded mock calendar)
  ok: reconcile reports an observation, not drift: "observed"
  ok: the event UbU never applied is the only conflict, and it is foreign: [["foreign","5n0q8c9h7g4k2m1p3r6t8v0a2c"]]
  ok: reconcile says it will not be touched: "this event was not created by UbU and will not be touched"
  ok: repair leaves the applied record at the two events UbU applied: {"applied_event_count":2,"dropped_events":0,"updated_events":0}
  ok: repair created no Task for the foreign event: ["Synthetic fixed appointment","Synthetic flexible errand"]
  ok: after repair the event is still foreign, so repair did not adopt it: [["foreign","5n0q8c9h7g4k2m1p3r6t8v0a2c"]]
  ok: and the next preview proposes nothing against it: []
PASS  9 foreign: an event UbU never applied reconciles as foreign, and repair neither adopts nor touches it
scenario 10 of 14: recurring refusal (seeded mock calendar)
  ok: the seeded id has the {base32hex}_{timestamp} shape: 7a1b2c3d4e5f6g7h8i9j0k1l2m_20260929T230000Z
  ok: the orchestrator started on the seed, so the event parsed
  ok: reconcile classifies it foreign: [["foreign","7a1b2c3d4e5f6g7h8i9j0k1l2m_20260929T230000Z"]]
  ok: reconcile says why it cannot be owned: [{"code":"capture_event_not_ownable","message":"Calendar event `7a1b2c3d4e5f6g7h8i9j0k1l2m_20260929T230000Z` cannot be captured: its id cannot be a UbU Task handle, so UbU cannot own it"}]
  ok: capture refuses it with capture_event_not_ownable: [{"code":"capture_event_not_ownable","message":"Calendar event `7a1b2c3d4e5f6g7h8i9j0k1l2m_20260929T230000Z` cannot be captured: its id cannot be a UbU Task handle, so UbU cannot own it"}]
  ok: capture captured nothing and skipped one: {"captured":0,"skipped":1,"unchanged":2}
  ok: no Task was created for it: ["Synthetic fixed appointment","Synthetic flexible errand"]
  ok: after capture it is still foreign, so it is not in the applied record: [["foreign","7a1b2c3d4e5f6g7h8i9j0k1l2m_20260929T230000Z"]]
  ok: the applied record still holds only the two events UbU applied: 2
PASS 10 recurring refusal: a recurring instance parses, classifies foreign, is refused by capture, creates no Task and is not recorded as applied
scenario 11 of 14: preferences
  ok: two Preferences are stated: 2
  ok: the third, which closes a cycle, is refused: "preference_cycle_rejected"
  ok: the refusal names the members of the cycle in order: "Preference cycle among Tasks [task_01a0ee2d56fe72d3b342c2e0787230bb -> task_01a0ee2d57077eb19084ef1710ee8ea3 -> task_01a0ee2d570a78d1b038cb90d1256c4c -> task_01a0ee2d56fe72d3b342c2e0787230bb]; disable or delete a conflicting Preference first"
  ok: deleting one leaves the other: [["Synthetic B","Synthetic C"]]
  ok: with the first deleted, the refused Preference is now accepted
PASS 11 preferences: two Preferences are created, a cycle is refused naming its members, and one is deleted
scenario 12 of 14: decomposition
  ok: the Task is decomposed into three children: 3
  ok: the Container holds them as one segment: [{"end":3,"start":0}]
  ok: all three children are in the Plan
  ok: the decomposed Task itself is not
  ok: the segment's children are contiguous: each starts when the one before it ends: [true,true]
  ok: undo restores the Task under a new handle: task_01a0ee2d57c77d7099af10c27ba78a35
  ok: undo reports the three children mooted: ["task_01a0ee2d579f73b3b8b28a0318fd63bd","task_01a0ee2d57a07991a97c0f5e62e6ec4b","task_01a0ee2d57a07991a97c0f70cc0dd717"]
  ok: the restored Task is active under the original title: ["Synthetic big job","Synthetic unrelated errand"]
  ok: and it is the new handle: "task_01a0ee2d57c77d7099af10c27ba78a35"
  ok: the children, and the original handle, are moot: ["task_01a0ee2d57967ae0a22ca5295096aeee","task_01a0ee2d579f73b3b8b28a0318fd63bd","task_01a0ee2d57a07991a97c0f5e62e6ec4b","task_01a0ee2d57a07991a97c0f70cc0dd717"]
PASS 12 decomposition: decomposed children are contiguous in the Plan; undo gives a new Task handle and moots the children
scenario 13 of 14: settings reach planning
  ok: before the Setting the event carries the default colour for personal: "3"
  ok: GET /settings reports the Setting: {"category":"personal","color_id":"7","origin":"setting"}
  ok: the next preview carries it, with no restart and no new Plan: "7"
  ok: reverting the Setting returns the default on the next preview: "3"
PASS 13 settings reach planning: a category colour changed through PUT /setting/:name is carried by the next preview with no restart
scenario 14 of 14: advisory
  ok: with nothing configured the run reports unconfigured: "unconfigured"
  ok: and names both missing Settings: ["advisory_unconfigured","advisory_unconfigured"]
  ok: without contacting the model: 0
  ok: a not_found answer reports advisory_http_failed and enqueues nothing: {"code":"advisory_http_failed","enqueued":0,"status":"worker_error"}
  ok: after one request to the model: 1
  ok: and the queue is still empty: 0
  ok: the server's 404 body reaches the diagnostic: The local model returned HTTP 404: model 'synthetic-model:1' not found; check advisory.model and that the model has been pulled; no candidates were enqueued
  ok: a empty answer reports advisory_empty_response and enqueues nothing: {"code":"advisory_empty_response","enqueued":0,"status":"malformed_result"}
  ok: after one request to the model: 2
  ok: and the queue is still empty: 0
  ok: the empty answer reports that thinking was present
  ok: and none of the thinking itself
  ok: a slow answer reports advisory_timeout and enqueues nothing: {"code":"advisory_timeout","enqueued":0,"status":"timeout"}
  ok: after one request to the model: 3
  ok: and the queue is still empty: 0
  ok: the run gave up at its 5000 ms budget, before the answer due at 8000 ms: 5013 ms
  ok: a good answer enqueues a candidate for each selected Task: {"enqueued":2,"selected":2,"status":"ok"}
  ok: the request the model received: {"model":"synthetic-model:1","stream":false,"think":false}
  ok: the prompt carries Task ids and titles only: [["id","title"],["id","title"]]
  ok: both are in the queue: 2
  ok: before admission the Task has no category: undefined
  ok: admitting the candidate sets the category: "grocery"
  ok: the Task whose candidate was not admitted is unchanged: undefined
PASS 14 advisory: unconfigured, a 404 body, an empty answer, a timeout and a good answer each report as they should, against a stub model
SKIP live Google Calendar: UBU_E2E_GOOGLE is not set to 1; this scenario did not run and proves nothing
SKIP live ollama: UBU_E2E_OLLAMA is not set to 1; this scenario did not run and proves nothing
RESULT: 14 of 14 scenarios passed, 0 failed, 2 skipped, 120 requests, all to 127.0.0.1
removed: /tmp/ubu-contract-check.XXXXXX
```

Fourteen `PASS` lines and two `SKIP` lines.

## Scenarios 7, 8, 9 and 10

The four behaviours that had never been asserted anywhere. Verbatim from the
run above.

```text
scenario 7 of 14: colour means done (seeded mock calendar)
  ok: before capture the Dynamic Task is active: true
  ok: capture changed one Task and left the Static one unchanged: {"captured":0,"skipped":0,"unchanged":1,"updated":1}
  ok: the Dynamic Task whose event was coloured is completed: "completed"
  ok: the Static Task, whose colour is its category, is still active: ["task_01a0ee2d520978b38ce76892d5da9a52"]
  ok: a second capture of the same calendar completes nothing again: {"unchanged":2,"updated":0}
PASS  7 colour means done: a colour on an applied Dynamic event completes its Task at capture, and only that Task
```

```text
scenario 8 of 14: drag means move (seeded mock calendar)
  ok: before the drag the Static Task's window is as captured: {"end":"2026-09-29T20:30:00Z","start":"2026-09-29T20:00:00Z"}
  ok: capture reports one move: {"moved":1,"resized":0,"updated":1}
  ok: the Task's static_window followed the event: {"end":"2026-09-29T22:30:00Z","start":"2026-09-29T22:00:00Z"}
  ok: the next Plan places it at the moved window: {"end_at":"2026-09-29T22:30:00Z","start_at":"2026-09-29T22:00:00Z"}
  ok: the next preview proposes no write to the moved event: the calendar already has it there: []
PASS  8 drag means move: a moved window on an applied Static event moves the Task's static_window at capture
```

```text
scenario 9 of 14: foreign (seeded mock calendar)
  ok: reconcile reports an observation, not drift: "observed"
  ok: the event UbU never applied is the only conflict, and it is foreign: [["foreign","5n0q8c9h7g4k2m1p3r6t8v0a2c"]]
  ok: reconcile says it will not be touched: "this event was not created by UbU and will not be touched"
  ok: repair leaves the applied record at the two events UbU applied: {"applied_event_count":2,"dropped_events":0,"updated_events":0}
  ok: repair created no Task for the foreign event: ["Synthetic fixed appointment","Synthetic flexible errand"]
  ok: after repair the event is still foreign, so repair did not adopt it: [["foreign","5n0q8c9h7g4k2m1p3r6t8v0a2c"]]
  ok: and the next preview proposes nothing against it: []
PASS  9 foreign: an event UbU never applied reconciles as foreign, and repair neither adopts nor touches it
```

```text
scenario 10 of 14: recurring refusal (seeded mock calendar)
  ok: the seeded id has the {base32hex}_{timestamp} shape: 7a1b2c3d4e5f6g7h8i9j0k1l2m_20260929T230000Z
  ok: the orchestrator started on the seed, so the event parsed
  ok: reconcile classifies it foreign: [["foreign","7a1b2c3d4e5f6g7h8i9j0k1l2m_20260929T230000Z"]]
  ok: reconcile says why it cannot be owned: [{"code":"capture_event_not_ownable","message":"Calendar event `7a1b2c3d4e5f6g7h8i9j0k1l2m_20260929T230000Z` cannot be captured: its id cannot be a UbU Task handle, so UbU cannot own it"}]
  ok: capture refuses it with capture_event_not_ownable: [{"code":"capture_event_not_ownable","message":"Calendar event `7a1b2c3d4e5f6g7h8i9j0k1l2m_20260929T230000Z` cannot be captured: its id cannot be a UbU Task handle, so UbU cannot own it"}]
  ok: capture captured nothing and skipped one: {"captured":0,"skipped":1,"unchanged":2}
  ok: no Task was created for it: ["Synthetic fixed appointment","Synthetic flexible errand"]
  ok: after capture it is still foreign, so it is not in the applied record: [["foreign","7a1b2c3d4e5f6g7h8i9j0k1l2m_20260929T230000Z"]]
  ok: the applied record still holds only the two events UbU applied: 2
PASS 10 recurring refusal: a recurring instance parses, classifies foreign, is refused by capture, creates no Task and is not recorded as applied
```

### They pass because of the seed

The runner was pointed at the orchestrator as it was before this ticket,
`5b2b5ac`, built in a scratch worktree. It ignores the variable, so what it
observes is what it applied.

```text
### control: the pre-ticket orchestrator (5b2b5ac), unseeded scenarios
PASS  1 contract: defaults agree on 7878, 39 of 39 path constants are live
PASS  2 task loop: capture, list, edit, and a stale expected_version is refused with 409 version_conflict
PASS  3 static window: a static_window set through PATCH makes the Task plan as Static at that window
PASS  4 routines: a Static routine is created, an overlapping one is refused naming both and the date, and the occurrence is planned
PASS  5 colour partition: in the preview the Static step carries a color_id and the Dynamic step does not
PASS  6 apply: a Mock approve grows the applied record from 0 to 2, and a second preview proposes nothing
NOT RUN  7 colour means done: excluded by UBU_CHECK_ONLY
NOT RUN  8 drag means move: excluded by UBU_CHECK_ONLY
NOT RUN  9 foreign: excluded by UBU_CHECK_ONLY
NOT RUN 10 recurring refusal: excluded by UBU_CHECK_ONLY
PASS 11 preferences: two Preferences are created, a cycle is refused naming its members, and one is deleted
PASS 12 decomposition: decomposed children are contiguous in the Plan; undo gives a new Task handle and moots the children
PASS 13 settings reach planning: a category colour changed through PUT /setting/:name is carried by the next preview with no restart
NOT RUN 14 advisory: excluded by UBU_CHECK_ONLY
RESULT: 9 of 14 scenarios passed, 0 failed, 0 skipped, 62 requests, all to 127.0.0.1, PARTIAL WALK: only 1,2,3,4,5,6,11,12,13 selected
exit=0
### control: the pre-ticket orchestrator (5b2b5ac), scenario 7
FAIL  7 colour means done: assertion failed: capture changed one Task and left the Static one unchanged
  expected: {"captured":0,"skipped":0,"unchanged":1,"updated":1}
  actual:   {"captured":0,"skipped":0,"unchanged":2,"updated":0}
RESULT: 0 of 14 scenarios passed, 1 failed, 0 skipped, 7 requests, all to 127.0.0.1, PARTIAL WALK: only 7 selected
### control: the pre-ticket orchestrator (5b2b5ac), scenario 8
FAIL  8 drag means move: assertion failed: capture reports one move
  expected: {"moved":1,"resized":0,"updated":1}
  actual:   {"moved":0,"resized":0,"updated":0}
RESULT: 0 of 14 scenarios passed, 1 failed, 0 skipped, 7 requests, all to 127.0.0.1, PARTIAL WALK: only 8 selected
### control: the pre-ticket orchestrator (5b2b5ac), scenario 9
FAIL  9 foreign: assertion failed: reconcile reports an observation, not drift
  expected: "observed"
  actual:   "matched"
RESULT: 0 of 14 scenarios passed, 1 failed, 0 skipped, 6 requests, all to 127.0.0.1, PARTIAL WALK: only 9 selected
### control: the pre-ticket orchestrator (5b2b5ac), scenario 10
FAIL 10 recurring refusal: assertion failed: reconcile classifies it foreign
  expected: [["foreign","7a1b2c3d4e5f6g7h8i9j0k1l2m_20260929T230000Z"]]
  actual:   []
RESULT: 0 of 14 scenarios passed, 1 failed, 0 skipped, 6 requests, all to 127.0.0.1, PARTIAL WALK: only 10 selected
### control: the pre-ticket orchestrator (5b2b5ac), scenario 14
PASS 14 advisory: unconfigured, a 404 body, an empty answer, a timeout and a good answer each report as they should, against a stub model
RESULT: 1 of 14 scenarios passed, 0 failed, 0 skipped, 18 requests, all to 127.0.0.1, PARTIAL WALK: only 14 selected
```

Scenarios 1 to 6 and 11 to 14 pass against the old orchestrator. Scenarios 7
to 10 fail against it, each at its first assertion about what was observed.
The worktree was removed afterwards.

## Orchestrator test 4: the refusal

`a_live_request_beside_a_seed_is_refused_before_any_calendar_call`. Verbatim,
one line for each of the three routes. The fixture's file name is replaced by
`<id>`.

```text
/projection/calendar/approve -> 409 Conflict {"diagnostics":[{"code":"calendar_mock_seed_with_live_export","message":"This process was started with UBU_CALENDAR_MOCK_EVENTS set to `/tmp/ubu-p1b47-live-<id>.json`, a mock Calendar fixture, and the request asked for export_mode `live`; unset the variable and restart to use the live Calendar, or ask for `mock`"}],"error":"This process was started with UBU_CALENDAR_MOCK_EVENTS set to `/tmp/ubu-p1b47-live-<id>.json`, a mock Calendar fixture, and the request asked for export_mode `live`; unset the variable and restart to use the live Calendar, or ask for `mock`"}
/projection/calendar/capture -> 409 Conflict {"diagnostics":[{"code":"calendar_mock_seed_with_live_export","message":"This process was started with UBU_CALENDAR_MOCK_EVENTS set to `/tmp/ubu-p1b47-live-<id>.json`, a mock Calendar fixture, and the request asked for export_mode `live`; unset the variable and restart to use the live Calendar, or ask for `mock`"}],"error":"This process was started with UBU_CALENDAR_MOCK_EVENTS set to `/tmp/ubu-p1b47-live-<id>.json`, a mock Calendar fixture, and the request asked for export_mode `live`; unset the variable and restart to use the live Calendar, or ask for `mock`"}
/projection/calendar/reconcile -> 409 Conflict {"diagnostics":[{"code":"calendar_mock_seed_with_live_export","message":"This process was started with UBU_CALENDAR_MOCK_EVENTS set to `/tmp/ubu-p1b47-live-<id>.json`, a mock Calendar fixture, and the request asked for export_mode `live`; unset the variable and restart to use the live Calendar, or ask for `mock`"}],"error":"This process was started with UBU_CALENDAR_MOCK_EVENTS set to `/tmp/ubu-p1b47-live-<id>.json`, a mock Calendar fixture, and the request asked for export_mode `live`; unset the variable and restart to use the live Calendar, or ask for `mock`"}
```

The message names both: the variable with its file, and the mode asked for.
A recording client was injected to count calls, and recorded none. No Task,
no projection result and no reconciliation was stored. Without the seed the
same request reaches the ordinary check and is refused with
`calendar_live_export_unconfigured`, so it is the seed that refuses.

## Orchestrator test 5: the skipped occurrence

`a_routine_occurrence_is_skipped_and_named_while_an_ordinary_task_is_selected`.
Verbatim:

```json
[
  {
    "code": "suggest_tags_occurrence_skipped",
    "message": "Task `task_018f3c8e9b2a7c4d8f1e2a3b4c5d6e71` (Synthetic lunar teapot 1) is an occurrence of a routine and was skipped; a routine's category belongs on its template, which the Routines screen edits"
  }
]
```

In the same pass the ordinary Task was selected, the model was asked about
it alone, and one candidate was enqueued.

## With the variable unset, behaviour is as at `5b2b5ac`

Established four ways.

1. **The 378 tests that existed at `5b2b5ac` pass unchanged.** None was
   edited in this ticket. None sets the variable.
2. **The code path.** With the variable unset `calendar_mock_events` is
   `None`, and `mock_calendar_api` builds the recording client from the
   applied record it is handed, which is the expression the three call sites
   held before.
3. **Orchestrator test 1**, with no client injected so the fallback itself is
   exercised. Verbatim:

   ```text
   reconcile={"conflicts":[],"status":"matched"} capture={"captured":0,"diagnostics":[],"moved":0,"resized":0,"schema_version":"ubu.orchestrator.calendar_capture.v1","skipped":0,"unchanged":2,"updated":0}
   ```

   Reconcile is `matched` with no conflict, capture leaves both events
   unchanged and creates nothing, and the next preview proposes nothing.
4. **The runner against both binaries.** Scenarios 1 to 6 and 11 to 14 set no
   seed. They pass against `5b2b5ac` and against `a84229d` with the same
   assertions, as shown above.

## The runner contacted nothing off-box

**Both live flags were unset** for every run in this record.

A full run was traced with
`strace -f -e trace=connect,sendto,sendmsg`, following every child: the
shell script, `cargo`, `node`, all fourteen orchestrators and the stub.

```text
socket calls carrying an address, by call and family:
  connect  AF_INET   59
destinations:
  127.0.0.1  x59
connect calls with no parsed address: 0
```

Every socket call that carried an address was a `connect` to `127.0.0.1`.
There was no `AF_INET6`, no other IPv4 address and no DNS query.

Independently of the trace, every request the script makes goes through one
function that refuses any address that is not `127.0.0.1` on a port the run
opened itself. Each orchestrator is started with an emptied environment: no
token, no Google path, `HOME` set to its own temp directory, and mock GitHub
modes. The only model endpoint configured is the stub's.

### The temp directory is removed on every exit path

| Exit path | Shown by |
| --- | --- |
| Success | `removed:` is the last line of the full run above. |
| Failure | Each failing control run above ended with `removed:` and exit status 1. Those lines are cut from the listing above for length. |
| Ctrl-C | Below. |
| `SIGTERM` | Below. |

The walk was interrupted two seconds into scenario 14, while its
orchestrator and the stub model were both running:

```text
### SIGINT to the process group, as Ctrl-C does, sent two seconds into scenario 14, while its orchestrator and the stub model are running
orchestrator processes while the walk is mid-run: 1 | temp dirs: 1
PASS 13 settings reach planning: a category colour changed through PUT /setting/:name is carried by the next preview with no restart
interrupted
removed: /tmp/ubu-contract-check.XXXXXX
exit=130
orchestrator processes afterwards: 0 | temp dirs afterwards: 0 | node processes: 0
### SIGTERM to the script alone, sent two seconds into scenario 14, while its orchestrator and the stub model are running
orchestrator processes while the walk is mid-run: 1 | temp dirs: 1
PASS 13 settings reach planning: a category colour changed through PUT /setting/:name is carried by the next preview with no restart
interrupted
removed: /tmp/ubu-contract-check.XXXXXX
exit=130
orchestrator processes afterwards: 0 | temp dirs afterwards: 0 | node processes: 0
```

After every run in this record, `/tmp` held no `ubu-contract-check`
directory and no orchestrator process was running.

## UI test 62: the self-check issues no write

`62: runs its three reads, reports each, and issues no write`, in
`tests/selfcheck.test.tsx`.

The mocked transport throws on any request that is not a `GET`. The test
asserts, on what the transport received after the button was pressed:

```text
GET /health
GET /tasks?schema_version=ubu.orchestrator.task_read.v1&status=active
GET /calendar/current
```

Exactly three, in that order, each with no body. It also asserts that across
the whole test, including what Setup itself requests on opening, every
request was a `GET`, and that none was to a `/projection` path.

With a `PUT` added to the self-check, the test failed.

That a `GET` is a read is not assumed. Against a real orchestrator with a
routine, a Task and a Plan in its store, every row of every table was hashed
before and after the three reads:

```text
IDENTICAL: every table has the same rows before and after the three reads
IDENTICAL after a Plan exists too
```

The same measurement for `GET /projection/calendar/preview` showed
`projection_previews` go from 0 rows to 1.

## `scripts/show-revs.sh`

Run with the new pins in place, before the commit. Exit status 0.

```text
Recorded R_* baseline: post-O20 R_orchestrator, post-GA2 R_adapter, post-S17 R_schemas, post-C12 R_core, post-ST7 R_store

REPO                     BRANCH         HEAD      SIG                 TREE   PINNED    STATUS
----                     ------         ----      ---                 ----   ------    ------
ubu_design               main           f7c4a1db  signed-ok           clean  f7c4a1db  OK
ubu_schemas              main           4974166a  signed-ok           clean  4974166a  OK
ubu_core                 main           c77c0a2d  signed-ok           clean  c77c0a2d  OK
ubu_store                main           7b24cd82  signed-ok           clean  7b24cd82  OK
ubu_github_adapter       main           4c7e3b6d  signed-ok           clean  4c7e3b6d  OK
ubu_planning_kernel      main           84b6d0d9  signed-ok           clean  84b6d0d9  OK
ubu_orchestrator         p1b-47-scenario-runner a84229db  signed-ok           clean  a84229db  OK
ubu_ui                   p1b-47-scenario-runner 6cea64d0  signed-ok           clean  6cea64d0  OK
ubu_brand                main           faf2005a  signed-ok           clean  faf2005a  OK
```

Every repository reads `OK`, with a clean tree.

## Commit trailers

No trailer in `ubu-orchestrator`. `Co-Authored-By: Claude Fable 5.1
<noreply@anthropic.com>` on every P1B-47 commit in `ubu-ui` and
`ubu-devshell`. All commits are signed.

## What was read and written, and where

The work read and wrote files under `~/ubu-phase1b` and under `/tmp` only.
The runner's stores and fixtures were under its `mktemp -d` directory. The
orchestrator tests' fixtures were files in `/tmp`, each removed when its
test ended.

Three things outside those two trees were touched, none of them by the
ticket's own steps: the toolchains read their own installations and caches
in the home directory; `git` read its configuration, its signing key and the
SSH key; and the agent's session notes are kept under `~/.claude`.

## Judgment calls

Fifteen of the sixteen were followed as written.

**Call 10 is followed in its purpose and not in its letter.** It says the
self-check is "health, one list read, one preview" and makes "no writes of
any kind". The preview writes. The agent kept the second statement and
changed the third read. If the preview is wanted, the card must stop saying
it writes nothing.

Observations, without disagreement:

- **Call 1.** The seed is loaded at startup, so a scenario restarts the
  orchestrator to change it. That costs about a tenth of a second per seeded
  scenario.
- **Call 9.** The live scenarios exist and have never run. Until the
  operator runs them they are a claim, not a check.
- **Call 16.** Agreed. Four of the seven failures the ticket lists are now
  scenarios: the port disagreement, the export authority, the recurring
  refusal, and the 404 and timeout.

## Ambiguities, and the reading taken

1. **"No pin moves" and section J.** As in earlier tickets: no dependency pin
   moves, and the devshell record is updated last.
2. **"In the shape `list_events` returns."** A JSON array of events with the
   fields of the orchestrator's event type. `task_id` may be omitted and is
   then `task_<external_id>`, as the wire parser gives it.
3. **An empty value of the variable** is a path, and refuses startup, as an
   empty palette path does.
4. **The status of the refusal beside `live`** is 409. The ticket names the
   code and not the status.
5. **Where skipped occurrences appear.** First in the run's diagnostics,
   before anything the model run reported. The run's status is unaffected.
6. **Scenario 1 keeps two checks the old walk made**: that planning and
   next-action answer the schema versions `ubu-ui` sends. The old walk's
   Task requests are scenario 2.
7. **Scenario 6, "the applied record grew".** The record has no read route.
   Its size is taken from repair's `applied_event_count` before the apply,
   and from the approve result after it.
8. **Scenario 8, "a second preview".** After a new Plan the planner places
   the Dynamic Task afresh, so a preview may propose an update to it. The
   scenario asserts that nothing is proposed for the moved Static event.
9. **Scenario 10, "is not written into the applied record".** Asserted two
   ways: a reconcile after capture still classifies it foreign, and repair
   reports the applied record at two events.
10. **Routes with no constant in `ubu-ui`.** Decompose, undo and the
    Container list are named in the script. Scenario 1 asserts the
    orchestrator serves them.
11. **The slow answer** is due at 8 seconds against a 5 second budget,
    because 5 seconds is the floor of `advisory.timeout_ms`.
12. **What the live scenarios do.** The ticket names the flags and not the
    scenarios. Google: one read-only live reconcile. ollama: one run for one
    synthetic Task.
13. **`UBU_CHECK_ONLY` and `UBU_CHECK_VERBOSE`** are additions. A partial
    walk says so in its `RESULT` line and skips no live scenario silently.
14. **Sections D and E are one file.** Commit D is the walk without the
    stub, scenario 14 and the live flags, and passed thirteen scenarios.
    Commit E adds them.
15. **"Applied events" is reworded** to two lines: the operations applied in
    this run, and the size of the applied record with a sentence saying what
    it is not.
16. **Fixed-window times** are entered in this computer's timezone and sent
    as instants. A stored window with seconds is not sent back unless the
    field is edited.
17. **The skipped-occurrence line in Review has no test of its own.** The
    ticket fixes the UI count at 62. The diagnostic is rendered by the
    component every run diagnostic goes through.

## Known limits

1. **The runner cannot see the Tauri transport, the capability scope, or anything rendered.** That is what step 2 is for.
2. **Live Google and live ollama are opt-in** and skipped by default.
3. **The mock seed is an environment variable**, so a scenario must restart the orchestrator to change it.
4. **One producer**, and `Advise`, `Clarify` and `Batch` still have no mainline equivalent.
5. **The Calendar export still records no approver.**
6. **An uncaptured recurring commitment still occupies no planning capacity**, and the operator's blocking-event workaround remains temporary.
7. **A long advisory run still holds the request open** with only a busy button.

Found during the work, beyond the seven:

8. **`GET /projection/calendar/preview` writes.** Every preview stores a record, including each one the Calendar screen takes.
9. **The orchestrator refuses a backwards window without a diagnostic code**, so a client can only show its text.
10. **The runner runs on the wall clock.** Its windows are set a few hours ahead of the current hour. It has not been run across midnight UTC or across a daylight-saving change.
11. **The self-check reads the Plan, not the Calendar projection.** It proves the transport reaches the orchestrator. It does not prove the Calendar routes answer.
12. **The Tasks screen shows no window in the list.** A pinned Task is listed as `static`; its window is visible when it is edited.
