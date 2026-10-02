# P1B-54 pins

P1B-54 changes three repositories. Two pins move, `ubu_orchestrator` and
`ubu_ui`. `ubu-devshell` does not pin itself.

| Order | Repository | Sections | Pushed revision |
| --- | --- | --- | --- |
| 1 | `ubu-orchestrator` | C, B | `38eb28ea2d72fc30e1df6d80e466c3680eb01958` |
| 2 | `ubu-ui` | A, D, C, B | `019c578faf602b1fd3974e37dc58ddf6b5fe28fe` |
| 3 | `ubu-devshell` | F, E, G | the commit that carries this file |

All are on the branch `p1b-54-readable`, cut from `main`. None is merged to
`main`. Nothing was force-pushed. Each lettered section is one commit in each
repository it touches.

Two things about the order and the letters:

- **Section B was committed after C** in the orchestrator, and last in
  `ubu-ui`. B waited on a decision from the operator, below, and the sections
  that did not depend on it were done first.
- **`ubu-ui` has a section C commit**, which the ticket did not list. It
  changes one test fixture and adds two tests: the fixture stood for the
  orchestrator's default palette and still said `location`. No source file
  changes in it.

`ubu-devshell`'s section E commit also carries what sections A and C made
necessary in the runner, the acceptance harness and the live rehearsal: they
asserted and described the old palette and the wrong times.

## Judgment call 1: what the kernel does

The ticket asked what the kernel does with two overlapping capacity-occupying
Static anchors, and said to stop if it refuses. **It refuses**: no candidates,
and `static anchor collides with scheduled task`. A kernel test pins that
message.

The orchestrator already had the way round that the ticket pointed at.
`routine_occurrence_overlaps_commitment` works because `committed_clusters`
hands the kernel one busy span for an overlapping group and puts each Task
back at its own window. The operator was asked, and chose to extend that to
every overlapping pair of Statics. So the kernel is unchanged, it is never
handed two anchors that overlap, and the ticket's wording holds: the collision
is reported, both Tasks keep their windows, the whole span is busy, and the
kernel runs. See `ubu-orchestrator/docs/STATIC_CONTAINMENT.md`.

One thing went further than the ticket named. `static_task_collision` had a
second source: a Static Task whose Static prerequisite ends after it starts.
That also meant no Plan. The edge is now dropped with the same warning.

## `scripts/show-revs.sh`

From P1B-54 it also checks that each pinned commit **is on a branch of
`origin`**, in a new column, `ORIGIN`. It reads the remote-tracking refs, so
it contacts no network: it knows what `origin` held at the last push or
fetch. P1B-51 and P1B-53 each pinned a commit while its branch was unpushed,
and the script exited 0 both times because it compared the pin with the local
checkout only.

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
ubu_orchestrator         p1b-54-readable 38eb28ea  signed-ok           clean  38eb28ea  yes     OK
ubu_ui                   p1b-54-readable 019c578f  signed-ok           clean  019c578f  yes     OK
ubu_brand                main           faf2005a  signed-ok           clean  faf2005a  yes     OK
```

A pin that is not on `origin` is `UNPUSHED`, and the script exits 1. This is
the same run made before the two branches were pushed, with a pin file naming
the heads they had then:

```text
ubu_orchestrator         p1b-54-readable b97e502d  signed-ok           clean  b97e502d  NO      UNPUSHED
ubu_ui                   p1b-54-readable 446202fb  signed-ok           clean  446202fb  NO      UNPUSHED

UNPUSHED: the pin for ubu_orchestrator, b97e502d77b472b6927c43a94a4bdfda524a5750, is on no branch of origin as this checkout last saw it.
UNPUSHED: the pin for ubu_ui, 446202fb4ca51722fc67bd12a9f5cd0fcc5a9842, is on no branch of origin as this checkout last saw it.
A pin that names a commit origin does not have is a pin nobody else can build.
Push the branch that holds it, or run git fetch if it was pushed from elsewhere, then run this again.

WARN: one or more repos have MISSING, MISMATCH, UNPUSHED, or ERROR status.
```

## `check-all.sh` and `test-all.sh`

Both exit 0. Their last stage, the fixture demo, is quarantined behind
`UBU_RUN_FIXTURE_DEMO=1`; see [fixture-demo.md](fixture-demo.md). With the
flag set the stage runs and fails as it did before, and the script exits 101.

`check-all.sh` begins with `show-revs.sh`, so it passes only when the pins
match the checkouts and are on `origin`.

## Left open, on purpose

- **Later placements can fall on odd seconds.** Only the Plan's start is on a
  whole minute. A stochastic duration still gives a ragged boundary, and each
  one is a calendar update on the next approve. Today now shows the seconds of
  such a placement, so it can be seen.
- **Frozen calendar events accumulate in the applied record.** Every
  completed Task's event stays there and is compared on every diff. Correct
  for now, and unbounded over a year.
- **`recalculate` and `GET /calendar/current` carry no `unplaced_tasks` and no
  `blocked_tasks`**, so “Not in this Plan” is empty after a recalculation and
  on a reload.
- **A blocked Task is shown by its id.** `blocked_tasks` carries no title.
- **A store reset makes UbU's own events foreign.** Asserted in the runner's
  scenario 20 and not fixed; see [CONTRACT_CHECK.md](CONTRACT_CHECK.md).

The pinned revisions are tested and have not been accepted by the operator.
What to run is `scripts/check-all.sh`, `scripts/check-ui-contract.sh`, then
`scripts/acceptance.sh`, then [the live rehearsal](LIVE_REHEARSAL.md).
