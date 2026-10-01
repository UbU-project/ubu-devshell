# P1B-53: the six decisions

The operator answered six open questions after the P1B-52 acceptance and the
first live rehearsal. Five were implemented in P1B-53. The sixth is a
decision to change nothing, and is recorded here so that it is not reopened
by accident.

| | Decision | What was done | Where it is written down |
|---|---|---|---|
| 1 | Sleep is its own category | The Asleep routine carries `sleep`. Its colour is the operator's own Setting, `calendar.color.sleep`, and not a palette default | [availability](AVAILABILITY.md) |
| 2 | One week for the switch | The default planning horizon is 604800 seconds | `ubu-orchestrator/docs/PLANNING_TIME.md` |
| 3 | Both churn fixes | A completed Task's calendar event is frozen, and the Plan starts on a whole minute | `ubu-orchestrator/docs/CALENDAR_APPLY.md`, `ubu-orchestrator/docs/PLANNING_TIME.md` |
| 4 | Risk needs investigating | Nothing here. It is P1B-54: an investigation that ends with a recommendation, not a patch | the P1B-53 ticket |
| 5 | Effects are idempotent per Task | A Task's effects apply once, however many times it is completed | `ubu-orchestrator/docs/TASK_REOPEN.md` |
| 6 | The default colour mapping is fine | **No change** | below |

## Decision 6: the default colour mapping needs no change

All eleven of Google Calendar's event colours are mapped to a category by
the default palette. The rehearsal showed what follows from that: no colour
is unmapped by default, and freeing one for a new category, or giving a new
category a colour, makes some colour a collision.

**The operator's decision is that the default mapping needs no change.** His
reasoning, as the P1B-53 ticket records his answer: Google Calendar shows
“Default” as a swatch distinct from the palette colour it actually
corresponds to. That is a visual matter, not a data one. He notes that a
future version may address it, since users may not understand the
difference.

So, on purpose:

- **no default changes.** The palette in `category_palette.rs` is as it was;
- **no diagnostic is added.** A Setting that makes a colour a collision is
  accepted as before. The collision is the operator's own, and Setup shows it
  in the table “Colour to category at capture” as `Collision: …`;
- `sleep` did not become a twelfth default. It has no colour unless the
  operator sets one, for the reason in [availability](AVAILABILITY.md).

What a future version may address is the understanding, not the data: why
Google's “Default” swatch and the palette colour it stands for look
different.

## A future direction recorded with decision 5

Reopening a Task reverses none of the effects it applied. From P1B-53 they
are also never applied a second time. The operator's note, as the ticket
records it: a future version may ask the operator whether to reverse
`UniverseState` during an undo. That wants a recorded decision of its own in
`ubu-design`, which this workspace cannot edit. Nothing implements it.

## Two reminders for `ubu-design`

Carried from the ticket, because this is where they will be seen:

- the deprecation of `UBU-D0259`'s decomposition-undo rule, superseded by
  `UBU-D0278`, is still not official and explicit;
- decision 5's future direction, above, wants a recorded decision.
