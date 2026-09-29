# P1B-45 final pins

Both upstream repositories were pushed before these inventory pins changed:

1. `ubu-orchestrator`: `df063d25a05abce2bd0df967ebfd636630f3bc0e` (section J; implementation A–E had already landed first).
2. `ubu-ui`: `4346ce4010e5e78defcd31527a7a408a98fe71f5` (section J).
3. `ubu-devshell`: the section K commit containing this report, pushed last on
   `p1b-45-advisory-producers`; its concrete SHA is in the delivery response.

Only the orchestrator and UI inventory entries changed. No dependency pin,
manifest, lockfile, read-only repository or other inventory entry changed.
There is no re-pin chain. Every changed repo uses the ticket branch. No merge or
force-push. The section K commit carries the required co-author trailer.

Backend tests: 360 → 370; UI tests: 47 → 53. TypeScript and production UI build
pass. Clippy warning counts: raw 16 → 16, unique 9 → 9, no new unique warnings.
All three lockfiles are byte-identical to baseline. The existing navigation test
expectation gains Review; six new UI tests alone account for the count increase.

See the [complete backend verification](https://github.com/UbU-project/ubu-orchestrator/blob/p1b-45-advisory-producers/docs/P1B-45_VERIFICATION.md)
for verbatim synthetic evidence, the advisory boundary, precise isolation and
filesystem qualifications, all fifteen judgment calls and the eight known
limits. Operator acceptance with live local Ollama remains for the user; no
agent-run test invokes the real transport.

## Actual after-pin inventory

All nine rows are clean and OK. The output below was compared byte-for-byte
against the backend report with only its documented self-referential SHA
substitution. Quick UbU is separately verified clean at `9ccc8b8`; devshell is
checked clean after this commit. Existing local acceptance excludes remain
private; outgoing history is audited without opening excluded artifacts.

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
ubu_orchestrator         p1b-45-advisory-producers df063d25  unsigned            clean  df063d25  OK
ubu_ui                   p1b-45-advisory-producers 4346ce40  unsigned            clean  4346ce40  OK
ubu_brand                main           faf2005a  signed-ok           clean  faf2005a  OK
```

## Contract check after the pin update

This is the ticket's explicit isolated loopback check with a temporary store,
mock external services, offline build and cleanup. It does not run advisory or
contact a model. Other test/build suites deny network sockets through seccomp.
The baseline was 33/33; now 39/39, exactly six additional UI constants and seven
successful synthetic loopback requests.

```text
build: cargo build --locked --offline in /home/sean/ubu-phase1b/ubu-orchestrator
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.15s
built: /home/sean/ubu-phase1b/ubu-orchestrator/target/debug/ubu_orchestrator
start: orchestrator on ephemeral port 38005, store in /tmp/ubu-contract-check.XnWZrh
defaults:
  ubu-ui            DEFAULT_ORCHESTRATOR_PORT = 7878
  ubu-orchestrator  UBU_ORCHESTRATOR_PORT unwrap_or = 7878
  the two defaults agree
requests against http://127.0.0.1:38005:
  200 GET http://127.0.0.1:38005/health
  201 POST http://127.0.0.1:38005/task
  200 GET http://127.0.0.1:38005/tasks?schema_version=ubu.orchestrator.task_read.v1&status=active
  200 PATCH http://127.0.0.1:38005/task/task_01a0eb072cfa77109eda08cb147717d1
  200 POST http://127.0.0.1:38005/planning/generate
  200 GET http://127.0.0.1:38005/next-action?schema_version=ubu.orchestrator.next_action.v1
paths in the live /openapi.json:
  200 GET http://127.0.0.1:38005/openapi.json
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
stopped: orchestrator pid 358228
removed: /tmp/ubu-contract-check.XnWZrh
```
