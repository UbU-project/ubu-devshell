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
There are twelve steps and seven copy-back items. The colour setup and
colouring steps are retired in P1B-60; their preconditions are below.

When a step cannot be completed, write down what the screen said and go on to
the next step.

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
still asks for the badge and for every finding's name and severity, in the
order the panel lists them, so that nobody has to scan a list and conclude
that something is not in it.

**The preview counts itself.** Until P1B-58 step 9 asked for three counts
that no screen showed, and a preview of ninety operations could only be
tallied by eye. The Preview panel now says the counts in one line, and step
9 asks for that line.

**What a Task can wait for has a screen.** A Task can ask that something be
true before UbU will plan it. From P1B-58 the screen “UniverseState” shows
what is recorded, and step 11 opens it. This run records nothing there, so on
this store it will say that nothing is recorded yet. That is the expected
reading and not a fault.

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

Copy back three things, and only these:

- the six counters with their numbers;
- the sentence that begins “N events had no colour.”;
- every line in the grey box, each sentence with its code.

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

Copy back: the first sentence of any box above “Timed placements”. The
number of placements carrying the badge “Skeleton”. And the whole section
“Not in this Plan”, or the words “no such section”.

Copy back: the words on the badge beside “Plan risk”, and every finding's
name and severity, in order as the panel lists them.

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
appears, and the whole of the first operation headed “Update:” that reads
“Placement: Dynamic”. Do not count the operations yourself.

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

Copy back: those two lines. Or the words “I did not approve”.

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
of its numbers is not 0, copy the line back all the same.

**That line, and nothing else from this screen.** It holds the names of the
collections and a count for each, and no value. A UniverseState is where
facts about your own life are recorded: health, money, your household. No
step in this document asks for a value from this screen, a key from it or
any row of its tables, and none ever may. Anyone who edits this step must
leave that as it is.

## Ask for a precondition

**12. Author facts, then run the advisor.** This model-dependent step comes
last, after the deterministic checks. Stay in **UniverseState**. Choose two or
three facts relevant to your captured Tasks. Under “Facts”, enter a key and a
value and click “Set fact”; or under “Numbers”, enter a key and a number and
click “Set number”. Use names meaningful to you. What you enter stays private
and is recorded as asserted. Do not copy any key, value or row back.

Open **Review**. Under “Precondition advisor”, leave “Precondition Task limit”
at 25 and click “Run precondition advisor”. It considers active Tasks with a
description, including one with an existing precondition. A captured Task with
no description is skipped; this step does not require an interview or promise
any candidate.
A replacement shows “Currently required” and “Proposed requirement” together,
with a line saying that admitting replaces the first with the second.
Read “Run status” and “Candidates enqueued”, then the first precondition proposal
in the queue, if there is one. A first-time proposal says “Before this Task
can be planned:” and the condition in words; a replacement uses the two labels
above. **Leave it in Review for this rehearsal.** No admission
is needed to read the proposal, and the Plan already approved is unchanged.

Every outcome is something to copy back, not a reason to repeat until a model
agrees. `precondition_missing_targets` means needed targets were not recorded
and no candidate for that Task was enqueued. `precondition_task_skipped` means
an occurrence or a missing description prevented selection. `precondition_no_facts` means no supported targets were available
and no model was asked. `advisory_unconfigured` means set the named configuration
in Setup; no model was asked. Connection, timeout, HTTP and malformed-result
diagnostics mean the run failed; read its remedy, copy only the code, and go on
to Stop. A valid result with zero candidates is also a result.

Copy back: the candidate count and the words of the first precondition, **with
every target name and expected value replaced by `[target]` and `[value]`**.
Keep only the relationship words (such as “is at least”, “and”, “or”). A candidate
can itself repeat private values or names, so its unredacted sentence is not a
safe copy-back. Never copy a Task description or title, a fact's key or value,
or diagnostic text that names a target. If there is no candidate, write “no
candidate” and the diagnostic codes only, or “no diagnostics”.

## Finish

**13. Stop.** In the first terminal, press Ctrl-C. The store at
`/tmp/ubu-live-rehearsal.db` is a rehearsal store and can be left or removed.

If you approved, the calendar now holds what that store created and moved.
The next store will not know those events. The next run begins from a reset
calendar, at its step 6, so there is nothing to clean up after this one.

## What to copy back, in order

1. From step 7: the six counters with their numbers, the sentence that
   begins “N events had no colour.”, and every line in the grey box with its
   code. Do not expand or copy the list behind “The N events with no colour”.
2. From step 8: the first sentence of any box above “Timed placements”, the
   number of “Skeleton” placements, and the whole section “Not in this Plan”
   or the words “no such section”.
3. From step 8: the words on the badge beside “Plan risk”, and every
   finding's name and severity, in order.
4. From step 9: the line that begins “Operations proposed:”, and the whole
   of the first operation headed “Update:” that reads “Placement: Dynamic”.
5. From step 10: the two approval lines, or “I did not approve”.
6. From step 11: the line that begins “Entries:”. The names and the counts
   only, never a value.
7. From step 12: the candidate count and the first precondition’s words with
   target names replaced by `[target]` and expected values by `[value]`; or
   “no candidate” and diagnostic codes only. No descriptions, titles or private
   keys or values.
8. And one answer, in your own words: is what it chose to schedule what you
   would have chosen, and is this a store you would plan tomorrow on? If
   not, what is missing?
