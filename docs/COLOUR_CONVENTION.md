# The colour convention

This is the one place the rule is written down, in both directions. Other
documents point here.

**A colour decides the placement.** On the calendar, an event with no colour
is work for UbU to schedule, and an event with any colour is a commitment at
its own time. Export and capture are the same rule read in opposite
directions, so a round trip closes.

| | on the calendar | means |
|---|---|---|
| Dynamic work | **no colour** | UbU decides when. Only its length is fixed. |
| A Static commitment | **its category's colour** | It happens at its own time. The colour is the category. |

Busy against Free decides nothing about placement. That was a Quick UbU
workaround for having no notion of chunks, and it is retired.

## Export: what UbU writes

| the Task | the event UbU writes |
|---|---|
| Dynamic | at the window the Plan chose, with **no colour** |
| Static, with a category | at its own window, in the category's colour |
| Static, with no category | at its own window, with **no colour** |

The preview says of each operation what its placement is, in `static_anchor`.
The placement is never inferred from the colour.

## Capture: what UbU reads

For an event UbU did not create:

| the event | the Task capture makes |
|---|---|
| **no colour** | **Dynamic.** `duration_estimate` is fixed at the event's length. No `static_window`, no category. It always occupies capacity. The event's start time is discarded. |
| a colour that maps to one category | **Static**, at the event's window, in that category. `occupies_capacity` follows Busy or Free. |
| a colour that maps to no category, or to several | **Static**, at the event's window, with no category. `capture_colour_unmapped` or `capture_colour_ambiguous` says so. |
| an instance of a recurring event, any colour or none | **Static**, as occupied time. UbU cannot write to it, so it cannot move it. |
| shorter than one planning second | nothing: refused. A duration is never invented. |
| all-day | nothing: skipped. It has a date and no time, so it has no length. |

`capture_colour_absent` is not a deficiency. It says the event had no colour,
so it was taken as work for UbU to schedule.

**The first preview after a capture moves the uncoloured events.** Each is an
`update` to the window the Plan chose, with no colour. Approving it writes
those windows to the calendar. One that does not fit is left where it is: a
captured event is never deleted.

## After capture: a Task from the calendar follows its event's colour

A captured event is UbU's to manage from then on, and the same rule keeps
reading it:

- take the colour off a commitment's event, and at the next capture its Task
  becomes Dynamic. The `static_window` is removed and the duration is the
  event's length;
- give a to-do's event a colour, and at the next capture its Task becomes
  Static at the time the event then has, in that colour's category. The
  duration is removed.

Changing one colour to another is not read. It is reported as
`capture_owned_drift`, as before.

## A colour as a gesture: done

On an event UbU exported for a **Task made in UbU**, a colour is a gesture,
and has been since P1B-33: colouring a Dynamic one means **done**. That is
unchanged, and the capture rule never reads such an event.

So the two readings do not compete, because they read different events:

| the event's Task | a colour on its uncoloured event means |
|---|---|
| made in UbU | done |
| came from the calendar | a commitment at the time it then has |

**This is the one thing to hold in mind.** On the phone the two look alike:
both are uncoloured events UbU placed. Colouring a to-do that came from the
calendar does not complete it. It pins it. To complete it, use Complete in
the app. The preview says which is which on each operation, under “Colour
means”.

## Where the round trip does not close

A Static Task with **no category** is exported with no colour. In the store
that exported it nothing changes: the event is UbU's own and is not captured
again.

A **new store** reading that calendar is the case that matters. From P1B-57
UbU stamps each event it creates, so a new store knows such an event for UbU's
own, captures nothing from it and names it as `capture_stale_export`: the
colour is never read. But an event from before P1B-57 carries no stamp. A new
store sees an uncoloured event and takes it as Dynamic work, so a commitment
made in UbU and given no category did not survive a store reset as a
commitment.

The remedy for unstamped leftovers is to reset the rehearsal calendar before
capturing into a new store, which [the live rehearsal](LIVE_REHEARSAL.md)
tells the operator to do. The runner's scenario 20 asserts both cases. The
stamp is described in `ubu-orchestrator/docs/CAPTURE_PROVENANCE.md`.

## Where each part is asserted

- `ubu-orchestrator/tests/capture_partition.rs`: the capture rule, the flip in
  both directions, and the round trip.
- `ubu-orchestrator/tests/calendar_interaction.rs`: the gesture boundary, from
  both sides.
- `scripts/check-ui-contract.sh`, scenario 21: six seeded events, one of each
  kind, over HTTP. Scenario 19 walks a week that holds two uncoloured events.
- `ubu-orchestrator/docs/CALENDAR_CAPTURE.md` and `CALENDAR_INTERACTION.md`
  hold the detail.
