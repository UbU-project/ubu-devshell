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

Two things to know before you start:

- **The dates and times on Today are wrong.** Beside each placement, Today
  prints a date and time computed as if the Plan's seconds were minutes. Do
  not judge a Plan by them. The true times are on Calendar, in each
  operation's “Window:” line, in UTC. This is a known defect, written down in
  the P1B-53 report.
- **The app cannot give `sleep` a colour or a category by itself.** Setup's
  Colours card edits only categories the palette already has, and the
  Routines form offers only those. One command in step 5 adds `sleep`.

## Before you start

**1. Run the scripted checks.** In a terminal, in `ubu-devshell`:

```sh
source ./scripts/env.sh
./scripts/check-ui-contract.sh
./scripts/acceptance.sh --stage-only
```

Read: the first ends `RESULT: 19 of 19 scenarios passed, 0 failed, 2 skipped`.
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

A throwaway store is fine for a rehearsal. To use one, add this line to the
exports in step 3, and say so when you copy back:

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

**5. Add the `sleep` category.** In a third terminal:

```sh
curl -sS -X PUT http://127.0.0.1:7878/setting/calendar.color.sleep \
  -H 'content-type: application/json' \
  -d '{"schema_version":"ubu.orchestrator.setting.v1","value":"8"}'
```

Read: one line of JSON that contains `"setting_id"` and `"version":1`.

Then, in the app: open **Setup**. In the card headed “Colours”, click
“Reload colours”.

Read: in the table “Category colours” there is now a row “sleep”, with “8”
in the column “Colour id” and “setting” in the column “Origin”. In the table
“Colour to category at capture”, the row for colour id “8” reads
“Collision: location, sleep — no category assigned.”

That collision is expected, and it is the cost of Graphite. Colour `8` is
Graphite, and the default palette already gives it to `location`. With this
Setting, **a real event you have coloured Graphite is captured with no
category**, and capture says so. You have three choices, and step 14 asks
which you took:

- keep it, and do not colour real events Graphite;
- give sleep a colour you do not use on real events: in the row “sleep”,
  type another colour id in the box and click “Save”;
- have no colour for sleep: after step 6, click “Revert” in the row “sleep”.
  The routine keeps its category, and its events are exported with no
  colour.

Copy back: the JSON line, the row “sleep”, and the row for colour id “8”.

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

**10. Capture.** Open **Calendar**. Under the heading “3. Capture”, click
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
your calendar and are not in that list.

## Plan

**11. Generate a Plan.** Open **Today**. Click “Generate Plan”.

Read, in this order:

- any box between the two buttons and the heading “Timed placements”. A
  quiet grey box is something that happened. A red box is a failure;
- under “Timed placements”, the titles. Your captured events, your routines
  and “Asleep” carry the badge “Static anchor”. Work the planner placed
  carries the badge “Skeleton”. **Do not read the dates and times beside
  them: they are wrong on this screen;**
- below the placements, the section headed “Not in this Plan”, if there is
  one. It names each Task the Plan left out, by title, with the reason and,
  under “What can be done:”, what to do about it. With no such section,
  everything was placed.

Copy back: any box above “Timed placements”, whole. The whole section “Not
in this Plan”, or the words “no such section”. And the number of placements
carrying the badge “Skeleton”.

**12. Take a preview.** Open **Calendar**. Under the heading “1. Preview”,
click “Take preview”. This calls nothing and writes nothing.

Read: one operation for each event UbU would write. Each has a “Window:”
line with its true start and end, in UTC, and a “Placement:” line.

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
the “Window:” line of the first operation that reads “Placement: Dynamic”.
That line is when the day's work would start.

**13. Decide whether to approve. You do not have to.** “Approve preview”,
under “2. Approve”, WRITES to your real calendar. It creates an event for
every placed Task, every routine occurrence and every night. It updates an
event only when its Task changed in UbU, and it deletes only events UbU
created. It never writes to an instance of a recurring event, and it never
updates or deletes the event of a completed Task.

If you click it:

Read: “Approval status: applied”, and a line “Operations applied in this
run: N of N”.

Copy back: those two lines. Or the words “I did not approve”.

To put your calendar back afterwards, delete in Google the events the
approval created.

## Finish

**14. Stop.** In the first terminal, press Ctrl-C. If you used your own
store and want it as it was, copy the backup from step 2 back over it:

```sh
cp -a ~/ubu-orchestrator.db.before-live-rehearsal ../ubu-orchestrator/ubu-orchestrator.db
```

Copy back: one sentence saying which of the three choices in step 5 you
took for the colour of sleep.

## What to copy back, in order

1. From step 1: the `RESULT:` line and the `staged and checked` line.
2. From step 2: the sentence saying which store you used.
3. From step 3: the block from `This is the LIVE run.` to the `token cache`
   line, or the `REFUSED:` line.
4. From step 5: the JSON line, the row “sleep”, and the row for colour id
   “8”.
5. From step 6: your Timezone, Duration (minutes) and Nominal start.
6. From step 7: every row of “Colour to category at capture”.
7. From step 9: the lines “accepted” and “enabled”.
8. From step 10: the six counters with their numbers, every line in the box
   under them with its code, and the titles of real commitments that did not
   come in.
9. From step 11: any box above “Timed placements”, the whole section “Not in
   this Plan” or the words “no such section”, and the number of “Skeleton”
   placements.
10. From step 12: the three counts, the grey box, and the “Window:” line of
    the first “Placement: Dynamic” operation.
11. From step 13: the two approval lines, or “I did not approve”.
12. From step 14: which choice you took for the colour of sleep.
13. And one answer, in your own words: is that store one you would plan
    tomorrow on, and if not, what is missing?
