# The live rehearsal

This is the procedure. It is the single source for the live sequence: a
ticket names this document and adds no steps of its own. Do the numbered
steps in order, from the first to the last, and copy back exactly the list
at the end.

Everything else in this repository runs in mock modes on a throwaway store.
This does not. It uses **your real Google Calendar**, and only you can run
it.

Each step says what to **open**, what to **click** and what to **read**. A
step asks you to **copy back** only where this run can show something that
has not already been shown. From P1B-55 a verification that has passed live
is retired, and recorded in the ledger in [ACCEPTANCE.md](ACCEPTANCE.md).
There are thirteen steps and eight copy-back items. The colour setup and
colouring steps are retired in P1B-60; their preconditions are below.

When a step cannot be completed, copy its named result line or absence phrase
and go on to the next step. Read any diagnostic remedy; do not transcribe its
sentences or count its lines.

## What changed, and what to expect

**A colour decides the placement.** From P1B-55, when UbU reads your
calendar:

- an event with **no colour** is work for UbU to schedule. It becomes a
  Dynamic Task as long as the event, and UbU decides when;
- an event with **any colour** is a commitment at its own time. It becomes a
  Static Task, and the colour is its category.

The whole rule, in both directions, is in
[COLOUR_CONVENTION.md](COLOUR_CONVENTION.md).

**Nearly everything has fitted, so do not expect a long list of what did
not.** This document used to say that the week would not hold everything and
that the section “Not in this Plan” on Today would be long. The runs showed
the opposite. In the P1B-57 run 85 events had no colour, 84 of them were
placed, and one Task was left out. In the P1B-58 run nothing was left out.
So expect “Not in this Plan” to hold one Task or two, or not to be on the
screen at all, and “no such section” is an ordinary thing to copy back at
step 8. When something is left out, that section is UbU saying what the
week cannot hold, which is the question the tool exists to answer. The thing
to judge is not whether everything fits. It is whether **what it chose to
schedule is what you would have chosen**.

**The risk report says what it means.** Every Plan until P1B-56 arrived
under a high-risk report, for reasons that were defects in the report: a
coverage figure about the whole week printed as a statement about the next 60
minutes, and an affect state nobody had recorded reported as exactly at its
limit. Both were fixed in P1B-56, and its run read medium, with “low
coverage”, “affect margin” and “post plan depletion” all absent. Step 8
now asks for the whole Plan risk panel as one selected block, so nobody has
to extract findings by name or scan a list and conclude that something is
not in it.

**The preview counts itself.** Until P1B-58 step 9 asked for three counts
that no screen showed, and a preview of ninety operations could only be
tallied by eye. The Preview panel now says the counts in one line, and step
9 asks for that line.

**What a Task can wait for has a screen.** A Task can ask that something be
true before UbU will plan it. From P1B-58 the screen “UniverseState” shows
what is recorded, and step 11 opens it. This run records nothing there, so on
this store it will say that nothing is recorded yet. That is the expected
reading and not a fault.

### Placement counting: interim method, now history

Step 8 now reads the Plan's own counts line; do not tally badges by hand.
Before that line shipped, the interim method was to copy the placements' page
text and count occurrences with `grep -o 'Skeleton' | wc -l`, case-sensitively.
`grep -c` counts lines, not occurrences; a badge can share a line with its title.
A case-insensitive search also counts lowercase `skeleton_failure` and
“deterministic skeleton”. Skeleton plus Static anchor equals the placement total.
Only for a store where all Dynamic work came from the calendar, with no other
exclusions or multiple placements per Task, can Skeleton also be cross-checked
against “N events had no colour” minus the number in “Not in this Plan”.
This note is history now that P1B-62's counts line ships; retire it in the ticket
that confirms the line live. No such acceptance is claimed here.

## Before you start

The rehearsal calendar must hold your events with your colours, and nothing
UbU wrote. In Google Calendar, glance at that calendar's coming week after
its reset: your coloured commitments and uncoloured to-dos must be there,
with no leftover exports. UbU's colour-to-category Settings must also be in
place: glance at Setup's “Colour to category at capture” table and check it
matches your categories. These are preconditions, not copy-back items.
Step 1 removes the previous rehearsal store, including its Settings; seed
the mappings in the new store before capture. Settings in an old store do
not carry over.

**1. Start from a fresh store.** A store captured before P1B-55 holds every
event as a fixed commitment, and nothing converts it. So this run does not
use it. In a terminal, in `ubu-devshell`, with no orchestrator running:

```sh
rm -f /tmp/ubu-live-rehearsal.db /tmp/ubu-live-rehearsal.db-wal /tmp/ubu-live-rehearsal.db-shm
export UBU_DB_PATH=/tmp/ubu-live-rehearsal.db
```

Read: both commands print nothing. The first removes the store an earlier
rehearsal left at that path, if there is one. Your own store, in
`ubu-orchestrator`, is not opened and not changed by this run.

If `acceptance.sh` is running, stop it with Ctrl-C now. It holds the app's
port, and step 2 refuses to start while it does.

## Start

**2. Start the orchestrator, live.** In the same terminal, with your own two
paths:

```sh
export UBU_GOOGLE_CREDENTIALS_PATH=/absolute/path/to/credentials.json
export UBU_GOOGLE_TOKEN_CACHE_PATH=/absolute/path/to/token-cache.json
./scripts/run-live.sh
```

The planning horizon is one week by default. One week of horizon is one week
of calendar: capture takes nothing that begins after it.

Read: the script prints a block that begins `This is the LIVE run.` Its
`store` line names `/tmp/ubu-live-rehearsal.db` and says it does not exist
yet and will be created. The block asks whether you have backed the store
up: this one is new, so there is nothing to back up. Then it asks for a word.

Type: `live`, and press Enter.

Read: the last line printed ends `ubu-orchestrator listening addr=127.0.0.1:7878`.

If the script prints `REFUSED:`, fix what it names and do this step again.
Never copy the contents of the credentials file or the token cache anywhere.

**3. Start the app.** In a second terminal, in `ubu-ui`:

```sh
npm run tauri:dev
```

Read: the app window opens on the screen “Today”.

## Tell UbU about your week

**4. Author your night.** A fresh store has no night. Open **Routines**.
Under the heading “Create a routine”, fill in the form with these values and
your own hours:

| field on the screen | value |
|---|---|
| Title | `Asleep` |
| Description | leave empty |
| Mode | `evergreen`; it cannot be changed |
| Timezone | your timezone as an IANA name, for example `America/New_York` |
| Repeats | “Every day” |
| Occurrence title | leave empty; it is the same as the title |
| Duration (minutes) | the length of your night in minutes; `480` is eight hours |
| Nominal start | the time you stop, for example `23:00` |
| Placement | “Static: at the nominal start” |
| Occupies capacity | ticked |
| Category | `sleep` |
| Tags | leave empty |
| Reminder minutes | leave empty |

Click: “Create routine”.

Read: the routine “Asleep” appears in the list headed “Routines”.

## Capture

**5. Enable the Google Calendar session.** Open **Setup**. In the card
headed “Google Calendar session”, click “Enable Google Calendar session”.

Read: the badge beside the heading changes to “enabled”. The first time,
your browser opens for Google's consent; complete it.

Nothing reached Google before this step. From here, on the screen
“Calendar”: “Run capture” and “Run reconciliation” READ your calendar, and
“Approve preview” WRITES to it.

**6. Reset the rehearsal calendar.** When capture runs, the calendar UbU
reads must hold **your events, and nothing UbU wrote**. Get it there by
copying: reconstitute the rehearsal calendar from your own calendar, with the
tooling you already use for that copy. Do not pick UbU's leftovers out of it
by hand.

Why a reset and not a clean-up: UbU knows which events it wrote only from its
store, and this store is new. On the calendar itself an event UbU wrote in an
earlier run cannot be told from one of yours, so there is nothing to detect
and nothing to filter. A calendar that is copied fresh has none.

From P1B-57 UbU stamps each event it creates, so a later run names those
events and does not capture them: they appear in the capture's grey box in
step 7 as `capture_stale_export`, with the count. Events on the calendar from
before P1B-57 carry no stamp, which is why the reset is still the
instruction.

If the reset was incomplete, this is what you will see for an unstamped
leftover, and it is the one thing that tells you. What a leftover becomes follows its colour, like any
other event. One with a colour is captured as a commitment, beside the
routine that still generates it: the same title twice on Tasks, and on Today
a grey box with `routine_occurrence_overlaps_commitment` or
`static_task_collision`. One with no colour is captured as work to schedule: a
to-do you did not write. Leftovers are what put 81 colliding pairs in the
P1B-55 run.

**7. Capture.** Open **Calendar**. Under the heading “3. Capture”, click
“Run capture”.

Four things follow, and each is worth knowing before you capture:

- **An event that repeats is never moved.** UbU cannot write to an instance
  of a recurring event. With or without a colour it stays where it is, as
  occupied time.
- **An all-day event is skipped.** It has a date and no time, so it has no
  length to schedule.
- **Busy and Free no longer decide anything about placement.** An uncoloured
  event is work, whether it was marked Busy or Free. A coloured event marked
  Free is a commitment that does not block other work.
- **Later, colouring one of these to-dos does not complete it.** A to-do that
  came from your calendar follows this rule for as long as it exists: give
  its event a colour and it becomes a commitment at the time it then has. To
  complete it, use “Complete” in the app. Only work you created in UbU is
  completed by colouring its event.

Read: six counters appear: “captured”, “updated”, “unchanged”, “skipped”,
“moved” and “resized”. Under them:

- a sentence that begins “N events had no colour.” Those are your to-dos.
  The sentence says it is not something missing. Under it, “The N events with
  no colour” opens a list with one line for each;
- a quiet grey box with the other lines, each with a code in small print:
  - `capture_occupancy_only`: the instances of recurring events, recorded as
    occupied time. It names one id, or a count and the first three;
  - `capture_stale_export`: events UbU itself created in an earlier run and
    stamped. Each is left alone and becomes no Task. It names one id, or a
    count and the first three;
  - `capture_colour_unmapped`, `capture_colour_ambiguous`: a commitment whose
    colour maps to no category, or to several. It is captured at its own
    time with no category;
  - `capture_all_day_unsupported`: an all-day event, skipped, and why;
  - `calendar_event_skipped`, `capture_event_invalid`: an event that was not
    captured, and why.

Read: above the grey list, one line beginning “Diagnostic counts:”. It gives
each code and its line count in the order its first line appears. The screen
counts them; you do not. If the list is empty, there is no count line.

Copy back three things, and only these:

- the six counters with their numbers; for any missing counter copy “no captured
  counter”, “no updated counter”, “no unchanged counter”, “no skipped counter”,
  “no moved counter” or “no resized counter”, using its name;
- the sentence that begins “N events had no colour.” (or “1 event had no
  colour.”), or “no no-colour sentence” if it is absent;
- the line beginning “Diagnostic counts:”, exactly as shown, or “no Diagnostic
  counts line” if it is absent. Do not transcribe its sentences or count lines.

**Do not copy back the list under that sentence.** The lines there, one for
each uncoloured event, are not in the grey box and are not wanted, whether
they are showing or behind “The N events with no colour”. Each of them also
carries a code, `capture_colour_absent`. That code is not one of the grey
box's.

## Plan

**8. Generate a Plan.** Open **Today**. Click “Generate Plan”.

Read, in this order:

- any box between the two buttons and the heading “Timed placements”. A
  quiet grey box is something that happened. A red box is a failure. A box
  that begins “N pairs of fixed commitments overlap” is about commitments of
  yours that are double-booked: both are in the Plan, and their time is busy.
  The P1B-55 run had 81 such pairs, many of them between an event and a
  leftover copy of itself. On a reset calendar the P1B-57 run had about 45;
- under “Timed placements”, the titles and the two times beside each. Your
  coloured events, your routines and “Asleep” carry the badge “Static
  anchor”. **Your uncoloured events carry the badge “Skeleton”, and the times
  beside them are the ones UbU chose**;
- below the placements, **the section headed “Not in this Plan”**, when there
  is one. It is on the screen only when something was left out, and it names
  each piece of work that did not fit, by title, with the reason and what can
  be done. The last two runs had one Task in it and then none, so it may not
  be there at all.

Then read the panel headed “Plan risk”, above the placements. The badge
beside the heading reads “low risk”, “medium risk” or “high risk”. Under it,
each finding has a name in bold, such as “unplaced work”, and its severity
on a badge beside the name.

Read: above the quiet grey diagnostic list, one line beginning “Diagnostic
counts:”. It states each code and its line count. Failure alerts keep their
existing rendering; if there is no information list, there is no count line.

Copy back: the line beginning “Diagnostic counts:” above “Timed placements”,
exactly as shown, or “no Diagnostic counts line” if it is absent. Do not
transcribe their sentences or count lines. The line directly under “Timed placements” that begins “Placements:” and gives total, Skeleton and Static anchor counts. And the whole section
“Not in this Plan”, or the words “no such section”. If there is no
“Placements:” line, copy “no Placements line”.

Copy back: the whole panel headed “Plan risk”, exactly as rendered, or “no
Plan risk panel” if it is absent. Select the panel as one block; do not extract
or name each finding separately.

**9. Take a preview.** Open **Calendar**. Under the heading “1. Preview”,
click “Take preview”. This calls nothing and writes nothing.

Read: above the operations, one line: “Operations proposed: N. Create N,
update N, delete N.” The first number is the total. Then one operation for
each event UbU would write. The same line says “N Dynamic placements
already match the calendar and need no operation; Static commitments keep their
fixed times.” For one, it says “1 Dynamic placement already matches the calendar
and needs no operation; Static commitments keep their fixed times.” Zero is
explicit. The matching count excludes Static commitments and completed history.

Read this beside the Skeleton count and “Not in this Plan” from step 8:
when Skeleton is non-zero and no updates are proposed, the already-match
clause identifies the Dynamic placements already at their chosen times, with
nothing to send for those placements. Any creates still need a write;
unplaced work still belongs to “Not in this Plan”. Zero updates alone does
not tell you how much work was planned.

- An operation headed “Update:” that reads “Placement: Dynamic” is one of
  your uncoloured events. Its “Window:” line is the time UbU chose for it, in
  UTC, and not the time you parked it at. Its “Colour means:” line says that
  a colour would make it a commitment.
- No operation is proposed for a coloured event of yours. It is a commitment
  and stays where it is.
- An uncoloured event that did not fit has no operation either. It is left
  on your calendar where it was, and it is in “Not in this Plan”.
- “Create: Asleep” operations read “Placement: Static”. Each night becomes a
  Busy event on your calendar. That is deliberate.
- No operation is proposed for an instance of a recurring event.

Copy back: the line that begins “Operations proposed:”, exactly as it
appears, or “no Operations proposed line” if absent, and the whole of the first
operation headed “Update:” that reads
“Placement: Dynamic”. If no Dynamic operation is headed “Update:”, copy “no
Dynamic Update
operation” instead of an operation. Do not count the operations yourself.

**10. Decide whether to approve. Read this before you press it.**

**Approving moves the uncoloured events that need updates to the time UbU
chose. Already-matching placements need no operation.** The line you copied in step 9 says how many: its “update” number.
In the P1B-58 run that line read “Operations proposed: 27. Create 7, update
20, delete 0.” Each event that moves leaves the slot you
parked it in and appears where the Plan put it, still with no colour, and
marked Busy. This is the feature working, and it is the most surprising
thing this change does. Your coloured events are not moved. Nothing is
deleted that UbU did not create.

“Approve preview”, under “2. Approve”, WRITES to your real calendar. It also
creates an event for every night and every routine occurrence. It never
writes to an instance of a recurring event.

You do not have to approve. If you want to see the moves first, read the
“Update:” operations in step 9: they are exactly what will be written.

If you click it:

Read: “Approval status: applied”, and a line “Operations applied in this
run: N of N”.

Copy back: those two lines, or “no Approval status line” and “no Operations
applied line” for the missing lines. If you did not click Approve, copy “I did
not approve”.

## What a Task can wait for

**11. Read the UniverseState.** Open **UniverseState**, in the navigation
between “Routines” and “Review”. Click nothing on it.

Read, in this order:

- the heading “UniverseState”, and under it a sentence that begins “A Task
  can ask that something be true before UbU will plan it.”;
- in the first panel, the sentence that begins “Nothing is recorded here
  yet.” This store is new, and nothing before this step records anything here, so
  that is what it should say;
- under it, one line that begins “Entries:”. It names the four collections,
  `facts`, `numeric_values`, `set_memberships` and `event_markers`, each
  followed by how many entries it holds. On this store each number is 0;
- four panels headed “Facts”, “Numbers”, “Sets” and “Event markers”, reading
  “No facts.”, “No numbers.”, “No sets.” and “No event markers.”

From P1B-59 a number on this screen can be set and cleared outright, and each
entry says in one word beside its value whether it was measured or asserted.

Copy back: the line that begins “Entries:”, exactly as it appears. If any
of its numbers is not 0, copy the line back all the same. If the line is absent,
copy “no Entries line”.

**That line, and nothing else from this screen.** It holds the names of the
collections and a count for each, and no value. A UniverseState is where
facts about your own life are recorded: health, money, your household. No
step in this document asks for a value from this screen, a key from it or
any row of its tables, and none ever may. Anyone who edits this step must
leave that as it is.

## Ask for a precondition

**12. Ask for names, supply values, then ask for a precondition.** This
model-dependent step comes last, after the deterministic checks. Open **Review**.
Under “Vocabulary advisor”, leave “Vocabulary Task limit” at 25 and click
“Run vocabulary advisor”. Read its “Run status:” and “Candidates enqueued:” lines.
It considers active, non-occurrence Tasks with a title or notes, and proposes at
most three names. A title alone is enough; an empty vocabulary is allowed.
This run promises no candidate. Read the suggested names and the Task each
was prompted by. Judge whether any name is worth recording about your own life.

For a name you agree with, enter your own value in “Fact value” or “Number value”
and click “Admit”. UbU suggested the name; every value is yours. Record only
what you can assert. A name you do not agree with can stay in Review, be deferred
or be rejected with the existing durable confirmation. Do not repeatedly ask
until a model agrees. Copy “a name was worth recording”, “no name was worth
recording”, or “no vocabulary candidate appeared”. Do not copy a name or value.
If `vocabulary_queue_full` appears, no model was asked: copy “vocabulary queue
full; no model asked”. Continue with the fallback and the precondition run.
Read any admission diagnostic remedy; if admission fails, copy “target admission
failed” and continue. This is a judgment of the names, not a recheck of the
runner's admission and context assertions.

If no proposal was admitted, open **UniverseState** and choose two or three
facts relevant to your captured Tasks. Under “Facts”, enter a key and a value
and click “Set fact”; or under “Numbers”, enter a key and a number and click
“Set number”. Use names meaningful to you. This hand-authoring is the fallback,
so the second run is available even if the first proposes nothing. What you
enter is recorded as asserted. Do not copy any key, value or row back.
Only `facts` and `numeric_values` names are proposed in this phase: Sets need a
member form and Event markers an occurrence form. This is a scope choice, not
a statement about those collections.

The producers are separate clicks: admit names and supply values first, then
run the precondition advisor against the larger vocabulary. The vocabulary
run itself authors no precondition.
Facts alone offer “is” and “is not recorded”; a number also offers the comparisons.

Open **Review**. Under “Precondition advisor”, leave “Precondition Task limit”
at 25 and click “Run precondition advisor”. It considers active Tasks that are
not routine occurrences, whether or not they have notes, including one with an
existing precondition. Only a Task with neither a non-blank title nor non-blank
notes has nothing to reason over. A captured Task's first notes now come from
its event's own notes, so the advisor can read what you wrote in your calendar;
existing Task notes are kept. A title alone is enough to ask the model. This
step does not require an interview or promise any candidate. A run considers up
to 25 Tasks but proposes for at most three; a small candidate count is the
design, not a thin result.
A replacement shows “Currently required” and “Proposed requirement” together,
with a line saying that admitting replaces the first with the second.
Read “Run status” and “Candidates enqueued”. If `precondition_queue_full` is
shown, ten or more proposed or resurfaced precondition candidates already await
review: the run did not happen and no model was asked. Review, defer or reject
what is waiting before asking for more; deferred candidates do not block a run.
For this rehearsal, copy the two result lines and “queue full; no model asked”,
then go to Stop. Do not rerun just to get a candidate. Otherwise read the first precondition proposal
in the queue, if there is one. A first-time proposal says “Before this Task
can be planned:” and the condition in words; a replacement uses the two labels
above. First read the proposal's words as rendered, then decide:

- If you judge it sound: **Leave it in Review for this rehearsal.** Copy
  “left in Review”. No admission is needed; the Plan already approved is unchanged.
- If you judge it wrong: click “Reject” on that proposal. Read “Rejection is
  durable. This same proposal will not return on another run; a different
  proposal for the Task can still arrive.” Enter a brief reason in “Reason”,
  then click “Confirm reject”. Read the queue again: the proposal should have
  left it. Copy “rejected; proposal left the queue”, or “rejection failed”
  if the proposal remains. Read any diagnostic remedy; do not tally its lines.
- If no candidate appears: copy “no candidate appeared, so nothing was rejected”.

This is durable suppression of a proposed requirement, with no finite snooze
interval. Finite snoozes apply to reviews of already-admitted requirements;
their live acceptance remains outstanding. Do not admit a proposal or run
another advisor just to exercise that other path.

Every outcome is something to copy back, not a reason to repeat until a model
agrees. The vocabulary step's codes are:

- `vocabulary_queue_full`: ten or more of its own proposed/resurfaced candidates
  await review; no model was asked. Deferrals do not block it and the precondition
  queue is independent.
- `vocabulary_no_task`: no eligible Task had a title or notes; the run did not happen.
- `vocabulary_task_skipped`: an occurrence or a Task without title/notes was skipped.
- `vocabulary_proposal_refused`: one name was refused, with its code-authored reason;
  the rest of the run stands. This includes an existing name, a reserved first
  key segment, an unsupported collection, malformed grammar or excessive length.
- `vocabulary_value_required`: admission was refused because no operator value was supplied.
- `vocabulary_admission_refused`: the name or Task is no longer admissible; nothing was written.
- `universe_mutation_invalid`: the supplied value failed the same mutation validation
  as the UniverseState screen; read its remedy.

The advisory configuration, connection, timeout, HTTP, empty-response and
malformed-result outcomes below apply to either producer. A zero-candidate
result is also a result. For the precondition run, `precondition_missing_targets`
means needed targets were not recorded
and no candidate for that Task was enqueued. `precondition_task_skipped` means
a routine occurrence should be edited on its template, or the Task has neither
a title nor notes to reason over. At most three Tasks are named, followed by
one count of the rest. Read the explanation, but do not transcribe diagnostic
sentences, select code names for copy-back or tally their lines.
`precondition_no_facts` means no supported targets were available
and no model was asked. `advisory_unconfigured` means set the named configuration
in Setup; no model was asked. `precondition_proposal_refused` means the model
proposed something UbU cannot evaluate: that one Task got no candidate, and the
rest of the run stands. `advisory_malformed_result` means the response was not a
proposal result at all, so no candidates were enqueued. Connection, timeout and
HTTP diagnostics mean the run failed; read its remedy, copy the two result lines, and
go on to Stop. A valid result with zero candidates is also a result.

Copy back: for each producer, label its “Run status:” and “Candidates enqueued:”
lines with “Vocabulary” or “Precondition”. For a missing line, copy “no Vocabulary
Run status line”, “no Vocabulary Candidates enqueued line”, “no Precondition Run
status line” or “no Precondition Candidates enqueued line”. Include the vocabulary
judgment and any failed admission outcome above. Then copy the words of the
first precondition **as
the screen renders them**, with no substitution or hand redaction, plus the
rejection outcome above. For a replacement, copy both “Currently required”
and “Proposed requirement” as rendered. If there is no candidate, copy “no
candidate appeared, so nothing was rejected”. If rejection failed, copy
“rejection failed”; read the diagnostic remedy without tallying its lines.

## Finish

**13. Stop.** In the first terminal, press Ctrl-C. The store at
`/tmp/ubu-live-rehearsal.db` is a rehearsal store and can be left or removed.

If you approved, the calendar now holds what that store created and moved.
The next store will not know those events. The next run begins from a reset
calendar, at its step 6, so there is nothing to clean up after this one.

## What to copy back, in order

1. From step 7: the six counters with their numbers, or “no captured counter”,
   “no updated counter”, “no unchanged counter”, “no skipped counter”,
   “no moved counter” or “no resized counter” for each missing counter; the sentence beginning
   “N events had no colour.” or “1 event had no colour.”, or “no no-colour
   sentence”; and the “Diagnostic counts:” line exactly as shown, or “no
   Diagnostic counts line”. Do not expand or copy the list behind “The N
   events with no colour”, transcribe diagnostic sentences or count lines.
2. From step 8: the “Diagnostic counts:” line above “Timed placements”, or
   “no Diagnostic counts line”; the “Placements:” count line, or “no Placements
   line”; and the whole section “Not in this Plan”, or “no such section”.
3. From step 8: the whole panel headed “Plan risk”, exactly as rendered,
   or “no Plan risk panel”. Select it as one block; do not extract each finding.
4. From step 9: the line beginning “Operations proposed:”, or “no Operations
   proposed line”; and the whole of
   the first operation headed “Update:” that reads “Placement: Dynamic”,
   or “no Dynamic Update operation” if no Dynamic Update is shown.
5. From step 10: the two approval lines, “no Approval status line” or
   “no Operations applied line” for missing lines, or “I did not approve” if
   you did not click Approve.
6. From step 11: the line that begins “Entries:”, or “no Entries line”. The names
   and the counts
   only, never a value.
7. From step 12: both producers’ result lines, labelled Vocabulary and
   Precondition, or their four named absent-line phrases above. Include “a name
   was worth recording”, “no name was worth recording”, “no vocabulary candidate
   appeared” or “vocabulary queue full; no model asked”, and “target admission
   failed” if applicable. Then the first
   precondition’s words as rendered, with no substitution or hand redaction
   (both requirements for a replacement); and “left in Review”, “rejected;
   proposal left the queue”, or “rejection failed”. If none appeared: “no
   candidate appeared, so nothing was rejected”. If the queue blocked the run:
   the two result lines and “queue full; no model asked”, with no proposal words.
   Do not name diagnostic codes for copy-back or tally their lines.
8. And one answer, in your own words: is what it chose to schedule what you
   would have chosen, and is this a store you would plan tomorrow on? If
   not, what is missing?
