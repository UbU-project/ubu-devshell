# The live rehearsal

## Why this is tested live

A colour decides placement: an uncoloured ownable event is Dynamic work for
UbU to schedule; a coloured event is a Static commitment at its own time.
The complete convention is in [COLOUR_CONVENTION.md](COLOUR_CONVENTION.md).

“Not in this Plan” being short is ordinary. P1B-57 placed 84 of 85 uncoloured
events; P1B-58 left nothing out. Excluded work explains what the week cannot
hold. Judge what UbU chose to schedule, rather than demanding everything fit.

Risk must mean what its label says. Before P1B-56, a whole-week coverage figure
was labelled as the next 60 minutes and manufactured affect was presented as a
measurement. P1B-56 corrected both. Read the actual risk detail on the private
screen; neither a manufactured observation nor an out-of-scope figure is evidence.

Reset completeness is unverifiable: stamped leftovers can be diagnosed, but
unstamped exports cannot be distinguished from original events. Reset remains
your responsibility. The driver never resets the calendar or retries a rehearsal.

## Prepare and run

Use Node 22 or newer, the sibling checkouts and the existing offline build setup.
Activate your existing virtual environment. Set UBU_PLANNING_WORKER_PYTHON to
its interpreter by absolute path; that is the reliable form because the bare
python3 fallback depends on the PATH available to the launcher. Select
UBU_PLANNER_STRATEGY=greedy for this worker rehearsal. Choose an absent fresh
store path, then check readiness before resetting the calendar or starting a
rehearsal. Set your private environment:

| variable | purpose |
|---|---|
| UBU_DB_PATH | absolute fresh rehearsal store path, including absent WAL/SHM siblings |
| UBU_GOOGLE_CALENDAR_ID | explicit rehearsal calendar id |
| UBU_GOOGLE_CREDENTIALS_PATH | readable absolute OAuth application-file path |
| UBU_GOOGLE_TOKEN_CACHE_PATH | absolute readable/writable token file, or writable parent |
| UBU_REHEARSAL_INPUTS | genuine private routine/settings/observations/Task requirement, exactly one operator-chosen provisional root in subjects, and a mutation that writes under it; include planning.gpu_enabled=true, in the [driver reference](LIVE_REHEARSAL_DRIVER.md) shape |
| UBU_PLANNING_WORKER_PYTHON | absolute interpreter path in your active virtual environment; its command/path and PyTorch version stay on the private screen |
| UBU_PLANNER_STRATEGY | required non-empty strategy; select greedy for this worker rehearsal |
| UBU_PLANNING_WORKER_PROBE_TIMEOUT_MS | optional integer 1–30000 ms environment-probe budget; default 30000 ms |
| UBU_REHEARSAL_BINARY | optional absolute executable; otherwise the launcher builds offline |
| UBU_REHEARSAL_OUTPUT | optional public output file; default ./live-rehearsal-copy-back.txt |

Include advisory.model and advisory.endpoint in the private inputs.settings so
pre-flight checks exactly the configuration the fresh store will receive. Every
required variable must be non-empty. Pre-flight checks file metadata, absent
store/WAL/SHM and writable parents, the advisory endpoint's model list, and the
owned worker module with quiet pinned CPU Torch 2.6.0+cpu. An omitted model tag
uses the runtime's :latest name. Model presence is readiness, not a prediction
test or a promise that generation will succeed.

Every Cargo build uses sourced env.sh, one job, shared exclusion and the available
memory scope. The lock is released before any human prompt. Credentials and
observations are never committed. Optional input omissions are recorded by code.

Supply exactly one provisional root in `inputs.subjects`, and make the following
genuine mutation authoring reference that root. Choose it yourself; the driver
neither invents a root nor ratifies it. This makes the existing Subjects panel
an outstanding ratification agenda. The driver reads it after authoring: the
private screen names its provisional roots, minting metadata and reference
counts; the public block reports only the governed/provisional tier counts and
the supplied root's UniverseState-key, fact_provenance-key and Task-precondition
target counts. No root, key, value or target string is pasted.

From ubu-devshell, first run the pre-flight:

```sh
./scripts/run-live-rehearsal.sh --check-inputs
```

It passes or names one thing to fix. It does not build, start a server, write
state/calendar data or replace the copy-back file. An explicitly supplied
binary is checked; an omitted binary is built only by the rehearsal launcher.
The check needs no reset and never offers a skip. Once it passes, back up your
own store and reset your rehearsal calendar with your own copy tool. Then run
the single rehearsal, which rechecks readiness before starting:

```sh
./scripts/run-live-rehearsal.sh
```

Check the displayed store/calendar and type `live`. The driver owns startup,
capture, planning, preview, authoring and the two separate advisory runs.
The terminal is labelled PRIVATE: it shows your own titles, condition words,
proposals and diagnostic/risk detail. Never paste or save that screen.

Read the Plan and exact preview operations on the terminal. Make the approval
decision at its explicit prompt. Only literal `approve` authorizes a real write;
no flag, default or timeout can approve. Optional app use is outside this procedure.

Answer the three questions with your own public judgment sentences:

- whether what it chose to schedule is what he would have chosen, and whether this is a store he would plan tomorrow on
- whether the precondition's words express his requirement
- whether a proposed name was worth recording

The app's visual pass belongs to pre-release testing. There is no comparison
cycle, manual fallback, tally, figure transcription or copy-back item list.
Paste the **entire printed output file**, once. On a rehearsal failure it contains
all observed steps, explicit unavailable judgments, then the named fault and
remedy with closed response status and diagnostic-code counts. Unobserved actions
stay unavailable. Another rehearsal invocation is another rehearsal; review
applied actions and reset/select a fresh store first. Pre-flight is not a rehearsal.

## Fault and remedy lookup

The fault line names public variables, failed checks, input fields/rules or the port. Credential
and token paths/contents remain private. Startup stderr is shown only privately,
before health succeeds; it is discarded before capture. Correct the named fault
using this lookup. The script stops rather than asking for a missing-figure phrase.

| reason | remedy |
|---|---|
| `required_configuration_missing` | Set each named variable in your private environment, then run again. |
| `absolute_path_required` | Set each named path variable to an absolute path, then run again. |
| `configuration_file_required` | Correct the named variable so its file/check meets the stated requirement. Set optional values or unset them. |
| `token_unavailable` | Correct UBU_GOOGLE_TOKEN_CACHE_PATH; its file must be readable/writable or its parent writable. |
| `fresh_store_required` | Stop the owned orchestrator, run the displayed cleanup command, reset the rehearsal calendar, then run again. |
| `orchestrator_port_unavailable` | Stop acceptance.sh, run-live.sh or the stale orchestrator using this port, then run again. |
| `owned_startup_failed` | Check the binary and checkout configuration and the private startup stderr shown on screen. |
| `owned_orchestrator_unavailable` | Correct the private startup error shown on screen before starting a fresh rehearsal. |
| `startup_timeout` | Correct the private startup error and make the owned health endpoint available before running again. |
| `unsupported_argument` | Use --check-inputs for pre-flight, or no arguments for the rehearsal; --help shows configuration. No comparison or approval flag exists. |
| `terminal_required` | Run from an interactive terminal so you can give consent and make the approval decision. |
| `mock_configuration_refused` | Unset UBU_CALENDAR_MOCK_EVENTS for this real-calendar rehearsal. |
| `invalid_port` | Set UBU_ORCHESTRATOR_PORT to an integer from 1 to 65535, or leave it unset for the UI default. |
| `invalid_private_inputs` | Correct the named field in UBU_REHEARSAL_INPUTS privately to satisfy the named rule; see LIVE_REHEARSAL_DRIVER.md. |
| `configuration_destination_or_transport_unavailable` | Check the selected environment and local checkout; paste this file when the cause remains unknown. |
| `build_environment_unavailable` | Correct CARGO_BUILD_JOBS/UBU_TARGET_ROOT and the sourced env.sh build configuration; retain exclusion and memory limits. |
| `offline_build_failed` | Make the locked offline orchestrator build pass under env.sh; stop a conflicting build/worker first. |
| `launcher_failed` | Check Node 22 or newer, the checkout and the local offline build setup; paste this file when the cause remains unknown. |
| `copy_back_unwritable` | Set UBU_REHEARSAL_OUTPUT to a writable file path outside credentials and state files, then run again. |
| `startup_confirmation_declined` | Check the displayed store/calendar and reset prerequisite before deliberately typing live. |
| `interrupted` | Review any actions already applied; reset the calendar and select a fresh store before starting another rehearsal. |
| `action_request_failed` | Correct the private API diagnostic shown on screen and the named action configuration before another rehearsal. |
| `preview_unavailable` | Generate a valid non-stale preview before authorizing a calendar write; inspect the private diagnosis. |
| `approval_interrupted` | Review whether a calendar write occurred; use a fresh store/reset before another rehearsal. |
| `task_selector_unavailable` | Correct the private Task selector to exactly one captured ordinary active Task. |
| `task_unavailable` | Correct the private Task selector/version; choose an ordinary active Task. |
| `calendar_session_unavailable` | Complete Google consent with the configured credential/token files and enable the session. |
| `advisory_run_failed` | Correct private advisory endpoint/model/budget settings using the diagnostic on screen; do not rerun for preferred candidates. |
| `subject_registry_unavailable` | Use the matching orchestrator checkout with subject metadata and complete non-negative reference counts, then start a fresh rehearsal. |
| `judgment_unanswered` | Provide one non-empty judgment sentence for each of the three questions. |
| `judgment_private_content` | Describe your judgment without copying known private data into the public answer. |
| `help_requested` | Set your private environment and run run-live-rehearsal.sh without arguments. |
