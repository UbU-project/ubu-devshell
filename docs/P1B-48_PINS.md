# P1B-48 landing record

P1B-48 has no verification document of its own in the ticket; its report is
the runner's final response. This file records the pins, as in earlier
tickets, and the evidence the report refers to.

## What was not done: the `ubu_store` pin

**Section E's pin bump was not made.** `ubu-orchestrator/Cargo.toml` still
pins `ubu_store` at `4066b818`, and `Cargo.lock` is byte-identical to the
baseline.

With the pin changed to `7b24cd82d78b70eea9c49f8816778a10b320b8ed`, the
offline build fails, because that revision is not in this machine's cargo git
cache:

```text
$ cargo build --offline --all-targets   (with ubu_store rev = 7b24cd82...)

Caused by:
  failed to load source for dependency `ubu_store`

Caused by:
  unable to update https://github.com/UbU-project/ubu-store?rev=7b24cd82d78b70eea9c49f8816778a10b320b8ed

Caused by:
  failed to lookup reference in preexisting repository, and can't check for updates in offline mode (--offline)

Caused by:
  revspec '7b24cd82d78b70eea9c49f8816778a10b320b8ed' not found; class=Reference (4); code=NotFound (-3)
```

Landing the bump needs one of two things the ticket forbids: contacting
`github.com` so that cargo can fetch the revision, or writing the revision
into cargo's cache under the home directory, outside `~/ubu-phase1b` and
`/tmp`. And until the cache holds it, `cargo build --locked --offline` fails,
which is the build `scripts/check-ui-contract.sh` runs. So the change was
reverted and nothing else depends on it.

The drift it would have closed is real and is documentation only:
`ubu-store` has three commits after `4066b81`, which add
`docs/BATCH_ADMISSION.md` and `docs/P1B-37a_VERIFICATION.md`, 217 lines, and
no code. `show-revs.sh` compares each checkout with `pinned-revs.toml` and
does not read `Cargo.toml`, so it reads `OK` either way.

To land it: with network access, run `cargo fetch` in `ubu-orchestrator`
after changing the revision, commit `Cargo.toml` and `Cargo.lock`, and run the
suite. The ticket's rule that all three lockfiles stay byte-identical cannot
hold for that commit: `Cargo.lock` names the revision.

## Revisions, in landing order

Baseline: `ubu-orchestrator` `a84229d`, `ubu-ui` `6cea64d`, `ubu-devshell`
`a93bcbb`, each on `main` with a clean tree, as was every sibling
repository. Work is on `p1b-48-clarify` in the three that change.

| Order | Repository | Sections | Pushed revision |
| --- | --- | --- | --- |
| 1 | `ubu-orchestrator` | A–D | `86a351be6ac45613c8fa49f693bc5461cdf05fd1` |
| 2 | `ubu-orchestrator` | documents | `4a9f95ed6420b974639fa48e5d833708d460abe0` |
| 3 | `ubu-ui` | F–H | `42892e0155f976664e223b6a050e27c4279e4171` |
| 4 | `ubu-devshell` | I, pins | the commit that carries this file |

| Section | Repository | Commit | Change |
| --- | --- | --- | --- |
| A | `ubu-orchestrator` | `193e72b` | The clarify wire: request body, question set, one candidate. |
| B | `ubu-orchestrator` | `399ab13` | `src/services/clarify.rs`; `POST /advisory/run` dispatches on producer. |
| C | `ubu-orchestrator` | `0f003b8` | `compose`, `apply_clarification`, `answer_candidate`, the answer route. |
| D | `ubu-orchestrator` | `86a351b` | `reopen_completion` and the reopen route. |
| D | `ubu-orchestrator` | `4a9f95e` | `docs/CLARIFY.md`, `docs/TASK_REOPEN.md`, `docs/ADVISORY.md`. |
| E | `ubu-orchestrator` | none | Not made. See above. |
| F | `ubu-ui` | `6f92da3` | Two path constants, the regenerated OpenAPI copy, three client methods. |
| G | `ubu-ui` | `dd76fa4` | The Clarify panel and the interview card. |
| H | `ubu-ui` | `4e405fe` | Undo completion, and the two Calendar sentences. |
| H | `ubu-ui` | `42892e0` | `docs/NAVIGATION.md`. |
| I | `ubu-devshell` | `5f07a7f` | The stub's clarify mode, scenarios 15 and 16, the runner's document. |
| pins | `ubu-devshell` | This commit | The two pins and this record. |

**Two pins move, not three.** The ticket asks for three new HEADs in
`pinned-revs.toml`. `ubu-devshell` is not one of the repositories the file
pins, and a file cannot hold the hash of the commit that contains it.

## Counts

| | Before | After |
| --- | --- | --- |
| `ubu-orchestrator` tests | 384 | **415** |
| `ubu-ui` tests | 62 | **76** |
| `endpoints.ts` path constants | 39 | **41** |
| OpenAPI paths | 52 | **54** |
| Clippy, emitted / unique | 16 / 9 | 16 / 9 |
| Runner scenarios | 14 | **16** |

No test was deleted, and no existing test was changed in either repository.

Clippy method: `cargo clippy --locked --offline --all-targets
--message-format=json` after touching `src/lib.rs`. "Emitted" counts JSON
lines with level `warning`; "unique" deduplicates on lint code, message, file,
line and column. The before and after sets were compared with line and
column removed, and are the same nine.

All three lock files are byte-identical to the baseline:

```text
e7a0ecf2a14949e5d106ffc3d744605225c56c6ca9d049ff5e698790c6641a15  ubu-orchestrator/Cargo.lock
f17aa89a8b2770b7c28e1aa38fe5a9a1b71c938f58a6bd87cb3666fd448d330f  ubu-ui/package-lock.json
4225e62a5930e8d9347d34b2454eaccf39d2738a7a129cba3f2c5bdfce3d5f56  ubu-ui/src-tauri/Cargo.lock
```

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
ubu_orchestrator         p1b-48-clarify 4a9f95ed  signed-ok           clean  4a9f95ed  OK
ubu_ui                   p1b-48-clarify 42892e01  signed-ok           clean  42892e01  OK
ubu_brand                main           faf2005a  signed-ok           clean  faf2005a  OK
```

## The runner

Run once after the pins, with both live flags unset. Exit status 0.

```text
PASS  1 contract: defaults agree on 7878, 41 of 41 path constants are live
PASS  2 task loop: capture, list, edit, and a stale expected_version is refused with 409 version_conflict
PASS  3 static window: a static_window set through PATCH makes the Task plan as Static at that window
PASS  4 routines: a Static routine is created, an overlapping one is refused naming both and the date, and the occurrence is planned
PASS  5 colour partition: in the preview the Static step carries a color_id and the Dynamic step does not
PASS  6 apply: a Mock approve grows the applied record from 0 to 2, and a second preview proposes nothing
PASS  7 colour means done: a colour on an applied Dynamic event completes its Task at capture, and only that Task
PASS  8 drag means move: a moved window on an applied Static event moves the Task's static_window at capture
PASS  9 foreign: an event UbU never applied reconciles as foreign, and repair neither adopts nor touches it
PASS 10 recurring refusal: a recurring instance parses, classifies foreign, is refused by capture, creates no Task and is not recorded as applied
PASS 11 preferences: two Preferences are created, a cycle is refused naming its members, and one is deleted
PASS 12 decomposition: decomposed children are contiguous in the Plan; undo gives a new Task handle and moots the children
PASS 13 settings reach planning: a category colour changed through PUT /setting/:name is carried by the next preview with no restart
PASS 14 advisory: unconfigured, a 404 body, an empty answer, a timeout and a good answer each report as they should, against a stub model
PASS 15 clarify: an interview runs two rounds: one open at a time, admitted by answering, and its answers accumulate in the Task's description
PASS 16 reopen: a completion made by mistake is undone by naming it; a wrong id and a second undo are refused; the Task can be completed again
SKIP live Google Calendar: UBU_E2E_GOOGLE is not set to 1; this scenario did not run and proves nothing
SKIP live ollama: UBU_E2E_OLLAMA is not set to 1; this scenario did not run and proves nothing
RESULT: 16 of 16 scenarios passed, 0 failed, 2 skipped, 155 requests, all to 127.0.0.1
```

### Scenario 15, the interview, verbatim

```text
scenario 15 of 16: clarify
  ok: the captured Task has no description: undefined
  ok: with no Task named, the run selects the Task with no description and enqueues one candidate: {"diagnostics":[],"enqueued":1,"selected":[{"id":"task_01a0eef22bc377a2a7cf038bc7cb2088","title":"Synthetic lunar teapot"}],"status":"ok"}
  ok: the prompt carried the Task's id, title and round 1, and no description: {"id":"task_01a0eef22bc377a2a7cf038bc7cb2088","round":1,"title":"Synthetic lunar teapot"}
  ok: the request the model received: {"model":"synthetic-model:1","stream":false,"think":false}
  ok: a second run is refused: the Task already has questions waiting: {"code":"clarify_already_queued","enqueued":0,"status":"ok"}
  ok: and the model received no further request: 1
  ok: the queue holds one clarification candidate, round 1: [["clarification_question","proposed",1]]
  ok: carrying the four questions the model asked: [{"id":"q1","kind":"YesNo","text":"Is there a deadline for the synthetic teapot?"},{"depends_on":["q1","y"],"id":"q2","kind":"ShortText","text":"What is the synthetic deadline?"},{"id":"q3","kind":"ShortText","text":"Who is the synthetic teapot for?"},{"depends_on":["q1","n"],"id":"q4","kind":"ShortText","text":"Why is there no synthetic deadline?"}]
  ok: plain Admit is refused: a clarification is admitted by answering it: "advisory_answer_required"
  ok: a yes/no question answered `maybe` is refused: "clarify_invalid_answer"
  ok: neither refusal wrote anything to the Task: undefined
  ok: and the candidate is still proposed: [["proposed",1]]
  ok: a proper answer admits the candidate: "admitted"
  ok: the description is the questions answered, in question order, with the blank and the inapplicable answer dropped: "Q: Is there a deadline for the synthetic teapot?\nA: y\nQ: What is the synthetic deadline?\nA: next synthetic Friday\n"
  ok: the queue is empty again: []
  ok: with no Task named there is now nothing to interview: round two must name the Task: "clarify_no_task"
  ok: and the model was not asked: 1
  ok: naming the Task runs round two: {"enqueued":1,"status":"ok"}
  ok: the prompt carried round 2 and the description written by round one: {"description":"Q: Is there a deadline for the synthetic teapot?\nA: y\nQ: What is the synthetic deadline?\nA: next synthetic Friday\n","id":"task_01a0eef22bc377a2a7cf038bc7cb2088","round":2,"title":"Synthetic lunar teapot"}
  ok: the new candidate is round 2: 2
  ok: the description grew by round two's answer: "Q: Is there a deadline for the synthetic teapot?\nA: y\nQ: What is the synthetic deadline?\nA: next synthetic Friday\nQ: Is the synthetic teapot already bought?\nA: n\n"
  ok: and round one's answers are still there: appended, not replaced
  ok: when the model has nothing left to ask, the run is ok and enqueues nothing: {"code":"clarify_no_questions","enqueued":0,"status":"ok"}
  ok: having been asked as round 3: 3
  ok: and the Task is unchanged: "Q: Is there a deadline for the synthetic teapot?\nA: y\nQ: What is the synthetic deadline?\nA: next synthetic Friday\nQ: Is the synthetic teapot already bought?\nA: n\n"
  the composed description, verbatim: "Q: Is there a deadline for the synthetic teapot?\nA: y\nQ: What is the synthetic deadline?\nA: next synthetic Friday\nQ: Is the synthetic teapot already bought?\nA: n\n"
PASS 15 clarify: an interview runs two rounds: one open at a time, admitted by answering, and its answers accumulate in the Task's description
```

### Scenario 16, the undone completion, verbatim

```text
scenario 16 of 16: reopen
  ok: completing the Task completes it: {"applied":true,"status":"completed"}
  ok: the Task is completed: "completed"
  ok: reopening with another Task's completion id is refused with 409: "reopen_stale_completion"
  ok: and the Task is still completed: "completed"
  ok: reopening with the right id undoes the completion: {"completion":"log_01a0eef22cb97933b7f473fe31daa14d","diagnostics":[],"status":"active"}
  ok: the Task is active: "active"
  ok: and is listed among the active Tasks again
  ok: reopening again is refused with 409: there is nothing to undo: "reopen_not_completed"
  ok: the reopened Task can be completed again: {"applied":true,"status":"completed"}
  ok: as a new completion, with its own id
  ok: the other Task was never touched: "completed"
PASS 16 reopen: a completion made by mistake is undone by naming it; a wrong id and a second undo are refused; the Task can be completed again
```

### Nothing left the machine

The same run, traced with `strace -f -e trace=connect,sendto,sendmsg`:

```text
socket calls carrying an address: {'connect AF_INET': 68}
destinations: {'127.0.0.1': 68}
```

Afterwards `/tmp` held no `ubu-contract-check` directory and no orchestrator
process was running.

## What the pins do not say

The pinned revisions are tested and have not been accepted by the operator.
No test and no scenario asked a model anything: every question set in this
ticket was written by a stub. Whether a real model asks useful questions, and
whether its second round repeats its first, is the operator's acceptance
step 4.
