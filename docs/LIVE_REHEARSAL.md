# The live rehearsal

This is the procedure. It is the single source for the live sequence: a
ticket names this document and adds no steps of its own. Do the numbered
steps in order, from the first to the last, and copy back exactly the list
at the end.

Everything else in this repository runs in mock modes on a throwaway store.
This does not. It uses **your own store and your real Google Calendar**, and
only you can run it.

Each step says what to **open**, what to **click**, what to **read** and what
to **copy back**. When a step cannot be completed, write down what the screen
said and go on to the next step.

Two things changed in P1B-54, and this procedure follows them:

- **The times on Today are the times in the Plan.** Each placement shows when
  it starts and ends in your own timezone, and the timezone is named above
  the placements. Calendar shows the same instants in UTC.
- **`sleep` is in the palette.** It has Graphite, colour `8`, by default, so
  the app offers it and nothing has to be added by hand.

## Before you start

**1. Run the scripted checks.** In a terminal, in `ubu-devshell`:

```sh
source ./scripts/env.sh
./scripts/check-ui-contract.sh
./scripts/acceptance.sh --stage-only
```

Read: the first ends `RESULT: 20 of 20 scenarios passed, 0 failed, 2 skipped`.
The second ends `staged and checked 11 seed(s) for 9 step(s)`.

Copy back: those two lines.

If `acceptance.sh` is running without `--stage-only`, stop it with Ctrl-C
now. It holds the app's port, and step 3 refuses to start while it does.

**2. Back up the store, or choose a throwaway one.** With no orchestrator
running, in `ubu-devshell`:

```sh
cp -a ../ubu-orchestrator/ubu-orchestrator.db ~/ubu-orchestrator.db.before-live-rehearsal
```

Read: the command prints nothing. If it says `No such file or directory`,
you have no store yet; the orchestrator creates an empty one in step 3, and
there is nothing to back up.

A throwaway store is fine for a rehearsal. It is a new store, so step 10
applies to it. To use one, add this line to the exports in step 3, and say so
when you copy back:

```sh
export UBU_DB_PATH=/tmp/ubu-live-rehearsal.db
```

Copy back: one sentence. Either “I backed up my own store” or “I used a
throwaway store at /tmp/ubu-live-rehearsal.db”.

## Start

**3. Start the orchestrator, live.** In the same terminal, with your own two
paths:

```sh
export UBU_GOOGLE_CREDENTIALS_PATH=/absolute/path/to/credentials.json
export UBU_GOOGLE_TOKEN_CACHE_PATH=/absolute/path/to/token-cache.json
./scripts/run-live.sh
```

The planning horizon is **one week by default** from P1B-53, so there is no
horizon to set. One week of horizon is one week of calendar: capture takes
nothing that begins after it. To rehearse the one-day horizon instead, add
`export UBU_PLANNING_HORIZON_SECONDS=86400` before the last line.

Read: the script prints a block that begins `This is the LIVE run.` and names
the `store`, the `calendar` and the `horizon`. The `horizon` line reads
`604800 seconds, one week: the orchestrator's default.` The `store` line is
the store you chose in step 2. Then it asks for a word.

Type: `live`, and press Enter.

Read: the last line printed ends `ubu-orchestrator listening addr=127.0.0.1:7878`.

Copy back: the whole block from `This is the LIVE run.` down to the line
that begins `token cache`. It contains two file paths and no secret. Never
copy the contents of either file anywhere.

If the script prints `REFUSED:`, copy that line back, fix what it names, and
do this step again.

**4. Start the app.** In a second terminal, in `ubu-ui`:

```sh
npm run tauri:dev
```

Read: the app window opens on the screen “Today”.

Copy back: nothing.

## Tell UbU about your week

**5. Read the colour of sleep.** Open **Setup**. In the card headed
“Colours”, click “Reload colours”.

Read: in the table “Category colours” there is a row “sleep”, with “8” in the
column “Colour id” and “default” in the column “Origin”. In the table “Colour
to category at capture”, the row for colour id “8” reads “sleep”.

Colour `8` is Graphite. With this default, each night UbU exports is
Graphite, and **a real event you have coloured Graphite is captured as
sleep**. You have two choices, and step 15 asks which you took:

- keep it;
- give sleep a colour you do not use on real events: in the row “sleep”,
  type another colour id in the box and click “Save”. Every colour belongs to
  some category by default, so the table “Colour to category at capture” will
  then show that colour as “Collision: …”, and a real event of that colour is
  captured with no category.

If the row for colour id “8” reads “Collision: location, sleep — no category
assigned.”, your store holds a Setting you made for `location`, a category
that is now retired. It is still honoured. To give Graphite to sleep alone,
click “Revert” in the row “location”.

Copy back: the row “sleep”, and the row for colour id “8”.

**6. Author your night.** Open **Routines**. Under the heading “Create a
routine”, fill in the form with these values and your own hours:

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

Copy back: the values you entered for Timezone, Duration (minutes) and
Nominal start.

**7. Set the colours of the categories you use.** Open **Setup**. In the
card headed “Colours”, in the table “Category colours”, for each category
you use: type its colour id in the box in that row and click “Save”.

Read: the row's “Origin” becomes “setting”. Then read the table “Colour to
category at capture”. Every colour you intend to use on a real event should
show one category. A row that reads “Collision: …” or “Unmapped — no
category assigned.” is a colour whose events will be captured with no
category.

Copy back: every row of the table “Colour to category at capture”.

**8. Colour a week of real events, in Google Calendar.** In Google, give the
events of the coming week the colours from step 7.

An event you leave uncoloured is still captured. It gets no category, and
capture says so with `capture_colour_absent`. An all-day event is not
captured.

Copy back: nothing.

## Capture

**9. Enable the Google Calendar session.** Open **Setup**. In the card
headed “Google Calendar session”, click “Enable Google Calendar session”.

Read: the badge beside the heading changes to “enabled”, and under the
button two lines read “accepted true” and “enabled true”. The first time,
your browser opens for Google's consent; complete it.

Copy back: the two lines.

Nothing reached Google before this step. From here, on the screen
“Calendar”: “Run capture” and “Run reconciliation” READ your calendar, and
“Approve preview” WRITES to it.

**10. Delete UbU's own events from the calendar, if this store is new.** If
you are starting from an empty or throwaway store, first delete from the
calendar every event UbU created in an earlier run. UbU recognises its own
events from the store; a new store does not know them, so it will capture
them as if they were yours, and a routine that still generates them will
collide with the copy.

In Google Calendar, delete every event an earlier “Approve preview” created
in the coming week: each night “Asleep”, each occurrence of a routine, and
each Task UbU placed. Leave your own events.

If this is the store that created those events, do nothing: it knows them,
and capture reports them as “unchanged”.

This is what it looks like when the step was skipped, so that you can
recognise it:

- on **Tasks**, under “Backlog”, the same title twice or more, where you
  have one routine or one Task;
- on **Today**, after “Generate Plan”, a quiet grey box with
  `routine_occurrence_overlaps_commitment` or `static_task_collision`, and
  the sentence “Two fixed commitments overlap, or one depends on another
  that ends too late.” The second code names both Tasks, and they have the
  same title;
- before P1B-54, `static_task_collision` meant there was no Plan at all:
  “Timed placements” was empty.

The Plan is still made now, with the duplicates in it and their time busy.
The duplicates are not removed for you. To remove them, delete the events in
Google and start again from a new store.

Copy back: one sentence. “This store is new and I deleted N events”, “This
store is new and the calendar held none of UbU's events”, or “This is the
store that created them”.

**11. Capture.** Open **Calendar**. Under the heading “3. Capture”, click
“Run capture”.

Read: six counters appear: “captured”, “updated”, “unchanged”, “skipped”,
“moved” and “resized”. Under them, a quiet grey box may list sentences, each
with a code in small print after it.

- `capture_occupancy_only`: events UbU cannot own, which are the instances
  of recurring events. Each was recorded as occupied time. It names one id,
  or a count and the first three ids.
- `capture_colour_absent`, `capture_colour_unmapped`,
  `capture_colour_ambiguous`: an event with no colour, a colour mapped to
  nothing, or a colour two categories share. Each was captured with no
  category.
- `calendar_event_skipped`, `capture_all_day_unsupported`,
  `capture_event_invalid`: an event that was not captured, and why.

Capture does not reconstruct recurrence. Each instance of a recurring event
inside the week becomes its own Static Task, and nothing in UbU knows two of
them are the same commitment.

**Copy back the whole panel: the six counters with their numbers, and every
line in the box under them, each sentence with its code.** The counters alone
cannot explain a low count; the lines are what say why.

Then open **Tasks**. Under “Backlog” are the Tasks capture made.

Copy back: the titles of any real commitments of the coming week that are on
your calendar and are not in that list. And any title that is in the list
more than once.

## Plan

**12. Generate a Plan.** Open **Today**. Click “Generate Plan”.

Read, in this order:

- any box between the two buttons and the heading “Timed placements”. A
  quiet grey box is something that happened. A red box is a failure. If a
  grey box begins “Two fixed commitments overlap”, two of your fixed
  commitments are at the same time. Both are in the Plan and their time is
  busy; the line under it names them. A real calendar can be double-booked,
  and that is not a fault in UbU. Two with the same title mean step 10 was
  skipped;
- the line “Each placement shows when it starts and when it ends, in your
  timezone, …”. It names your timezone;
- under “Timed placements”, the titles and the two times beside each: when
  it starts, and when it ends. **These are the times in the Plan.** Your
  captured events, your routines and “Asleep” carry the badge “Static
  anchor”, and each “Asleep” starts at the time you entered in step 6 and
  ends the next day. Work the planner placed carries the badge “Skeleton”;
- below the placements, the section headed “Not in this Plan”, if there is
  one. It names each Task that did not fit, by title, with the reason and,
  under “What can be done:”, what to do about it. A Task that reads “Not
  ready” did not fail to fit: it is waiting for something to be so, and the
  section says what. With no such section, everything was placed.

Copy back: any box above “Timed placements”, whole. The line that names your
timezone. The two times beside the first “Asleep”. The title and the two
times of the first placement carrying the badge “Skeleton”. The whole section
“Not in this Plan”, or the words “no such section”. And the number of
placements carrying the badge “Skeleton”.

**13. Take a preview.** Open **Calendar**. Under the heading “1. Preview”,
click “Take preview”. This calls nothing and writes nothing.

Read: one operation for each event UbU would write. Each has a “Window:”
line with its start and end in UTC, and a “Placement:” line. The instants
are the ones Today showed in your timezone.

- “Create: Asleep” operations read “Placement: Static”. Asleep is exported:
  each night becomes a Busy event on your calendar. That is deliberate.
- No operation is proposed for an instance of a recurring event. UbU does
  not own those and never writes to them. A quiet grey box above the
  operations says so, once for each, with `calendar_event_id_unmappable`.
- A line containing “neither updated nor deleted”, with
  `calendar_event_retained`, is about Tasks you completed: the event of each
  is left as the record of it.

Copy back: the number of operations headed “Create:”, the number headed
“Update:”, the number headed “Delete:”, the whole grey box above them, and
the “Window:” line of the operation for the “Skeleton” placement you copied
in step 12.

**14. Decide whether to approve. You do not have to.** “Approve preview”,
under “2. Approve”, WRITES to your real calendar. It creates an event for
every placed Task, every routine occurrence and every night. It updates an
event only when its Task changed in UbU, and it deletes only events UbU
created. It never writes to an instance of a recurring event, and it never
updates or deletes the event of a completed Task.

If you click it:

Read: “Approval status: applied”, and a line “Operations applied in this
run: N of N”.

Copy back: those two lines. Or the words “I did not approve”.

**The events it creates are the ones step 10 is about.** If you used a
throwaway store, delete them in Google when you are done: the next store
will not know them. If you used your own store and keep it, leave them.

## Finish

**15. Stop.** In the first terminal, press Ctrl-C. If you used your own
store and want it as it was, copy the backup from step 2 back over it:

```sh
cp -a ~/ubu-orchestrator.db.before-live-rehearsal ../ubu-orchestrator/ubu-orchestrator.db
```

A store put back from a backup taken before the approval does not know the
events that approval created. Delete them in Google, as in step 10.

Copy back: one sentence saying which of the two choices in step 5 you took
for the colour of sleep.

## What to copy back, in order

1. From step 1: the `RESULT:` line and the `staged and checked` line.
2. From step 2: the sentence saying which store you used.
3. From step 3: the block from `This is the LIVE run.` to the `token cache`
   line, or the `REFUSED:` line.
4. From step 5: the row “sleep”, and the row for colour id “8”.
5. From step 6: your Timezone, Duration (minutes) and Nominal start.
6. From step 7: every row of “Colour to category at capture”.
7. From step 9: the lines “accepted” and “enabled”.
8. From step 10: the sentence saying whether the store is new and what you
   deleted.
9. From step 11: the six counters with their numbers, every line in the box
   under them with its code, the titles of real commitments that did not
   come in, and any title that is in the list more than once.
10. From step 12: any box above “Timed placements”, the line that names your
    timezone, the two times beside the first “Asleep”, the title and two
    times of the first “Skeleton” placement, the whole section “Not in this
    Plan” or the words “no such section”, and the number of “Skeleton”
    placements.
11. From step 13: the three counts, the grey box, and the “Window:” line of
    the operation for that “Skeleton” placement.
12. From step 14: the two approval lines, or “I did not approve”.
13. From step 15: which choice you took for the colour of sleep.
14. And one answer, in your own words: is that store one you would plan
    tomorrow on, and if not, what is missing?
