# P1B-39 pins

P1B-38 bumped the pins before the last two repositories had landed, which
left `ubu_ui` and `ubu_orchestrator` one step behind. P1B-39 bumps them
last, after both tracks were pushed.

This record lives here rather than in `ubu-ui/docs/P1B-39_VERIFICATION.md`
because that file is part of the `ubu-ui` revision being pinned, and a file
cannot contain the hash of the commit that contains it. `ubu-devshell` is not
one of the pinned repositories, so this file does not disturb what it shows.

## Revisions, in landing order

| Order | Repository | Sections | Pushed revision |
| --- | --- | --- | --- |
| 1 | `ubu-orchestrator` | A–C | `d047149b09a78d01f748f3b6f40bf597cc1f9b2f` |
| 2 | `ubu-ui` | D–H | `7046687e6db419c9643843324dd61454f10efe1b` |
| 3 | `ubu-devshell` | I | the commit that carries this file |

Two pins changed, `ubu_orchestrator` and `ubu_ui`. The other five already
named the current revision of their repository and are unchanged, comments
included.

## `scripts/show-revs.sh`

Run with the new pins in place, before the commit:

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
ubu_orchestrator         p1b-39-transport-and-overlap d047149b  signed-ok           clean  d047149b  OK
ubu_ui                   p1b-39-transport-and-overlap 7046687e  signed-ok           clean  7046687e  OK
ubu_brand                main           faf2005a  signed-ok           clean  (unset)   unset
```

Exit status 0. All seven pinned repositories read `OK`. `ubu_design` and
`ubu_brand` have never been pinned and remain `unset`.

The first line of the output is printed from a string inside
`show-revs.sh` and still describes the pre-P1B baseline. It was left alone,
as in P1B-38.

The `ubu_ui` pin names a revision whose transport has been built and tested
but not yet accepted in the Tauri shell. The operator acceptance steps in
`ubu-ui/docs/P1B-39_VERIFICATION.md` are outstanding.
