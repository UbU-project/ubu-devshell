# P1B-76 — the existing registry becomes a readable ratification agenda

Implementation and automated verification are complete; operator acceptance is
pending. Three repositories change: orchestrator, UI and devshell. P1B-75
`9e57b49` was confirmed on local `main` and `origin/main` before work. All twelve
repositories started clean on `main`; the other nine remain at their baselines.

## Governing sentences and approved corrections

From `UBU-D0291`, read in full with D0243 and DESIGN §4.2/§11.2:

> The provisional registry is operator-authored and visible in one place.

This constrains the result to an operator-owned, readable agenda in the existing
UniverseState Subjects panel. No second screen, invented root or automatic mint
is introduced. Governed subjects stay fixed and provisional ones retain their
explicit authoring path.

> Every provisional root must either be promoted into the governed set by an amending `UBU-D` record or retired. The registry is that decision's agenda. The switch is when the operator's store stops being disposable; it is the last moment when a rename is cheap. Afterward a rename rewrites UniverseState keys, fact_provenance keys and every precondition target string in Task payloads, with no migration tooling.

This requires all three reference spaces to be visible as counts and forbids a
retirement that silently orphans them. It does not grant automatic promotion,
cascading deletion, a migration operation or enforcement of the switch. Empty
is satisfied for now; the condition is evaluated at the switch, not banked.

| Section | Additional governing sentence read before editing | Constraint |
|---|---|---|
| A–C | subject_vocabulary.rs: “Operator-authored provisional subjects; governed roots are never Setting rows.” | Derive metadata from existing provisional Settings, preserving the governed tier and root validator. |
| A–C | setting_authoring.rs: “Named configuration through ordinary Setting admission; never a Preference.” | No canonical type, schema version or persistence format is added. |
| A–C | universe_state.rs: “This manual mutation route additionally checks first key segments; its target grammar must hold for clients with no screen.” | UI controls supplement the server refusal; direct HTTP retirement must be safe too. |
| A–C | UNIVERSE_STATE.md: “It runs under the same lock as a Task action, so an edit and a completion do not interleave.” | Reuse authoring locks and add an atomic count-check/DELETE transaction. |
| C–D | UniverseState.tsx: “Event markers can only be added to, never changed or removed, and this screen does not add them.” | Explain the marker retirement gap rather than promising universal clearing. |
| D | endpoints.ts: “The contract with ubu-orchestrator: where it is, which routes exist and which schema versions are sent.” | Reuse SETTINGS_LIST_PATH and existing put/delete methods; preserve paths/constants and refresh generated response descriptions. |
| D | SubjectFields.tsx: “Choose a singular noun naming an entity or domain, never an instance, an attribute, a provenance or source, or a reverse-DNS authority prefix.” | Preserve existing pre-request mechanical validation and the operator's semantic root choice. |
| E | ACCEPTANCE rule 10: “A manual step exists only for rendering.” | Put deterministic registry figures in driver projections, not a human tally or comparison. |
| E | ACCEPTANCE rule 11: “A manual instrument has one line of execution.” | Complete once or stop with one named reason/remedy; retain one invocation, three judgments and one pasted file. |
| E | LIVE_REHEARSAL.md: “The terminal is labelled PRIVATE: it shows your own titles, condition words, proposals and diagnostic/risk detail.” | Keep names/content on the private screen; publish only figures and safe status. |
| F | pinned-revs.toml: “Record the expected HEAD SHA here each time an upstream repo lands.” | Published source heads are recorded; no Cargo consumer revision advances. |

The operator approved the grounding corrections and the local ticket was
rewritten accordingly. The “only hard gate left” claim is replaced: this ticket
does not discharge desktop GPU planning/CPU certification. The existing Subjects
list, mint/retire controls and validation are extended. The dangling-diagnostic
claim is **withdrawn**, not softened; that diagnostic already points to a real
list, and its message is unchanged. The old UI sentence permitting retirement
with retained references is replaced alongside the refusal controls in the UI
commit, coupled with the server guard in this multi-repository change set.

**UBU-D0291 append-only-marker retirement gap.** A root referenced by an
append-only event marker cannot use ordinary retirement in the promoted-or-retired
binary because no marker-clearing operation exists. It remains registered
pending operator ratification or separate cleanup work. This is reported as a
named gap, not resolved by a new decision. Other retained rows without an exposed
cleanup path also remain counted. Automatic promotion, cascading erasure or
dropping such references from the counts would conceal the gap rather than fix it.

## Which follow-ups existed already

At the stated baselines, the validator was implemented in
`src/services/subject_vocabulary.rs::validate_root` (reserved/governed/shape
refusals); explicit minting in `src/services/setting_authoring.rs::put`
(`universe.subject.<root>`, boolean true, duplicate refusal); and advisor
constraints in `subject_vocabulary::effective` and `target_pattern`.
Basic registry visibility and mint/retire controls also existed in
`ubu-ui/src/routes/UniverseState.tsx::load`, `changeRoot` and its Subjects panel,
with `SubjectFields.tsx::effectiveSubjects` and `rootRefusal`. All four deferred
follow-ups had landed in basic form, contrary to the original visibility premise.
This ticket completes the registry's **ratification agenda** with minting
metadata, reference costs, guarded retirement and computed status.

## A–D: registry view, reference costs and retirement

No route or endpoint constant is added. `SETTINGS_LIST_PATH` already supplies the
Setting rows; each effective provisional row gains derived `subject_metadata`
with `minted_at` from its creation time and the three reference counts. Its
existing version supplies the displayed registry version. The client derives
separate governed/provisional tiers and renders their metadata and counts in the
existing UniverseState panel, beside the facts whose namespace it controls.
Setup remains the place for other Settings; duplicating the registry there
would create competing agendas.

| Tracked API surface | Before | After |
|---|---:|---:|
| OpenAPI paths | 56 | 56 |
| endpoints.ts path constants | 43 | 43 |

The endpoint module is byte-identical. Orchestrator OpenAPI was generated offline
from its compiled definition and copied with the existing file-mode UI generator;
both copies are identical and all internal references resolve. The additive
response DTOs are derived views, not new canonical objects. Canonical schemas,
Setting payloads, schema versions, Cargo manifests, lockfiles and revisions do
not change. No generated client is left on the former response description.

| Count | Computation |
|---|---|
| UniverseState keys | Match the first key segment exactly in all four collections across all current stored UniverseState object rows, including a non-latest row. Count keys, not values, set members or marker entries. |
| fact_provenance keys | Match the subject after a recognized collection in each full provenance target key. Count each key separately. |
| Task precondition targets | Scan all current stored Task payloads, including inactive Tasks; walk only preconditions and their all_of/any_of children. Count each matching target occurrence, including repetitions. Expected values, descriptions and effects are not searched for lookalikes. |

The Task count requires a full payload scan: there is no indexed target column.
One scan computes counts for every root, so work is linear in stored payload
bytes/condition nodes, rather than multiplied by the number of roots. The current
implementation fetches matching Task/UniverseState JSON strings together;
memory includes those strings, the largest decoded payload and aggregate counts.
No index/cache is added. Logs, candidate payloads and object-history rows are
outside D0291's three named current-object spaces. Unreadable count inputs fail
closed with a generic diagnosis rather than exposing contents or inventing zero.

DELETE refuses with HTTP 409, `subject_referenced`, all three counts and an
explicit no-cascade remedy whenever any count is nonzero. The existing import
and Task-action locks serialize normal authoring; the scan and DELETE also share
a SQLite transaction. Zero references permit the existing removal. Refusal does
not alter the Setting, a fact/provenance row or a Task requirement. The UI disables
retirement with its reason, refreshes counts after edits and registry changes,
and refreshes stale refusals. Unknown or malformed client counts disable it.
The former retirement sentence and new refusal controls share the UI commit.

No reference key, value or target string is introduced into the public block or
the count scanner/retirement diagnostics or logs. The metadata view contains
counts only; the existing private UniverseState tables remain private. New
count errors contain fixed text, and the scan emits no log. Privacy canaries
cover nested lookalike content and extra metadata fields. No actual operator
store was opened, root minted/retired or ratification performed. Tests use only
invented isolated stores. No Compartment scope or first-run Device grant changes.

## E: one invocation, two sinks and Setting-family labels

The live configuration requires exactly one operator-chosen root in `subjects`
and subsequent mutation authoring under it. It never invents either. The existing
versioned Task requirement path remains; useful trees are preserved, so the
root's Task-precondition count can genuinely be zero. After deterministic
authoring, GET SETTINGS_LIST_PATH supplies the registry snapshot before either
advisory run. Its private presentation names the provisional root and metadata;
the public block publishes the governed/provisional tier cardinalities, the
supplied root's three server-computed counts, and computed outstanding/for-now
status. No keys, values, target strings, root names or raw metadata are copied.
Missing/invalid/duplicate selected-root metadata stops with
`subject_registry_unavailable` and one remedy, before model calls.

Setting families now have distinct labels: `colour_setting` (calendar.color),
`advisory_setting`, `planning_setting`, and `subject_setting` for the settings
array. Explicit subjects minting retains `subject`. planning.gpu_enabled therefore
has planning's label rather than a colour label. The source-derived diagnostic
vocabulary advances 256 → 257 for `subject_referenced`; validator fingerprints
and names/values rules are unchanged.

LIVE_REHEARSAL.md remains the single procedure: fresh store, activated existing
venv, one supplied root, one invocation, three public judgments and one pasted
file. No new human tally, comparison, branches, absence phrases or transcription
is added. No agent live acceptance run, real Google/ollama/editor call or new
signal handler/spawn pathway occurs. Pure driver tests inject all effects;
existing worker and owned-loopback runner exemptions are unchanged.

## Verification

| Check | Before | After |
|---|---:|---:|
| Orchestrator Rust | 637 | 642 passed, zero failed/ignored |
| UI | 212 | 220 passed |
| Devshell driver | 47 | 53 passed, zero skips |
| Scenario runner | 36/36, 667 requests | 36/36, 669 requests; zero failed, two explicit live skips |
| Kernel Clippy | zero warnings | zero warnings, -D warnings |
| Orchestrator Clippy | eight distinct / nine occurrences | eight distinct / nine occurrences |

UI production build, shell syntax, generated API equivalence/reference resolution,
whitespace and source-agreement checks pass. The two extra runner requests
exercise the registry metadata read and the separate permitted DELETE after
explicit reference clearing. Existing retirement tests/scenario were corrected
to assert refusal before cleanup, rather than weakened to preserve orphaning.
Full scans cover all collections, provenance-only references, repeated/nested
targets, inactive Tasks/non-latest states and the append-only-marker gap. UI tests
cover each independent nonzero count, zero-state satisfaction, mint metadata,
invalid counts, updates and stale refusal. Driver tests assert each projected
count and its privacy/early-stop behavior without a whole-block golden.

Initial driver file-permission fixtures lacked the now-required subject input;
their synthetic setup was corrected. React waits were changed to the rendering
test helper to eliminate unwrapped-update warnings. No production behavior or
existing assertion was disabled to make checks pass. Cargo remained sequential
at one job under the unchanged flock and available scoped memory ceiling; no
two-job trial, CUDA context, configuration relaxation or package install occurred.
The existing fixture-demo quarantine is unchanged. model-committee rank was not run.

## F: every pin

The three changes are published on `p1b-76-subject-ratification-agenda`, without
force-push or merge. The inventory records the final published orchestrator/UI
heads and refreshes its stale design entry to P1B-75's already-merged input head;
this does not change the read-only design repository. No Cargo consumer needs
a revision bump, so every Cargo Git pin and lockfile stays byte-identical.

The pin table below records published final heads. No self pin exists for devshell.

| Inventory | Full revision | Disposition |
|---|---|---|
| ubu_schemas | 070d0a6f9a6ad7833dd523042925008316ce923b | unchanged |
| ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b | unchanged |
| ubu_store | 83a099f55220b1286ffb2dee3c9d19006e2090b5 | unchanged |
| ubu_planning_kernel | 3da928be0d6d8cc6527e616a92d11dbc41d61d35 | unchanged |
| ubu_github_adapter | e14a43b47aeb0a928f4dfdc83cd78ea9a2e044f6 | unchanged |
| ubu_orchestrator | a83284a00119d2b2036c2e38f23bfec604c63d1c | advanced for P1B-76 |
| ubu_ui | 649f8e117a3eec08b5f8581885b06999d187f8a3 | advanced for P1B-76 |
| ubu_design | 9e57b4959fecc39e852b84d2391deb95a93da446 | refreshed to accepted P1B-75 input; repository unchanged |
| ubu_brand | faf2005a8bd9e64742dd76ee6d1f91f45223946b | unchanged |

All Cargo Git dependency pins remain:

| Manifest | Dependency | Revision |
|---|---|---|
| ubu-orchestrator/Cargo.toml | ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b |
| ubu-orchestrator/Cargo.toml | ubu_store | 83a099f55220b1286ffb2dee3c9d19006e2090b5 |
| ubu-orchestrator/Cargo.toml | ubu_github_adapter | e14a43b47aeb0a928f4dfdc83cd78ea9a2e044f6 |
| ubu-orchestrator/Cargo.toml | ubu_planning_core | 3da928be0d6d8cc6527e616a92d11dbc41d61d35 |
| ubu-orchestrator/Cargo.toml | ubu_planning_cpu | 3da928be0d6d8cc6527e616a92d11dbc41d61d35 |
| ubu-orchestrator/Cargo.toml | ubu_planning_worker | 3da928be0d6d8cc6527e616a92d11dbc41d61d35 |
| ubu-planning-kernel/Cargo.toml | ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b |
| ubu-store/Cargo.toml | ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b |
| ubu-github-adapter/Cargo.toml | ubu_core | fa26bf678977f5e077229eb97a39cc1b8b960c9b |

Core schemas-ref: `070d0a6f9a6ad7833dd523042925008316ce923b`, unchanged.

Read-only extra heads: quick-ubu `9ccc8b8e302d4e39207b749fb00bc449dc172cf0`; model-committee `4359c557fc8b6228f9da6bbdcd62a4cdf9f26260`.

The report's containing devshell commit completes the driver, documentation and
inventory. Scope/privacy audits cover outgoing commits and added lines, including
the new test file. Protected local acceptance artifacts were neither opened nor
uploaded; their names and machine-specific paths are excluded from new content.
The nine read-only repositories retain their baseline revisions; all twelve
working trees finish clean. This is implementation evidence, not operator approval
of the agenda's readability or a claim that the switch is ready.

Operator acceptance has not been performed; it is one invocation, and what is under test is whether the ratification agenda can be read.
