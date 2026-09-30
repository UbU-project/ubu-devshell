# P1B-50 pins

P1B-50 changes three repositories. Two pins move, `ubu_orchestrator` and
`ubu_ui`. `ubu-devshell` does not pin itself.

| Order | Repository | Sections | Pushed revision |
| --- | --- | --- | --- |
| 1 | `ubu-orchestrator` | B | `4e121560a6733dcd5bb1f84e6e918aac4b52ef0a` |
| 2 | `ubu-ui` | A, C | `7c729947b47989195f66f8eb5ef11091a0737cbc` |
| 3 | `ubu-devshell` | D, E | the commit that carries this file |

All are on the branch `p1b-50-description-and-time`. None is merged to `main`.

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
ubu_orchestrator         p1b-50-description-and-time 4e121560  signed-ok           clean  4e121560  OK
ubu_ui                   p1b-50-description-and-time 7c729947  signed-ok           clean  7c729947  OK
ubu_brand                main           faf2005a  signed-ok           clean  faf2005a  OK
```

The pinned revisions are tested and have not been accepted by the operator.
The seven acceptance steps they need are staged by `scripts/acceptance.sh`.
