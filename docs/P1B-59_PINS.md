# P1B-59 pins

P1B-59 changes eight repositories, and it is the first `ubu-core` chain since
P1B-37a. Seven pins move. `ubu-devshell` has no key in `pinned-revs.toml` and
is given none: a commit cannot name its own revision.

The order was forced. `ubu-core` carries `ubu-schemas` as the submodule
`schemas-ref`, so the schemas were pushed before the core could move it. The
store, the kernel and the adapter each pin `ubu_core` by revision, and the
orchestrator pins all four, so each was pushed before the next could name it.

| Order | Repository | Sections | Pushed revision |
| --- | --- | --- | --- |
| 1 | `ubu-schemas` | A, A again | `dadb5042ba8bfcd08381a3dbab68af9f3b4a9a68` |
| 2 | `ubu-core` | B | `0e6be7660e4958aec003bccb073e452715cb70e3` |
| 3 | `ubu-store` | C | `628eec531e90c57f1537d33d4e45c3549fdeae05` |
| 3 | `ubu-planning-kernel` | C | `f918d050f03c7ab2990debe68156a70007fae20b` |
| 3 | `ubu-github-adapter` | C | `b77a729f6f2a643a667e86aa81affe4330c911ff` |
| 4 | `ubu-orchestrator` | C, D | `929260571d1125483efa089dec7a5a93d85050c7` |
| 5 | `ubu-ui` | E | `a9434156c7671727f5972d0884efd02a9a58adb9` |
| 6 | `ubu-devshell` | F, G | the commit that carries this file |

All are on the branch `p1b-59-measured-number`, cut from `main` after P1B-58
was merged. None is merged to `main`. Nothing was force-pushed.

No dependency was added and no route was added. The OpenAPI document stays at
56 paths and regenerates byte-identical, and `endpoints.ts` stays at 43 path
constants.

| | before | after |
|---|---|---|
| `ubu-schemas` fixtures, valid and invalid | 80 and 82 | 86 and 99 |
| `ubu-schemas` tests | 2 | 2 |
| `ubu-core` tests | 137 | 157 |
| `ubu-store` tests | 108 | 108 |
| `ubu-planning-kernel` tests | 83 | 83 |
| `ubu-github-adapter` tests | 23 | 23 |
| `ubu-orchestrator` tests | 504 | 510 |
| `ubu-ui` tests | 144 | 147 |
| OpenAPI paths | 56 | 56 |
| OpenAPI schemas | 183 | 185 |
| `endpoints.ts` path constants | 43 | 43 |
| runner scenarios | 22 | 22 |
| runner requests | 416 | 433 |
| harness seeds | 8 | 9 |

## What the change is

A measured number is a first-class fact. Four things, one subject:

- **A number is set and cleared.** `set_numeric` replaces whatever is there
  and `clear_numeric` removes the key. Before, a number could only be moved by
  a difference: from 0.7, a request for 0.1 arrived as 0.09999999999999998,
  and a number could never be removed.
- **A number is compared.** A precondition may use `at_least`, `at_most`,
  `greater_than` and `less_than` on a `numeric_values` target. A number that
  was never recorded satisfies none of them, and it is not an error to ask.
- **A fact says how it was established.** `fact_provenance` maps a full
  target to a kind, `asserted`, `measured`, `derived` or `proposed`, and the
  time it was written. A mutation states the kind of what it writes, and none
  means `asserted`. No entry outlives its value.
- **Bootstrap's keys no longer repeat their collection.** That closes a hole:
  a doubled key hid its namespace from the guard that refuses intrinsic-affect
  targets outside `user_mode`.

The contracts are `ubu-schemas/CONTRACT.md`, `ubu-core/CONTRACT.md` and
`ubu-orchestrator/docs/UNIVERSE_STATE.md`. The screen is in
`ubu-ui/docs/NAVIGATION.md`.

## Where this differs from the ticket

- **The map is `fact_provenance`, not `provenance`.** A stored `UniverseState`
  payload already carries the object envelope under `provenance`, and
  `ubu-store` rewrites that key on each write. The operator chose the name
  when asked. That is why `ubu-schemas` has two commits for section A.
- **Three schemas changed, not two.** The predicates are an enum in
  `core/precondition.schema.json`. Its invalid fixture `unknown-predicate`
  used `greater_than`, which is now a predicate.
- **The orchestrator's section C carries four lines of source.** The new core
  does not compile against it untouched: `UniverseMutation` lost `note` and
  gained `provenance_kind`, and `apply_universe_mutations` takes the write
  time. The operator chose a pin commit with that mechanical fix over folding
  it into section D. The store, the kernel and the adapter are pin-only.
- **The orchestrator's pin moves five git sources**, not one: the core, and
  the store, the adapter and both planning crates that pin it. One graph holds
  one `ubu_core`.
- **`note` is removed**, as the ticket preferred, and the mutation type now
  refuses unknown fields. A stored Task whose effects carry a `note` no longer
  deserializes. The operator's stores hold no Task with effects.
- **The two clears refuse a `provenance_kind`**, as they refuse a payload. A
  field that silently discards what it is given is what `note` was.
- **Both generators that write a README into `ubu-ui` are fixed**, not one.
  They are in this repository, not in `ubu-ui`.

## What it does not do

- **No advisor**, no `CandidateKind::Precondition`, and no authoring of a
  precondition in the app. A Task's `preconditions` are still set over HTTP.
- **The app records nothing as `measured`.** What is set on the screen states
  no kind and is recorded as `asserted`. A measured value arrives over HTTP or
  from a Task's effects.
- **Bootstrap's facts carry no provenance entry.** It writes the maps
  directly, not through a mutation.
- **No migration.** A store bootstrapped before this keeps its doubled keys.
- **The schema and the core still disagree about `source_summary`.** The
  schema's is an object and the core's is a string, so no `UniverseState`
  fixture round-trips as a whole. A core test pins it. Not closed here.
- **Old verification documents still hold absolute paths**, in `ubu-ui`,
  `ubu-orchestrator` and here. They are records of past runs and were left.

## `scripts/show-revs.sh`

Run with the new pins in place, after all seven branches were pushed and
before this commit. Exit status 0, and every pin is on `origin`.

```text
Recorded R_* baseline: post-O20 R_orchestrator, post-GA2 R_adapter, post-S17 R_schemas, post-C12 R_core, post-ST7 R_store

REPO                     BRANCH         HEAD      SIG                 TREE   PINNED    ORIGIN  STATUS
----                     ------         ----      ---                 ----   ------    ------  ------
ubu_design               main           f7c4a1db  signed-ok           clean  f7c4a1db  yes     OK
ubu_schemas              p1b-59-measured-number dadb5042  signed-ok           clean  dadb5042  yes     OK
ubu_core                 p1b-59-measured-number 0e6be766  signed-ok           clean  0e6be766  yes     OK
ubu_store                p1b-59-measured-number 628eec53  signed-ok           clean  628eec53  yes     OK
ubu_github_adapter       p1b-59-measured-number b77a729f  signed-ok           clean  b77a729f  yes     OK
ubu_planning_kernel      p1b-59-measured-number f918d050  signed-ok           clean  f918d050  yes     OK
ubu_orchestrator         p1b-59-measured-number 92926057  signed-ok           clean  92926057  yes     OK
ubu_ui                   p1b-59-measured-number a9434156  signed-ok           clean  a9434156  yes     OK
ubu_brand                main           faf2005a  signed-ok           clean  faf2005a  yes     OK
```

## Left open, on purpose

- The precondition advisor, which stands on everything above.
- The editable log: a colour change on a captured commitment is still
  `capture_owned_drift`.
- `calendar_reconcile.rs` still says of a stamped event that it “was not
  created by UbU”.
- The legend on the Calendar preview reads “resize — the duration changed”,
  in a tense that reads as a report.
- The two coverage decisions.
- Three birth labels for a `UniverseState` row, and the 409-to-patch path
  that leaves an event unstamped.

The pinned revisions are tested and have not been accepted by the operator.
Operator acceptance is [the live rehearsal](LIVE_REHEARSAL.md), from its
first step to its last. This ticket changed its step 13 and the predictions
in its introduction and in steps 8, 10 and 12.
