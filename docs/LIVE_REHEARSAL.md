# The live rehearsal

Everything else in this repository runs in mock modes on a throwaway store.
`check-ui-contract.sh` asserts the daily loop over an invented week, and
`acceptance.sh` stages that week for the app. Neither can tell you what
**your** calendar does to the planner. This is the one sequence that can,
and only you can run it: it uses your own store and your real Google
Calendar.

Do it after the scripted checks are green:

```sh
./scripts/check-ui-contract.sh        # nineteen of nineteen, two skipped
./scripts/acceptance.sh --stage-only  # every seed OK
```

Stop `acceptance.sh` before you begin. It holds the app's port, and
`run-live.sh` refuses to start while anything is listening there.

## 1. Back up the store

Your store is `ubu-orchestrator/ubu-orchestrator.db`, beside the
orchestrator's `Cargo.toml`. Capture writes Tasks to it. Copy it first, with
the orchestrator stopped:

```sh
cp -a ../ubu-orchestrator/ubu-orchestrator.db ~/ubu-orchestrator.db.before-live-rehearsal
```

To undo the whole rehearsal, stop the orchestrator and copy that file back.
An empty store is also a legitimate starting point: if the file does not
exist, the orchestrator creates one.

## 2. Decide the horizon

`UBU_PLANNING_HORIZON_SECONDS` is how far ahead UbU plans **and how much of
the calendar it sees**. The default is 86400, one day. One day of horizon is
one day of calendar: capture takes nothing that begins after it, and says
nothing about what it left. For a week, export 604800. The most is 2678400.

Which of the two the switch runs on has not been decided. The rehearsal is
where the difference shows, so it is worth doing at both.

## 3. Start the orchestrator, live

```sh
export UBU_GOOGLE_CREDENTIALS_PATH=/absolute/path/to/credentials.json
export UBU_GOOGLE_TOKEN_CACHE_PATH=/absolute/path/to/token-cache.json
export UBU_PLANNING_HORIZON_SECONDS=604800   # or leave unset for one day
./scripts/run-live.sh
```

The script prints the absolute path of the store it is about to open, the
calendar id and the horizon, and waits for you to type `live`. It refuses to
start if the credentials file does not exist, if the token cache does not
exist and cannot be created, if a mock calendar fixture is configured, or if
something is already listening on the port. `./scripts/run-live.sh --help`
says the rest. Never paste the contents of either file anywhere.

Then start the app in another terminal: `(cd ../ubu-ui && npm run tauri:dev)`.

## 4. Author your night

**Routines**: create an **Asleep** routine for your own hours. The recipe,
with the exact field values, is in [availability](AVAILABILITY.md): daily,
your timezone, the hour you stop, a fixed duration, Static, occupying
capacity. Without it the planner places work at any hour.

It is exported to your calendar as a Busy block every night when you
Approve. That is deliberate.

## 5. Set the colours

**Setup → Colours**: set `calendar.color.*` for the categories you actually
use, and read the inverse mapping beside it. Every one of Google's eleven
colours is mapped to a category by default, so:

- an event with a colour you did not mean to map still arrives with a
  category;
- moving a category onto a colour another category holds makes that colour
  ambiguous, and an event of that colour then arrives with no category and
  `capture_colour_ambiguous`. The Setting is accepted without a warning.

## 6. Colour a week in Google

In Google Calendar, give a week of your real events the colours you mapped.
An event with no colour arrives with no category and `capture_colour_absent`.
All-day events are not captured.

## 7. Enable Google Calendar, then Capture

**Setup → Enable Google Calendar session.** Nothing reaches Google before
this. The first Live request opens your browser for consent if the token
cache holds no token.

**Calendar → Run capture.** Capture reads your calendar and writes to your
store. It makes one Static Task for each event UbU did not create that is
inside the horizon:

- an event UbU can own is claimed, and from then on a drag or a resize in
  Google moves the Task;
- **an instance of a recurring event is recorded as occupied time.** UbU
  cannot own it and never writes to it. Each instance becomes its own
  unrelated Static Task. Capture does not reconstruct the series, and
  nothing in UbU knows two instances are the same commitment. They are
  reported once, as `capture_occupancy_only`, with a count.

**Write down:** how many events were captured; how many were
occupancy-only; how many had an unmapped, ambiguous or absent colour; and
**which of your real commitments did not come in at all**. That last list is
the one nothing prints: compare the Tasks screen with your calendar.

## 8. Generate a Plan, and read what did not fit

**Today → Generate Plan.** Read three things:

- **Timed placements.** The Static anchors are what capture brought in, your
  routines and your night. Is any work placed where you would not do it?
- **Not in this Plan.** Each Task the Plan left out, by title, with why and
  what can be done. A Task longer than any free interval in the horizon is
  left out; at a one-day horizon that is anything that does not fit before
  the day ends.
- **The risk report.** At the time of writing every Plan in the rehearsal is
  reported high risk for low coverage. That is an open question, not a
  finding about your week.

**Write down:** what did not fit, at which horizon, and whether the shape of
the waking hours is one you would work to.

Do not Approve unless you mean to. **Calendar → Take preview** shows what an
approval would write and calls nothing. Approve writes to your real
calendar: it creates an event for every placed Task and routine occurrence,
your night included. Every re-plan after that rewrites the Dynamic events,
and a Task completed through Next Task has its event deleted at the next
approval. Both are open decisions.

## 9. Say whether you would plan tomorrow on it

Is that store one you would plan tomorrow on? If not, what is missing is the
list that decides the remaining tickets before the switch.

To put everything back: stop the orchestrator, restore the copy from step 1,
and delete from Google any events an approval created.
