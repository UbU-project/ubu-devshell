# P1B-52 pins

P1B-52 changes three repositories. Two pins move, `ubu_orchestrator` and
`ubu_ui`. `ubu-devshell` does not pin itself.

P1B-51 was fast-forwarded to `main` in all three repositories before this
ticket began. Its `ubu-ui` branch was on the remote and nothing was lost.

| Order | Repository | Sections | Pushed revision |
| --- | --- | --- | --- |
| 1 | `ubu-ui` | A, B, C | `34c63f8e9bcb8253c396006c1b1c2c6f73078d71` |
| 2 | `ubu-orchestrator` | D | `e39393917944decac2f8b2497a97e4140b413a08` |
| 3 | `ubu-devshell` | E, F, G | the commit that carries this file |

All are on the branch `p1b-52-legible`. None is merged to `main`.

## `scripts/show-revs.sh`

Run with the new pins in place, before the commit. Exit status 0.

```text
Recorded R_* baseline: post-O20 R_orchestrator, post-GA2 R_adapter, post-S17 R_schemas, post-C12 R_core, post-ST7 R_store

REPO                     BRANCH         HEAD      SIG                 TREE   PINNED    STATUS
----                     ------         ----      ---                 ----   ------    ------
ubu_design               main           f7c4a1db  signed-ok           clean  f7c4a1db  OK
ubu_schemas              main           4974166a  signed-ok           clean  4974166a  OK
ubu_core                 main           c77c0a2d  signed-ok           clean  c77c0a2d  OK
ubu_store                main           7b24cd82  signed-ok           clean  7b24cd82  OK
ubu_github_adapter       main           4c7e3b6d  signed-ok           clean  4c7e3b6d  OK
ubu_planning_kernel      main           84b6d0d9  signed-ok           clean  84b6d0d9  OK
ubu_orchestrator         p1b-52-legible e3939391  signed-ok           clean  e3939391  OK
ubu_ui                   p1b-52-legible 34c63f8e  signed-ok           clean  34c63f8e  OK
ubu_brand                main           faf2005a  signed-ok           clean  faf2005a  OK
```

The pinned revisions are tested and have not been accepted by the operator.
The eight acceptance steps are staged by `scripts/acceptance.sh`, and the
live rehearsal is started with `scripts/run-live.sh`.
