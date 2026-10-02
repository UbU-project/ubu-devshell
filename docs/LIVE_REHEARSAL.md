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
This document asked for fourteen things back. It now asks for six. The steps
whose copy-back went are still here, as instructions, because the later steps
need what they set up.

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

**The week will not hold everything, and that is not a failure.** Last time
about sixty of your events had no colour. They are now sixty pieces of work
to place in a week that already holds about a hundred and fifty commitments
and seven nights. They will not all fit. The section “Not in this Plan” on
Today will be long. Until now UbU could only show a week of fixed blocks. It
will now say what does not fit, which is the question the tool exists to
answer. The thing to judge is not whether everything fits. It is whether
**what it chose to schedule is what you would have chosen**.

## Before you start

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

**5. Set the colours you use.** A colour now does two things. It says an
event is a commitment at its own time, and it says which category the
commitment is in. Open **Setup**. In the card headed “Colours”, in the table
“Category colours”, for each category you use: type its colour id in the box
in that row and click “Save”.

Read: the row's “Origin” becomes “setting”. Then read the table “Colour to
category at capture”:

- a row that shows one category is a colour whose events are captured as
  commitments in that category;
- a row that reads “Collision: …” or “Unmapped — no category assigned.” is a
  colour whose events are still captured as commitments at their own times,
  with no category;
- the row for colour id “8” reads “sleep”. Colour `8` is Graphite, so a real
  event you have coloured Graphite is captured as a commitment in the sleep
  category;
- no row is for “no colour”. An event with no colour is not a commitment at
  all, and the sentence under the heading says so.

Copy back: every row of the table “Colour to category at capture”.

**6. Colour your week, in Google Calendar. This step decides what UbU may
move.** Go through the events of the coming week and give each one a colour,
or leave it without one, by this rule:

- **A commitment gets a colour.** A meeting, an appointment, anything that
  happens when it happens. Give it the colour of its category from step 5.
  UbU will not move it.
- **A to-do gets no colour. Leaving an event's colour as “Default” is how you
  tell UbU to schedule it.** UbU keeps its length and discards its time. It
  will be placed wherever in the week UbU chooses, and step 12 moves the
  event there.

The same rule runs the other way when UbU writes to the calendar: a
commitment is written in its category's colour, and work UbU scheduled is
written with no colour.

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

## Capture

**7. Enable the Google Calendar session.** Open **Setup**. In the card
headed “Google Calendar session”, click “Enable Google Calendar session”.

Read: the badge beside the heading changes to “enabled”. The first time,
your browser opens for Google's consent; complete it.

Nothing reached Google before this step. From here, on the screen
“Calendar”: “Run capture” and “Run reconciliation” READ your calendar, and
“Approve preview” WRITES to it.

**8. Delete UbU's own events from the calendar.** This store is new. First
delete from the calendar every event UbU created in an earlier run. UbU
recognises its own events from the store; a new store does not know them, so
it will capture them as if they were yours, and a routine that still
generates them will collide with the copy.

In Google Calendar, delete every event an earlier “Approve preview” created
in the coming week: each night “Asleep”, each occurrence of a routine, and
each Task UbU placed. Leave your own events.

What a leftover becomes follows its colour, like any other event. One with a
colour is captured as a commitment, beside the routine that still generates
it: the same title twice on Tasks, and on Today a grey box with
`routine_occurrence_overlaps_commitment` or `static_task_collision`. One with
no colour is captured as work to schedule: a to-do you did not write.

**9. Capture.** Open **Calendar**. Under the heading “3. Capture”, click
“Run capture”.

Read: six counters appear: “captured”, “updated”, “unchanged”, “skipped”,
“moved” and “resized”. Under them:

- a sentence that begins “N events had no colour.” Those are your to-dos.
  The sentence says it is not something missing. Under it, “The N events with
  no colour” opens a list with one line for each;
- a quiet grey box with the other lines, each with a code in small print:
  - `capture_occupancy_only`: the instances of recurring events, recorded as
    occupied time. It names one id, or a count and the first three;
  - `capture_colour_unmapped`, `capture_colour_ambiguous`: a commitment whose
    colour maps to no category, or to several. It is captured at its own
    time with no category;
  - `capture_all_day_unsupported`: an all-day event, skipped, and why;
  - `calendar_event_skipped`, `capture_event_invalid`: an event that was not
    captured, and why.

Copy back: the six counters with their numbers; the sentence that begins “N
events had no colour.”; and every line in the grey box, each sentence with
its code. The list of uncoloured events itself is not needed.

## Plan

**10. Generate a Plan.** Open **Today**. Click “Generate Plan”.

Read, in this order:

- any box between the two buttons and the heading “Timed placements”. A
  quiet grey box is something that happened. A red box is a failure. A box
  that begins “N pairs of fixed commitments overlap” is about commitments of
  yours that are double-booked: both are in the Plan, and their time is busy.
  There were 66 such pairs last time. Pairs of uncoloured events are no
  longer among them;
- under “Timed placements”, the titles and the two times beside each. Your
  coloured events, your routines and “Asleep” carry the badge “Static
  anchor”. **Your uncoloured events carry the badge “Skeleton”, and the times
  beside them are the ones UbU chose**;
- below the placements, **the section headed “Not in this Plan”**. It names
  each piece of work that did not fit, by title, with the reason and what can
  be done. This time it will be long, and it is the most useful thing on the
  screen: it is what the week cannot hold.

Copy back: the first sentence of any box above “Timed placements”. The
number of placements carrying the badge “Skeleton”. And the whole section
“Not in this Plan”, or the words “no such section”.

**11. Take a preview.** Open **Calendar**. Under the heading “1. Preview”,
click “Take preview”. This calls nothing and writes nothing.

Read: one operation for each event UbU would write.

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

Copy back: the number of operations headed “Create:”, the number headed
“Update:”, the number headed “Delete:”, and the whole of the first operation
headed “Update:” that reads “Placement: Dynamic”.

**12. Decide whether to approve. Read this before you press it.**

**Approving will move every uncoloured event that was placed to the time UbU
chose.** That was about sixty events last time. Each one leaves the slot you
parked it in and appears where the Plan put it, still with no colour, and
marked Busy. This is the feature working, and it is the most surprising
thing this change does. Your coloured events are not moved. Nothing is
deleted that UbU did not create.

“Approve preview”, under “2. Approve”, WRITES to your real calendar. It also
creates an event for every night and every routine occurrence. It never
writes to an instance of a recurring event.

You do not have to approve. If you want to see the moves first, read the
“Update:” operations in step 11: they are exactly what will be written.

If you click it:

Read: “Approval status: applied”, and a line “Operations applied in this
run: N of N”.

Copy back: those two lines. Or the words “I did not approve”.

## Finish

**13. Stop.** In the first terminal, press Ctrl-C. The store at
`/tmp/ubu-live-rehearsal.db` is a rehearsal store and can be left or removed.

If you approved, the calendar now holds what that store created and moved.
The next store will not know those events. Before the next rehearsal, do
step 8 again: delete the nights and routine occurrences this run created.
The to-dos it moved are your own events and stay, where UbU put them.

## What to copy back, in order

1. From step 5: every row of the table “Colour to category at capture”.
2. From step 9: the six counters with their numbers, the sentence that
   begins “N events had no colour.”, and every line in the grey box with its
   code.
3. From step 10: the first sentence of any box above “Timed placements”, the
   number of “Skeleton” placements, and the whole section “Not in this Plan”
   or the words “no such section”.
4. From step 11: the three counts, and the whole of the first operation
   headed “Update:” that reads “Placement: Dynamic”.
5. From step 12: the two approval lines, or “I did not approve”.
6. And one answer, in your own words: is what it chose to schedule what you
   would have chosen, and is this a store you would plan tomorrow on? If
   not, what is missing?
