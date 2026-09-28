# P1B-43 pins

P1B-43 changes three repositories. Two pins move, `ubu_orchestrator` and
`ubu_ui`. They were bumped last, after both repositories were pushed.

This record lives here rather than in
`ubu-orchestrator/docs/P1B-43_VERIFICATION.md` because that file is part of a
revision being pinned, and a file cannot contain the hash of the commit that
contains it. `ubu-devshell` is not one of the pinned repositories.

## Revisions, in landing order

| Order | Repository | Sections | Pushed revision |
| --- | --- | --- | --- |
| 1 | `ubu-orchestrator` | A, B | `8150d303d280f446e2f7fec4012d068c3e82896f` |
| 2 | `ubu-ui` | C–F | `c94b6acbf307461e3380551e1f0949df6e245d23` |
| 3 | `ubu-orchestrator` | F | `5ea1d85bede59867b290540575bb2180a36e7545` |
| 4 | `ubu-devshell` | G | the commit that carries this file |

All are on the branch `p1b-43-export-and-routines`. None is merged to `main`.

The `ubu_orchestrator` pin names `5ea1d85`, the final revision. It differs
from `8150d30` in documents only: `src` and `tests` are identical, and the
353 tests were run again at `5ea1d85`.

The other seven pins are unchanged, comments included.

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
ubu_orchestrator         p1b-43-export-and-routines 5ea1d85b  signed-ok           clean  5ea1d85b  OK
ubu_ui                   p1b-43-export-and-routines c94b6acb  signed-ok           clean  c94b6acb  OK
ubu_brand                main           faf2005a  signed-ok           clean  faf2005a  OK
```

All nine repositories read `OK`, with clean trees.

The first line of the output is printed from a string inside `show-revs.sh`
and still describes the pre-P1B baseline. It was left alone, as in earlier
tickets.

## `scripts/check-ui-contract.sh`

Run again after the pins, against the pinned revisions. Exit status 0.

```text
build: cargo build --locked --offline in /home/sean/ubu-phase1b/ubu-orchestrator
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.12s
built: /home/sean/ubu-phase1b/ubu-orchestrator/target/debug/ubu_orchestrator
start: orchestrator on ephemeral port 38281, store in /tmp/ubu-contract-check.bV8BYy
defaults:
  ubu-ui            DEFAULT_ORCHESTRATOR_PORT = 7878
  ubu-orchestrator  UBU_ORCHESTRATOR_PORT unwrap_or = 7878
  the two defaults agree
requests against http://127.0.0.1:38281:
  200 GET http://127.0.0.1:38281/health
  201 POST http://127.0.0.1:38281/task
  200 GET http://127.0.0.1:38281/tasks?schema_version=ubu.orchestrator.task_read.v1&status=active
  200 PATCH http://127.0.0.1:38281/task/task_01a0e86d32417521ae48643c40d4b82a
  200 POST http://127.0.0.1:38281/planning/generate
  200 GET http://127.0.0.1:38281/next-action?schema_version=ubu.orchestrator.next_action.v1
paths in the live /openapi.json:
  200 GET http://127.0.0.1:38281/openapi.json
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
PASS: ubu-ui contract check: defaults agree on 7878, 7 requests succeeded, 33 of 33 path constants are live
stopped: orchestrator pid 333160
removed: /tmp/ubu-contract-check.bV8BYy
```

**33 path constants**, up from 27 before the ticket: the six that P1B-43
section C adds. The full before and after outputs are in
`ubu-orchestrator/docs/P1B-43_VERIFICATION.md`.

## What the pins do not say

The pinned revisions are tested and have not been accepted by the operator.
No test contacted Google, and the Routines screen has not been seen in the
Tauri shell. The operator acceptance steps are in the P1B-43 ticket.
