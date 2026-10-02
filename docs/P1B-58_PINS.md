# P1B-58 pins

P1B-58 changes three repositories. Two pins move: `ubu_orchestrator` and
`ubu_ui`. `ubu-devshell` has no key in `pinned-revs.toml` and is given none: a
commit cannot name its own revision.

| Order | Repository | Sections | Pushed revision |
| --- | --- | --- | --- |
| 1 | `ubu-orchestrator` | A | `a7e275517dae526e2dc6fe1dfb6a32f04b093e06` |
| 2 | `ubu-ui` | B, C | `da3afa712c62d2f81af1a96c8780480e8c2f78e8` |
| 3 | `ubu-devshell` | D, E | the commit that carries this file |

All are on the branch `p1b-58-universe-state-on-screen`, cut from `main` after
P1B-57 was merged. None is merged to `main`. Nothing was force-pushed. Each
lettered section is one commit.

No kernel change, no `ubu-core` change and no pin chain. No lockfile moved and
no dependency was added.

**This ticket adds a route, so two counts that had stood still both rose.**

| | before | after |
|---|---|---|
| OpenAPI paths | 55 | 56 |
| OpenAPI schemas | 180 | 183 |
| `endpoints.ts` path constants | 42 | 43 |
| `ubu-orchestrator` tests | 493 | 504 |
| `ubu-ui` tests | 132 | 144 |
| runner scenarios | 21 | 22 |
| runner requests | 391 | 416 |
| harness seeds | 7 | 8 |

The one new path is `/universe-state`, with `GET` and `PATCH`. The document
regenerates byte-identical from the code, and the diff against the P1B-57
document is additions only. No existing route gained a response field.

## What the two changes are

- **The UniverseState has a route and a screen.** A Task can ask that
  something be true before UbU will plan it, and UbU has evaluated that for a
  long time. Nothing let the operator see what it was evaluated against.
  `GET /universe-state` returns it, through the reader the planner uses.
  `PATCH /universe-state` takes a list of `ubu-core` `UniverseMutation`s and
  applies them through the two functions a completed Task's effects go
  through. The screen “UniverseState” shows the four collections and edits
  three of them. A blocked Task on Today links to it. The contract is
  `ubu-orchestrator/docs/UNIVERSE_STATE.md`, and the screen is in
  `ubu-ui/docs/NAVIGATION.md`.
- **The Calendar preview says how much it proposes.** One line above the
  operation cards: “Operations proposed: N. Create N, update N, delete N.”
  Step 11 of the live rehearsal copies back that line.

## What the route and the screen do not do

- **No precondition is authored on the screen.** The Task routes accept
  `preconditions` and `effects`: both are in the allow-list in
  `ubu-orchestrator/docs/TASK_CAPTURE.md`. The app sends neither.
- **No per-fact provenance.** Nothing records that one fact was measured and
  another asserted. That needs a `ubu-core` field.
- **A number cannot be set outright or removed.** The seven operations have
  an increment and a decrement and nothing else for a number. The screen sends
  a difference. For some fractions the result is not the value asked for, and
  the screen says so when that happens.
- **Event markers are read-only on the screen.**
- **The labels are not normalised.** An edit keeps the Compartment label of
  the row it supersedes. A row the route creates is `user-capture`. Bootstrap
  writes `bootstrap`, and a completion writes its Task's label.
- **Bootstrap's keys carry their collection twice.** It stores a fact under
  the key `facts.operator.work_style` inside `facts`, so the target that
  addresses it is `facts.facts.operator.work_style`. Reported, not changed.

## `scripts/show-revs.sh`

Run with the new pins in place, after both branches were pushed and before
this commit. Exit status 0, and every pin is on `origin`.

```text
Recorded R_* baseline: post-O20 R_orchestrator, post-GA2 R_adapter, post-S17 R_schemas, post-C12 R_core, post-ST7 R_store

REPO                     BRANCH         HEAD      SIG                 TREE   PINNED    ORIGIN  STATUS
----                     ------         ----      ---                 ----   ------    ------  ------
ubu_design               main           f7c4a1db  signed-ok           clean  f7c4a1db  yes     OK
ubu_schemas              main           4974166a  signed-ok           clean  4974166a  yes     OK
ubu_core                 main           c77c0a2d  signed-ok           clean  c77c0a2d  yes     OK
ubu_store                main           7b24cd82  signed-ok           clean  7b24cd82  yes     OK
ubu_github_adapter       main           4c7e3b6d  signed-ok           clean  4c7e3b6d  yes     OK
ubu_planning_kernel      main           ed742967  signed-ok           clean  ed742967  yes     OK
ubu_orchestrator         p1b-58-universe-state-on-screen a7e27551  signed-ok           clean  a7e27551  yes     OK
ubu_ui                   p1b-58-universe-state-on-screen da3afa71  signed-ok           clean  da3afa71  yes     OK
ubu_brand                main           faf2005a  signed-ok           clean  faf2005a  yes     OK
```

## Left open, on purpose

- `calendar_reconcile.rs` still says of a stamped event that it “was not
  created by UbU”. Telling the two apart means giving the stamp set to
  `classify`, which is pure and takes none.
- Numeric predicates and per-fact provenance: a `ubu-core` and `ubu-schemas`
  change, and the first six-repository chain since P1B-37a.
- The precondition advisor, which needs both.
- The Compartment labels of the `UniverseState` row, and the first-run
  Device's empty allowlist.
- An insert that Google answers with 409 becomes a patch, and the event stays
  unstamped.
- The editable log: a colour change on a captured commitment is still
  `capture_owned_drift`.
- The two coverage decisions.

The pinned revisions are tested and have not been accepted by the operator.
What to run is `scripts/check-all.sh`, `scripts/check-ui-contract.sh`, then
`scripts/acceptance.sh`, then [the live rehearsal](LIVE_REHEARSAL.md).
