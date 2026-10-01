# P1B-53 pins

P1B-53 changes three repositories. Two pins move, `ubu_orchestrator` and
`ubu_ui`. `ubu-devshell` does not pin itself.

| Order | Repository | Sections | Pushed revision |
| --- | --- | --- | --- |
| 1 | `ubu-orchestrator` | A, B, C, D, E, and D again | `9dd15adce018c13e43dfc2d04111080a2f6dce85` |
| 2 | `ubu-ui` | E | `732ebd2c9808da03004a946345fbb0fdb67fa9c7` |
| 3 | `ubu-devshell` | F, G, H, I, and I again | the commit that carries this file |

All are on the branch `p1b-53-decisions`. None is merged to `main`.

**Section D has two commits, and so does I.** The orchestrator's sections A
to E were pushed first, as the ticket orders. The rehearsal then showed that
rounding the Plan's start to a whole minute did not deliver what section D
promised: an unchanged store planned twice in one minute could still come
back as two different Plans, because the planner's randomness followed the
request id. That was fixed in a second section D commit, `9dd15ad`, and the
pin was moved to it in a second section I commit, which also makes the
rehearsal read the minute from the clock rather than infer it from the
result. Nothing was force-pushed.

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
ubu_orchestrator         p1b-53-decisions 9dd15adc  signed-ok           clean  9dd15adc  OK
ubu_ui                   p1b-53-decisions 732ebd2c  signed-ok           clean  732ebd2c  OK
ubu_brand                main           faf2005a  signed-ok           clean  faf2005a  OK
```

The pinned revisions are tested and have not been accepted by the operator.
What to run is `scripts/check-ui-contract.sh`, then `scripts/acceptance.sh`,
then [the live rehearsal](LIVE_REHEARSAL.md). The six decisions this ticket
answers are in [P1B-53: the six decisions](P1B-53_DECISIONS.md).
