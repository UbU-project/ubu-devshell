# P1B-60 pins and verification

P1B-60 changes eight repositories on `p1b-60-what-already-matches` and moves
seven pins. All upstream revisions were pushed before being pinned. Nothing
was merged to main or force-pushed. Each section has one commit, except C,
which has one per repository. UI and devshell commits carry the requested
Co-Authored-By trailer; Rust commits do not.

## Revisions

| Order | Repository | Sections | Pushed revision |
|---|---|---|---|
| 1 | `ubu-schemas` | A | `6082ad50680e38a7140e52ed4d8b8377efbc3b2c` |
| 2 | `ubu-core` | B | `8ffc936257331c50cd03773c9d1333a3344cf4cc` |
| 3 | `ubu-store` | C | `a6ae9b82170b03e231a196d1b9341bfa0e20fce8` |
| 3 | `ubu-planning-kernel` | C | `072867285ba267bb9caee28a12fb33c6ede51c2b` |
| 3 | `ubu-github-adapter` | C | `999e0e2f50388db6c5b999449c8620c750f288cf` |
| 4 | `ubu-orchestrator` | C, D | `84c00c55f5a9782a85c35eac6b6b701e8af64491` |
| 5 | `ubu-ui` | E, F | `78eab141c5b1fd806385fd6ae5b2592a3b6f832f` |
| 6 | `ubu-devshell` | G, H | G is recorded below; H is the commit carrying this file |

## Changes and governing documents

### A — ubu-schemas, `6082ad5`

Both summaries now have the string types the implementation writes. Source remains required and nonempty; confidence remains optional and nullable. Two object-summary refusal fixtures and one normalized whole-state fixture were added. Six existing invalid provenance fixtures were corrected so they still fail for their intended provenance defect.

schemas CONTRACT.md: “This creates lockstep with hand-written `ubu-core` serde types so schema drift fails early in CI and fixture review.” The sentence stays and now explicitly limits its claim to whole-fixture coverage.

Files: `CHANGELOG.md`, `CONTRACT.md`, `fixtures/invalid/core/universe-state/confidence-summary-object.json`, `fixtures/invalid/core/universe-state/provenance-key-collection-only.json`, `fixtures/invalid/core/universe-state/provenance-key-without-collection.json`, `fixtures/invalid/core/universe-state/provenance-missing-recorded-at.json`, `fixtures/invalid/core/universe-state/provenance-unknown-kind.json`, `fixtures/invalid/core/universe-state/provenance-with-confidence.json`, `fixtures/invalid/core/universe-state/provenance-with-free-text.json`, `fixtures/invalid/core/universe-state/source-summary-object.json`, `fixtures/valid/core/universe-state/populated.json`, `fixtures/valid/core/universe-state/roundtrip.json`, `fixtures/valid/core/universe-state/with-provenance.json`, `schemas/core/universe-state.schema.json`.

### B — ubu-core, `8ffc936`

The schemas-ref submodule points at A. A whole JSON-value round trip replaces the test that pinned the summary drift; a second test rejects the two object summaries. Existing provenance-only coverage remains. No runtime Rust type changed.

core CONTRACT.md: “Compatibility is checked by round-tripping canonical fixtures from `schemas-ref/fixtures` when the submodule is available.” CODEGEN.md: “This crate uses the `schemas-ref/` submodule only for fixture compatibility tests.”

Files: `CHANGELOG.md`, `CONTRACT.md`, `schemas-ref`, `tests/schema_fixture_roundtrip.rs`.

### C — ubu-store, `a6ae9b8`

Core manifest pin and its single lockfile Git source line only. Full suite passed without changing any source or test.

For C–D, CALENDAR_INTERACTION.md: “Projection retains calendar-completed events, including after regeneration removes the Task from the plan, so it does not erase the gesture or delete the event needed for reopening.”

Files: `Cargo.lock`, `Cargo.toml`.

### C — ubu-planning-kernel, `0728672`

Core manifest pins and the single core lockfile Git source line only. Full suite passed without changing any source or test.

The same C–D retention sentence above governs the graph that consumes the core types; B itself changes no runtime behavior.

Files: `Cargo.lock`, `Cargo.toml`.

### C — ubu-github-adapter, `999e0e2`

Core manifest pin and its single lockfile Git source line only. Full suite passed without changing any source or test.

The same C–D retention sentence above applies; this commit changes no calendar behavior.

Files: `Cargo.lock`, `Cargo.toml`.

### C — ubu-orchestrator, `a740775`

Manifest pins move core, store, kernel and adapter together. Exactly five Git source lines move in Cargo.lock, with no other lockfile changes. All 510 tests passed without changing a source or test.

The same C–D retention sentence above applies. The pin-only commit preserves it.

Files: `Cargo.lock`, `Cargo.toml`.

### D — ubu-orchestrator, `84c00c5`

The typed matching_placements property counts distinct current Plan event IDs that produce no operation, excluding retained completed events and entries outside this Plan. Three in-process HTTP tests cover all matches, all moved and retained calendar-completed history. The generated OpenAPI changes only by this property and its required entry.

CALENDAR_INTERACTION.md: “This retention has no automatic history cleanup.” Therefore retained history is explicitly excluded from the count.

Files: `docs/CALENDAR_INTERACTION.md`, `openapi/openapi.generated.json`, `src/api/calendar_projection.rs`, `src/services/calendar_apply.rs`, `tests/calendar_retained.rs`.

### E — ubu-ui, `6cdee16`

The preview summary reads the server count and adds its sentence only when positive, with singular wording for one. Three rendered tests cover a response count of 14 despite only two fixture events, zero omission, and a single summary when there are no operations. Both the OpenAPI copy and canonical summary-field TypeScript declarations were regenerated.

NAVIGATION.md: “The new Calendar screen drives `/projection/calendar/*`; see [Calendar surface](CALENDAR_SURFACE.md).”

Files: `docs/NAVIGATION.md`, `src/api/client.ts`, `src/api/generated/openapi.generated.json`, `src/presentation/calendar-preview.ts`, `src/routes/Calendar.tsx`, `src/types/generated/index.d.ts`, `tests/calendar.test.tsx`.

### F — ubu-ui, `78eab14`

PreconditionWords uses at_least, at_most, greater_than and less_than. Six tests cover all four comparisons, an unknown predicate retaining raw JSON, and nested all_of mixing equals and at_least. No precondition authoring was added.

core universe_state.rs: “A number that was never recorded satisfies none of them, and it is not malformed to ask.” Its match arm spells the four predicates exactly as used here.

Files: `docs/NAVIGATION.md`, `src/presentation/precondition.ts`, `src/routes/Today.tsx`, `tests/unplaced.test.tsx`.

### G — ubu-devshell, `0dc9a2b`

Old live steps 5 and 6 and the colour-table copy-back are retired with their evidence recorded. Four capture facts remain beside new step 7. Preconditions, reset wording, capture copy-back, and preview/Plan reading are corrected; there are 12 steps and 7 copy-back items. A tenth harness seed stages an already-matching captured Dynamic placement. Runner scenario 23 proves the capture-only case and checks shared UI wording against HTTP values; the colour-completion scenario checks retained exclusion. The operator-requested one-job build default and sequential Cargo workflow are included.

ACCEPTANCE.md: “Anything assertable over HTTP belongs in `check-ui-contract.mjs`, as a scenario, not here.” CONTRACT_CHECK.md: “The boundary: anything assertable over HTTP is a scenario here, never a manual step there.”

Files: `docs/ACCEPTANCE.md`, `docs/BUILD_ENV.md`, `docs/CONTRACT_CHECK.md`, `docs/LIVE_REHEARSAL.md`, `scripts/acceptance.mjs`, `scripts/check-ui-contract.mjs`, `scripts/env.sh`.

### H — ubu-devshell, the commit carrying this file

Files: `pinned-revs.toml` and `docs/P1B-60_PINS.md`. Seven upstream pins move;
there is no `ubu_devshell` key. The same ACCEPTANCE and CONTRACT_CHECK boundary
quoted for G governs this verification: “Anything assertable over HTTP belongs
in `check-ui-contract.mjs`, as a scenario, not here.” Mock HTTP checks are
automated, and operator acceptance is left to the operator.

## Tests and diagnostics

All listed suites passed. Unit and integration suites were run with network
sockets denied; the explicitly exempt runner and staging harness used isolated
mock stores on loopback. No Google, Ollama, operator store or operator
acceptance was used. No dependency or route was added.

| Repository / check | Before | After |
|---|---:|---:|
| schemas Rust tests | 2 | 2 |
| schemas valid / invalid fixtures | 86 / 99 | 87 / 101 |
| core tests | 157 | 158 |
| store tests | 108 | 108 |
| planning-kernel tests | 83 | 83 |
| github-adapter tests | 23 | 23 |
| orchestrator tests | 510 | 513 |
| UI tests | 147 | 156 |
| OpenAPI paths | 56 | 56 |
| endpoint path constants | 43 | 43 |
| runner scenarios | 22 | 23 |
| runner requests | 433 | 444 |
| harness seeds | 9 | 10 |

Runner/harness before counts come from the P1B-59 verification record; suite
before counts were measured on the starting revisions. Section E passed 150
UI tests before F raised the count to 156. TypeScript and production builds
passed at both UI commits. Schema validation, TypeScript generation/casing and
the schema bundler test passed. OpenAPI regenerates byte-identical; comparison
against the prior document finds only `matching_placements` and its required
entry in CalendarProjectionPreviewResponse.

Clippy ran with `--all-targets`. Unique warnings are deduplicated by diagnostic
code and message within each repository's Cargo JSON output, not counted once
per repeated target:

| Rust repository | Before | After |
|---|---:|---:|
| `ubu-schemas` | 0 | 0 |
| `ubu-core` | 2 | 2 |
| `ubu-store` | 0 | 0 |
| `ubu-planning-kernel` | 0 | 0 |
| `ubu-github-adapter` | 0 | 0 |
| `ubu-orchestrator` | 8 | 8 |

`check-all.sh`: **exit 0**. Its pre-existing fixture-demo quarantine remains
explicit and was not run; it is not reported as a pass. No test was removed or
changed in C. No existing behavior test needed an exception.

```text
RESULT: 23 of 23 scenarios passed, 0 failed, 2 skipped, 444 requests, all to 127.0.0.1
staged and checked 10 seed(s) for 1 step(s); not waiting for the app
```

The runner's two live scenarios were skipped, not passed. Shared pure UI
wording is tested by the runner; actual React rendering is covered by the UI
suite. The harness only stages the new condition: it applies its staged Plan
to its throwaway mock calendar. The runner separately proves capture alone
can yield a matching placement without an intervening approval.

### Retained-history evidence

The in-process HTTP test completes a synthetic event through calendar capture,
regenerates and applies the remaining placement, then previews again:

```json
{"desired_events":2,"matching_placements":1,"operations":[],"retained":1}
```

The runner independently regenerates after a calendar completion and asserts
one matching Static placement, no operations, and the completed event still
present as retained history. Retained history does not increase the count.

### Remaining fixture coverage gaps

Among canonical core object types, **AutomationWorker, Compartment,
ExternalEvent, Identity, Relationship and WorkItem** have no whole canonical
fixture round-trip test. They were not changed. Nested helper types are
covered only as exercised by parent fixtures; this is not a claim of exhaustive
coverage of every exported Rust type.

The new UniverseState fixture normalizes fractional timestamp spelling, set
order and numeric representation so the whole JSON value round-trips exactly.
Both summary strings and all four populated collections participate. This
closes the two summary-type mismatches, not every possible validation mismatch:
core still omits empty collections that the schema requires, and an ordinary
Rust String does not enforce source_summary's minLength. Those existing
behavioral differences were not changed by this schema/test-only section.

## OOM interruption and build configuration

The operator requested this additional fix after the crash. The host journal
records systemd-oomd killing the terminal scope at Oct 02 22:32:05, after
68.63% memory pressure exceeded the 50% threshold for over 20 seconds; the
scope held 7.2 GB. This confirms a memory-pressure kill. The journal does not
identify a single compiler's historical RSS as its sole cause.

Two Cargo invocations, orchestrator and store, were overlapping with four jobs
each. Their combined compiler/linker work is a likely contributor. Section G
changes the central env.sh default from four to **one job per invocation** and
documents **sequential Cargo invocations across repositories**. An explicit
operator override remains available. No profile, debug setting or test-thread
limit changed; one large compiler process can still consume substantial memory.

Shell syntax passed, an unset job variable became 1, and an explicit override
of 2 remained 2. The active Cargo process was verified to have
`CARGO_BUILD_JOBS=1`. The interrupted checks were rerun successfully under this
configuration; the final suites and check-all passed. Build outputs remained
inside the authorized workspace using the existing UBU_TARGET_ROOT mechanism;
no machine-specific path was committed.

## Qualifications and corrections

- The ticket's repository table has stale section letters; the detailed A–H
  headings were followed.
- Zero updates alone does not prove all Dynamic work was placed or already
  matches. Creates, unplaced work and retained history must be distinguished.
  The rehearsal now names the matching clause beside the Plan's Skeleton and
  Not in this Plan readings instead of promising an inference from zero alone.
- Preview compares UbU's applied snapshot. It makes no fresh Google read.
- Generated UI canonical types were refreshed with the two summary fields as
  well as the one-property OpenAPI copy.
- The initial orchestrator baseline encountered an existing external target
  symlink outside the authorized build area, then the overlapping rebuild was
  interrupted by the memory-pressure kill. The supported workspace target root
  and one-job sequential workflow resolved those execution issues. They are
  not reported as successful baseline runs.
- Read-only repositories remain at their starting revisions. Protected local
  acceptance artifacts were not opened or committed; outgoing paths and diffs
  were audited without publishing their names or contents.

## show-revs.sh

Exit 0 after all upstream branches were pushed and the seven pins updated:

```text
Recorded R_* baseline: post-O20 R_orchestrator, post-GA2 R_adapter, post-S17 R_schemas, post-C12 R_core, post-ST7 R_store

REPO                     BRANCH         HEAD      SIG                 TREE   PINNED    ORIGIN  STATUS
----                     ------         ----      ---                 ----   ------    ------  ------
ubu_design               main           f7c4a1db  signed-ok           clean  f7c4a1db  yes     OK
ubu_schemas              p1b-60-what-already-matches 6082ad50  unsigned            clean  6082ad50  yes     OK
ubu_core                 p1b-60-what-already-matches 8ffc9362  unsigned            clean  8ffc9362  yes     OK
ubu_store                p1b-60-what-already-matches a6ae9b82  unsigned            clean  a6ae9b82  yes     OK
ubu_github_adapter       p1b-60-what-already-matches 999e0e2f  unsigned            clean  999e0e2f  yes     OK
ubu_planning_kernel      p1b-60-what-already-matches 07286728  unsigned            clean  07286728  yes     OK
ubu_orchestrator         p1b-60-what-already-matches 84c00c55  unsigned            clean  84c00c55  yes     OK
ubu_ui                   p1b-60-what-already-matches 78eab141  unsigned            clean  78eab141  yes     OK
ubu_brand                main           faf2005a  signed-ok           clean  faf2005a  yes     OK
```

## Operator acceptance

**Not performed.** Follow [LIVE_REHEARSAL.md](LIVE_REHEARSAL.md) from its first
step to its last. Old steps 5 and 6 are retired; later steps are renumbered.
Capture is now **7**, Plan **8**, preview **9**, approval **10**, UniverseState
**11**, and stop **12**. The document has **12 steps and 7 copy-back items**.
The capture list behind “The N events with no colour” is explicitly not wanted
in the copy-back. Predictions remain those in the rehearsal; this report makes
no claim about a live run.
