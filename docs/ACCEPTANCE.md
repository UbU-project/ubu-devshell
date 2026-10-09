# The acceptance harness

`scripts/acceptance.sh` stages the store the operator's acceptance steps
need, checks every staged precondition over HTTP, prints the steps with the
staged objects named in them, and holds one orchestrator up on the app's
default port until Ctrl-C. The operator starts the app and follows the steps.

It exists because four acceptance runs in a row stalled on a precondition
that was assumed rather than staged:

| ticket | step | what was assumed |
|---|---|---|
| P1B-41 | all | a populated store |
| P1B-43 | capture | that reconcile had already seen the event |
| P1B-47 | 3 | a generated Plan and a category on the Task |
| P1B-48 | 2 | that an active Task existed |

Four for four were preconditions, not rendering. The operator's own store
is empty by decision, since mainline bootstraps from Google Calendar and that
bootstrap has not happened, so every step that needs data must bring its own.

## What it is for, and what it is not

The scenario runner, `check-ui-contract.sh`, covers the HTTP layer and
asserts behaviour. Three things it cannot see remain for a human: the Tauri
HTTP plugin transport, the capability scope, and anything rendered. The first
two are the self-check card in Setup. The third is the only reason a human
opens the app, and it is what the steps this harness prints are for.

The harness:

- **stages**: it creates the Tasks and Settings the steps rely on, in a
  throwaway store, through the same routes the app uses;
- **checks**: every seed asserts over HTTP that the state it promises
  actually holds, not that a request was accepted;
- **prints**: the numbered steps, with each staged object named by title
  and id, so a step never says "a Task" when it means a particular one;
- **holds**: one orchestrator on the app's default port, so
  `npm run tauri:dev` reaches the staged store with no configuration.

It does not assert behaviour, it does not drive the app, and it never opens
the operator's own store.

## The seed-and-step contract

Both live in `scripts/acceptance.mjs`, beside each other.

The two examples here are from P1B-50's list. Both have since been retired
by the sixth rule; the shape they show is unchanged.

A **seed** has three parts:

```js
interview: {
  what: "an active Task with no description, which Clarify picks on its default",
  async make() { /* create it through the API; return what was made */ },
  async check(made) { /* assert over HTTP that the state holds; return a name for it */ }
}
```

- `what` says in one line what the seed is for. It is printed.
- `make` stages it and returns whatever `check` needs.
- `check` asserts, over HTTP, that the API now agrees the state holds. It
  throws when it does not, naming what is wrong. It returns the text that
  names the object in the steps, by title and id.

A **step** names the seeds it needs, and says what to open, click, read and
copy back:

```js
{
  needs: ["described"],
  name: "A Task's notes",
  open: "Tasks, in the navigation.",
  click: "Under the heading “Backlog”, the line “Notes for Acceptance — already answered”. It opens.",
  read: "Two lines appear under it: “Q: Is this one already clarified?” and, on the next line, “A: y”. This is {described}.",
  copy: "The two lines, exactly as they appear.",
  codes: []
}
```

`{interview}` is replaced by what the seed's `check` returned. `codes` lists
every diagnostic the step can meet, each with what it means and whether the
run happened; it is printed under `codes`. A step with
`needs: []` is one whose precondition is genuinely the empty store or the
app alone.

Two things are checked before anything is built:

- a step that names a seed that does not exist is a failure, so a
  precondition nobody stages cannot be quietly referenced;
- a seed that no step names is reported, so a stale seed is visible.

Every seed's `check` runs after every seed is made, so a check can see the
whole staged store. That matters when two steps could collide. The check
that Clarify's default picked the interview Task, a seed since retired,
re-implemented the selection predicate, first active non-occurrence Task with
a blank description ordered by id, rather than trusting that creating it
first made it first.

## Whether a step belongs in the list at all

From P1B-50, three rules decide it, from P1B-51 a fourth, from P1B-53 a
fifth, from P1B-55 a sixth, from P1B-56 a seventh, from P1B-60 an eighth,
from P1B-61 a ninth, and from P1B-73 the tenth and eleventh. A step that fails any
one of them is not written; it is moved to the runner, dropped, moved to where
it breaks nothing, rewritten until it says exactly what to do, or retired. The
seventh is about what a step may ask the operator to read at all.

1. **A manual step may not verify what the runner or a `ubu-ui` test already
   asserts.** P1B-48's dependent-question check broke this rule: that a
   dependent question shows only when its dependency is answered is asserted
   by the runner's clarify scenario and by `ubu-ui` test 66, so it is gone.
2. **A step's expected outcomes must name the diagnostic codes, and must
   include the "it did not run" outcome.** Every step carries a `codes`
   field, one line per code with what it means, and the harness prints them
   under `codes`. P1B-48's second-round step broke this rule: it did not
   say that `clarify_no_task` means the selector was left on its default and
   the run did not happen, and that outcome was read as a result of a run.
3. **A step must not depend on what a model chooses to emit.** If a behaviour
   is deterministic given a question set, it belongs in the runner against
   the stub model. A real-model step may only check that a real model
   answers at all, and every one of its outcomes is a result to report.

4. **Deterministic steps come first and model-dependent steps come last, and
   no step may be a prerequisite of a later step unless it is deterministic.**
   P1B-50's list broke this rule. Its third step was answered by a model, its
   fourth read what the model's questions had produced, and the time-by-category
   panel and two more came after. The model answered `done` on round one, so
   there were no answers, the fourth step had nothing to show, and the three
   steps after it were abandoned: the whole of the time-by-category panel
   went unlooked at. Under this rule:
   - a step whose outcome depends on a model is placed after every step that
     does not;
   - a step that follows a model-dependent step must be runnable whatever that
     step's outcome was, and its `codes` name each case;
   - what a later step needs is staged by the harness, never produced by an
     earlier step that could fail. The notes step reads a description the
     harness staged itself, not one an interview wrote.

A valid model result with zero proposals is still a result. P1B-73 supersedes
the live continuation instruction: a failed action stops with a named fault and
remedy in the public artifact. No human transcribes an absence or retries for
a preferred model result. Historical continuation rules below describe earlier runs.

5. **A step says exactly what to open, exactly what to click, exactly what to
   read, and exactly what to copy back. It never asks the operator to infer.
   It never uses "Report" as a verb — "Write down" or "Copy back" instead,
   because "Report:" has twice been read as the name of a screen. A ticket's
   acceptance section names the script to run and the document to follow, and
   contains no steps of its own.**

   **An instance of it, from P1B-56.** That ticket's copy-back at step 10 of
   the live rehearsal asked whether each of three finding names "appears
   among the findings". Verifying an absence means scanning a list and
   concluding, which is inference. The operator's answer included "whether it
   appears among the findings: UNKNOWN", and then every finding pasted in
   full, which is the form the step should have asked for. P1B-57 changed the
   copy-back to "every finding's name and severity, in order". A step asks
   for what is on the screen, never for what is not.

   **A second instance, from P1B-57, where the instrument broke the rule and
   not the operator.** Step 11 of the live rehearsal asked for "the number of
   operations headed “Create:”, the number headed “Update:”, the number
   headed “Delete:”". The Preview panel showed one card for each operation
   and no count anywhere. The step asked the operator to tally what the
   screen never summarised. With some ninety operations the answer was "MANY
   (too many to visually count)", in two runs in a row. P1B-58 made the
   screen summarise it, in one line above the cards, “Operations proposed: N.
   Create N, update N, delete N.”, and reworded the copy-back to that line.
   A step asks for a line to read. When the line does not exist, the fix is
   to the screen, and the step follows it.

   **A third, also from P1B-57.** Step 9 asked for "every line in the grey
   box, each sentence with its code". The uncoloured events are not in the
   grey box: the screen counts them in one sentence and lists them under it.
   But each of those lines carries a code too, so with the list open the
   instruction read as though it covered them, and 85 of them came back.
   Nothing on the screen was wrong. P1B-58 reworded the copy-back to name the
   three things wanted and to say that the list under the sentence is not
   one of them. A copy-back says what is not wanted when something beside it
   looks like what is.

   **A `READ` that predicts must be true, and a prediction the runs
   contradicted is rewritten from the runs.** The rule says `READ` quotes the
   words the screen will show. The live rehearsal went further and told the
   operator what to expect: that the week would not hold everything, that
   “Not in this Plan” would be long, and that about sixty events would move.
   The P1B-57 run left one Task out, and the P1B-58 run left none. A document
   that tells the operator to expect the opposite of what they will see is
   worse than one that says nothing: a correct screen then reads as a fault.
   P1B-57's report flagged it and left it, because that ticket did not ask.
   P1B-59 rewrote the paragraph and the three sentences in steps 10 and 12
   from what the runs recorded: 85 uncoloured events and 84 placed in the
   P1B-57 run, nothing left out in the P1B-58 run, and “Operations proposed:
   27. Create 7, update 20, delete 0.” A sentence about a past run now names
   the run, and never says “last time”, which goes stale with the next one.

   **A copy-back never asks for a private value.** The step P1B-58 added, for
   the screen “UniverseState”, asks for one line: the names of the four
   collections and a count for each. A UniverseState holds facts about the
   operator's own life. No step may ask for a value, a key or a row from that
   screen, and the step says so in its own text so that a later edit does not
   widen it.

   The P1B-53 ticket calls this the fourth rule. It is the fifth here only
   because the P1B-51 ordering rule already holds the fourth place; it is the
   same rule.

   What it means for a step in `scripts/acceptance.mjs`:
   - it has four fields, and the harness prints them under those four words:
     `OPEN`, `CLICK`, `READ` and `COPY BACK`;
   - `OPEN` names the screen as the navigation names it. `CLICK` names the
     control by the words on it, in quotation marks, and says which card or
     heading it is under;
   - `READ` quotes the words the screen will show. It does not ask whether
     something "looks right";
   - `COPY BACK` says which lines, rows or box. "The whole box", not "what
     you see";
   - nothing asks the operator to compare two things and draw a conclusion.
     A comparison that matters is a scenario in the runner.

   What it means for a ticket: its acceptance section says which script to
   run and which document to follow. The steps live in the harness, which
   prints them, and in [the live rehearsal](LIVE_REHEARSAL.md), which is the
   single source for the live sequence. A ticket that restates steps has two
   copies to keep true, and the operator follows the wrong one.

6. **A step is either an instruction — start this, open that, stop — or a
   verification, which asks the operator to read something and copy it back.
   An instruction stays as long as the procedure needs it to reach the state
   the verifications depend on. A verification is retired once it has passed
   live, unless the ticket changes something that could affect it. Every
   retirement is recorded in the ledger below, naming what was proven and in
   which ticket, so that retiring a check is a record and not amnesia.**

   The operator's rule, from P1B-55. The live rehearsal had reached fifteen
   steps and fourteen copy-backs, and most of them re-proved something that
   had already passed.

   What makes the pruning mechanical and not a judgment each time:
   - an **instruction** reaches a state. It has no copy-back, and it stays
     while a later step needs that state. Authoring the night stays, because
     a fresh store has no night;
   - a **verification** asks for something to be read and copied back. Once
     that has come back right from a live run, it is retired: where the step
     is also an instruction, the instruction stays and only the copy-back
     goes; where the step was nothing else, the step goes;
   - **a ticket that changes what a retired verification covers brings it
     back.** The ledger is where to look: each line says what was proven, so
     a ticket that touches that thing can see which check to restore;
   - the harness follows the same rule. A seed that only a retired step
     needed goes with it; a seed another step needs stays.

   P1B-73 explicitly retires duplicate numeric/status transcription under existing
   runner/UI coverage plus new projection tests. That is an operator withdrawal
   of redundant work, not an inferred live confirmation; the ledger says so.

   The ledger is what makes the rule safe. Without it, "that was proven once"
   is a memory, and in six months nobody can say whether Google's consent
   flow was ever exercised against a real account.

7. **A figure the operator is shown must be computed over the span it is
   named after, and a value UbU manufactured in place of a measurement is
   never presented as one.**

   Each of the first six was written after a specific failure. This one was
   written after four tickets of a report nobody believed. Every Plan from
   P1B-53 to P1B-55 arrived as high risk, and the operator said so each time.
   Both halves of the rule earned their place in the same week:

   - **the span.** The risk report said “this Plan holds for 9% of the ways
     the next 60 minutes could go”. The 9% was computed over the whole week.
     The sentence named an hour. The kernel's continuation walk judged every
     step of the Plan while its boundaries, its scope label and the sentence
     were about the reactive horizon. The figure was right about the week and
     false as shown;
   - **the stand-in.** With no Snapshot, the orchestrator manufactures an
     affect observation on each tolerance's own location. Its margin is
     exactly zero by arithmetic. The report read that zero as a measurement
     at its limit: “affect margin 0.000”, “depleted”, and two findings, on
     every run, beside a Plan that was fine.

   What it means for a step: a step never asks the operator to read a figure
   and judge the Plan by it unless the figure is about what its label says,
   and it never asks them to copy back a value that was not measured as if it
   were one. A value that was not measured reads “not recorded”. A figure
   about one span is not printed under the name of another.

   What it means for a ticket: when a report is wrong on every run, that is
   a defect in the report, to be investigated before the next feature, and
   not a standing condition to work around.

8. **A screen stating what it proposes must also state what it found already
   correct.** Otherwise an empty proposal is indistinguishable from a failure.
   P1B-60's preview count and sentence make matching current Plan placements
   visible beside proposed operations; retained completed history is excluded.

### P1B-73 operative rules 10 and 11

10. **A manual step exists only for rendering.** The harness's own justification
    is: “Three things it cannot see remain for a human: the Tauri HTTP plugin
    transport, the capability scope, and anything rendered.” It then says:
    “The third is the only reason a human opens the app.” A verification that
    does not inspect rendering moves to the runner or driver. Human consent and
    judgments remain choices; deterministic verifications do not become choices.
11. **A manual instrument has one line of execution.** It completes or stops
    with a named reason and remedy. It may not branch on what the operator sees
    or ask for a phrase describing an absence. Live numeric readings belong to
    the script. Rendering inspection belongs to the pre-release visual pass.

A step with no diagnostic to meet says so: its `codes` is `[]` and the
harness prints `none`.

### The list from P1B-56, unchanged by P1B-57, P1B-58 and P1B-59

P1B-57 adds no step and retires none. It adds one scenario to the staging,
`week_leftover`, below: the staged calendar holds an event UbU wrote in an
earlier run, and the capture must name it and make no Task of it.

P1B-58 adds no step here and retires none. It adds one scenario to the
staging, `week_universe`, below: the staged store's UniverseState is read,
one invented fact is set and read back, and a malformed mutation is refused
with the state left as it was. The step names the seed so that it is checked
before the step is printed. The step itself reads nothing from the
UniverseState, and no staged Task waits on the fact. The new screen's step is
in the live rehearsal, as its step 13. The staged store does hold that one
invented fact, so the screen “UniverseState” in the staged app is not empty.

P1B-59 adds no step here and retires none. It adds one scenario to the
staging, `week_measured`, below: a number is set outright and read back
exactly, it is cleared and its key is gone, and a Task that waits on a number
with `at_least` is not ready until the number is set above the value and is
in the next Plan once it is. That last part is the whole chain of that
ticket, schema to planner, proved over HTTP. The staged store ends with one
measured number beside the asserted fact, so the staged screen shows both
words. The live rehearsal's step 13 gained one sentence and its copy-back is
unchanged: names and counts, never a value.

One step. The sixth rule retired the three that P1B-55 printed: they passed
with that ticket, and P1B-56 changes nothing they cover. They are in the
ledger below. The step that is left is what P1B-56 changed on the screen.

| # | step | kept or new | staged by |
|---|---|---|---|
| 1 | The risk report says what it means: Today, “Generate Plan” | kept: P1B-57, P1B-58 and P1B-59 retire nothing | `week_colours`, `week_calendar`, `week_leftover`, `week_routine`, `week_night`, `week_backlog`, `week_universe`, `week_measured`, `week_risk` |

It reads the badge beside “Plan risk”, the bold names of the findings under
it, and the three affect rows of “Plan-quality signals”, which on a store
with no Snapshot read “not recorded”. Its `codes` name the one case in which
“high risk” is a correct reading: a staged commitment starts within the next
60 minutes with uncertain work placed in front of it. The harness stages in
the computer's own timezone at whatever time it is run, so that case can
happen, and it is the report doing its job.

What the step relies on is checked over HTTP before it is printed, by the
seed `week_risk`, which holds the two scenarios P1B-56 added:

- **the risk report of the staged week names no affect finding and is not
  high.** A Plan is generated. No finding has the category `affect_margin`,
  `post_plan_depletion` or `destructive_pressure`; the Plan-quality report's
  state is `neutral` and its first suggestion is the stand-in sentence; and
  no finding is High except `low_coverage` with a commitment in scope;
- **the coverage figure is absent or in scope.** If the selected candidate
  carries `coverage`, every `boundaries[].start_at` is inside the next hour,
  and the figure is not below its target with no boundary to attribute that
  to. The second clause is the defect as it showed: 65% with nothing in the
  hour to explain it.

These two are the one place this harness asserts behaviour. They are here
because the operator's own run is what exercises them, and the same
assertions are in the runner's scenario 19.

## The ledger of retired verifications

One line for each retirement: what the check proved, the ticket whose
acceptance run proved it, where that is on record, and when it was retired.
A ticket that changes the thing a line names brings that check back.

“On record” is exact about how good the record is. Some of these were named
in a later ticket's own text, which quotes what the operator's run showed.
Others passed only as part of an acceptance run that the next ticket calls
accepted, with no line of their own. Those say so.

### From `docs/LIVE_REHEARSAL.md`

Step numbers are the ones the document had in P1B-54.

| retired | what it proved | proved in | on record | retired |
|---|---|---|---|---|
| step 1, the whole step: run the scripted checks, copy back the `RESULT:` line and the `staged and checked` line | that the runner and the harness's staging pass on the operator's machine | P1B-53, P1B-54 | the P1B-55 ticket: a duplicate of each ticket's own acceptance steps 1 to 3, which still run both | P1B-55, 2026-10-02 |
| step 3, the copy-back: the block from `This is the LIVE run.` to the `token cache` line | that `run-live.sh` names the store, the calendar and the horizon before it starts, and refuses each of its five bad configurations | P1B-53, P1B-54 | the P1B-55 ticket: "the banner and all five refusals passed in P1B-53 and P1B-54" | P1B-55, 2026-10-02 |
| step 5, the whole step: read the colour of sleep, copy back the row “sleep” and the row for colour id “8” | that `sleep` holds colour 8 by default on a live store, and that Graphite maps to `sleep` alone | P1B-54 | the P1B-55 ticket: "passed: `sleep 8 default`" | P1B-55, 2026-10-02 |
| step 6, the copy-back: the Timezone, Duration and Nominal start entered for the night | that a night authored in the app is planned at its own local hours | P1B-54 | the P1B-55 ticket: Today showed `Thu, Oct 1, 11:00 PM → Fri, Oct 2, 7:00 AM` in `America/New_York` | P1B-55, 2026-10-02 |
| step 9, the copy-back: the lines “accepted true” and “enabled true” | that Google's consent flow and the session enablement work against the operator's real account | P1B-54, and first in P1B-52 | the P1B-55 ticket: "passed: accepted and enabled"; the P1B-53 ticket: "the live rehearsal started against a real calendar for the first time" | P1B-55, 2026-10-02 |
| step 15, the copy-back: which choice was taken for the colour of sleep | nothing of its own: it belonged to step 5 | P1B-54 | retired with step 5 | P1B-55, 2026-10-02 |

Retired in P1B-60; these step numbers are from P1B-59.

| retired | what it proved | proved in | on record | what covers it now | retired |
|---|---|---|---|---|---|
| step 5 and copy-back item 1, the colour-to-category setup and table | the capture mapping agrees with the operator's categories | P1B-56 through P1B-59 | P1B-60 records the identical table returned in P1B-56, P1B-57, P1B-58 and P1B-59 | `capture_partition.rs` and the runner's colour scenarios assert the mapping; the operator's own tooling now performs both setup and colouring | P1B-60 |
| step 6 as an instruction, colouring the week | colour partitions commitments from work to schedule | P1B-55 and every run since | P1B-60 records the partition proven live in P1B-55 and every subsequent run | `capture_partition.rs` and the runner's colour scenarios; the operator's own tooling now performs both steps; four capture facts remain beside new step 7 | P1B-60 |

Retired by operator decision on 2026-10-06; step numbers are from P1B-68.

| retired | what it proved | proved in | on record | retired |
|---|---|---|---|---|
| step 13 and copy-back item 8, the first live finite-snooze reading | the review producer runs against an operator-authored precondition and returns a verdict; it did not prove a live critique or snooze interval, which requires model disagreement; intervals remain asserted by the runner against the stub | P1B-68 | P1B-69 quotes the operator's live result, “1 preconditions examined; 1 judged sound.”; explicit operator retirement, not inferred interval acceptance | P1B-69, operator decision 2026-10-06 |

The operator declined to manufacture a false requirement on their own store
just to induce disagreement. Synthetic reversed requirements remain staged by
the harness and finite intervals remain asserted by the stub-backed runner.
A ticket changing those intervals brings this check back under the ledger rule.
Nothing else is retired by P1B-69.

Three copy-backs and one instruction went from that document **without
having been proven**. They are not retirements, and they are written down so
that nobody takes them for one:

| dropped | why | what covers it now |
|---|---|---|
| step 2, the sentence saying which store was used | there is no longer a choice to state: the step always starts a fresh store | the instruction itself |
| step 8 as P1B-55 numbered it, the whole instruction: delete UbU's own events from the calendar by hand. It had no copy-back of its own | dropped in P1B-56. It was never run live: the operator declined the hand deletion in the P1B-55 run as too slow. **The hazard it guarded is still real**, and 81 colliding pairs in that run came from it | the calendar reset that replaces it as step 8, and the runner's scenario 20, which asserts the hazard that no live run has. From P1B-57, also the stamp UbU writes on each event it creates, which lets a new store name its leftovers and capture none, asserted by the harness seed `week_leftover` and by scenarios 19 and 20. **The stamp does not cover events created before it**: those are still indistinguishable from the operator's own, so the reset stays. The remedy has moved; the hazard has not gone |
| step 10, the sentence saying whether the store was new and what was deleted | the P1B-55 ticket: "the check ran but the hazard was never exercised live". The instruction stays | the runner's scenario 20 asserts the hazard; no live run has |
| step 11, the titles of commitments that did not come in, and of any title listed twice | it asked the operator to compare two lists and draw a conclusion, which the fifth rule forbids | the capture counters and the grey box, which are still copied back |

### P1B-73 retirements of the eight proposed P1B-72 transcriptions

The comparison requirement is withdrawn under rule 1. These retirements rest
on the existing runner/UI coverage **plus P1B-73 §B projection tests**, by the
operator's explicit correction. They do not certify P1B-72 acceptance or invent
a new live run. The older evidence qualifications remain. Item 9 stays active.
A ticket changing a named surface brings its check back under the ledger rule.

| retired | what it proved | proved in | on record | what covers it now | retired |
|---|---|---|---|---|---|
| item 1 transcription | live capture counters, no-colour observation and diagnostic counts | P1B-71 whole run; projection verified by P1B-73 §B; no new live confirmation | P1B-72 opening accepts P1B-71 as a whole; no item-1 measurements quoted | existing capture scenarios/UI tests; P1B-73 §B field-by-field projection tests and driver API counters and labelled diagnostic-entry histograms | P1B-73, explicit operator correction 2026-10-07 |
| item 2 transcription | live placements, exclusions and planning diagnostics | P1B-71 whole run; projection verified by P1B-73 §B; no new live confirmation | P1B-72 opening accepts P1B-71 as a whole; no item-2 measurements quoted | existing Plan scenarios/UI tests; P1B-73 §B field-by-field projection tests and driver labelled cardinalities/histograms, private excluded-work prose withheld | P1B-73, explicit operator correction 2026-10-07 |
| item 3 transcription | live risk level and findings | P1B-71 whole run; projection verified by P1B-73 §B; no new live confirmation | P1B-72 opening accepts P1B-71 as a whole; no item-3 measurements quoted | existing risk scenario/UI tests; P1B-73 §B field-by-field projection tests and driver fixed risk fields, private detail withheld | P1B-73, explicit operator correction 2026-10-07 |
| item 4 transcription | live operation counts, matching placements and first Dynamic Update | P1B-71 whole run; projection verified by P1B-73 §B; no new live confirmation | P1B-72 opening accepts P1B-71 as a whole; no item-4 measurements quoted | existing preview scenarios/UI tests; P1B-73 §B field-by-field projection tests and driver operation fields and counts, identity/gesture prose withheld | P1B-73, explicit operator correction 2026-10-07 |
| item 5 transcription | explicit live approval result and operations applied | P1B-71 whole run; projection verified by P1B-73 §B; no new live confirmation | P1B-72 opening accepts P1B-71 as a whole; no item-5 measurements quoted | existing apply scenarios/UI tests; P1B-73 §B field-by-field projection tests and driver approval status and operation-result histogram, human approval retained | P1B-73, explicit operator correction 2026-10-07 |
| item 6 transcription | UniverseState's four pre-authoring entry counts | P1B-71 whole run; projection verified by P1B-73 §B; no new live confirmation | P1B-72 opening accepts P1B-71 as a whole; no item-6 measurements quoted | existing UniverseState scenarios/UI tests; P1B-73 §B field-by-field projection tests and driver collection cardinalities only | P1B-73, explicit operator correction 2026-10-07 |
| item 7 status transcription only | genuine authoring and saved requirement outcome | P1B-71 whole run; projection verified by P1B-73 §B; no new live confirmation | P1B-72 opening accepts P1B-71 as a whole; no item-7 measurements quoted | existing authoring scenarios/UI tests; P1B-73 §B field-by-field projection tests and driver HTTP outcomes/readback presence, meaning/words remain operator-owned | P1B-73, explicit operator correction 2026-10-07 |
| item 8 numeric transcription only | each advisory producer's separate result/selection counts | P1B-71 named producer readings; projection verified by P1B-73 §B; no new live confirmation | P1B-72 opening quotes Vocabulary and Precondition candidates_enqueued 3 and selection none; no new live-driver measurements | existing advisory scenarios/UI tests; P1B-73 §B field-by-field projection tests and driver separate producer snapshots, words/names/decisions remain operator-owned | P1B-73, explicit operator correction 2026-10-07 |
| item 9 active human judgment; no retirement proposed | whether the chosen schedule and store suit the operator | P1B-71 whole run; judgment remains live each time | P1B-72 opening accepts P1B-71 as a whole; no schedule-judgment sentence quoted | operator's public judgment at every rehearsal; script cannot supply it | not retired |

### From `scripts/acceptance.mjs`

Step numbers are the ones the harness printed in P1B-54.

| retired | what it proved | proved in | on record | retired |
|---|---|---|---|---|
| step 1, the app reaches this orchestrator: Setup, “Run self-check” | that the Tauri HTTP plugin transport and the capability scope reach the staged orchestrator: three reads answered | P1B-52, P1B-53, P1B-54 | accepted with each of those tickets as a whole; no ticket names it | P1B-55, 2026-10-02 |
| step 2, a Task's notes: Tasks, “Notes for …” | that a description of `Q:` and `A:` lines is shown under the Task | P1B-51 and after | the P1B-52 ticket: the answers of a real interview "reached the Task's notes" | P1B-55, 2026-10-02 |
| step 3, time by category: Today, “Show report” | that the panel shows the rows and the total for staged time | P1B-52, P1B-53, P1B-54 | accepted with each of those tickets as a whole; no ticket names it. The P1B-51 ticket records that until then nobody had looked at it | P1B-55, 2026-10-02 |
| step 4, complete, then undo: Next Task | that a completion is undone from the app and the Task is recommended again | P1B-52, P1B-53, P1B-54 | accepted with each of those tickets as a whole; no ticket names it | P1B-55, 2026-10-02 |
| step 5, the part that read the night's two times on Today | that Today shows a placement's real start and end in local time | P1B-54 | the P1B-55 ticket: `Thu, Oct 1, 11:00 PM → Fri, Oct 2, 7:00 AM` | P1B-55, 2026-10-02 |
| step 6, the part that read the four lines of “Create: Asleep” and of “Create: Invented:” | that the preview says an operation's placement, and what a colour and a window change mean for it | P1B-53, P1B-54 | accepted with each of those tickets as a whole; the P1B-53 ticket records that Take preview "read as a result" in P1B-52's run | P1B-55, 2026-10-02 |
| step 7, sleep's colour with no Setting: Setup, “Reload colours” | that the Colours card shows `sleep` on colour 8 by default, with no collision | P1B-54 | the P1B-55 ticket: "passed: `sleep 8 default`" | P1B-55, 2026-10-02 |
| step 8, Clarify with the selector left alone: Review, “Run Clarify” | that a real model's interview runs in the app, names its round, and that a decline reads as a result | P1B-52 | the P1B-53 ticket: "Clarify ran two rounds with the round named" | P1B-55, 2026-10-02 |
| step 9, Clarify again with the Task chosen: Review, “Run Clarify” | that the selector interviews the chosen Task, and that the second round is named | P1B-52 | the same line of the P1B-53 ticket | P1B-55, 2026-10-02 |

Retired in P1B-56, on 2026-10-02. Step numbers are the ones the harness
printed in P1B-55.

| retired | what it proved | proved in | on record | retired |
|---|---|---|---|---|
| step 1, the uncoloured events are work and the Plan places them: Today, “Generate Plan” | that an uncoloured event is shown as a “Skeleton” placement at a time the planner chose, with no collision box | P1B-55 | accepted with that ticket as a whole. The P1B-56 ticket quotes the live run, 62 Skeleton placements from 63 uncoloured events, and not the harness step | P1B-56, 2026-10-02 |
| step 2, the preview moves them and gives them no colour: Calendar, “Take preview” | that each is one “Update:” operation, Dynamic, with what a colour would mean | P1B-55 | accepted with that ticket as a whole. The P1B-56 ticket records 65 of 65 operations applied in the live run | P1B-56, 2026-10-02 |
| step 3, the rule where capture is run: Calendar, “3. Capture”, then Setup | that the screen states the capture rule, and that an uncoloured event is not a fault | P1B-55 | accepted with that ticket as a whole; no ticket names it | P1B-56, 2026-10-02 |

With the P1B-55 retirements went the seeds only those steps needed: `completable`, `interview`,
`described`, `spent`, `advisory` and `week_sleep_colour`. What they staged is
still asserted where it always was: Clarify, undo, notes and the report by the
runner's scenarios 15 to 18, and the default colour of sleep by scenario 19.

## The staged week

From P1B-51 the harness also stages the switch rehearsal's week, the one
`check-ui-contract.sh` walks and asserts in its scenario 19. It is
`scripts/rehearsal-week.mjs`, imported by both, so what the runner proves is
what the operator looks at. Every title in it is invented and says so.

| seed | what it stages | what its check asserts |
|---|---|---|
| `week_colours` | `calendar.color.*` for the three categories the week uses, and one colour left mapped to nothing | each is a Setting, and colour 1 maps to no category |
| `week_calendar` | the week's calendar, captured in Mock | every event inside the horizon is one Task; a coloured event is Static, with its colour's category; each of the two uncoloured ones is Dynamic, and capture said it is work for UbU to schedule; the unowned instances were reported once, as one `capture_occupancy_only`; a second capture admits nothing |
| `week_routine` | one daily routine, at noon | it is listed |
| `week_night` | the **Asleep** routine: daily, 23:00, 480 minutes, category `sleep` | read back from the store: this computer's timezone, daily, `nominal_start` 23:00:00, 28800 seconds, Static, occupying capacity, category `sleep` |
| `week_backlog` | six Dynamic Tasks, one too long to fit anywhere, and a Preference | all six are active and Dynamic, and the Preference is listed |
| `week_leftover` | nothing more: the staged calendar holds one event UbU wrote in an earlier run, carrying its stamp, and `week_calendar` ran the capture | the capture named it once as `capture_stale_export`, by id; no Task was made of it; the Tasks from the calendar are one fewer than its events |
| `week_universe` | one invented fact, `facts.invented.kettle_descaled`, set through `PATCH /universe-state` on a store that had no UniverseState | before the edit the read answered the empty state with a null version; the edit answered with the one fact at version 2; a later read is exactly what the edit answered with; a malformed mutation sent behind a good one is refused as `universe_mutation_invalid`; and after the refusal the state is unchanged |
| `week_measured` | a number set to 0.7 and then to 0.1 through `set_numeric`, cleared through `clear_numeric`; one Task, “Invented: water the imaginary bench”, with the precondition `numeric_values.invented.tank_level` `at_least` 25; that number set to 24 and then to 40, as `measured`; and a Plan generated at each stage | the number set to 0.1 is exactly 0.1 in the edit's answer and in a later read, which the difference P1B-58's screen sent was not; the cleared key and its provenance are gone; the Task is in `blocked_tasks` and in no step with no number recorded and at 24, and is in a step of the Plan made at 40; the level's provenance is `measured` and the fact's `asserted`; and no provenance entry is left for a value that is gone |
| `week_risk` | one Plan of the staged week, generated over HTTP | no affect finding; the Plan-quality state is `neutral` and its first suggestion is the stand-in sentence; every coverage boundary is inside the next hour, and no uncovered mass is reported without one; nothing is High except `low_coverage` with a commitment in scope; `unplaced_work` is named |
| `week_matches` | the Plan generated by `week_risk`, applied to the throwaway mock calendar so a captured Dynamic event sits at its Plan window | that captured event's window equals the staged placement, and the Task remains Dynamic; preview behaviour and wording are asserted by the runner |

The week's calendar is a file the mock Calendar observes, written before the
orchestrator starts and named by `UBU_CALENDAR_MOCK_EVENTS`. With that set, a
Live calendar request is refused before any client exists, so the app cannot
reach a real calendar from the staged orchestrator.

**The horizon** is the orchestrator's default, which from P1B-53 is one week.
Export `UBU_PLANNING_HORIZON_SECONDS=86400` before running the harness to
stage one day; the harness passes it through and prints which horizon is
staged. At one week, all seven recurring instances are inside the horizon; at
one day, one of them is.

**Each instance is its own Task.** Capture records occupied time; it does
not reconstruct recurrence. The staged calendar holds one recurring
commitment, and the staged store holds one unrelated Static Task for each
instance inside the horizon. Nothing in UbU knows they are one commitment,
and the harness says so in the line it prints for `week_calendar`.

**The week has a night in it.** The harness stages the week in this
computer's own timezone, with its events at local wall-clock hours, and an
Asleep routine from 23:00 to 07:00. UbU has no working-hours setting; a
capacity-occupying Static routine is how it is told when no work may be
placed. See [availability](AVAILABILITY.md). The night block is why a Plan
generated in the evening starts the rest of the work the next morning and
not at midnight, and the Generate Plan step says so. Take preview shows each
night as an event to create: Asleep is exported to the calendar as a Busy
block, on purpose.

**One Plan is staged**, by `week_risk`, after all Task seeds. `week_matches`
then stages that Plan in the mock calendar without generating another.
`week_measured` generates three before it, to show its Task not ready
and then planned; each is superseded by the next. It is what the two HTTP scenarios are asserted on. The operator generates
another in the step, so the Plan on the screen is one made while they watch.

**Checks run after every seed is made**, in a second pass, so a check sees
the whole staged store and not only what was made before it.

## How to add a step

1. Check the step against all eleven acceptance rules, and decide where in the
   order it goes: before the first model-dependent step unless it is one.
2. Write the step in `STEPS`, in order, with `needs` naming every seed it
   relies on, `open`, `click`, `read` and `copy` in the words the app uses,
   and `codes` naming every diagnostic it can meet. Take the words from the
   app's source, not from memory. If the
   precondition does not exist yet, write the seed in `SEEDS` with a `what`,
   a `make` and a `check`.
3. Make the `check` assert the thing the step actually depends on. If the
   step depends on what Next Task recommends, the check asks `/next-action`.
   If it depends on which Task Clarify picks, the check computes the pick.
4. Run `./scripts/acceptance.sh --stage-only` until every seed prints `OK`
   and every step prints with its objects named. A `FAIL` names the seed
   and the reason.
5. Only then hand the steps over. The operator runs the same command
   without `--stage-only` and follows what it prints.

One step list at a time. A ticket replaces the list; git history keeps the
old ones.

## What belongs in the runner instead

**Anything assertable over HTTP belongs in `check-ui-contract.mjs`, as a
scenario, not here.** If a step's outcome can be checked by a request, it is
not a manual step: write the scenario, and let the runner assert it every
time. The harness stages; it never asserts behaviour. That is the boundary,
and it is what keeps the manual list short.

## Running it

```sh
./scripts/acceptance.sh                # stage, print the steps, hold until Ctrl-C
./scripts/acceptance.sh --stage-only   # stage, check, print, exit
```

Then, in another terminal:

```sh
cd ../ubu-ui && npm run tauri:dev
```

Requirements: `cargo`, Node 22 or newer, and the `ubu-orchestrator` and
`ubu-ui` checkouts beside `ubu-devshell`. There is no `package.json` and
nothing to install. The build is `cargo build --locked --offline`.

| Variable | Default | Description |
|---|---|---|
| `UBU_ACCEPTANCE_MODEL` | unset | `advisory.model` to stage. Unset, the operator chooses it in Setup, and the staging output says so. |
| `UBU_ACCEPTANCE_ENDPOINT` | `http://127.0.0.1:11434` | `advisory.endpoint` to stage. |
| `UBU_ACCEPTANCE_TIMEOUT_MS` | `600000` | `advisory.timeout_ms` to stage. |
| `REPOS_DIR` | `../` relative to devshell | Parent directory of all repos |
| `ORCHESTRATOR_DIR` | `$REPOS_DIR/ubu-orchestrator` | Path to orchestrator checkout |
| `UI_DIR` | `$REPOS_DIR/ubu-ui` | Path to UI checkout |
| `STARTUP_TIMEOUT_SECONDS` | `60` | How long to wait for `/health` |

The model is the operator's to choose: the endpoint and the timeout are
plumbing, the model is what a real-model step exists to vary.

### The default port

The harness starts its orchestrator on the app's default port, and **refuses
to start if something already answers there**. Otherwise the app might be
talking to the operator's real orchestrator while the operator follows steps
written for a staged one. The refusal says what to do: stop the orchestrator
you have running.

### The operator's store is unreachable

The staged orchestrator runs with `HOME` and `UBU_DB_PATH` both inside the
harness's temp directory, `UBU_DEVICE_REGISTRATION` there too, mock GitHub
modes, and nothing else in its environment: no token and no Google path. Its
working directory is the temp directory. The first line the harness prints
is the store path, so it can be seen to be a temp one. `ubu-orchestrator.db`
in the repo is not opened.

### Ending

Ctrl-C is how a session ends, so the interrupt path is the normal path. The
harness stops the orchestrator and `acceptance.sh` removes the temp
directory, on Ctrl-C, on `SIGTERM`, on a failed seed and on `--stage-only`.
The last line says the store is gone.

## P1B-61: a candidate must be evaluable

9. **A candidate the operator can admit must be one the system can evaluate.**
   Validate every precondition branch and its mode before enqueueing, and admit
   only over targets that still exist. Otherwise a suggestion can silently
   create work that cannot currently run. This does not change `absent`, which
   is true for a missing key, or imply a missing fact can never be authored.

Nothing is retired. `week_precondition` stages one invented fact and one Task
with an invented description implying a precondition over that fact. Its check
verifies those inputs, not advisor behavior. Scenario 24 in the runner asserts
proposal, admission and planning as the fact changes. The live rehearsal has
13 numbered steps and 8 numbered copy-back items. The new step is 12, after the
UniverseState check and before Stop, following the operator-approved correction
to §H's original middle-of-sequence placement. Step 9 states the Dynamic count.

Copy-back preserves the count and predicate words, redacting target identifiers
and expected values from a candidate sentence; that sentence can contain private
facts too. No fact value or Task description is requested. Operator acceptance
is not performed by the automated checks.

The operator briefly requested a two-job Cargo default during this ticket,
then reported another OOM and requested the known-good one-job configuration.
The default is restored to one; invocations remain sequential. See BUILD_ENV.md.

## P1B-62: a dismissal is a snooze, never a silence

An operator can put a critique aside without hearing it again this week, and
can reconsider it later. Keying on the subject prevents repeated rewordings;
finite intervals, a ceiling and the blocking-work cap keep future reconsideration
available. Normal review honours a hold; explicit Review again now bypasses it.
Nothing is retired by this ticket. The harness stages a synthetic Task whose
admitted at_most comparison contradicts its description's at-least requirement,
over an existing numeric target. The runner asserts review behavior.

The live rehearsal remains **13 steps and 8 copy-backs**. Step 8 and its existing
copy-back read the new placement count line instead of tallying badges. The
interim case-sensitive occurrence-counting command is retained as history until
the count line is confirmed live. No other copy-back asks for a hand tally of
rendered items. The existing advisor step remains after deterministic
UniverseState and before Stop. Review requires a separate click there, so no
review copy-back is added. Any future review copy-back must retain only verdict
and tree shape, replace identifiers and expected values with placeholders, and
omit model reason text, fact values, real Task titles and descriptions.

## P1B-63: the advisor reads what capture writes

A manual step's inputs must be staged by something that runs during that
document's own procedure. `LIVE_REHEARSAL.md` explicitly stops `acceptance.sh`,
so the acceptance harness stages nothing for that separate live procedure.
P1B-61/62's step 12 depended on descriptions that its calendar capture could not
write, while the only described seed lived in the stopped harness. Every
captured Task was skipped. That was a design error, not a failed model run.

A runner scenario that stages Tasks through `POST /task` does not exercise a
store built by calendar capture. A producer whose input only the manual route
can supply can pass those tests and do nothing on the operator's store. The
P1B-63 scenario therefore starts with two mock calendar events, captures them,
and runs the advisor for both a title-only Task and one with imported notes.
Notes are optional; a non-blank title is sufficient. Routine occurrences stay
excluded. Calendar notes fill only a blank description, never overwrite existing
Task notes, and are never exported back to Google.

Nothing is retired. The live rehearsal remains 13 steps and 8 copy-back items;
its last model-dependent step is still step 12. It can now reach the model,
but promises no candidate. All outcomes remain results to copy back with the
existing redaction. Passing the runner and UI tests is not operator acceptance:
the operator must run the full live procedure and return its copy-back.

## P1B-64: the model is told what the validator will accept

When a producer constrains a model with a schema, that schema is part of the
contract and must be tested against the validator, not against the model's
behaviour. A schema that admits a validator-refused tree is a defect model
quality cannot fix. It presents as a model failure, which is how the expected
presence and predicate/collection gaps survived P1B-61, P1B-62 and P1B-63.
The tests must include concrete witnesses of that gap, rather than merely
checking that a stub emits what a scenario wants.

A batch validator that aborts on the first refusal converts one bad answer into
no answer; the operator reads that as the feature not working. Independent
Task proposals are refused independently, with bounded code-authored reasons.
Previously recorded diagnostics survive. A decoded result can have no usable
proposals and still be `ok`; an undecodable result retains its whole-response
malformed diagnostic. Scenario 27 asserts that two valid proposals survive one
equals leaf without an expectation, and observes the facts-only request format.

Grounding required three operator-approved corrections. The proposed equality
of schema and validator sets was impossible: core and the existing validator
support object/array equality, while the ticket deliberately asks for scalar
model expectations and a smaller depth. We chose a safe subset with an
unchanged validator, rather than restricting established manual admission or
expanding the model grammar. Three levels with ten children permit at most 111
nodes; depth alone with 128 children would violate the 128-node guard. A full
depth-16 expansion or exact node-budget grammar would be larger and harder for
the model and operator. Finally, the prompt now says “the predicates allowed by
the response schema”, rather than promising seven where facts alone permit
two; its remaining constraints retain their wording. The contract tests
explicitly distinguish valid trees inside the grammar, invalid trees, and
validator-valid trees deliberately outside that conservative grammar.

Nothing is retired. Step 12 remains model-dependent and promises no candidate.
It explains that facts offer “is” and “is not recorded”, while numbers also
offer comparisons. Its new per-proposal refusal code says the rest of the run
stands; its malformed-result code means no proposal result could be decoded.
The live rehearsal remains 13 steps and eight redacted copy-back items.
Passing 27 deterministic scenarios is not operator acceptance: the operator
must run the whole live procedure against their own calendar and return its
copy-back, with step 12 as the step under test.

## P1B-65

The operator has withdrawn hand redaction for his own live rehearsal copy-back:

> “The specific requirement to strip value by hand is impractical. I am explicitly sharing my data now so there's really no need to redact anything; you have full access anyway.”

This explicitly supersedes P1B-62's forward rule that future review copy-back
must replace identifiers and expected values with placeholders, for this
operator's own rehearsal. Step 12 asks for the precondition's words as rendered,
with no substitution. Its `absent` predicate has no expected value to substitute.
The waiver covers transcription to the operator's conversation, not repository
content: every committed fixture remains invented, with no real Task titles,
notes, event identifiers, or fact keys or values. Step 11's prohibition on
copying a key, value or table row from UniverseState remains verbatim. A later
editor must not restore the placeholders as a correction for this operator.

Bulk transcription has shortened or abandoned four rehearsals. Steps 7 and 8
now request each diagnostic code and how many lines carry it, rather than every
sentence. This is a labour correction, not a privacy measure. The rehearsal
still has thirteen steps and eight copy-back items; the rejection outcome is
part of item seven.

Planning collision diagnostics name Task titles so a person can recognise the
two commitments on screen. Calendar capture diagnostics name only ids because
they are read in bulk. Both families answer their own question correctly; neither
changes. The copy-back rule concerns how much to transcribe, not which family
produced it. Plan, capture and colour behavior, precondition rendering, advisor
schema and review snoozes are unchanged. Nothing is retired.

Two grounding corrections were approved before implementation. Initial
precondition proposals use durable rejection, while finite snoozes belong to
`precondition_review` critiques of already-admitted requirements. Step 12
therefore reads the durable warning, uses Reject, Reason and Confirm reject,
and reports whether the proposal left the queue. A sound proposal stays in
Review; no candidate means “no candidate appeared, so nothing was rejected”.
Live finite-snooze acceptance remains outstanding. Adding an admission and an
extra model run would change the rehearsal's decision and still could not
promise a critique, so the existing durable path is the chosen correction.

UNIVERSE_STATE requires route contract changes in the implementation commit.
Its essential namespace contract therefore ships in section A, with broader
context in section D. Deferring the whole contract to D would violate that
same-commit requirement; combining A and D would violate the ticket's separate
section commits. No behavior is changed to resolve either documentation conflict.

## P1B-66

P1B-62 established that no copy-back may ask for a hand tally of rendered
items. P1B-65's own “each diagnostic code and how many lines carry it” wording
broke that rule. This is a recurrence by the same ticket author within three
tickets, not a new UI principle: any copy-back phrased as “each X and how many”
is a tally in disguise. The repair is the same as P1B-62's placement count:
the screen states the number. Calendar capture and Today's information lists
now expose one selectable “Diagnostic counts:” status line, in first-seen code
order. Their diagnostic sentences remain on screen for understanding the week.
The other twenty-nine DiagnosticsList call sites are unchanged.

The audit covers all eight items. Items 1 and 2 copy already-counted lines;
item 3 copies the whole Plan risk panel rather than extracting each finding's
name and severity; item 4 copies the operations count and the first Dynamic
Update, or “no Update operation”; items 5 and 6 copy existing approval and
Entries lines; item 7 copies Run status and Candidates enqueued, the precondition
as rendered and the rejection outcome, without tallying Review diagnostics;
item 8 is the operator's own assessment. Named absence phrases cover empty
diagnostic lists, placements, the Plan risk panel and zero updates. No item
asks for a hand count or per-item naming exercise.
Step 11's UniverseState restriction and step 9's converged-state explanation
remain verbatim. The rehearsal remains thirteen steps and eight copy-back items.
The operator's P1B-65 transcription waiver remains; repository fixtures are
still invented. No redaction or copy-for-report control is added.

A producer that works is a labour source. Assume the first newly working
advisory producer will flood its queue unless something bounds it. A
precondition run now considers up to 25 Tasks but proposes for at most three,
and ten proposed or resurfaced precondition candidates block another run before
a transport is consulted. Deferred candidates do not block it. The refusal
states the current count and asks the operator to review, defer or reject what
is waiting; no model was asked. Ten is an attention judgment that the operator
may want lower, and a model may choose the first three. These caps make review
manageable; they do not improve proposal relevance. The small vocabulary is
the cold-start problem for P1B-67. Nothing is retired.

Today's separate failure list retains its existing rendering. The rehearsal
asks for the information list's count line and names its absent-line outcome;
it never calls an absent count line proof that no failure diagnostic exists.
Finite-snooze live acceptance still belongs to precondition_review and remains
outstanding. The initial-proposal rejection path stays durable.


## P1B-67

A manual step must name the absence of every figure it asks for. Three instances
establish the rule: the operator invented [value] for a condition that had none,
NONE for an absent operation, and “no Diagnostic counts line” when capture's
list correctly rendered no count line. A step that assumes presence produces an
invented phrase, a reporting defect even when the system is correct. Audit all
copy-back fields, including failed requests that leave result lines absent.
Use named absence phrases; do not restore a hand tally or diagnostic transcription.

Grounding corrected two descriptions with operator approval. Step 7 already
named “no Diagnostic counts line” after P1B-66; it is preserved, not claimed as
new work. The audit also covers all other eight items. Core's schemas-ref is a
fixture compatibility input, not runtime enum validation; its pointer moves to
section A and whole-fixture round trips are checked. Runtime core types remain
handwritten. The report records the moved pointer and coverage explicitly.

Vocabulary is the first advisory output whose admission writes an object the
candidate does not reference. target_refs names its evidence Task, while admission
writes UniverseState. That distinction must be documented rather than treating
refs as a destination contract. UbU proposes only names; every value is supplied
by the operator and recorded as asserted through the shared UniverseState
mutation service. No value is defaulted, inferred, derived or sent to a model.

Only facts and numeric_values names are proposed in this phase. Sets require a
member form and Event markers an occurrence form. This is a scope choice, not a
statement about those collections. Controlled subject vocabulary remains open.
The three-proposal and ten-awaiting bounds are independent of the precondition
queue. Rejection is durable by name and Task; finite review snooze remains live
unaccepted. Nothing is retired.

Scenario 30 proves the two-click sequence over stub-backed loopback HTTP: a
cold-start title-only Task, a bounded three-name response with one reserved-name
refusal, no-value admission refused without a seed, an operator-supplied value
written as asserted, and a separate precondition context containing the new name
and no observation. The live step judges the names, not those deterministic
admission or context assertions. Hand-authoring stays as fallback if no proposal
is admitted; neither producer's output is a prerequisite that can strand the
rehearsal. Every model outcome remains a result, with no reruns to force a candidate.

The rehearsal stays at 13 steps and eight copy-back items. Item 7 includes both
producer result lines and the operator's judgment of the names without adding
an item. Step 11's protected paragraph and step 9's converged-state explanation
remain verbatim. The operator's precondition transcription waiver remains in
force; no hand redaction is restored. No new real data is placed in repositories.
Passing the runner and UI tests is not operator acceptance: the operator must
run LIVE_REHEARSAL.md end to end against his own calendar and return its copy-back.
The new first half of step 12 is whether a suggested name is worth recording.


## P1B-68

The operator must be able to read and author the requirement that determines
whether their Task appears in a Plan. The Tasks form reads admitted and manual
requirements alike in words, authors one leaf over recorded targets, and clears
explicitly through the same versioned Task route. Trees remain readable and
clearable; tree authoring is outside the Phase 1b form. Candidate admission
history is not reopened by a later Task edit. The existing review subject key
includes the condition, so changing it already invalidates the old hold.

Rule 4 decides the new live order. Step 12 records an operator-owned target and
authors a requirement deterministically before any model-dependent step. Step 13
reviews that requirement and reads a finite hold if a critique appears. Step 14
then runs Vocabulary and Precondition as separate clicks; neither depends on
the earlier review's output. A failed authoring or no candidate remains a named
outcome, never a reason to abandon later steps. The full live rehearsal is now
15 numbered steps and ten copy-back items. No deterministic admission, clearing,
planner-gate or interval arithmetic is reverified manually: the live task is
the actual webview's authoring and the first finite-hold reading. Nothing is
retired and no live acceptance is claimed by the automated tests.

The shared selection code is advisory_task_skipped. Each independent producer
response carries its decision, three named Tasks then one count. Review renders
the latest shared selection notes once; it does not introduce cross-request
suppression or combine the two model requests. Producer refusals retain their
own codes. Rehearsal-facing Review lists now state Diagnostic counts. The count
is of rendered lines per code, not a Task count; sentences remain readable.

Grounding corrected three descriptions with operator approval. First, the API
has two independent producer clicks, so neutralizing the code alone cannot
deduplicate their rendered panels; section D adds one shared selection report.
Second, P1B-67 already requested vocabulary candidate counts and explicitly
forbade code transcription/tallying. That existing request is preserved; the
new work names the rendered count lines and copies results before navigation
can discard them. The omitted vocabulary count is the fourth presence/reporting
incident beside [value], NONE and the missing diagnostic count line, without
claiming its instruction was absent. Every copy-back item is audited again.
Third, the obsolete undo rule was also repeated in DESIGN §23.1 and the solved
Q0132 summary. Their specific undo text is corrected with the same D0278
supersession, preserving their other policy and status metadata.

Scenarios 31–33 assert operator leaf authoring/null clearing, the shared gate,
and truthful stamped-origin reconciliation over mock loopback HTTP. The latter
keeps foreign grouping and applied ownership unchanged: a stamp proves origin,
not adoption or write authority. Calendar's two legend paragraphs retain their
layout and state future gestures conditionally. My assertion remains the
UniverseState default; A reading records measured. No derived/proposed choice
is offered and no fact observation goes to a model.

D0291 records a two-tier effective subject vocabulary and ratification before
the switch. It adds no root and implements no registry, minting control or
validator; affect and D0242 remain reserved and unchanged. The desktop GPU scope
stands for the raised planning expectation, without a switch date.

The operator must run LIVE_REHEARSAL.md end to end against their own calendar
and return the ten-item copy-back. Passing the runner and UI tests does not
settle either the sovereignty question or the finite snooze's first live reading.


## P1B-69

An item whose correct answer in a clean run is an absence is phrased so that
the absence is an answer, not a missing figure. The assumed-presence pattern
has now appeared five times: [value], NONE, the absent diagnostic count line,
the omitted vocabulary candidate count, and empty diagnostic lists in a clean
run. This fifth case is the inverse of the other four: absence is the good
outcome. Copy “none” when the named list has no diagnostics; copy its rendered
count line when it does. Visible diagnostic sentences without their summary
remain a distinct failure, “diagnostics shown; count line missing”. Neither
case asks for a tally or transcription of diagnostic sentences. The audit
covers all nine items, including optional no-operation/no-candidate outcomes
and missing mandatory result fields.

The live procedure now has fourteen steps and nine copy-back items, both one
fewer after the operator's retirement of the finite-snooze reading. The ledger
records exactly what P1B-68 proved and what it did not; the synthetic harness
and stub-backed runner continue to cover intervals. A later interval change
brings the check back. Nothing else is retired. The protected step 11
UniverseState paragraph, the preview convergence explanation and the operator's
precondition transcription waiver remain intact. No subject name, fact key,
value or UniverseState row is requested.

Step 12 teaches authoring a fact as a subject and predicate and explicitly
minting a root if none fits. A refusal is a result about the form, not an
operator mistake. It retains deterministic authoring before model-dependent
Vocabulary/Precondition, now step 13; neither producer's result can block the
other. Thirty-five runner scenarios and the unchanged eleven seeds for one
staged step assert HTTP behavior. Automated checks are not operator acceptance;
the operator must run LIVE_REHEARSAL.md end to end against their own calendar
and return its nine-item copy-back.

## P1B-70

Land and prove a boundary before moving any computation across it. The CPU
oracle and its exact/tolerance parity classes must exist before the device
implementation they judge. This ticket computes nothing on a GPU and adds no
manual step; the unchanged live rehearsal remains the operator's acceptance.

Only the kernel worker tests and devshell's bounded worker suite gain the
process exemption, under all five conditions:

1. Spawn only a local interpreter running the kernel repository's own committed
   module, with no network, download or installation.
2. The test owns the session lifetime and reaps the child under a timeout,
   including failure, cancellation, timeout and panic. No orphan may survive.
3. Skip interpreter-dependent checks cleanly if suitable Python is absent;
   check-all.sh must still pass without Python, CUDA or torch. CPU-only oracle,
   parity and pure codec checks remain mandatory.
4. No worker test installs a signal handler.
5. No other test path gains permission to spawn: orchestrator and UI tests do
   not, and every advisory transport remains StubTransport. The runner's
   pre-existing owned loopback orchestrator/model-stub exemption is unchanged.

The worker is persistent inside its owned session, transient across sessions,
with no socket or daemon. See [the boundary and parity profile](PLANNING_WORKER.md).
Transport engine_error/cancelled outcomes never certify a Plan; no streamed
chunk is exposed. Future streaming must obey CPU certification before surfacing.


## P1B-71

Two operator actions are two results. The P1B-68 prompt's condition “Where both
run in one operator action” is withdrawn: Vocabulary and Precondition are two
separate clicks, each with its own selection result and count. Cross-action
deduplication would hide the second run. The existing sentence-copying ban is
preserved; copy each rendered selection count once immediately after its run,
or its named absence/failure answer, and keep both even when they are equal.
Screens and diagnostic sentences are unchanged. The live procedure remains
fourteen steps and nine copy-back items; its stale introduction is corrected.

A parity tolerance is never widened to make a test pass. The existing
boundary-v1 float profile remains unchanged for scores and rollout summaries.
Stage 1's atomic placement-duration bootstrap has entirely exact structural,
feasibility, padding, omission and candidate-batch comparisons. Its CPU uses
fixed seconds or log-normal mode, not stochastic draws. Stages 2–4 already
exist in planning core and are unchanged. Split support remains deferred;
unsupported split input is explicitly rejected, never silently made atomic.

The operator approved six grounding corrections, including a narrowly bounded
internal Stage 1 envelope exception to D0283; the canonical four frame kinds
and schema 0.1 remain unchanged. Repair stays on CPU because prior_plan is not
serialized. The P1B-70 five spawn conditions remain unchanged. Framework
probing and Stage 1 execution occur only through owned, bounded workers in the
kernel worker tests and devshell suite; no other test gains worker spawning.
Installing torch is documented, never performed by checks or this execution.
Real tensor tests skip without it; skipped tests do not certify tensor parity.

Operator acceptance is still pending: run LIVE_REHEARSAL.md with torch absent
and policy off against the operator's own calendar and report its copy-back.
The two readings are the Review copy-back length and the otherwise identical
P1B-70 rehearsal. Automated passes are not operator acceptance.

## P1B-72 (historical; comparison and sinks superseded by P1B-73)

**An acceptance instrument that asks a human to transcribe will grow a branch
for every absence, and the branches are a sign the wrong party is reading.**
Item 1 acquired seven phrases: “no captured counter”, “no updated counter”,
“no unchanged counter”, “no skipped counter”, “no moved counter”, “no resized
counter” and “no no-colour sentence”. They express an appropriate manual rule
applied to a task a script can perform. The ordinary path now records fields
and unavailability, with no human figure transcription. The complete fallback
retains those branches; P1B-67's absence rule is not repealed and applies to
remaining manual readings/transcription and any new manual step.

Rule 1 says: **“A manual step may not verify what the runner or a `ubu-ui`
test already asserts.”** The former copy-back's rendering/count checks were
already in tension with it. The fixture assertions stay in the runner and UI
tests. One visual pass through Today, Calendar, Tasks and Review adds the
operator's actual data, collisions, layouts and assessment of requirement words,
rather than re-proving fixture rendering. The extra two screens are necessary
because requirements and proposals are not all visible on Today or Calendar.

Judgment call 2 makes automation safe by printing source API fields, rather
than reconstructing rendered sentences or gesture business rules. The approved
exception for generic cardinalities/histograms labels each **client-computed**
and names its source route/field. Skip diagnostic entries may include an
aggregate; their count is not a Task count. Judgment call 8 checks the new
instrument against the manual one once, with the **same UI request responses**
observed through a local forwarding proxy. Duplicate mutations/producer runs
would alter the thing being compared. There is no UI scraping or new route.

The seven approved grounding corrections are concrete:

1. Genuine authoring comes from private operator inputs; missing inputs are
   skipped. Fabricating routine hours/fact values or deciding admissions would
   substitute a script's intent for the operator's observations.
2. The API has no pre-computed placement/operation/diagnostic/collection counts.
   Generic labelled counts are permitted; imitating UI prose would create a
   second rendering implementation, while withholding every count would lose
   the instrument's main benefit.
3. The visual pass includes Tasks and Review as well as Today and Calendar.
   PreconditionWords is UI-only and includes private targets/expectations;
   implementing it in the script or publishing those words would be wrong.
4. Four deliberately public operator judgment sentences are collected, as an
   explicit content-policy exception. Raw API/configuration data stay withheld.
   Refusing all answers would defeat section C; broad permission to echo data
   would defeat the privacy requirement.
5. Reset completeness is unverifiable. Stamped leftovers/collisions can be
   reported, but a route cannot distinguish unstamped exports from original
   events. Claiming a verified reset would manufacture evidence; operator reset
   remains the prerequisite.
6. Comparison mode forwards the UI's existing requests once. Capture, preview
   and advisory result panels use local React state, so independently issuing
   requests cannot populate them. Replaying the actions would compare different
   runs; backend/UI modifications exceed this ticket.
7. Ledger retirement is pending until the operator confirms the comparison.
   Automated stub tests establish projection/plumbing behavior, not agreement
   on a real calendar. Item 9 remains an active human judgment.

The driver owns its orchestrator because no route attests an attached process's
store/calendar identity. It prints those two destinations, requires typed
`live`, presents a preview, and separately requires literal `approve` before a
real write. Comparison approval comes from the UI's own explicit click after
its own preview. No flag/timeout/default authorizes writes. Builds use the
unchanged env.sh lock/scope and finish before human waiting. None of the new
pure tests listens, spawns, signals, installs handlers or reaches external HTTP,
Google, ollama or an editor. The P1B-70 five spawn conditions and the standing
runner exemption are unchanged. check-all/test-all run only injected-effects
unit tests, never the live CLI. Torch is neither installed nor executed.

The public whitelist retains six capture counters; Plan placement/exclusion
counts, fixed risk fields; operation kinds/static flags/timestamps/colour/busy
flags/reminder counts; matching placements; approval status/results; the four
UniverseState collection counts; authoring statuses and condition presence;
and separate producer status/enqueue/selection/diagnostic-entry counts. Unknown
strings/codes, diagnostic messages, Task/event IDs/titles/notes, excluded-work
prose, risk detail/subjects, fact keys/values/rows and proposed names/condition
words are withheld. Questions ask for judgments, never those contents.

Final verification caught two projection defects before publication: the
closed status vocabulary initially omitted admitted Plans and worker
error/timeout outcomes, and comparison readback initially could confuse a later
unrelated Task read with the edited Task. The whitelist now includes the actual
contract enums; private Task identity is used only in memory to associate the
readback. Both corrections have pure regression coverage. No route or content
permission was expanded.

P1B-71 was accepted by the P1B-72 opening. The P1B-72 driver shipped, but its
operator acceptance was refused. Its comparison mandate and pending retirement
condition are withdrawn by P1B-73 below; no successful P1B-72 live run is claimed.

## P1B-73 — one line of execution

P1B-72's judgment call 8 is **withdrawn**, not repaired. Rule 1 says **“A manual
step may not verify what the runner or a `ubu-ui` test already asserts.”** Its
operator comparison duplicated those verifications. Section B replaces it with
field-by-field projection tests against injected flow responses: every scalar,
cardinality, histogram and enum in groups 1–8 must equal its observed source;
one-field mutations may change only their dependent lines. Failed, skipped and
unreached actions remain explicit; unknown strings are withheld but counted.
There is no whole-block golden and no human comparison.

The eight pending numeric/status retirements are retired **by this explicit
operator correction**, with existing runner/UI coverage **and the projection
tests** named in each ledger row. They do not claim P1B-72 live acceptance or
new live confirmation. Item 9 remains an active human judgment. P1B-71 accepted
readings remain historical evidence with their original quality qualifications.

The two sinks reverse P1B-72: the screen is private and never pasted; one file
is public and pasted whole. The approved terminal formatter consumes existing
HTTP ASTs and the shared numeric-word helper, with no new API or UI code.
Independent private-renderer canaries for a title, condition word, diagnostic
message and risk detail must appear on screen and never in PublicReport.render().
Three judgments remain; the visual-pass prompt/fourth judgment are gone.

The instrument either completes its requested action sequence or stops with a
named reason and remedy. Failed requests, unusable previews/selectors, disabled
sessions and failed producers stop; valid zero-candidate responses are results.
Omitted optional authoring inputs and a deliberate declined approval are recorded
by code. No manual phrase is requested for them. Consent/approval never defaults.
The same public artifact contains the completion block or refusal line, with
no private renderer or startup stderr in it. Credential/token paths remain
withheld. An unwritable output destination is diagnosed, not replaced by an
undocumented private transcript or second fallback file.

P1B-67's absence rule is retained for whatever manual readings remain. It is
**dead letter for this live document**, which now asks for no figure transcription
or missing-figure phrase. A new manual step still has to meet the rule and rules
10/11; its existence cannot be justified by reviving the removed fallback.

### The regime

Per commit: check-all.sh and the scenario runner, no human. Per feature: the live
driver, which gains a recorded action for each new feature. Its human surface
is calendar reset, private environment, live, one approval decision, three public
judgment sentences and one paste of the file. Pre-release only: the UI visual
pass through actual operator data. Setup/consent/judgments are operator choices,
not duplicate deterministic verifications.

The cost is explicit: **per-ticket live rendering findings are given up**. The
P1B-56 risk-report defects illustrate the class—scope wording and manufactured
affect presented as measurement. Existing HTTP/UI tests cover known cases, but
actual-data layout/rendering findings can now wait until the pre-release pass.
No acceptance based only on automated counts is claimed.

Measurement: fourteen steps and nine branching copy-back items; P1B-72 then one
invocation with four judgment prompts plus a visual pass; P1B-73 now one invocation
with three, no visual pass, no manual fallback and no numbered copy-back items.
LIVE_REHEARSAL.md moves from 828 to 108 lines. Its 30 distinct curly-quoted phrases
beginning “no ” (whitespace normalized) become zero, not replacement phrases.

Three grounding corrections were approved before implementation. Existing HTTP
supplies ASTs but not rendered condition words, so terminal presentation is
explicitly permitted. The worker discards stderr and clears environment, so
import warnings are counted in its existing framework-probe response and asserted
zero by its existing owned-worker check. Finally, the kernel inventory pin must
advance to its published correction commit; the other eight pins and consumer
Cargo revisions stay unchanged. No test gains a new spawning/HTTP/signal path.

## P1B-74 — source agreement and a named worker attempt

P1B-74's opening records P1B-73 acceptance passed in one invocation. That
operator evidence settles the earlier pending acceptance; it is not a new
agent-run rehearsal. No numeric transcription or visual comparison returns.
Rules 10/11 and the one invocation / three judgments / one pasted file remain.

The gate must agree with the validator behind it. Settings names/constants and
both prefixes derive from Rust source assertions; values, defaults, subject lists
and validation-function fingerprints catch future drift. Routine composition
supplies evergreen mode, category membership and the UI's title/list defaults.
Diagnostic names derive from emitted source and forwarded closed enums.
Messages, fact contents and names remain private. Missing planning collections
are named, never inferred empty; intentional empty-field omission is recorded
as an orchestrator finding without a serializer change. Selected Task counts
name selected[] and show the actual advisory request limit.

Five concrete grounding corrections were approved before implementation:

1. Settings additionally require literal loopback endpoint syntax, provisional
   true, governed-root exclusions and seed <= current ceiling. Copying the
   abbreviated value rules would recreate the validator gap; changing Rust
   would weaken an established admission contract. Fresh-store defaults and
   supplied order are checked without silently reordering operator intent.
2. Consumers pin the final published kernel reason API, rather than ea6b453
   which cannot contain it. Kernel and orchestrator inventories advance to
   their published heads; leaving them stale violates show-revs equality.
   The three consumer revisions advance together; other pins stay unchanged.
3. The prompt lists ten fallback paths, not nine. All ten receive closed names;
   identity/profile/version checks remain one grouped mismatch, as specified.
   Reclassification does not change fallback conditions or certification.
4. Stage 1 certifies CpuStrategy (Greedy), while the orchestrator defaults to
   ChunkedSweep. The default stays intact and reports unsupported_strategy;
   only explicitly selected Greedy attempts the worker. Automatic switching
   would change a Plan; extending the worker's algorithm exceeds this reason
   and reachability ticket. No Stage 2/3/4 or stochastic-duration work is added.
5. A reason only in a private message cannot be tested from the public file.
   A second, closed reason-specific diagnostic code is emitted beside
   planning_gpu_unavailable. Publishing messages would expose operator content;
   adding a new API field would widen the contract unnecessarily. Counts still
   explicitly mean diagnostic entries, not Tasks.

The CPU kernel must validate any returned candidate before canonical Plan commit.
StageOutput::assemble and its exact padded comparison are byte-identical.
Operator enabled=true supplies the local compute-budget justification. The
executable injects a kernel-owned, bounded transport; library state has none and
orchestrator tests use only in-memory stubs. Real framework imports/owned worker
parity remain within the existing five-condition kernel/devshell exemption.
The shared nonblocking Cargo/compute lock and one-job memory scope are unchanged.
Sessions drop/reap before persistence or any later build. Real certified worker
provenance records its actual CPU device; a stub never claims GPU execution.

After the five approvals, the operator explicitly authorized installing torch
and numpy if useful, superseding this ticket's compute-install ban for this
execution. Pinned CPU-only torch 2.6.0+cpu and numpy 2.2.6 were installed in a
private environment with pytest; no machine path enters a repository. The
actual owned probe must be quiet. Checks and runtime still install nothing.
CPU tensor parity is useful evidence; it does not certify CUDA or live acceptance.
The ordinary torch-absent environment remains a tested explicit-skip path.

Operator acceptance remains the single invocation in LIVE_REHEARSAL.md, with
planning.gpu_enabled=true in private inputs. It is not performed by the agent.
What is under test is whether formerly hidden diagnostics name themselves and
planning_gpu_unavailable carries its reason through a public closed code.

## P1B-76 — the existing Subjects panel becomes a ratification agenda

Rules 10 and 11 govern the extension: **“A manual step exists only for
rendering.”** and **“A manual instrument has one line of execution.”** Registry
cardinalities and reference counts move through driver response projections,
not a new tally, comparison, absence phrase or transcription step. Rendering
remains the pre-release visual pass. LIVE_REHEARSAL.md remains the sole live
procedure; no additional judgment or alternative invocation is introduced.

The operator approved three grounding corrections. Subject ratification is a
remaining switch gate, not proof that desktop GPU planning/CPU certification is
discharged. The UniverseState Subjects list, mint/retire controls and client
validation already existed; this ticket extends that panel rather than claiming
to introduce it. The dangling-diagnostic claim is withdrawn outright, and its
existing message is preserved. Changing that text as if it named no screen would
replace a correct reference with a fictional repair.

The third correction preserves no-cascade retirement while explaining that
append-only event markers have no clearing operation. The old panel sentence
allowing retirement despite retained references is replaced alongside the UI
refusal controls, coupled with the server's guarded DELETE in this change set.
**UBU-D0291 append-only-marker retirement gap** names the missing retirement
leg of the promoted-or-retired binary for such roots. They remain registered
pending operator ratification or separate cleanup work. No new decision,
cascading erasure, automatic promotion, marker-clearing operation or switch lock
is filed or implemented here.

The live input now supplies exactly one operator-chosen root in `subjects` and
a genuine mutation write under it. The driver mints that supplied root through
the existing Setting route, authors the supplied state/requirement, then reads
SETTINGS_LIST_PATH before either advisory run. The private screen names the
provisional root, minting metadata/version and counts; the public file contains
only the two tier counts, that root's three server-computed reference counts and
computed satisfaction/outstanding status. Missing or invalid count metadata
stops once with subject_registry_unavailable and one remedy. Zero references
are legitimate when the server actually returns them; no omitted count is
manufactured. A preserved Task tree is not overwritten to force a reference.

calendar colours, advisory, planning and subject Settings supplied through the
settings array now have separate driver labels; explicit subjects minting has
its own subject label. Thus planning.gpu_enabled is no longer labelled a colour
setting. The public diagnostic vocabulary gains the source-derived
subject_referenced code, with messages still private. Pure driver tests exercise
metadata projections, one-field changes, privacy canaries, Setting-family
labels and early-stop conditions without HTTP, child processes, handlers,
Google, real ollama, editors or signals. Existing runner/worker exemptions and
the one-job exclusion/memory wrapper remain unchanged.

Operator acceptance is the one invocation in LIVE_REHEARSAL.md; the agent does
not perform it. What is under test is whether the ratification agenda can be read.


## P1B-77 — the worker probe names its interpreter source and failed fact

Rules 10 and 11 remain operative: **“A manual step exists only for rendering.”**
and **“A manual instrument has one line of execution.”** Environment diagnosis
and input validation happen in code; neither introduces another invocation,
figure transcription, absence phrase, judgment or visual pass. Source and reason
codes survive the public projection; interpreter spelling and observed versions
stay in private diagnostic messages. The existing interpreter selection from
P1B-74 is retained, rather than claimed as a new implementation.

The operator approved three grounding corrections. The driver already mentioned
UBU_PLANNING_WORKER_PYTHON, but lacked prerequisite/configuration-table entries
and reliable absolute-path guidance. liveConfig had five throw sites, a sixth
in runActions, and validAuthoringInputs had six return-false sites with shared
loops/conditions; the implementation names each actual field/rule instead of
manufacturing fifteen faults. Only the three kernel Cargo consumer revisions
advance; the kernel/orchestrator inventory entries also record their published
heads, as the standing inventory policy requires.

The probe's default rises from five to thirty seconds, within the existing
transport ceiling, with UBU_PLANNING_WORKER_PROBE_TIMEOUT_MS bounded to integer
1–30000 milliseconds. A timeout is its own fact. The compiled import root must
contain the ubu_planning_worker package directory; the old package layout is
reported separately from a missing root. Interpreter absence/start failure,
layout, invalid budget, timeout, failed/malformed probe, unavailable/broken
PyTorch and version mismatch have closed codes. None contains a path or version.
The source code is emitted for successful probes too; unsupported strategy or
missing factory still does not spawn or pretend an interpreter was probed.

The exact StageOutput::assemble comparison and “Never widen a numeric tolerance
here” comment stay byte-identical. CpuStrategy retains authority on fallback.
The no-compute probe remains outside the compute lock; the compute session's
shared exclusion, lifetime and reaping remain unchanged. The one-job Cargo
wrapper and scoped memory ceiling, and P1B-70's five spawn conditions, remain
unchanged. In-process orchestrator tests inject facts; pure driver tests inject
responses. No new test path reaches HTTP, ollama, Google, editors or signals.

The advisory default remains 120000 milliseconds. Larger local models require
an explicit advisory.timeout_ms Setting; the operator's accepted 300000 ms
budget is documented. This preserves the shorter unconfigured wait while
making the larger-model requirement visible before a rehearsal.

Operator acceptance remains the single invocation in LIVE_REHEARSAL.md. The
agent does not perform it. What is under test is whether a failing environment
names both which fact failed and which interpreter was asked. CPU-only owned
worker checks do not claim CUDA parity or live acceptance.


## P1B-78 — exact certification names its first difference

Rules 10 and 11 remain: **“A manual step exists only for rendering.”** and
**“A manual instrument has one line of execution.”** The driver projects the
failed field and bounded indices/count from existing diagnostics; no numeric
transcription, new judgment or additional invocation is introduced.

“Exact comparison covers every padded value, code, mask and omission, not only
the final schedule. Never widen a numeric tolerance here.” The thirteen typed
field comparisons remain exact; every inequality still refuses and retains
CpuStrategy. First-difference reporting follows declaration order, candidate
order and slot order, counting differing fields rather than cells. Error
Display/Debug contain metadata alone. Differing values belong only to the
private diagnostic message/screen, and the public projector constructs a new
object containing only validated structural metadata. Global omissions/failure
have no candidate/slot index; absent rows have no slot index.

Four grounding corrections were approved. The original shared goldens have
one to three Tasks, and scale is a hypothesis until reproduced. Overlapping
static anchors are a CPU refusal, so the successful 120-placement week and
three-overlap refusal are separate cases. A one-candidate constrained week
exercises unused candidate rows beside the main 16-candidate case. Backend
provenance was absent from the public block; its existing closed wire value
is gpu_worker, now projected without framework/device/version details.

The committed generator uses only synthetic shape parameters, a fixed seed,
93 anchors including seven mandatory daily routine labels, and 27 dynamic
Tasks. Dependency depth, many-anchor occupancy scanning, bounded perturbations,
unused slots and unused candidates are exercised. Both the independent Python
algorithm and actual CPU tensor worker match the unchanged CPU goldens for all
three new cases. The live divergence is not reproduced; Python and the CPU
reference therefore remain unchanged. Matching synthetic shape does not certify
the operator's week, and no CUDA parity or agent-run acceptance is claimed.

The thirteen field-specific codes augment the retained generic certification
fallback. Public indices/counts are zero-based and validated; missing/malformed
metadata is unavailable, never invented. Existing canonical frames, API/schema,
worker spawning conditions, lock ownership/reaping, one-job Cargo and memory
scope remain unchanged. No ChunkedSweep work or model-committee rank occurs.

Operator acceptance is the single invocation in LIVE_REHEARSAL.md, performed
by the operator. What is under test is whether a refused certification names
the field it refused.

### P1B-79 enumerated hard feasibility and bounded occupancy

PLANNING_KERNEL_CONTRACT.md §5 and amended UBU-D0171 now enumerate Stage 1's
dependency_feasibility and hard_constraint_feasibility. The latter combines
plan validity, dependency timing, plan/Task-window and exact-anchor containment,
and pairwise disjointness with endpoint touching allowed. The definition was
published before either implementation changed. UBU-D0301 records that exact
parity requires an enumerated field; UBU-Q0184 remains unanswered and records
Rust's false versus Python's direct-index error for an absent prerequisite.

Greedy suffix perturbations now use the minimum forward non-suffix occupancy
gap for each placement, alongside existing window bounds. Skeleton placement
behavior and chunked generation are unchanged. Python mirrors the bound in
proposal generation; its predicate, within and dependency terms are unchanged.
Rust adds disjointness as a tested invariant. The thirteen-field comparator,
exact assembly guard and public/private diagnostic split remain byte-identical.

The existing week generator adds one synthetic occupancy-ahead case. Before
the bound, the actual CPU tensor-worker comparison reports one diverging field,
hard_constraint_feasibility, first at candidate 4. Afterward it reports zero.
The fourteen existing worker cases retain their expected values; the new case
retains sixteen candidates with bounded shifts. One older C-1 golden shrinks
from sixteen to nine candidates because its occupancy gap permits eight delays;
the existing freezer generates its exact new expectations. No assertion is
relaxed. Counts, governing quotations, the approved corrections and both kinds
of published pin are in [P1B-79_PINS.md](P1B-79_PINS.md).

This is CPU tensor certification, not CUDA parity or certification of the
operator's week. Operator acceptance remains the one invocation in
[LIVE_REHEARSAL.md](LIVE_REHEARSAL.md), performed by the operator. What is under
test is whether Stage 1 certifies on that week; no manual steps are added.
