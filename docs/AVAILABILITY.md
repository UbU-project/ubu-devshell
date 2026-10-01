# Availability: telling UbU when no work may be placed

**UbU has no working-hours setting.** There is no "day starts at", no
"asleep from", no availability calendar. The planner places Dynamic work
wherever the horizon has free time, starting at the minute the Plan is
generated, at any hour.

Unavailability is expressed the way every other fixed commitment is: as a
**capacity-occupying Static Task**. That is what `UBU-D0279` means by Static
Tasks partitioning the horizon into chunks. A Static Task that occupies
capacity cuts the horizon, the free intervals between the cuts are the
chunks, and Dynamic work is only ever placed inside a chunk. A night is one
more cut. Because it recurs, it is a **Routine**.

## The recipe

One Routine, authored once, on the Routines screen or with
`POST /objective`:

| field | value |
|---|---|
| title | `Asleep`, or whatever you will recognise |
| `mode` | `evergreen` |
| `recurrence.timezone` | your IANA timezone, for example `America/New_York` |
| `recurrence.rule` | `{ "kind": "daily" }` |
| `routine_instance_template.nominal_start` | `23:00:00` |
| `routine_instance_template.duration_estimate` | `{ "type": "fixed", "seconds": 28800 }`, which is 480 minutes |
| `routine_instance_template.placement` | `static` |
| `routine_instance_template.occupies_capacity` | `true` |
| `routine_instance_template.category_tag` | none |

Use your own hours. Any block of the day you want kept clear is a Routine of
this shape: a second one for an evening, one with a weekly rule for a day
off.

## What it does

Checked by `scripts/check-ui-contract.sh`, scenario 19, at a one-day and a
one-week planning horizon, on every run:

- **It materialises once for each day of the horizon**, and each occurrence
  spans midnight: 23:00 on one local day to 07:00 on the next.
- **No Dynamic placement falls inside any Asleep window.** The rehearsal is
  staged two hours before the night with about three hours of work: what
  fits is placed that evening, and the rest is placed from 07:00 the next
  morning.
- What cannot fit any free interval is still reported as left out, exactly
  as it is without the night.

`scripts/acceptance.sh` stages the same routine in this computer's timezone,
so the operator sees it on Today.

## What it costs

- **It is exported to Google Calendar, as a Busy block every night.** The
  Calendar preview creates one event for each occurrence, with no colour and
  `transparent: false`. That is deliberate and it is asserted: a visible Busy
  block is the honest result of telling UbU you are unavailable. Suppressing
  it would need a per-routine "do not export" flag, which does not exist.
- **It counts as Uncategorized time.** The time-by-category report counts
  every Static window, and Asleep has no category, so eight hours a night
  appear under `Uncategorized`. Over a week that is fifty-six hours, far more
  than anything else in the report. Give the routine a category of its own if
  you would rather see it named.
- **It is only as long as the horizon.** At the default one-day horizon one
  night is materialised. At one week, seven are.
- **The duration is fixed in seconds.** By arithmetic, on the night the
  clocks change an eight-hour block that begins at 23:00 local ends at 06:00
  or 08:00 local. The rehearsal runs in a zone with no such night, so this
  is not tested.
- **It does not move for a late night.** It is a Static routine. An override
  for a single date is made on the Routines screen.

## What it is not

It is not a preference: the planner does not place work in it "if it must".
A Task longer than any free interval between the cuts is left out of the
Plan and named under **Not in this Plan** on Today.

It is not tested against other Static windows. What the planner does with a
captured calendar event that falls inside the night is not covered by the
rehearsal, whose events are all in waking hours.
