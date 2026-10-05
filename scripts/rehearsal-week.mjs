// rehearsal-week.mjs: one invented week, for the switch rehearsal.
//
// Imported by check-ui-contract.mjs, which walks the daily loop over it and
// asserts, and by acceptance.mjs, which stands it up for the app. The same
// week, built the same way, so what the runner proves is what the operator
// looks at.
//
// Every title here is invented and says so. This is not the operator's
// calendar and not an imitation of it. Its SHAPE is realistic: a recurring
// commitment, coloured one-off events, two uncoloured events parked at
// overlapping times, one leftover that UbU itself wrote in an earlier run, a
// routine, a night, a Dynamic backlog with one Task that cannot fit anywhere,
// a Preference, and category colours.
//
// A colour decides the placement (P1B-55). The coloured events are commitments
// at their own times. The two uncoloured ones are to-dos: capture takes each as
// Dynamic work of the event's length, and the planner decides when. So the week
// has two sources of Dynamic work, the backlog and the calendar, as a real one
// does.
//
// The week lives in a timezone, because a night does. Its events are at local
// wall-clock hours: the routine at noon, the standing commitment at 14:00, the
// one-off events at 16:00 and 18:00, the two parked to-dos at 17:00 and 17:15,
// and Asleep from 23:00 for eight hours.
// The runner stages it in a zone where it is always evening, so every walk is
// the same walk; the harness stages it in the computer's own zone, so the
// night on screen is the operator's night.

const HOUR = 3_600_000;
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
// Google's own suffix for an instance of a recurring event: its original start, in UTC.
const stamp = (ms) => iso(ms).replace(/[-:]/g, "");

/// The wall-clock fields of an instant in an IANA zone.
export function localParts(zone, ms) {
  const format = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  const part = Object.fromEntries(format.formatToParts(new Date(ms)).map(({ type, value }) => [type, Number(value)]));
  return { year: part.year, month: part.month, day: part.day, hour: part.hour, minute: part.minute, second: part.second };
}
const offsetMs = (zone, ms) => {
  const p = localParts(zone, ms);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
};
/// The first instant at or after `fromMs` at which it is `hour`:00:00 in `zone`.
export function nextLocalHour(zone, fromMs, hour) {
  const p = localParts(zone, fromMs);
  for (let ahead = 0; ahead < 3; ahead += 1) {
    const wall = Date.UTC(p.year, p.month - 1, p.day + ahead, hour);
    // Twice, so that an offset that changes between the guess and the answer is the answer's.
    const instant = wall - offsetMs(zone, wall - offsetMs(zone, wall));
    if (instant >= fromMs) return instant;
  }
  throw new Error(`no ${hour}:00 found in ${zone} within three days of ${iso(fromMs)}`);
}

/// A fixed-offset zone in which the top of the current hour is 21:00. The runner
/// uses it so that every walk happens on the same evening: two hours before the
/// night, with more work than fits before it.
export function eveningZone(nowMs) {
  let offset = (21 - new Date(nowMs).getUTCHours() + 24) % 24;
  if (offset > 12) offset -= 24;
  // IANA's Etc names carry the sign reversed: Etc/GMT-3 is three hours ahead of UTC.
  return offset === 0 ? "Etc/UTC" : `Etc/GMT${offset > 0 ? "-" : "+"}${Math.abs(offset)}`;
}
/// The computer's own zone, for the harness: the night on screen is the operator's night.
export const localZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/// The body ubu-ui's Routines screen sends to create one of the week's routines.
export function routineBody(week, routine, schemaVersion) {
  return {
    schema_version: schemaVersion,
    mode: "evergreen",
    title: routine.title,
    recurrence: { timezone: week.zone, rule: { kind: "daily" } },
    routine_instance_template: {
      title: routine.title,
      duration_estimate: { type: "fixed", seconds: routine.seconds },
      nominal_start: routine.nominalStart,
      placement: "static",
      occupies_capacity: true,
      ...(routine.category ? { category_tag: routine.category, tags: [routine.category] } : { tags: [] }),
      reminder_minutes: []
    }
  };
}

/// `nowMs` is the moment of staging and `zone` the IANA zone the week lives in.
/// Every event begins at least an hour after the top of the current hour and
/// within a day of it, so the first of each is inside a one-day horizon.
export function rehearsalWeek(nowMs, zone) {
  const thisHour = Math.floor(nowMs / HOUR) * HOUR;
  const at = (hours, minutes = 0) => iso(thisHour + hours * HOUR + minutes * 60_000);
  const next = (hour) => nextLocalHour(zone, thisHour + HOUR, hour);
  const event = (external_id, summary, startMs, minutes, color_id, description) => ({
    external_id, summary, start_at: iso(startMs), end_at: iso(startMs + minutes * 60_000), color_id, transparent: false, reminders_minutes: [],
    ...(description === undefined ? {} : { description })
  });

  // One recurring commitment: seven daily instances at 14:00 local, a week of
  // it. The id is in the shape Google gives an instance, {base32hex}_{timestamp},
  // with an invented base. UbU cannot own it, so each instance is captured as
  // occupied time. Each becomes its own Static Task: nothing in UbU knows that
  // the seven are one commitment.
  const RECURRING_BASE = "0inv3nt3dmarm0tc0unci1";
  const recurring = [];
  for (let start = next(14); recurring.length < 7; start = nextLocalHour(zone, start + HOUR, 14)) {
    recurring.push(event(`${RECURRING_BASE}_${stamp(start)}`, "Invented standing marmot council", start, 60, "9"));
  }

  // Two one-off events with ids UbU can own. One carries a mapped colour; the
  // other carries colour 1, which the Settings below leave mapped to nothing.
  const mapped = event("0inv3nt3dk3tt1edescaling", "Invented kettle descaling appointment", next(16), 30, "3");
  const unmapped = event("0inv3nt3d1ighth0uset0ur", "Invented lighthouse tour", next(18), 60, "1");

  // Two one-off events with no colour, parked at overlapping times as to-dos
  // are. Capture takes each as Dynamic work: its length is its duration, and
  // its time is not kept. Being Dynamic, the two do not collide.
  const parked = [
    { key: "globe", seconds: 2_700, ...event("0inv3nt3dg10bereturn", "Invented: return the library globe", next(17), 45, null) },
    { key: "duck", seconds: 1_800, ...event("0inv3nt3dbrassduck", "Invented: polish the brass duck", next(17) + 15 * 60_000, 30, null, "Invented brass duck polishing needs the synthetic soft cloth.") }
  ];
  /// The event alone, as the mock Calendar holds it.
  const asEvent = ({ key, seconds, ...rest }) => rest;

  // One event UbU wrote in an earlier run, for a Task no store here has: a
  // leftover. It is in Google's own shape, because it carries the stamp UbU
  // writes when it creates an event (P1B-57): a private extended property
  // naming the Task whose handle the event id is. Capture recognises it as
  // UbU's own echo. It becomes no Task, and the capture says so once.
  const LEFTOVER_ID = "0inv3nt3d1eft0verfr0manear1ierrun";
  const leftoverStart = next(19);
  const leftover = {
    id: LEFTOVER_ID,
    summary: "Invented leftover from an earlier run",
    start: { dateTime: iso(leftoverStart) },
    end: { dateTime: iso(leftoverStart + 30 * 60_000) },
    colorId: "3",
    reminders: { useDefault: false, overrides: [] },
    extendedProperties: { private: { ubu_task: `task_${LEFTOVER_ID}` } }
  };

  return {
    at,
    zone,
    recurring,
    mapped,
    unmapped,
    /// The uncoloured events, each with a `key` and its length in `seconds`.
    parked,
    /// The operator's own events: everything capture should take.
    calendar: [...recurring, mapped, unmapped, ...parked.map(asEvent)],
    /// UbU's stamped leftover, which capture should not take.
    leftover,
    /// What the mock Calendar observes: the file UBU_CALENDAR_MOCK_EVENTS names.
    /// The operator's events, and the leftover among them.
    seed: [...recurring, mapped, unmapped, ...parked.map(asEvent), leftover],

    /// calendar.color.* for each category the week uses, stated as Settings
    /// rather than left to the defaults. The fourth frees a colour: every one of
    /// Google's eleven is mapped by default, so a colour is only ever unmapped
    /// after the operator has moved a category off it. It moves onto 5, not 8:
    /// colour 8 is kept as the default palette has it, with `sleep` alone.
    settings: [
      ["calendar.color.work", "9"],
      ["calendar.color.personal", "3"],
      ["calendar.color.grocery", "2"],
      ["calendar.color.entertainment", "5"]
    ],
    /// Graphite. From P1B-54 the default palette gives colour 8 to `sleep`, so
    /// the night needs no Setting: it exports in Graphite, and a real Graphite
    /// event is captured as `sleep`. `setting` is how the operator would choose
    /// another colour, and `other` is one to try. `retired` is the category
    /// that held colour 8 until P1B-54: an operator's own Setting for it is
    /// still honoured, and on colour 8 it shares Graphite with `sleep`.
    sleepColour: { setting: "calendar.color.sleep", colour: "8", other: "10", retired: { setting: "calendar.color.location", category: "location" } },
    categoryOfColour: { 9: "work", 3: "personal", 2: "grocery" },
    unmappedColour: "1",

    /// One daily routine, half an hour, Static, at noon local.
    routine: {
      title: "Invented daily kelp inventory",
      nominalStart: "12:00:00",
      seconds: 1_800,
      category: "personal"
    },

    /// The night. UbU has no working-hours setting: unavailability is a
    /// capacity-occupying Static routine. Daily, 23:00 local, 480 minutes, in a
    /// category of its own, `sleep`, so that the night is reported as sleep and
    /// not as Uncategorized time. The planner places no Dynamic work inside it,
    /// and the preview exports each occurrence as a Busy event. See
    /// docs/AVAILABILITY.md.
    asleep: {
      title: "Asleep",
      nominalStart: "23:00:00",
      seconds: 28_800,
      category: "sleep"
    },

    /// Six Dynamic Tasks across three categories: Fixed and stochastic
    /// durations, and one thirty-hour job that is deliberately too long to fit
    /// any free interval, because the night alone breaks every day.
    backlog: [
      { key: "buttons", title: "Invented: sort the button jar", category: "work", duration_estimate: { type: "fixed", seconds: 2_700 }, seconds: 2_700 },
      { key: "census", title: "Invented: draft the marmot census", category: "work", duration_estimate: { type: "shifted_lognormal_p95", min_seconds: 1_200, mode_seconds: 2_400, p95_seconds: 5_400 }, seconds: 2_400 },
      { key: "oatmilk", title: "Invented: buy imaginary oat milk", category: "grocery", duration_estimate: { type: "fixed", seconds: 1_200 }, seconds: 1_200 },
      { key: "pantry", title: "Invented: restock the pretend pantry", category: "grocery", duration_estimate: { type: "shifted_lognormal_p95", min_seconds: 600, mode_seconds: 1_200, p95_seconds: 3_000 }, seconds: 1_200 },
      { key: "fern", title: "Invented: repot the plastic fern", category: "personal", duration_estimate: { type: "fixed", seconds: 1_800 }, seconds: 1_800 },
      { key: "fence", title: "Invented: paint the whole imaginary fence", category: "personal", duration_estimate: { type: "fixed", seconds: 108_000 }, seconds: 108_000, tooLong: true }
    ],

    /// One Preference: the oat milk before the fern.
    preference: { before: "oatmilk", after: "fern" }
  };
}
