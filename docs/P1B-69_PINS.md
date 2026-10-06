# P1B-69 verification and pins

Implementation and automated verification are published on
`p1b-69-a-target-is-a-subject-and-a-predicate` in UI, orchestrator and devshell.
UniverseState authors targets as a subject and predicate and offers a separate
explicit mint. Provisional subjects live in Setting records. New writes and
Vocabulary proposals use the effective vocabulary and final-predicate grammar;
legacy targets remain readable, evaluable and clearable. Operator acceptance
of the new form remains outstanding.

## Grounding and approved corrections

All twelve repositories began clean on main. Fresh origin fetches confirmed
the required P1B-68 heads merged to main in all four of its repositories. Core's
schemas-ref checkout matched its recorded pointer. Only the three named repos
change; design remains read-only.

The operator approved four concrete corrections before implementation:

1. The ticket asked to keep affect available to the operator while preserving
   the manual route's five reserved-segment refusals, including affect even in
   user_mode. Affect remains visible as governed and reserved, but disabled in
   manual value selectors. Its advisor exclusion and the existing refusal are
   preserved. Enabling it would instead have withdrawn that explicit contract.
2. The target preview dates to P1B-65; P1B-68 B added assertion/reading choices.
   The precondition enum contains recorded targets, including legacy ones,
   rather than only names authored under the new grammar. Correct attribution
   and preservation of legacy enumeration avoid an invented migration or
   retroactive refusal. The capitalized private example also fails the stated
   lowercase mechanical rule; semantic noun judgment remains operator-owned.
3. Essential registry/route contracts ship in B/C's implementation commits,
   as UNIVERSE_STATE requires. F adds broader context, the acceptance rule,
   pins and this report. Deferring all contract prose to F would publish a
   changed route beside a contradictory document; combining sections or adding
   an extra commit was unnecessary.
4. Vocabulary's schema and validator agree on the static target grammar.
   Existing-name, evidence, envelope and later admission checks remain
   additional state-dependent checks. ADVISORY's P1B-64 contract explicitly
   calls its grammar a safe subset, not full-set equality. Weakening established
   checks or promising future state through a request pattern would be false.

## Sections and governing sentences

| Section | Sentence read before writing | Result |
|---|---|---|
| A | D0243: “`<predicate>` is the final segment: a snake_case attribute name.” D0291: “Minting a provisional root is an explicit operator act, never a side effect of authoring a fact and never available to an advisor.” | Subject selectors and predicate fields on Facts, Numbers and Sets; separate mint/retire form and one visible vocabulary list. NAVIGATION and UNIVERSE_STATE's existing preview/bootstrap/reserved-key contract were read. |
| B | D0287: “Named configuration values are therefore `Setting` records, `{ id, name, value, authority_source }`, with the ID prefix `setting_`.” SETTINGS: “They are **not Preferences**: they express no pairwise value judgment and never enter Preference layering.” | Provisional true-valued Settings on existing routes; governed constants cannot be edited away. |
| C | UNIVERSE_STATE: “Existing keys are not migrated or refused on reads, advisor vocabulary enumeration or precondition evaluation.” D0242's intrinsic-affect mode rule was read. | New-write governance with unchanged core/effects semantics and legacy destructive operations. |
| D | ADVISORY: “The controller validates before enqueueing, even for injected transports.” P1B-64: “This is a safe subset contract, not equality of the two accepted sets.” | Request and controller share name policy; runtime state/envelope/admission checks remain. |
| E | ACCEPTANCE: “Deterministic steps come first and model-dependent steps come last, and no step may be a prerequisite of a later step unless it is deterministic.” Ledger: “A ticket that changes the thing a line names brings that check back.” CONTRACT_CHECK: “The boundary: anything assertable over HTTP is a scenario here, never a manual step there.” | New authoring instructions, first-class empty diagnostics, the declared snooze retirement and two HTTP scenarios. |
| F | UNIVERSE_STATE: “This document is contract.” ACCEPTANCE rule 5: “A step says exactly what to open, exactly what to click, exactly what to read, and exactly what to copy back. It never asks the operator to infer.” pinned-revs: “Push a branch before pinning it.” | Current authoring/advisory documentation, the fifth presence-pattern rule, published pins and this report. |

The governing documents, including ACCEPTANCE's rules 1–5, retirement ledger
and P1B-65 through P1B-68 history, were read before their sections were written.

## Commits and pins

| Section | Repository | Commit |
|---|---|---|
| A | ubu-ui | `698a15f` |
| B | ubu-orchestrator | `2d8f9e7` |
| C | ubu-orchestrator | `9d9e5b9` |
| D | ubu-orchestrator | `1ce900d` |
| E | ubu-devshell | `48c239d` |
| F | ubu-orchestrator | `f610d32` |
| F | ubu-devshell | The commit carrying this report, the acceptance rule and two updated pins |

One commit per section per affected repository, seven total: F names both
orchestrator and devshell. UI/devshell carry Co-Authored-By; orchestrator does
not. No force-push or main merge was used.

| Pin | Published revision |
|---|---|
| ubu_schemas | `926636041ded437d101aa51bb123559f52bc155e` |
| ubu_core | `46135fea0312bab3606e467c3012d7327096d400` |
| ubu_store | `b80787d86c235a754b285cb80c800fea2e178e54` |
| ubu_planning_kernel | `8413a270cd2525b515501563e78fde474f112f48` |
| ubu_github_adapter | `2a253029b8dea8a824aff970532face21a6c354e` |
| ubu_orchestrator | `f610d321219ab9f64150acc2191cecf8188f64a3` |
| ubu_ui | `698a15fde8244dca96a03b07ad144a4c2b65af15` |
| ubu_design | `7313e82f7fb835965bc18521b10f897b238b65dc` |
| ubu_brand | `faf2005a8bd9e64742dd76ee6d1f91f45223946b` |

Only UI and orchestrator pins move. **Design and all five chain pins do not
move. No UBU-D record is added or amended.** No root is ratified or promoted.
Brand also remains unchanged; devshell has no self-pin. show-revs reports **OK
for all nine rows**, matching published sibling heads. Final cleanliness is
checked after the report commit, without copying pre-commit devshell edits as
a final DIRTY marker. All nine read-only repositories retain their heads and
clean trees, including design, Quick UbU and model-committee.

## Subject and predicate form

Facts, Numbers and Sets have a subject selector over the effective vocabulary
and a predicate text field. **The entity path has no separate field**: it is
folded into the predicate field before the final segment, for example
issue.14.pipeline_state. This keeps ordinary facts at two naming fields while
retaining nested entities and numeric instance segments. The live preview
assembles collection, subject and the trimmed predicate/path. A predicate
alone cannot submit a single-part target. Event markers remain read-only.

One Subjects list marks operator, project, github, affect and relationship as
governed; provisional roots are marked awaiting ratification. Affect is shown
as reserved and disabled in these forms, per the approved correction. Subjects
are not inferred from stored keys. A failed Settings read does not authorize
an assumed vocabulary. Minting is a distinct form and PUT; a value-form
submission cannot mint. Mint and Retire reload the list and selectors. Retirement
does not rewrite old targets or values. Clear/remove still use the exact stored
name. Change splits a known subject from its path/predicate; an unknown or
single-part legacy name needs a chosen subject for a subsequent grammatical
write. The existing assertion/reading choices and stored provenance badges
retain their behavior.

The exact non-mechanical sentence shown at minting is:

> Choose a singular noun naming an entity or domain, never an instance, an attribute, a provenance or source, or a reverse-DNS authority prefix.

There is no plural detection or part-of-speech guessing. Mechanical checks are
lowercase ASCII snake_case, starting with a letter, no dots, at most 64 bytes,
no reserved/governed name and no duplicate. UI checks mirror the route's root
refusals; direct clients receive the same protections on the existing routes.

| Refusal | Code / exact message |
|---|---|
| Five reserved segments | subject_reserved: ``Subject `{root}` is reserved and cannot be minted.`` |
| Other governed root | subject_governed: ``Subject `{root}` is governed and cannot be minted or retired.`` |
| Empty, uppercase, non-ASCII, dotted, hyphenated, malformed underscore shape, leading digit or overlong root | subject_invalid: `A subject must be lowercase ASCII snake_case, start with a letter, contain no dots, and be at most 64 characters.` |
| Existing provisional root | subject_already_registered: ``Subject `{root}` is already provisional; choose it from the subject list.`` |
| A registry value other than boolean true | subject_invalid_value: `A provisional subject Setting must have the boolean value true; retire it with DELETE.` |

The first four messages can be shown before a UI write; the value form supplies
only true to the registry route. Governed/reserved DELETE is refused, an absent
provisional DELETE retains 404, and duplicate admitted Setting names retain
the existing conflict rather than picking a record arbitrarily.

## Registry and mutation validation

Provisional roots are Setting records named `universe.subject.<root>` with
boolean value true, user authority and ordinary Setting attribution/admission.
The governed five are code constants, never registry rows. GET /settings already
returns those records; no response field or route was added. The effective set
is their union, excluding malformed imported registry entries. DELETE retires
only the provisional record, retaining the existing Setting withdrawal idiom.
Registry changes and new world writes share the Task-action lock, so retirement
cannot interleave an admitted write.

New manual writes require a collection, effective subject, optional ASCII
entity segments and final lowercase snake_case predicate, with a complete
target at most 128 bytes. This applies to set_fact, set_numeric,
increment_numeric, decrement_numeric, add_membership and append_event_marker.
The five existing reserved-segment checks and their reasons remain, including
affect; core's non-user-mode rejection runs first. Existing core malformed-target
diagnostics are preserved for targets core cannot parse. The whole list is
checked before any seed or write.

Unknown subject, code **universe_target_subject_unknown**, exact template:

```text
Subject `{subject}` is not in the effective vocabulary. Mint it explicitly in UniverseState's Subjects list before writing `{target}`.
```

Single-part key or additional new grammar refusal, code
**universe_target_grammar_invalid**, exact template:

```text
Target `{target}` needs a subject and a predicate: <collection>.<subject>[.<entity-path>].<predicate>, with a lowercase snake_case predicate, ASCII entity segments and at most 128 characters.
```

No migration or retroactive read/evaluation check runs. Old single-part,
unknown-root, doubled or reserved names remain stored, readable, enumerated
by targets() and evaluable. clear_fact, clear_numeric and remove_membership
still work on them. Retirement refuses future writes while leaving existing
targets intact. Task effects and core semantics remain unchanged.

## Vocabulary's actual target constraint

For a store with one provisional root, the invented teapot, the request's
target constraint is exactly:

```json
{"type":"string","pattern":"^(facts|numeric_values)\\.(github|operator|project|relationship|teapot)\\.([A-Za-z0-9_-]+\\.)*[a-z][a-z0-9]*(_[a-z0-9]+)*$","maxLength":128}
```

The subject alternatives are the governed set minus affect plus that provisional
root. Affect is reserved for intrinsic affect and has D0242 mode consequences;
Vocabulary never proposes into it. The request context adds subject names only,
not registry booleans, World observations or provenance. The system text drops
the redundant explicit collection instruction while retaining relevance,
existing-name, name-only and value prohibitions.

The controller uses the same name policy and the intersection of the request
snapshot with the current vocabulary, so injected results and retirement after
submission cannot bypass it. Admission rechecks the current set. Unknown
subjects and missing predicates use vocabulary_proposal_refused with bounded
code-authored reasons, three named then a count; a usable sibling proposal
survives and status remains ok. Existing names, evidence eligibility, wrapper
shape and state at admission remain additional checks, not guarantees made by
the request regex. The runner tests the actual pattern independently with
JavaScript RegExp witnesses, rather than only asserting a stub's chosen answer.

Precondition's source, prompt, format builder and validator remain byte-identical
to baseline, as do the reviewer and snooze policy. For the same target context,
its emitted format is byte-identical across registry changes. Its target enum
already contains recorded targets, including legacy ones. Newly admitted names
inherit the new authoring grammar; old names are not retroactively filtered.

## Rehearsal, every copy-back item

The live rehearsal becomes **14 steps, from 15**, and **nine copy-back items,
from ten**. Both fall by one because only the operator-declared live snooze
verification is retired. Step 12 teaches subject/predicate authoring and the
separate mint; its refusal is a result about the form, not the operator. The
model-dependent Vocabulary/Precondition step becomes 13; Stop becomes 14.
The deterministic-before-model order remains. No candidate or model agreement
is forced. The protected step 11 paragraph and preview convergence explanation
remain byte-identical; the prior condition-transcription waiver is retained.

| Item | Presence/clean-absence audit |
|---|---|
| 1, capture | Six mandatory counters retain individual missing-counter failure phrases; no-colour sentence retains its named missing-sentence outcome. Grey-box diagnostics now answer “none” when no lines are shown, otherwise the rendered count line. The separate no-colour event list is excluded. Visible diagnostic sentences without a summary use the labelled “diagnostics shown; count line missing” failure. No hand tally. |
| 2, Plan | The information list above Timed placements answers “none” when empty, otherwise its rendered counts. Failure alerts keep their separate rendering. Placements remains a required line with “no Placements line” for absence. Optional Not in this Plan has “no such section” as an explicit normal absence answer, not a missing count. |
| 3, risk | Copy the whole Plan risk panel; “no Plan risk panel” remains a missing-panel outcome. No per-finding naming or counting. |
| 4, preview | Operations proposed includes zero; its missing mandatory line remains a named failure. The optional first Dynamic Update is a block or “no Dynamic Update operation”, an explicit normal no-operation answer. The convergence explanation is unchanged; no tally or invented figure. |
| 5, approval | Both result lines retain named missing-line outcomes. “I did not approve” remains first-class when the action was not taken, rather than an assumed approval. |
| 6, UniverseState | Entries is the single names/counts line even on an empty state; “no Entries line” remains a missing mandatory field. No subject, key, value or row is requested. The protected step 11 text is untouched. |
| 7, authoring | Saved judgment and rendered condition words retain their authoring/missing-control/no-target outcomes. Mint adds “subject mint failed”, “minted subject missing from selector” and “fact authoring refused”, without requesting its name or value. A refusal is attributed to the form. No success or useful subject is assumed. |
| 8, advisors | Both producers retain labelled Run status/Candidates enqueued and their four missing-result phrases, including explicit zero. Vocabulary, Precondition and latest selection diagnostics each answer “none” when empty or their rendered count line when present. A shown list missing its summary has the labelled failure above. Existing no-name/no-candidate/queue-full, failed-admission and rejection outcomes remain; required candidate words have named missing-field failures only when a card exists. Results are copied before navigation resets them. No diagnostic transcription or tally. |
| 9, assessment | The operator's own judgment about scheduling and tomorrow's usefulness; no screen figure or model output is assumed. |

The fifth assumed-presence incident is the inverse of the previous four:
absence is a good clean-run outcome. ACCEPTANCE's new rule states that absence
is phrased as an answer, not a missing figure. Nothing else is retired.

## Retirement ledger, verbatim line

```text
| step 13 and copy-back item 8, the first live finite-snooze reading | the review producer runs against an operator-authored precondition and returns a verdict; it did not prove a live critique or snooze interval, which requires model disagreement; intervals remain asserted by the runner against the stub | P1B-68 | P1B-69 quotes the operator's live result, “1 preconditions examined; 1 judged sound.”; explicit operator retirement, not inferred interval acceptance | P1B-69, operator decision 2026-10-06 |
```

The record distinguishes reaching the live reviewer from proving live intervals.
The operator declined to manufacture a false requirement in their own store.
Synthetic reversed requirements remain staged; stub-backed tests assert the
intervals. Under the ledger's rule, a later interval change brings this check
back. No snooze interval or review behavior changed in this ticket.

## Verification

| Repository | Result |
|---|---|
| ubu-ui | **212 tests**, from 203: nine new subject-authoring tests. Full suite and TypeScript/production build passed. |
| ubu-orchestrator | **628 tests**, from 615: three registry, five mutation-governance and five vocabulary-governance tests. Full suites passed at B (618), C (623) and D (628). |
| ubu-devshell | **35 of 35 scenarios**, from 33; **659 requests**, from 622; 0 failed and 2 explicitly skipped live integrations. Eleven seeds for the unchanged one staged step passed; Node and shell syntax checks passed. |
| ubu-store, read-only floor | **110 tests**, unchanged; full offline suite passed. |

```text
RESULT: 35 of 35 scenarios passed, 0 failed, 2 skipped, 659 requests, all to 127.0.0.1
```

Existing tests and harness fixtures now explicitly mint their invented subjects
before manual writes; this is fixture setup, never producer or mutation-route
minting. One old single-part set fixture becomes toolbox.tools so its new
authoring remains grammatical; dedicated new tests preserve actual single-part
legacy cleanup/evaluation coverage. UI key-control expectations now exercise
the two naming controls, preserving value, provenance, refusal and clear behavior.
The old UI affect-refusal case now asserts the approved disabled option and no
write; server reserved/mode-refusal assertions remain. Vocabulary's old pattern
expectation becomes the dynamic subject pattern, and its formerly accepted
single-part name witness becomes grammatical, with a new missing-predicate
refusal witness. No old test is removed or weakened to hide a production failure.

A new evaluator test initially passed JSON rather than the typed condition,
then compared serialized floating-point zero with integer zero; those test
mistakes were corrected to use the existing type and numeric accessor. An
existing lamp fixture initially lacked its explicit mint and was corrected in
setup. Incidental recursive rustfmt changes to shared fixtures were removed;
only their necessary explicit-mint setup remains. A whole-repo cargo fmt check
reported pre-existing broad formatting drift; no unrelated formatting sweep
was made. The required build/test/clippy checks passed.

Clippy remains **8 distinct warning messages before and 8 after**, baseline 8;
the same messages occur at nine locations, including one duplicate message at
two sites. No new warning was introduced. The OpenAPI path count remains **56**.
`ubu-ui/src/api/endpoints.ts` is byte-identical and retains **43 endpoint
constants**. No new route, path, candidate kind, predicate, dependency, manifest
or lockfile was introduced. Core, schema and evaluator contracts do not change.

scripts/check-all.sh completed with exit 0, including offline builds, the
patch-generator regressions, static export-bypass guard, recording fake GitHub
import/projection and hard-boundary tests. The standing fixture demo stayed
QUARANTINED and did not run; that is not a pass. show-revs reports nine OK rows.
Final tree/publication checks follow the report commit.

**No env.sh constraint was relaxed. Two jobs were not used anywhere in P1B-69.
No OOM occurred.** Every Cargo invocation sourced env.sh, used one job and ran
sequentially across repositories. No persistent runtime or build-cap change
was made. Dependencies stayed offline; Git remained the authorized network
exception. No incremental measurement was used to justify a full-build trial.

## Privacy and acceptance boundary

Every added fixture, test and document example is invented. None carries real
calendar data, real event ids, real Task titles/notes, real Quick UbU data or
real fact keys/values. Both protected operator key strings are absent from
tracked content in all twelve repositories and from outgoing commits/additions.
The earlier protected key and local acceptance artifact names also pass the
outgoing audit; excluded artifact contents were never opened. No machine-specific
path is committed. No operator store, real calendar, OAuth cache or credential
was opened. Design is untouched, including its private-argument boundary.

All new producer transports are StubTransport; UI uses the mocked existing
Tauri HTTP plugin. New Rust/UI tests reach no real model, HTTP service, Google,
editor or signal; they spawn no process and install no signal handler. The
exempt devshell runner/staging harness uses loopback, mock processes and
throwaway stores, with live Google and ollama explicitly skipped. No World
observation value reaches any model; registry names are names, not values.
No password-hygiene agent was invoked or fed input; credentials remain outside
canonical StateStore. No model-committee ranking was run.

Plan, capture contract, colour partition, collision diagnostics, Task effects,
precondition producer and review snooze intervals remain unchanged. No boolean
tree form, ontology detector, root ratification or migration was added.
Automated verification is not operator acceptance. The operator must follow
[LIVE_REHEARSAL.md](LIVE_REHEARSAL.md) end to end against their own calendar and
return its **nine-item copy-back**. A refusal in the new subject/predicate form
is a result about section A, not an operator mistake. This report adds no
separate manual sequence.

Operator acceptance has not been performed; the step under test is authoring a fact as a subject and a predicate without meeting a refusal.
