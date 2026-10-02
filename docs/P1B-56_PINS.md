# P1B-56 pins

P1B-56 changes four repositories. Three pins move: `ubu_planning_kernel`,
`ubu_orchestrator` and `ubu_ui`. `ubu-devshell` does not pin itself: it is not
in `repos.toml`, and a commit cannot name its own revision.

| Order | Repository | Sections | Pushed revision |
| --- | --- | --- | --- |
| 1 | `ubu-planning-kernel` | A, and A again | `ed742967f0d8cb60b5088fa0959d81a0d42c6ed6` |
| 2 | `ubu-orchestrator` | B, C | `a6a82413e3ad6851cc7cab2ac4d20920667732f4` |
| 3 | `ubu-ui` | D | `f8f7ae7d8547793121c0fe224d799b542b0d6983` |
| 4 | `ubu-devshell` | E, F, G | the commit that carries this file |

All are on the branch `p1b-56-risk-says-what-it-means`, cut from `main` after
P1B-55 was merged. None is merged to `main`. Nothing was force-pushed.

This is the kernel's first change of its own in Phase 1b. It had stood at a
P1B-37a revision, pinned to the published Container core revision, for
eighteen tickets. Only `ubu-orchestrator/Cargo.toml` pins the kernel, so this
is a three-repository pin and not the six-repository `ubu-core` chain. The
orchestrator's `Cargo.lock` moves in the two `ubu_planning_*` source lines and
nowhere else.

**Section A has two commits.** The first, `9cb667d`, is the one-line guard, its
two tests and the changelog, and it was pushed so that section B could name
it. The kernel's `CONTRACT.md` was then found to say, in so many words, that
the first slice "does not truncate the feasibility or continuation walks". The
ticket had called the unscoped walk an oversight. It was a recorded choice.
The second commit, `ed74296`, corrects the contract text and changes no code.
The orchestrator pins that second commit, the kernel's head.

## What the three changes are

- **The kernel.** `coverage_estimate` is labelled `reactive_horizon`. Its
  boundaries were always limited to that span. Its continuation verdict was
  not: a commitment anywhere in the Plan could fail it. The verdict now covers
  the same span. Feasibility, the rollout draws and every golden fixture are
  unchanged.
- **The orchestrator.** An affect observation that the orchestrator
  manufactured, because no Snapshot was taken, has a margin of exactly zero by
  arithmetic. The reports no longer read that zero as a measurement: the three
  findings that read it are not raised, the post-Plan state is `neutral`, and
  the first revision suggestion says the figures are a stand-in.
- **The UI.** The Plan-quality panel reads "not recorded" for the three affect
  rows of such a Plan.

On the rehearsal week, which reported high risk from four findings on every
walk until now, the risk report is medium, from `unplaced_work` alone.

## `scripts/show-revs.sh`

Run with the new pins in place, after all three branches were pushed and
before this commit. Exit status 0, and every pin is on `origin`.

```text
Recorded R_* baseline: post-O20 R_orchestrator, post-GA2 R_adapter, post-S17 R_schemas, post-C12 R_core, post-ST7 R_store

REPO                     BRANCH         HEAD      SIG                 TREE   PINNED    ORIGIN  STATUS
----                     ------         ----      ---                 ----   ------    ------  ------
ubu_design               main           f7c4a1db  signed-ok           clean  f7c4a1db  yes     OK
ubu_schemas              main           4974166a  signed-ok           clean  4974166a  yes     OK
ubu_core                 main           c77c0a2d  signed-ok           clean  c77c0a2d  yes     OK
ubu_store                main           7b24cd82  signed-ok           clean  7b24cd82  yes     OK
ubu_github_adapter       main           4c7e3b6d  signed-ok           clean  4c7e3b6d  yes     OK
ubu_planning_kernel      p1b-56-risk-says-what-it-means ed742967  signed-ok           clean  ed742967  yes     OK
ubu_orchestrator         p1b-56-risk-says-what-it-means a6a82413  signed-ok           clean  a6a82413  yes     OK
ubu_ui                   p1b-56-risk-says-what-it-means f8f7ae7d  signed-ok           clean  f8f7ae7d  yes     OK
ubu_brand                main           faf2005a  signed-ok           clean  faf2005a  yes     OK
```

## Left open, on purpose

- **The two decisions the ticket leaves to the operator.** Whether a
  displaced commitment breaks a Plan, and whether the reactive horizon stays
  one hour. Either answer is one line in `planning_service.rs` and a sentence
  in the finding's detail.
- **UbU's own events are not marked on the calendar.** A leftover from an
  earlier run cannot be told from one of the operator's, so the live rehearsal
  resets the calendar by copying it afresh. The mark is the next ticket.
- **`affect_margin` is still a required number.** With no Snapshot it is the
  stand-in's `0.0`; the UI says "not recorded" in its place.
- **“Feedback latency” is printed with the wrong unit.** The orchestrator
  sends seconds and the Plan-quality panel prints “min” after the number.
  Found in this ticket and not fixed in it.
- A change from one colour to another on a captured commitment is still
  `capture_owned_drift`. Later placements can fall on odd seconds. Frozen
  events accumulate. `recalculate` and `GET /calendar/current` carry no
  `unplaced_tasks`. `blocked_tasks` carries no title.

The pinned revisions are tested and have not been accepted by the operator.
What to run is `scripts/check-all.sh`, `scripts/check-ui-contract.sh`, then
`scripts/acceptance.sh`, then [the live rehearsal](LIVE_REHEARSAL.md).
