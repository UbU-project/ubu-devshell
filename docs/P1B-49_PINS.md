# P1B-49 pins

P1B-49 changes three repositories. Two pins move, `ubu_orchestrator` and
`ubu_ui`. `ubu_store`'s pin already named `7b24cd8`; what changed is that
`ubu-orchestrator`'s `Cargo.toml` now names the same revision.

| Order | Repository | Sections | Pushed revision |
| --- | --- | --- | --- |
| 1 | `ubu-orchestrator` | B | `18946b14328894d7b3da8861a7df4d5dba6934a6` |
| 2 | `ubu-ui` | C | `335fbcb469fac7cee88a7803280274f4106911d6` |
| 3 | `ubu-devshell` | A, D | the commit that carries this file |

All are on the branch `p1b-49-acceptance`. None is merged to `main`.

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
ubu_orchestrator         p1b-49-acceptance 18946b14  signed-ok           clean  18946b14  OK
ubu_ui                   p1b-49-acceptance 335fbcb4  signed-ok           clean  335fbcb4  OK
ubu_brand                main           faf2005a  signed-ok           clean  faf2005a  OK
```

The pinned revisions are tested and have not been accepted by the operator.
The acceptance steps they need are staged by `scripts/acceptance.sh`.
