# P1B-55 pins

P1B-55 changes three repositories. Two pins move, `ubu_orchestrator` and
`ubu_ui`. `ubu-devshell` does not pin itself.

| Order | Repository | Sections | Pushed revision |
| --- | --- | --- | --- |
| 1 | `ubu-orchestrator` | A, B, D | `3b77b1d90ff0b18491d8d2aeaf02d06ff7fc0fab` |
| 2 | `ubu-ui` | C | `5ad37e9aa6ae4cc4d7ea11ea9a65aa6c4e41a99c` |
| 3 | `ubu-devshell` | D, E, F | the commit that carries this file |

All are on the branch `p1b-55-colour-decides`, cut from `main` after P1B-54
was merged. None is merged to `main`. Nothing was force-pushed. Each lettered
section is one commit in each repository it touches.

**`ubu-orchestrator` has a section D commit**, which the ticket did not list.
Section D's scenario seeds an event of no length and an all-day event, and
the mock calendar fixture could hold neither. The commit lets it. It is a
test affordance read from an environment variable: no route, no OpenAPI
property.

## What the code decided that the ticket left open

The rule itself is in [COLOUR_CONVENTION.md](COLOUR_CONVENTION.md). Four
things in it were not in the ticket, or were not as the ticket assumed:

1. **A captured event is not foreign the second time.** Capture records it in
   the applied record, so later captures treat it as UbU's own and it never
   reaches `plan_capture` again. The ticket placed the flip between Static and
   Dynamic in the admission loop, which such an event does not reach. It is
   done in the capture path instead: an event of a captured Task that has
   gained or lost its colour since UbU last saw it is planned again by the
   same rule.
2. **So the two readings of a colour are told apart by where the Task came
   from.** On an event UbU exported for a Task made in UbU, a colour means
   done. On the event of a Task that came from the calendar, a colour means a
   commitment. Gesture detection needed no change: it already left captured
   Tasks alone. But the operator cannot tell the two apart on a phone.
   Colouring a calendar to-do that UbU scheduled pins it. It does not
   complete it. The preview says which is which, and the live rehearsal says
   so before capture.
3. **An event UbU cannot own stays Static whatever its colour.** An instance
   of a recurring event cannot be written to, so it cannot be moved. An
   uncoloured one is not made Dynamic.
4. **A Static Task with no category does not survive a store reset as a
   commitment.** It is exported with no colour, so a new store captures it as
   Dynamic work. Scenario 20 asserts it.

## `scripts/show-revs.sh`

Run with the new pins in place, after both branches were pushed and before
this commit. Exit status 0.

```text
Recorded R_* baseline: post-O20 R_orchestrator, post-GA2 R_adapter, post-S17 R_schemas, post-C12 R_core, post-ST7 R_store

REPO                     BRANCH         HEAD      SIG                 TREE   PINNED    ORIGIN  STATUS
----                     ------         ----      ---                 ----   ------    ------  ------
ubu_design               main           f7c4a1db  signed-ok           clean  f7c4a1db  yes     OK
ubu_schemas              main           4974166a  signed-ok           clean  4974166a  yes     OK
ubu_core                 main           c77c0a2d  signed-ok           clean  c77c0a2d  yes     OK
ubu_store                main           7b24cd82  signed-ok           clean  7b24cd82  yes     OK
ubu_github_adapter       main           4c7e3b6d  signed-ok           clean  4c7e3b6d  yes     OK
ubu_planning_kernel      main           84b6d0d9  signed-ok           clean  84b6d0d9  yes     OK
ubu_orchestrator         p1b-55-colour-decides 3b77b1d9  signed-ok           clean  3b77b1d9  yes     OK
ubu_ui                   p1b-55-colour-decides 5ad37e9a  signed-ok           clean  5ad37e9a  yes     OK
ubu_brand                main           faf2005a  signed-ok           clean  faf2005a  yes     OK
```

## Left open, on purpose

- **Why every Plan is high risk.** `low_coverage`, `affect_margin` 0.000 and
  `post_plan_depletion` on every run. Not examined here.
- **A change from one colour to another on a captured commitment is not
  read.** It is `capture_owned_drift`, as before, and the next approve writes
  the Task's own colour back.
- **Nothing converts a store captured under the old rule.** Capture into a
  fresh store.
- **Later placements can fall on odd seconds**, and **frozen events
  accumulate** in the applied record.
- **`recalculate` and `GET /calendar/current` carry no `unplaced_tasks`**, so
  “Not in this Plan” is empty after a recalculation and on a reload. That
  matters more now that the list will be long.
- **`blocked_tasks` carries no title.**

The pinned revisions are tested and have not been accepted by the operator.
What to run is `scripts/check-all.sh`, `scripts/check-ui-contract.sh`, then
`scripts/acceptance.sh`, then [the live rehearsal](LIVE_REHEARSAL.md).
