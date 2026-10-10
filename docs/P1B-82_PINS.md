# P1B-82: a recorded affect observation replaces the stand-in

## Grounding and approved corrections

All twelve repositories began clean on main. P1B-81 is merged to main and
origin/main in design and devshell. Four repositories change on
p1b-82-affect-observation: orchestrator, UI, design and devshell. Eight retain
their exact baseline heads and clean trees. No operator acceptance was run.

The governing contract sentence, from PLANNING_KERNEL_CONTRACT.md §6, is:

> It must not silently present stale affect assumptions as current measured state.

The governing acceptance sentence is:

> A manual instrument has one line of execution.

Observation is applied once after ranking and before planning on that existing
line. Absence is recorded as skipped, without another flag, prompt, comparison,
retry, paste or judgment. Calendar approval remains its existing deliberate act.
The separate pre-flight checks readiness; it is not another rehearsal.

Seven concrete corrections were approved before implementation:

1. POST's proposed response lacked the provenance needed by §D. The server now
   returns source_kind and dimension_count as well as schema_version,
   snapshot_id and observed_at. Reading values remain private. Inferring
   provenance from the submitted request would not establish what the server
   recorded, so the public projection uses response metadata.
2. Numeric equality to 4/7/8 is not calibration provenance. Calibration means
   any of the exact ten Settings checked by build_affect_profile is present,
   as the operator specified, including explicit default numbers, null and
   unparsable values. Existing parsing/fallback tolerances remain. The private
   builder derives mode from that presence, avoiding a new core/kernel field
   or a false claim that an explicit default answer is uncalibrated.
3. A fresh store with no Tasks cannot produce a Plan. Scenario 38 captures one
   invented fixed-duration 15-minute Task first. This supplies the required
   planning input rather than changing the kernel's empty-schedule refusal.
4. Correcting §13.1 alone would leave §13.2's second scale and unimplemented
   valence, §13.4's implemented-decay claim and §15.2.2's unconditional
   user-facing enforcement claim inconsistent. Those descriptions are scoped
   to the actual implementation in the same design change.
5. UBU-D0100 requires snapshot-level confidence; the frozen core/schema have
   no field. The named UBU-D0100 confidence gap is documented in D0304 and
   the route contract. No schema change, full-policy-compliance claim or
   separate gap decision is made.
6. The operator's scoped freshness rule is preserved: current until replaced
   when no freshness limit is configured; a store that holds one, or a
   supplied request, still goes stale. No writer is added. Disabling existing
   freshness checks would discard supported store/request semantics.
7. “Never refuses to plan” is narrowed to uncalibrated priors not blocking an
   otherwise feasible Plan. Calibrated enforcement and unrelated planning
   failures remain valid. Forcing a Plan through either would break the
   standing legitimacy and feasibility contract.

## Governing sentences by section

All named documents were read before their section was written, including the
whole contract §6, stand-in contract, affect design and the cited decisions.

| Section | Sentence from the required reading | Application |
|---|---|---|
| All | ACCEPTANCE rule 1: “A manual step may not verify what the runner or a ubu-ui test already asserts.” | Deterministic assertions stay in tests and the runner. |
| All | Rule 5: “A ticket's acceptance section names the script to run and the document to follow, and contains no steps of its own.” | Operator acceptance names LIVE_REHEARSAL.md only. |
| All | Rule 6: “A verification is retired once it has passed live, unless the ticket changes something that could affect it.” | Update the existing visual step's measured rows. |
| All | Rule 10: “A manual step exists only for rendering.” | No added transcription step. |
| A | AFFECT_STAND_IN.md: “It reads the source_kind, not the warning text.” | Leave planning_analysis unchanged and test live report provenance. |
| A | SETTINGS.md: “Attribution is server-controlled.” | Client supplies only schema and the three readings. |
| B | Generated API README: “No network fetch was used.” | Copy the regenerated orchestrator document with the default file-mode generator. |
| B | PlanReports' prop contract: “It says whether the affect figures were measured.” | Test the existing live figure rendering with a default-prior warning. |
| C | ACCEPTANCE: “Anything assertable over HTTP belongs in check-ui-contract.mjs, as a scenario, not here.” | Append scenario 38; add a self-checking seed, no manual step. |
| C | How to add a step: “Run ./scripts/acceptance.sh --stage-only until every seed prints OK and every step prints with its objects named.” | Staging passed all 12 seeds for the single updated step. |
| D | LIVE_REHEARSAL_DRIVER.md: “PublicReport accepts original action records, never private rendered text.” | Project only closed response metadata, not private readings or terminal text. |
| E | UBU-D0035: “User-declared and sensor-derived observations use the same object type.” | Write the existing typed Snapshot. |
| E | UBU-D0100: “The original Snapshot observation is never edited or deleted as canonical history.” | Every check-in admits a new version-1 Snapshot, with no PATCH/DELETE. |
| F | pinned-revs.toml: “Push a branch before pinning it.” | Verify published upstream heads before advancing the three inventory pins. |

## A: one path records an immutable check-in

POST and GET /affect/observation sit beside /universe-state and are registered
in OpenAPI. POST accepts exactly:

```json
{"schema_version":"ubu.orchestrator.affect_observation.v1","energy":7,"stress":3,"mood_intensity":3}
```

All dimensions are required finite numbers in [0,10]; fractions are supported.
HTTP 201 returns schema_version, snapshot_id, observed_at, source_kind
live_observation and dimension_count 3. GET returns schema_version and
observation null, or {snapshot_id, observed_at, source_kind, dimensions:
{energy,stress,mood_intensity}}. Attribution fields are refused, not accepted
from the client. The final OpenAPI review made schema_version required and
non-null in the request metadata, matching the already-tested server refusal;
all four request fields are required in the regenerated document.

The exact new HTTP 400 codes are affect_dimension_missing and
affect_value_out_of_range. Existing unknown_schema_version and
missing_schema_version remain. Diagnostic text names the field and rule, never
the submitted value. Unknown DTO fields use the existing extraction refusal.

The writer uses UbuId::new(Snapshot), the ordinary User mutation envelope and
queries::admit_object: object_type Snapshot, version 1, active, user-capture.
Its typed payload has captured_at and affect.observed_at both equal to the
planning clock's now, objects [], source_kind live_observation, and each
{dimension,value}. Each check-in is a new Snapshot; none is edited.

GET and planning share selection of the newest active Snapshot carrying affect:
json_extract(payload_json, '$.affect') IS NOT NULL. Ordering is updated_at
then local rowid descending; the latter makes a second admission win even at
the same fixed test-clock time. A newer non-affect Snapshot cannot hide it.
The next explicit POST /planning/generate reads it. Recording creates no Plan
and recalculates nothing on its own.

The ten calibration names are acceptable_energy_floor, affect_energy_floor,
energy_floor, tolerable_stress_ceiling, affect_stress_ceiling, stress_ceiling,
tolerable_intensity_ceiling, tolerable_mood_intensity_ceiling,
affect_mood_intensity_ceiling and mood_intensity_ceiling. Any matching active
Setting present makes the store-built profile calibrated and enforce. Without
one it is warn_only, even with real readings; the existing default-review-prior
warning explains why. Missing, incomplete or stale observation fallback stays
warn_only. Full supplied requests retain their caller's mode and freshness.

Seven new in-process tests pass: semantic refusals without writes; exact typed
Snapshot admission/read-back/kernel values with no recalculation; immutable
supersession at equal timestamps; energy 2 retaining a Plan in warn_only with
affect_feasible false and energy violated; comfortable live figures with no
affect finding or stand-in suggestion; ignoring a newer non-affect Snapshot;
and each calibration name enforcing even at default/null/unparsable values.
Low energy reports at_risk and an affect_margin finding, as the unchanged
report producer defines. The full existing suite also retains its configured
store-freshness and supplied-request tests. planning_analysis.rs is byte-identical.

AFFECT_OBSERVATION.md records the route, body, codes, fields, selection, mode,
next-generation behavior and confidence gap. AFFECT_STAND_IN.md closes with
“How the stand-in retires”. The freshness sentence is scoped exactly: an
observation is current until replaced when no freshness limit is configured;
a store that holds one, or a supplied request, still goes stale. No freshness
Setting writer or confidence-decay implementation is added.

## B: Today records the reading above its reports

recordAffectObservation and readAffectObservation use the existing Tauri HTTP
transport, AFFECT_OBSERVATION_PATH and AFFECT_OBSERVATION_SCHEMA_VERSION.
“How are you feeling?” sits immediately above PlanReports. Energy, Stress and
Mood intensity inputs use min 0, max 10, step 1; meaning lines state higher
energy is better, lower stress is better, intensity is arousal/volatility
rather than good/bad mood. GET shows Not recorded or Recorded at local time.
Record shows the response timestamp and “The next ‘Generate Plan’ uses this
observation. Recording it does not recalculate the current Plan.” Refusals
render through DiagnosticsList; no planning request follows success.

Seven new tests pass under the existing no-network preload: exact POST and no
automatic generation; latest GET/local timestamp/meaning; client refusal for
range/blank/fractional inputs; server diagnostic rendering; Today placement;
fractional API preservation; and live figures under the bootstrap-prior warning.
The figure test reads 0.381, comfort and neutral rather than not recorded.
Existing App mocks now explicitly answer the new startup GET; navigation/time
expect both startup reads and time-report indices account for the extra read.
The prior diagnostics test now checks removal of .diagnostics-info after
planning failure instead of asserting that every status on Today disappears:
the independent observation status remains. No planning refusal assertion is
weakened. The new tests' fixture attribution and at_risk expectation were
corrected before the passing runs. The follow-up below updates one existing
Rust path-count expectation for the newly committed route.

The exact regenerated OpenAPI copy is committed in the UI. tsc and Vite build
pass. UI runtime report logic remains unchanged.

## C: scenario 38 and the same single visual step

Existing scenarios 1–37 remain byte-identical; scenario 38 is appended last.
It proves fresh GET null, the invented Task, POST/read-back 7/3/3 and server
provenance, a live Plan without the stand-in warning/suggestion or the three
affect finding categories, and an enum post-plan state. Energy 2 keeps a
warn_only Plan with affect_feasible false and energy violated. Energy 11 and
missing stress each produce HTTP 400 with the corresponding new code.

Actual scenario-38 figures: affect_margin 0.3807970779778823, stretch_pressure
comfort, post_plan_state_delta neutral. Its low-energy case also passes.

```text
RESULT: 38 of 38 scenarios passed, 0 failed, 2 skipped, 703 requests, all to 127.0.0.1
```

The two skipped live scenarios were not run and prove nothing. This runner
retains its existing loopback exemption and uses invented fixtures only.

week_observation precedes week_risk, records 7/3/3 and checks exact GET values,
id, timestamp and live source. week_risk asserts the comfortable live reports,
no affect findings, enum state and no stand-in suggestion. The existing STEP
now reads the three affect figures/words and no “Record how you are feeling:”
line. Its reverse code is “a row that reads ‘not recorded’ after
week_observation passed: NOT EXPECTED”; the other risk/coverage outcomes remain.
The staged-by column names week_observation. The existing copy-back still reads
the risk badge, finding names and three rows, without another manual step.

acceptance.sh --stage-only passed 12 seeds for one step: staged risk medium,
only unplaced_work, margin 0.3807970779778823, stretch comfort, state neutral,
and coverage 100% with one in-scope commitment at this run's clock. These are
throwaway staged figures, not an operator measurement. CONTRACT_CHECK.md
records row 38, the count and the actual RESULT above.

## D: private readings, closed public provenance

Optional private observation has exactly energy, stress and mood_intensity.
observation_object_required checks object shape/extra keys;
observation_value_0_to_10 checks each required finite number in [0,10]. Safe
fault paths are observation and its three fixed field names. The new action
observation posts once after ranking and before Plan, expecting 201; absence
records private_input_missing and an unavailable action.

Injected tests render these exact success lines in section 2, after ranking:

```text
POST /affect/observation HTTP: 201; outcome: response_observed
POST /affect/observation observation: dimensions 3; source_kind: live_observation (closed value; values and observed_at withheld)
```

dimension_count comes from the server; source_kind is checked against the two
members live_observation/bootstrap_default_profile, otherwise
withheld_or_unavailable. Snapshot id, observed_at and readings are withheld.
The subsequent Plan line reads affect_figures: not_marked_as_stand_in when its
report lacks the stand-in marker. Absence leaves unavailable; action not
observed and the injected no-observation Plan retains affect_figures: stand_in.

Six new injected tests verify structural rule/fault privacy before any effects,
pre-flight refusal before live effects, exact action body/order, once-labelled
private values without remembering numbers, field-specific public dependence,
absent/live stand-in classification, and stop-before-planning on recording
failure. Values or timestamps changing alone alter no public line; status,
server count and the closed server source alter only their dependent lines.
Distinct fractional canaries never reach render or the fault. Driver reference,
LIVE_REHEARSAL input row and ACCEPTANCE describe the input/order/rules, with
no new operator instruction branch. The old OpenAPI path assertion explicitly
moves 56 to 57 because route growth is authorized by this ticket.

## E: D0304, one value scale and accurately scoped freshness

D0304 is appended Accepted; D0038/D0039 and all earlier decisions are
byte-identical. It records immutable user-declared check-ins, the ten-name
presence calibration rule, uncalibrated warn_only, calibrated enforce, the
0–10 value scale versus [0,1] satisfaction, deferred valence/decay, scoped
freshness and the named confidence gap. No separate decision is filed for it.
PLANNING_KERNEL_CONTRACT.md and OPEN_QUESTIONS.md remain byte-identical.
P1B-81 seeded ranking remains a synthetic stand-in.

The principal DESIGN sentences now read:

- “Values are reported on the user-facing scale from 0 to 10 (UBU-D0304).
  The sigmoid satisfaction score is separately in [0, 1].”
- “The user records a check-in through POST /affect/observation, which writes a
  new immutable Snapshot with source_kind: live_observation, the three values,
  and a server-stamped observed_at (UBU-D0304).”
- “Step 4's affect-Snapshot content is realized by the affect observation route
  (UBU-D0304); step 5's interactive bootstrap interview remains.”

§13.2 scopes uncollected valence and changes its intensity scale; §13.4 names
unimplemented decay/confidence; §15.2.2 describes the actual calibration/mode
rule and preserves full supplied requests.

## Verification and published inventory

| Check | Before | After |
|---|---|---|
| Orchestrator Rust, locked/offline | 650 | 657 passed, 0 failed; full --no-fail-fast correction run |
| UI | 220 | 227 passed; seven new tests; tsc/build passed |
| Devshell driver | 82 | 88 passed; six new tests |
| Devshell runner | 37/37; 694 requests | 38/38; 703 loopback requests; two live skips |
| Devshell staging | 11 seeds, one visual step | 12 seeds passed, same single updated step |
| Design | no executable suite | unique D0304; earlier decisions/contract unchanged |
| Frozen kernel Rust | 125 | 125 passed |
| Kernel Clippy | zero | zero with -D warnings |
| Orchestrator Clippy | 8 distinct / 9 occurrences | 8 distinct / 9 occurrences, unchanged |
| Actual owned worker | 35 | 35 passed with pinned CPU Torch, no skips |
| Pytest with Torch | 58 | 58 passed, no skips |
| Pytest without Torch | 39 passes / 19 skips | 39 passed / 19 skipped |
| endpoints.ts | 56 paths / 43 constants | 57 paths / 44 constants |
| OpenAPI | 56 paths / 191 schemas | 57 paths / 197 schemas; exact UI copy |
| Closed vocabulary | 279 | 281; exactly affect_dimension_missing and affect_value_out_of_range added |
| Validator fingerprints | existing file | byte-identical |
| Standing check-all.sh | required | passed; existing fixture-demo quarantine unchanged |

The earlier full-suite result did not establish a passing suite at published
head 3c4495a. It preceded the regenerated committed OpenAPI document; the later
focused observation tests and Clippy did not run the stale path-count assertion.
That head's tests/universe_state.rs:568 still expected 56 committed paths while
the document contained 57. The operator reported the resulting full-suite failure.
The earlier full-suite-pass claim is withdrawn as validation of that head.

The authorized P1B-82 follow-up changes that one expectation from 56 to 57,
matching the deliberate new route, and reruns the full suite using:

```sh
export CARGO_BUILD_JOBS=1
source ../ubu-devshell/scripts/env.sh
cargo test --locked --offline --no-fail-fast
```

Actual result: 657 passed, 0 failed, 0 ignored, 0 filtered out. All 81
test-result groups passed, including
the_document_names_the_route_and_its_five_schemas. The command exited 0.

This is a full-suite rerun against the final committed OpenAPI input, not the
previous focused check. No runtime code, OpenAPI document, dependency revision,
lockfile or other test expectation changes. The orchestrator pin and published
inventory row below advance only after the correction branch is published.
Other reported suite results above are retained from the original P1B-82 run;
they were not rerun for this one-line expectation correction. The existing
single-job, lock and memory controls remain unchanged.

One Cargo job per invocation, sequential across repositories, sourced env.sh,
nonblocking flock, MemoryHigh=16G/MemoryMax=20G and build/compute exclusion
remain unchanged. No installation or non-Git external network was used. Tests
use in-process/injected seams; only the existing runner/staging loopback and
bounded owned-worker exemptions run their established real boundaries.
No real Ollama, Google, editor or operator CLI/pre-flight was invoked.

Inventory pins for orchestrator, UI and design advance to verified published
heads, recorded below after publication. Every other inventory pin is unchanged;
devshell has no self-pin. Every Cargo consumer rev, manifest and lockfile stays
byte-identical, including the kernel consumer revs distinct from inventory.
No core, schema, store, kernel, adapter, quick-ubu, brand or model-committee change.

| Published upstream | Inventory pin |
|---|---|
| ubu-orchestrator | 9fddef16990ac89d07a168c75bf04b77c35b9bc3 |
| ubu-ui | dda2312fd17a5dc330fef102f9def30ab88ac5bf |
| ubu-design | 6d8a78aa3ba927ac402d27c0d96a627bf02de550 |

All four branches publish without force-push or merge. Claude performs the
subsequent merges to main and main-branch pushes. Final audits verify eight frozen heads/trees,
existing 37 scenario bytes, unchanged standing guards/fingerprints/report
producer, dependency/lock invariance, exact OpenAPI copy, historical decision
prefix and outgoing privacy. The three excluded local acceptance artifacts were not opened; their contents
and filenames are not published. The audit uses only local exclusion metadata
and generic assertions.

Operator acceptance has not been performed; it is one pre-flight plus one rehearsal with observation supplied, and what is under test is whether the operator’s reading is reported as a measurement and uncalibrated priors do not block an otherwise feasible Plan.
