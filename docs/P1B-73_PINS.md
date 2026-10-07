# P1B-73 — one line of execution

The implementation is prepared for the operator's single invocation. P1B-72's
parallel comparison is withdrawn, its appendix is removed, and the driver has
one action mode. This report records automated verification, not operator
acceptance or a verified real framework installation.

## Governing sentences

ACCEPTANCE.md rule 1: **“A manual step may not verify what the runner or a
`ubu-ui` test already asserts.”** This governed withdrawal of the comparison:
existing runner/UI checks and the new projection tests cover the transcriptions.

The harness's justification: **“Three things it cannot see remain for a human:
the Tauri HTTP plugin transport, the capability scope, and anything rendered.”**
It continues: **“The third is the only reason a human opens the app.”** This
governed removing the per-feature app/visual pass and reserving rendering
inspection for pre-release. The three operator judgments remain human choices.

All of ACCEPTANCE.md, LIVE_REHEARSAL.md and LIVE_REHEARSAL_DRIVER.md were read
before editing, together with their driver sources/tests, the runner boundary,
BUILD_ENV.md, kernel metadata/READMEs and the worker check. P1B-72 656271c was
confirmed on local main and an ancestor of fetched origin/main. All twelve
repositories were clean at the starting inventory; the 19 baseline tests passed.

| section | governing sentence quoted | disposition |
|---|---|---|
| A | LIVE_REHEARSAL_DRIVER.md: “Normal mode ignores later visual reads when recording automatic snapshots, but records deliberate admission/rejection route/status outcomes.” | that behavior is now unconditional; constructor/mode/flag branch removed |
| B | ACCEPTANCE.md: “A comparison that matters is a scenario in the runner.” | pure projection tests replace the human comparison; A and B landed together |
| C | CONTRACT_CHECK.md: “The walk stops at the first failure.” | faults now name the fact/remedy; the prior live continuation policy is superseded by P1B-73's stop-or-complete requirement |
| D | ACCEPTANCE.md: “The third is the only reason a human opens the app.” | private terminal presentation replaces app reading; public file is the only pasted sink |
| E | CONTRACT_CHECK.md: “anything assertable over HTTP is a scenario here, never a manual step there.” | 108-line procedure, no manual fallback or numeric transcription |
| F | ACCEPTANCE.md: “A ticket that changes the thing a line names brings that check back.” | explicit retirement basis preserved; item 9 remains active; operative rules 10/11 added |
| G | pinned-revs.toml: “Record the expected HEAD SHA here each time an upstream repo lands.” | only the approved kernel inventory pin advances; eight others unchanged |
| H | STAGE1_WORKER.md: “It must perform a real import to distinguish a working CPU package from stale metadata or a broken native extension; Rust imports no framework.” | the actual owned import path now reports warnings for a mandatory quietness assertion |

The three grounded corrections were explicitly approved: private words must
be formatted from the existing HTTP AST/shared numeric helper; worker stderr
is discarded and inherited environment cleared, requiring probe metadata plus
an owned assertion; changed kernel HEAD requires an inventory advance. Reasons
and alternatives are recorded in ACCEPTANCE.md. No API/UI/consumer revision
exception was taken. Kernel has no docs directory; its actual gpu-advisory
README and the linked devshell STAGE1_WORKER.md carry the install rule.

## One mode, response fidelity and two sinks

`--compare`, the PublicReport constructor option, mode line and manual branch
are gone. The forwarder remains for optional app use. Forwarded reads cannot
overwrite automatic snapshots; explicit admission/rejection routes retain only
safe route/status decision rows. The driver still owns startup and imports
endpoint/schema constants from the unchanged UI. No route/OpenAPI/UI change was
made; the 56 paths and 43 endpoint constants remain unchanged, and the runner
confirmed all 43 served constants.

Section B uses the existing flow fixture, expanded with known injected bodies.
Its projection test checks every scalar counter, collection cardinality,
histogram, operation/finding enum and flag in groups 1–8 field by field. Mutating
one captured count, matching count, producer count, risk severity or diagnostic
entry changes exactly its dependent lines. Failed/skipped/unreached actions have
an explicit unavailable row; unknown enum/code entries stay counted and withheld.
A stored whole-block golden would accept its own stale values while the injected
response changed; these tests directly tie each projection to its source instead.
No whole-block snapshot/golden is used.

**Private screen:** placements with titles/windows/Static or Dynamic, excluded
work/reasons/alternatives, preview operations, saved condition words, queued
names/requirements, diagnostic messages and risk detail. Terminal control bytes
are escaped; credential/token path spellings are scrubbed. Private output never
becomes a PublicReport input or a file. The named test **“D private title,
condition word, diagnostic message and risk detail never reach public render”**
puts independent UUID canaries in all four fields, finds them on screen, finds
none in render(), and checks that private rendering does not mutate the report.

**Public file:** `./live-rehearsal-copy-back.txt`, overridable through
UBU_REHEARSAL_OUTPUT, with BEGIN/END markers on completion or a single reason
and remedy on refusal. The writer uses an exclusive temporary file, mode 0600
and atomic rename, with cleanup. A real filesystem smoke verified replacement,
permissions and no leftover transcript. Default artifacts are ignored by Git;
custom outputs must stay outside tracked content. Credential/token/binary/state
paths and non-regular output destinations are refused.

Human condition words are **not an HTTP field**. GET /task/{task_id} carries
payload.preconditions and GET /advisory/queue carries normalized_proposal ASTs.
The approved private formatter uses them and the existing numericComparisonWords
helper, preserving nested logic. All other requested presentation data already
exist over HTTP: Plan summaries/windows/static flags and exclusion reasons,
preview summaries/windows, diagnostic messages, risk detail and proposed names.
No additional missing figure, route, UI scraper or UI change was needed.

The operator sees the Plan and proposed operations before the approval prompt.
The displayed store/calendar precede startup consent; literal live and separate
literal approve remain necessary. No flag, default or timeout can approve.
Three public judgments now follow; the visual prompt/fourth judgment is removed.
Known private content in an answer produces a fault, not private file content.
The driver neither resets the calendar, invents observations nor selects
admissions/rejections. Optional private authoring omissions and declined approval
are recorded by code; failed required actions stop rather than request absence
phrases or silently claim completion.

## Every reason and remedy

Facts identify permitted variable names/checks, a safe action/HTTP/transport
status or the configured port. Fresh-store refusal alone also prints its already
selected store path and an exact Bash-quoted rm -f command for DB/WAL/SHM;
no cleanup command is executed by the driver. Credential/token paths/contents
never enter the public fault. Startup stderr is bounded to the last 20 lines,
shown privately only on a startup failure, scrubbed, then discarded at health.
Capture/advice-era child stderr is never buffered. Runtime interruption cleanup
uses the existing owner; tests install no handlers or real signals.

| reason | remedy | previous diagnosis |
|---|---|---|
| `required_configuration_missing` | Set each named variable in your private environment, then run again. | code only; no variable |
| `absolute_path_required` | Set each named path variable to an absolute path, then run again. | code only; no variable |
| `configuration_file_required` | Correct the named variable so its file/check meets the stated requirement. | code only or generic; no variable/check |
| `token_unavailable` | Correct UBU_GOOGLE_TOKEN_CACHE_PATH; its file must be readable/writable or its parent writable. | code only or generic; no variable/check |
| `fresh_store_required` | Stop the owned orchestrator, run the displayed cleanup command, reset the rehearsal calendar, then run again. | no cleanup command; WAL/SHM missed |
| `orchestrator_port_unavailable` | Stop acceptance.sh, run-live.sh or the stale orchestrator using this port, then run again. | generic fallback; no port or listener remedy |
| `owned_startup_failed` | Check the binary and checkout configuration and the private startup stderr shown on screen. | blind; child stderr discarded |
| `owned_orchestrator_unavailable` | Correct the private startup error shown on screen before starting a fresh rehearsal. | blind; child stderr discarded |
| `startup_timeout` | Correct the private startup error and make the owned health endpoint available before running again. | blind; child stderr discarded |
| `unsupported_argument` | Use run-live-rehearsal.sh without arguments; --help shows configuration. No comparison or approval flag exists. | category only; no remedy |
| `terminal_required` | Run from an interactive terminal so you can give consent and make the approval decision. | category only; no remedy |
| `mock_configuration_refused` | Unset UBU_CALENDAR_MOCK_EVENTS for this real-calendar rehearsal. | category only; no remedy |
| `invalid_port` | Set UBU_ORCHESTRATOR_PORT to an integer from 1 to 65535, or leave it unset for the UI default. | category only; no remedy |
| `invalid_private_inputs` | Correct UBU_REHEARSAL_INPUTS privately to the documented JSON object/field shapes. | category only; no remedy |
| `configuration_destination_or_transport_unavailable` | Check the selected environment and local checkout; paste this file when the cause remains unknown. | category only; no remedy |
| `build_environment_unavailable` | Correct CARGO_BUILD_JOBS/UBU_TARGET_ROOT and the sourced env.sh build configuration; retain exclusion and memory limits. | new explicit outcome |
| `offline_build_failed` | Make the locked offline orchestrator build pass under env.sh; stop a conflicting build/worker first. | new explicit outcome |
| `launcher_failed` | Check Node 22 or newer, the checkout and the local offline build setup; paste this file when the cause remains unknown. | new explicit outcome |
| `copy_back_unwritable` | Set UBU_REHEARSAL_OUTPUT to a writable file path outside credentials and state files, then run again. | new explicit outcome |
| `startup_confirmation_declined` | Check the displayed store/calendar and reset prerequisite before deliberately typing live. | new explicit outcome |
| `interrupted` | Review any actions already applied; reset the calendar and select a fresh store before starting another rehearsal. | new explicit outcome |
| `action_request_failed` | Correct the private API diagnostic shown on screen and the named action configuration before another rehearsal. | new explicit outcome |
| `preview_unavailable` | Generate a valid non-stale preview before authorizing a calendar write; inspect the private diagnosis. | new explicit outcome |
| `approval_interrupted` | Review whether a calendar write occurred; use a fresh store/reset before another rehearsal. | new explicit outcome |
| `task_selector_unavailable` | Correct the private Task selector to exactly one captured ordinary active Task. | new explicit outcome |
| `task_unavailable` | Correct the private Task selector/version; choose an ordinary active Task. | new explicit outcome |
| `calendar_session_unavailable` | Complete Google consent with the configured credential/token files and enable the session. | new explicit outcome |
| `advisory_run_failed` | Correct private advisory endpoint/model/budget settings using the diagnostic on screen; do not rerun for preferred candidates. | new explicit outcome |
| `judgment_unanswered` | Provide one non-empty judgment sentence for each of the three questions. | new explicit outcome |
| `judgment_private_content` | Describe your judgment without copying known private data into the public answer. | new explicit outcome |
| `help_requested` | Set your private environment and run run-live-rehearsal.sh without arguments. | new explicit outcome |

The port and child-startup cases previously printed nothing useful about their
cause; variable/file/store cases lacked the concrete missing fact. The generic
fallback remains honest about unknown causes, but now supplies a remedy and the
same artifact. One physical fault line is safe to paste, including unusual
store-path characters. No raw exception or private response becomes that line.

A file cannot be produced on an unwritable destination: copy_back_unwritable
names the output variable and remedy on screen. Node and a writable, separate
output destination are prerequisites; no private fallback transcript is created.

## Measurements and verification

LIVE_REHEARSAL.md: **828 → 108 lines**. Named absence phrases: **30 → 0**, measured
as distinct curly-quoted phrases beginning “no ” with whitespace normalized.
Numbered copy-back items: **9 → 0**. The appendix and interim counting history
are deleted. Colour partition, ordinary short exclusions, risk scope/measurement
and unverifiable reset explanations remain.

Human sequence: **14 steps/9 branching items → P1B-72 one invocation with four
judgments and a visual pass → P1B-73 one invocation with three judgments**.
Calendar reset/private environment/live consent/approval/file paste remain.
There is no operator comparison. Per commit: checks and runner, no human. Per
feature: the driver with a recorded action for each new feature. Pre-release:
the UI visual pass. Per-ticket live rendering findings are explicitly given up;
P1B-56's mislabelled coverage/manufactured-affect presentation illustrates that
risk. Fixture/API coverage does not certify actual-data UI layouts.

| check | result |
|---|---|
| devshell driver tests | **19 → 37 passed**, no skips; original coverage adapted to the single mode, field-by-field/mutation/privacy/fault/artifact coverage added |
| check-all / scenario runner per implementation commit | passed; A/B combined as required; all runs offline and sequential |
| final check-all / test-all | passed; live CLI never invoked by either |
| scenario runner | 36/36, zero failures, 2 explicit live skips, 667 owned-loopback requests |
| schemas / core / store / adapter Rust | 2 / 166 / 110 / 23 passed, unchanged |
| kernel Rust | **105 → 107 passed**; owned quiet probe and warning-failure negative control added |
| kernel pytest | **32 → 35 passed**, 15 torch tests skipped; existing private pytest used, no installation |
| orchestrator Rust / UI | 633 / 212 passed, unchanged |
| kernel Clippy | zero warnings, all-targets -D warnings |
| orchestrator Clippy | eight distinct warning texts, nine occurrences plus duplicate summaries; unchanged baseline |
| planning parity | existing CPU exact goldens and worker suite passed; no tolerance changes |
| pins | all nine inventory rows OK; eight unchanged, approved kernel inventory advance only |
| syntax, whitespace, privacy/path audit | passed; protected acceptance artifact filenames/contents neither read nor published |

```text
RESULT: 36 of 36 scenarios passed, 0 failed, 2 skipped, 667 requests, all to 127.0.0.1
```

New driver tests introduce no listener, external HTTP, Google/ollama/editor,
child spawn or signal handler. A public-artifact filesystem smoke uses an owned
removed temporary directory. The kernel checks reuse its existing owned,
bounded interpreter/module session and preserve the five spawn conditions.
The standing runner's owned-loopback exemption is unchanged.

An initial projection test helper counted repeated action-attempt metadata as
a second field occurrence; restricting it to the data portion fixed that test
without changing projection values. Rust formatting was corrected before H
checks passed. One automatic commit-approval review timed out; its permitted
single retry succeeded. No rejection or blocked action remains.

**env.sh constraints relaxed: no. Two Cargo jobs used: no. OOM: no.** Every
Cargo invocation sourced env.sh, used one job sequentially and retained flock
and the available MemoryHigh=16G/MemoryMax=20G scope. No two-job trial, package
installation, GPU work, Stage 1 tensor computation or model-committee rank ran.
The fixture-demo quarantine remains explicit and unchanged.

## Kernel corrections and pin inventory

H pins **numpy==2.2.6 beside torch==2.6.0+cpu** in the optional extra. Its official
tagged metadata was read through the authorized Git exception: Python >=3.10,
classifiers through 3.13. Installation instructions now install NumPy from PyPI
and the CPU torch wheel from its official index. No package was installed here.

**“A documented install is verified when a run under it is quiet, not when it
resolves.”** This rule sits beside the real installation instructions and in
the kernel worker README. framework_environment records import_warning_count
without serializing warning text/paths. Its existing owned invocation check
requires zero before treating absence as a skip. Python regressions cover
warnings during import and native initialization, including later fallback;
the Rust negative control rejects a warning for both available and unavailable
framework results. The check script propagates this failure, rather than trying
to grep stderr which the session intentionally discards. No runtime planning,
canonical frame/schema, strategy, numeric tolerance or consumer revision changed.

Both available interpreters lack torch/NumPy. The real installation therefore
has **not** been verified quiet here; the 15 tensor skips certify no real tensor
execution. The quiet guard itself is verified with synthetic warnings and the
owned stdlib worker. GPU stage work remains P1B-74; stale future-stage references
in the install document were corrected accordingly.

Only ubu-devshell and ubu-planning-kernel changed. All ten readonly repositories
retain baseline HEADs and clean trees. Kernel H is ea6b453; its published full
revision is the inventory value below. Consumer Cargo revisions and lockfiles
remain byte unchanged. Cargo's existing Git cache was seeded from the published
local kernel repository for offline parity checks; no consumer rev bump occurred.
The report's containing devshell commit completes G/H documentation and inventory;
recording its own SHA inside itself would be circular. No self pin exists.

| inventory | revision | disposition |
|---|---|---|
| ubu_schemas | 070d0a6f9a6ad7833dd523042925008316ce923b | unchanged |
| ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b | unchanged |
| ubu_store | 83a099f55220b1286ffb2dee3c9d19006e2090b5 | unchanged |
| ubu_planning_kernel | ea6b453c26120b095f6ea91da90f3742e3b55f4f | approved kernel correction |
| ubu_github_adapter | e14a43b47aeb0a928f4dfdc83cd78ea9a2e044f6 | unchanged |
| ubu_orchestrator | b42cadd9b3a6a010021a080e5a4f4af16ac2095a | unchanged |
| ubu_ui | 698a15fde8244dca96a03b07ad144a4c2b65af15 | unchanged |
| ubu_design | 7313e82f7fb835965bc18521b10f897b238b65dc | unchanged |
| ubu_brand | faf2005a8bd9e64742dd76ee6d1f91f45223946b | unchanged |

## Retirement basis and operator acceptance

The eight numeric/status retirements rest on **existing runner/UI coverage plus
section B's projection tests**, under the operator's explicit P1B-73 correction.
They are not inferred from automated success and claim no P1B-72 live confirmation.
The ledger retains the earlier evidence-quality qualifications. Item 9 is not
retired; only the operator can judge whether the schedule/store suits them.
A later changed surface brings its named check back. New rules 10/11 make manual
verification rendering-only and the instrument one line of execution; P1B-67's
absence rule is retained but dead letter for the live document's transcription.

Operator acceptance has not been performed; it is now one invocation, and the thing under test is whether a single line of execution either completes or explains itself.
