# P1B-46 pins

P1B-46 changes three repositories. Two pins move, `ubu_orchestrator` and
`ubu_ui`. They were bumped last, after both repositories were pushed.

This record lives here rather than in
`ubu-orchestrator/docs/P1B-46_VERIFICATION.md` because that file is part of a
revision being pinned, and a file cannot contain the hash of the commit that
contains it. `ubu-devshell` is not one of the pinned repositories.

## Revisions, in landing order

| Order | Repository | Sections | Pushed revision |
| --- | --- | --- | --- |
| 1 | `ubu-orchestrator` | A–E | `b6ff8ac7059fcbe64e550d65dde734e3cda8df78` |
| 2 | `ubu-ui` | F–I | `9bed3a340741b7978fa3d9ce8a4d197f2f6d648d` |
| 3 | `ubu-orchestrator` | I | `5b2b5acdd8c10f983e90ae2aabeb87bca26b0eb9` |
| 4 | `ubu-devshell` | pins | the commit that carries this file |

All are on the branch `p1b-46-advisory-budget`. None is merged to `main`.

The `ubu_orchestrator` pin names `5b2b5ac`, the final revision. It differs
from `b6ff8ac` in documents only: `src` and `tests` are identical, and the
378 tests were run again at `5b2b5ac`.

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
ubu_orchestrator         p1b-46-advisory-budget 5b2b5acd  signed-ok           clean  5b2b5acd  OK
ubu_ui                   p1b-46-advisory-budget 9bed3a34  signed-ok           clean  9bed3a34  OK
ubu_brand                main           faf2005a  signed-ok           clean  faf2005a  OK
```

Every repository reads `OK`, with a clean tree.

The first line of the output is printed from a string inside `show-revs.sh`
and still describes the pre-P1B baseline. It was left alone, as in earlier
tickets.

## `scripts/check-ui-contract.sh`

Run again after the pins, against the pinned revisions. Exit status 0.

```text
build: cargo build --locked --offline in /home/sean/ubu-phase1b/ubu-orchestrator
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.12s
built: /home/sean/ubu-phase1b/ubu-orchestrator/target/debug/ubu_orchestrator
start: orchestrator on ephemeral port 43797, store in /tmp/ubu-contract-check.AGM1hF
defaults:
  ubu-ui            DEFAULT_ORCHESTRATOR_PORT = 7878
  ubu-orchestrator  UBU_ORCHESTRATOR_PORT unwrap_or = 7878
  the two defaults agree
requests against http://127.0.0.1:43797:
  200 GET http://127.0.0.1:43797/health
  201 POST http://127.0.0.1:43797/task
  200 GET http://127.0.0.1:43797/tasks?schema_version=ubu.orchestrator.task_read.v1&status=active
  200 PATCH http://127.0.0.1:43797/task/task_01a0ed2cdf6e73d1a8bb4fe67e105c9d
  200 POST http://127.0.0.1:43797/planning/generate
  200 GET http://127.0.0.1:43797/next-action?schema_version=ubu.orchestrator.next_action.v1
paths in the live /openapi.json:
  200 GET http://127.0.0.1:43797/openapi.json
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
PASS: ubu-ui contract check: defaults agree on 7878, 7 requests succeeded, 39 of 39 path constants are live
stopped: orchestrator pid 190690
removed: /tmp/ubu-contract-check.AGM1hF
```

**39 path constants**, the same 39 as before the ticket. P1B-46 adds no
route.

## What the pins do not say

The pinned revisions are tested and have not been accepted by the operator.
No test contacted ollama, and no run in this ticket reached a model. The
operator acceptance steps are in the P1B-46 ticket.
