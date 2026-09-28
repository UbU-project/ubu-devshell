# P1B-44 release pins

The final orchestrator and UI revisions were pushed before these two inventory
pins were bumped. No dependency pin, manifest or lockfile changed. This is the
unlettered final devshell commit required by P1B-44; sections A–F have one commit
each in their respective repositories. All work uses `p1b-44-foreign-tolerance`;
no branch was force-pushed or merged.

## Final pushed revisions, in landing order

| Order | Repository | Revision |
| --- | --- | --- |
| 1 | ubu-orchestrator | `fdec65ace189061f75f0733c596dd55af753fbba` (F) |
| 2 | ubu-ui | `2796a069607f4fce62a7f632f4e9da12ac7ddc24` (E) |
| 3 | ubu-devshell | The commit containing this document, on `p1b-44-foreign-tolerance` |

The orchestrator implementation A–C was first pushed as
`c5168f38d7e800d7009c8685a5897c1deb4862a9`; F adds documentation only. A commit
cannot include its own hash; the final delivery response records the concrete
three repository tips.

The [orchestrator verification report](https://github.com/UbU-project/ubu-orchestrator/blob/p1b-44-foreign-tolerance/docs/P1B-44_VERIFICATION.md)
records the approved correction to the projection description, synthetic test
evidence, two existing test expectation updates, all eight known limits, and
operator acceptance. Tests: **360 orchestrator and 47 UI**, TypeScript and UI build
pass, Clippy delta zero, three lockfiles byte-identical. Recurring commitments
remain uncaptured and occupy no capacity; their count and reason are now visible.

## Actual after-pin inventory

`scripts/show-revs.sh` exited 0 after the pin bump. All nine rows are clean and
OK. This output matches the orchestrator report byte-for-byte after replacing
only its self-referential HEAD/PINNED SHA with `<ORCH-F>`. Quick-ubu is separately
confirmed clean at `9ccc8b8`; devshell's own clean state is checked after commit.

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
ubu_orchestrator         p1b-44-foreign-tolerance fdec65ac  unsigned            clean  fdec65ac  OK
ubu_ui                   p1b-44-foreign-tolerance 2796a069  unsigned            clean  2796a069  OK
ubu_brand                main           faf2005a  signed-ok           clean  faf2005a  OK
```

## Contract check at the pinned revisions

`scripts/check-ui-contract.sh` exited 0 before changes, after implementation, and
after these final pins. The path-constant count stays **33/33**. This isolated
loopback check uses an ephemeral store, mock modes and a scrubbed runtime
environment; it never accesses a Google account. The pinned run was:

```text
build: cargo build --locked --offline in /home/sean/ubu-phase1b/ubu-orchestrator
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.13s
built: /home/sean/ubu-phase1b/ubu-orchestrator/target/debug/ubu_orchestrator
start: orchestrator on ephemeral port 41509, store in /tmp/ubu-contract-check.ycwaTQ
defaults:
  ubu-ui            DEFAULT_ORCHESTRATOR_PORT = 7878
  ubu-orchestrator  UBU_ORCHESTRATOR_PORT unwrap_or = 7878
  the two defaults agree
requests against http://127.0.0.1:41509:
  200 GET http://127.0.0.1:41509/health
  201 POST http://127.0.0.1:41509/task
  200 GET http://127.0.0.1:41509/tasks?schema_version=ubu.orchestrator.task_read.v1&status=active
  200 PATCH http://127.0.0.1:41509/task/task_01a0e9dede067f63bf4a7b52c09cd5ac
  200 POST http://127.0.0.1:41509/planning/generate
  200 GET http://127.0.0.1:41509/next-action?schema_version=ubu.orchestrator.next_action.v1
paths in the live /openapi.json:
  200 GET http://127.0.0.1:41509/openapi.json
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
stopped: orchestrator pid 958226
removed: /tmp/ubu-contract-check.ycwaTQ
```

Only `ubu_orchestrator` and `ubu_ui` inventory entries changed; the other seven
pins and their comments are untouched. No new dependency or runtime cap was
introduced. Local acceptance artifacts remain excluded through local Git metadata
only; their filenames and contents are not included in this release.
