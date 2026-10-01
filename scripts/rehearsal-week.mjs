// rehearsal-week.mjs: one invented week, for the switch rehearsal.
//
// Imported by check-ui-contract.mjs, which walks the daily loop over it and
// asserts, and by acceptance.mjs, which stands it up for the app. The same
// week, built the same way, so what the runner proves is what the operator
// looks at.
//
// Every title here is invented and says so. This is not the operator's
// calendar and not an imitation of it. Its SHAPE is realistic: a recurring
// commitment, coloured one-off events, a routine, a Dynamic backlog with one
// Task that cannot fit anywhere, a Preference, and category colours.

const HOUR = 3_600_000;
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
// Google's own suffix for an instance of a recurring event: its original start, in UTC.
const stamp = (ms) => iso(ms).replace(/[-:]/g, "");

/// `thisHour` is the top of the current hour in milliseconds. Every window is
/// in the near future, so the first day's are inside the default one-day horizon.
/// The body ubu-ui's Routines screen sends to create the week's routine.
export function routineBody(week, schemaVersion) {
  return {
    schema_version: schemaVersion,
    mode: "evergreen",
    title: week.routine.title,
    recurrence: { timezone: "UTC", rule: { kind: "daily" } },
    routine_instance_template: {
      title: week.routine.title,
      duration_estimate: { type: "fixed", seconds: week.routine.seconds },
      nominal_start: week.routine.nominalStart,
      placement: "static",
      occupies_capacity: true,
      category_tag: week.routine.category,
      tags: [week.routine.category],
      reminder_minutes: []
    }
  };
}

export function rehearsalWeek(thisHour) {
  const at = (hours, minutes = 0) => iso(thisHour + hours * HOUR + minutes * 60_000);

  // One recurring commitment, three daily instances. The id is in the shape
  // Google gives an instance, {base32hex}_{timestamp}, with an invented base:
  // UbU cannot own it, so each is captured as occupied time.
  const RECURRING_BASE = "0inv3nt3dmarm0tc0unci1";
  const recurring = [4, 28, 52].map((hours) => ({
    external_id: `${RECURRING_BASE}_${stamp(thisHour + hours * HOUR)}`,
    summary: "Invented standing marmot council",
    start_at: at(hours),
    end_at: at(hours + 1),
    color_id: "9",
    transparent: false,
    reminders_minutes: []
  }));

  // Two one-off events with ids UbU can own. One carries a mapped colour; the
  // other carries colour 1, which the Settings below leave mapped to nothing.
  const mapped = {
    external_id: "0inv3nt3dk3tt1edescaling",
    summary: "Invented kettle descaling appointment",
    start_at: at(6),
    end_at: at(6, 30),
    color_id: "3",
    transparent: false,
    reminders_minutes: []
  };
  const unmapped = {
    external_id: "0inv3nt3d1ighth0uset0ur",
    summary: "Invented lighthouse tour",
    start_at: at(8),
    end_at: at(9),
    color_id: "1",
    transparent: false,
    reminders_minutes: []
  };

  return {
    at,
    recurring,
    mapped,
    unmapped,
    /// What the mock Calendar observes: the file UBU_CALENDAR_MOCK_EVENTS names.
    calendar: [...recurring, mapped, unmapped],

    /// calendar.color.* for each category the week uses, stated as Settings
    /// rather than left to the defaults. The fourth frees a colour: every one of
    /// Google's eleven is mapped by default, so a colour is only ever unmapped
    /// after the operator has moved a category off it.
    settings: [
      ["calendar.color.work", "9"],
      ["calendar.color.personal", "3"],
      ["calendar.color.grocery", "2"],
      ["calendar.color.entertainment", "8"]
    ],
    categoryOfColour: { 9: "work", 3: "personal", 2: "grocery" },
    unmappedColour: "1",

    /// One daily routine, half an hour, Static, two hours from the top of this hour.
    routine: {
      title: "Invented daily kelp inventory",
      nominalStart: at(2).slice(11, 19),
      seconds: 1_800,
      category: "personal"
    },

    /// Six Dynamic Tasks across three categories: Fixed and stochastic
    /// durations, and one thirty-hour job that is deliberately too long to fit
    /// any free interval, because the routine alone breaks every day.
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
