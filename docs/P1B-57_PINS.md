# P1B-57 pins

P1B-57 changes three repositories. Two pins move: `ubu_orchestrator` and
`ubu_ui`. `ubu-devshell` has no key in `pinned-revs.toml` and is given none: a
commit cannot name its own revision.

| Order | Repository | Sections | Pushed revision |
| --- | --- | --- | --- |
| 1 | `ubu-orchestrator` | A, B, C, D | `6adb91cac850d37499a4e8566a855798cc29f8ce` |
| 2 | `ubu-ui` | D | `da8a9987bdf12c6cc634557407d274b8abe1929b` |
| 3 | `ubu-devshell` | E, F | the commit that carries this file |

All are on the branch `p1b-57-ubu-knows-its-own-events`, cut from `main` after
P1B-56 was merged. None is merged to `main`. Nothing was force-pushed. Each
lettered section is one commit in each repository it touches. Section D is in
two repositories: the UI's formatter, and one line in the orchestrator that
states the unit.

No kernel change, no `ubu-core` change and no pin chain. No lockfile moved.
The OpenAPI document regenerates byte-identical at 55 paths, and
`fixtures/calendar/expected-event-body.json` is unchanged.

## What the two changes are

- **UbU knows its own events.** An insert writes
  `extendedProperties.private.ubu_task`, the Task the event was minted for. A
  PATCH never does. A list is read back for the ids whose stamp names their
  own Task. An event that reaches capture as foreign and carries that stamp is
  UbU's echo from a store it no longer has: it becomes no Task, counts as
  skipped, and is reported once as `capture_stale_export`. The contract is
  `ubu-orchestrator/docs/CAPTURE_PROVENANCE.md`.
- **A duration is said in its own unit.** `feedback_latency` is planning
  seconds. The Plan-quality panel printed it with "min". It now reads as a
  duration.

## What the stamp does not do

- **Events from before P1B-57 carry none.** They are still indistinguishable
  from the operator's own, so the live rehearsal keeps its calendar reset.
- **A copy made by another tool may drop private properties.** A copied
  leftover is then unstamped, and is captured.
- **Reconciliation does not read the stamp.** A stale export is still listed
  there as `foreign`, under a sentence that says it was not created by UbU.

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
ubu_orchestrator         p1b-57-ubu-knows-its-own-events 6adb91ca  signed-ok           clean  6adb91ca  yes     OK
ubu_ui                   p1b-57-ubu-knows-its-own-events da8a9987  signed-ok           clean  da8a9987  yes     OK
ubu_brand                main           faf2005a  signed-ok           clean  faf2005a  yes     OK
```

## Left open, on purpose

- The two coverage decisions: whether a displaced commitment breaks a Plan,
  and whether the reactive horizon stays one hour.
- `affect_margin` is still a required number.
- A change from one colour to another on a captured commitment is still
  `capture_owned_drift`, and the log is not editable.
- The precondition advisor.
- Later placements can fall on odd seconds. Frozen events accumulate.
  `recalculate` and `GET /calendar/current` carry no `unplaced_tasks`.
  `blocked_tasks` carries no title.

The pinned revisions are tested and have not been accepted by the operator.
What to run is `scripts/check-all.sh`, `scripts/check-ui-contract.sh`, then
`scripts/acceptance.sh`, then [the live rehearsal](LIVE_REHEARSAL.md).
