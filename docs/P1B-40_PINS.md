# P1B-40 pins

P1B-40 changes two repositories, `ubu-ui` and `ubu-devshell`. One pin moves:
`ubu_ui`. It was bumped last, after `ubu-ui` was pushed.

This record lives here rather than in `ubu-ui/docs/P1B-40_VERIFICATION.md`
because that file is part of the `ubu-ui` revision being pinned, and a file
cannot contain the hash of the commit that contains it. `ubu-devshell` is not
one of the pinned repositories, so this file does not disturb what it shows.

## Revisions, in landing order

| Order | Repository | Sections | Pushed revision |
| --- | --- | --- | --- |
| 1 | `ubu-ui` | A, B, D–H | `f37fe95e6b322be7928cb7a076a72ebe1787ec6f` |
| 2 | `ubu-devshell` | A, C, H, I | the commit that carries this file |

Both are on the branch `p1b-40-front-door`. Neither is merged to `main`.

`ubu-devshell` commits before this one:

| Section | Commit | Change |
| --- | --- | --- |
| A | `e71da83` | The generator's default URL becomes `http://127.0.0.1:7878`. |
| C | `0ff9959` | `scripts/check-ui-contract.sh` and `scripts/check-ui-contract.mjs`. |
| H | `ad50fbe` | `docs/CONTRACT_CHECK.md`. |
| I | This commit | The `ubu_ui` pin and this record. |

`ubu-orchestrator` is untouched at
`d047149b09a78d01f748f3b6f40bf597cc1f9b2f`. Its pin and the other five are
unchanged, comments included.

## `scripts/show-revs.sh`

Run with the new pin in place, before the commit:

```text
Recorded R_* baseline: post-O20 R_orchestrator, post-GA2 R_adapter, post-S17 R_schemas, post-C12 R_core, post-ST7 R_store

REPO                     BRANCH         HEAD      SIG                 TREE   PINNED    STATUS
----                     ------         ----      ---                 ----   ------    ------
ubu_design               main           f7c4a1db  signed-ok           clean  (unset)   unset
ubu_schemas              main           4974166a  signed-ok           clean  4974166a  OK
ubu_core                 main           c77c0a2d  signed-ok           clean  c77c0a2d  OK
ubu_store                main           7b24cd82  signed-ok           clean  7b24cd82  OK
ubu_github_adapter       main           4c7e3b6d  signed-ok           clean  4c7e3b6d  OK
ubu_planning_kernel      main           84b6d0d9  signed-ok           clean  84b6d0d9  OK
ubu_orchestrator         main           d047149b  signed-ok           DIRTY  d047149b  OK
ubu_ui                   p1b-40-front-door f37fe95e  signed-ok           clean  f37fe95e  OK
ubu_brand                main           faf2005a  signed-ok           clean  (unset)   unset
```

Exit status 0. All seven pinned repositories read `OK` in the STATUS column.
`ubu_design` and `ubu_brand` have never been pinned and remain `unset`.

**`ubu_orchestrator` reads `DIRTY` in the TREE column.** Its revision matches
its pin and no tracked file is modified. Four untracked files are in its
root, left by the operator's P1B-39 acceptance run:
`ubu-device-registration.json`, `ubu-orchestrator.db`,
`ubu-orchestrator.db-shm` and `ubu-orchestrator.db-wal`. The operator chose
to proceed with them in place. They were not opened, moved or changed by
this ticket, and the contract check does not use them. The orchestrator's
`.gitignore` does not cover them, and this ticket does not change the
orchestrator.

The first line of the output is printed from a string inside `show-revs.sh`
and still describes the pre-P1B baseline. It was left alone, as in P1B-38
and P1B-39.

The `ubu_ui` pin names a revision whose screens have been tested in Vitest
and have not been seen in the Tauri shell. The operator acceptance steps are
in `ubu-ui/docs/P1B-40_VERIFICATION.md`.
