// acceptance.mjs: stage a throwaway store the operator's acceptance steps need,
// then hold an orchestrator up on the default port while they drive the app.
//
// Run by acceptance.sh, which builds the orchestrator and owns the temp
// directory. Node 22 or newer, built-in fetch only, no dependency.
//
// The contract between a step and its store is declared, not assumed. Every
// step names the seeds it needs; every seed states what it is and CHECKS ITSELF
// over HTTP after the seed runs. A step whose precondition does not hold is a
// failure here, in seconds, instead of a failure in the operator's evening.
//
// Nothing here leaves the machine. The orchestrator runs with HOME and
// UBU_DB_PATH inside the temp directory, in mock modes, with no credential in
// its environment, so the operator's own store cannot be read or written.
import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import net from "node:net";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { localParts, localZone, rehearsalWeek, routineBody } from "./rehearsal-week.mjs";

function option(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || index + 1 >= process.argv.length) {
    if (fallback !== null) return fallback;
    throw new Error(`missing --${name}`);
  }
  return process.argv[index + 1];
}

class StagingFailure extends Error {}

const endpointsPath = option("endpoints");
const binary = option("binary");
const workDir = option("work-dir");
const startupTimeoutMs = Number(option("startup-timeout", "60")) * 1000;
const endpoints = await import(pathToFileURL(endpointsPath).href);

// The app's own default, so `npm run tauri:dev` reaches this staged store with
// no configuration anywhere. It is also why a real orchestrator must be stopped.
const PORT = Number(endpoints.DEFAULT_ORCHESTRATOR_PORT);
const BASE = `http://127.0.0.1:${PORT}`;

async function call(method, path, body, expect = [200, 201]) {
  const url = `${BASE}${path}`;
  if (new URL(url).hostname !== "127.0.0.1") {
    throw new StagingFailure(`refusing a request that is not to 127.0.0.1: ${url}`);
  }
  const response = await fetch(url, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  const accepted = Array.isArray(expect) ? expect : [expect];
  if (!accepted.includes(response.status)) {
    throw new StagingFailure(`${method} ${path} returned ${response.status}: ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) : null;
}

const fill = (path, values) =>
  Object.entries(values).reduce((filled, [n, v]) => filled.replace(`{${n}}`, encodeURIComponent(v)), path);

const iso = (date) => date.toISOString().replace(/\.\d{3}Z$/, "Z");
const thisHour = Math.floor(Date.now() / 3_600_000) * 3_600_000;
const at = (hours, minutes = 0) => iso(new Date(thisHour + hours * 3_600_000 + minutes * 60_000));
const fixed = (minutes) => ({ type: "fixed", seconds: minutes * 60 });

const captureTask = (fields) =>
  call("POST", endpoints.TASK_CAPTURE_PATH, { schema_version: endpoints.TASK_CAPTURE_SCHEMA_VERSION, ...fields }, 201);
const readTask = (taskId) =>
  call("GET", `${fill(endpoints.TASK_PATH, { task_id: taskId })}?${new URLSearchParams({ schema_version: endpoints.TASK_READ_SCHEMA_VERSION })}`);
const listTasks = async (status = "active") =>
  (await call("GET", `${endpoints.TASK_LIST_PATH}?${new URLSearchParams({ schema_version: endpoints.TASK_READ_SCHEMA_VERSION, status })}`)).tasks;
const putSetting = (name, value) =>
  call("PUT", fill(endpoints.SETTING_PUT_PATH, { name }), { schema_version: endpoints.SETTING_SCHEMA_VERSION, value });
const nextAction = () =>
  call("GET", `${endpoints.NEXT_ACTION_PATH}?${new URLSearchParams({ schema_version: endpoints.NEXT_ACTION_SCHEMA_VERSION })}`);

// Obviously invented, and obviously this harness's, so a row in the app is never
// mistaken for the operator's own work.
const TITLE = (what) => `Acceptance ${what}`;

// The switch rehearsal's week, the same one check-ui-contract.mjs walks and
// asserts. Its calendar is what the mock Calendar observes, so it is written
// to a file before the orchestrator starts. The horizon is the orchestrator's
// own default, one week from P1B-53, unless UBU_PLANNING_HORIZON_SECONDS says
// otherwise: export 86400 to stage the one-day horizon instead.
// The week lives in a timezone, because it has a night in it. Here it is this
// computer's own zone, so the night on screen is the operator's night.
const ZONE = localZone();
const week = rehearsalWeek(Date.now(), ZONE);
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/// A wall-clock time in that zone, as the app shows it.
const local = (instant) => {
  const p = localParts(ZONE, Date.parse(instant));
  return `${WEEKDAYS[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()]} ${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
};
const HORIZON_SECONDS = Number(process.env.UBU_PLANNING_HORIZON_SECONDS ?? 604_800);
const HORIZON = HORIZON_SECONDS % 86_400 === 0 ? `${HORIZON_SECONDS / 86_400}-day` : `${HORIZON_SECONDS}-second`;
const inHorizon = (event) => Date.parse(event.start_at) < Date.now() + HORIZON_SECONDS * 1000;
const captureCalendar = () =>
  call("POST", endpoints.CALENDAR_CAPTURE_PATH, { schema_version: endpoints.CALENDAR_CAPTURE_SCHEMA_VERSION, export_mode: "mock" });
// What every seed made and how its check described it, for the step titles.
const staged = {};

// --------------------------------------------------------------- the seeds
//
// `make` stages it. `check` asserts, over HTTP, that the state a step relies on
// actually holds — not that a request was accepted, but that the API now agrees.

const SEEDS = {
  completable: {
    what: "a ready Task that Next Task recommends now, to complete and then undo",
    async make() {
      // Created FIRST, because with no explicit priority next_action_service
      // orders by created_at then id, so the earliest ready Task is recommended.
      // It carries a description so Clarify's default skips over it: the undo step
      // must not act on the Task the Clarify steps are interviewing.
      return captureTask({
        title: TITLE("— take the bins out"),
        description: "Staged for the undo step; not part of the interview.",
        duration_estimate: fixed(10)
      });
    },
    async check(made) {
      const task = await readTask(made.task_id);
      if (task.payload.status !== "active") throw new StagingFailure("the completable Task is not active");
      const recommendation = (await nextAction()).recommendation;
      if (!recommendation) throw new StagingFailure("Next Task recommends nothing: the undo step would have no Complete button");
      if (recommendation.task_id !== made.task_id) {
        throw new StagingFailure(
          `Next Task recommends ${recommendation.title} (${recommendation.task_id}), not the Task staged for the undo step — ` +
            `that step would act on a Task another step is using`
        );
      }
      // That it is recommended now is what the check above established.
      return `${task.payload.title} (${made.task_id})`;
    }
  },
  interview: {
    what: "an active Task with no description, which Clarify picks on its default",
    async make() {
      return captureTask({ title: TITLE("— replace the kettle element"), duration_estimate: fixed(25) });
    },
    async check(made) {
      const task = await readTask(made.task_id);
      if (task.payload.status !== "active") throw new StagingFailure("the interview Task is not active");
      if ((task.payload.description ?? "").trim() !== "") throw new StagingFailure("the interview Task already has a description");
      // Clarify's default is the first active, non-occurrence Task with a blank
      // description, ordered by id. Assert that predicate here rather than
      // trusting that creating it first made it first.
      const eligible = [];
      for (const summary of await listTasks("active")) {
        if (summary.is_routine_occurrence) continue;
        const candidate = await readTask(summary.task_id);
        if ((candidate.payload.description ?? "").trim() === "") eligible.push(summary.task_id);
      }
      eligible.sort();
      if (eligible.length === 0) throw new StagingFailure("no active Task with a blank description: Clarify's default would report clarify_no_task");
      if (eligible[0] !== made.task_id) {
        throw new StagingFailure(`Clarify's default would pick ${eligible[0]}, not the interview Task ${made.task_id}`);
      }
      return `${task.payload.title} (${made.task_id})`;
    }
  },
  described: {
    what: "an active Task that already has a description: the Notes step reads it, and Clarify's default skips over it",
    async make() {
      return captureTask({
        title: TITLE("— already answered"),
        description: "Q: Is this one already clarified?\nA: y\n",
        duration_estimate: fixed(15)
      });
    },
    async check(made) {
      const task = await readTask(made.task_id);
      if ((task.payload.description ?? "").trim() === "") throw new StagingFailure("the described Task has no description");
      return `${task.payload.title} (${made.task_id})`;
    }
  },
  spent: {
    what: "a Static Task whose window fell yesterday, so the time-by-category report has a row to show",
    async make() {
      const yesterday = thisHour - 24 * 3_600_000;
      return captureTask({
        title: TITLE("— yesterday's fixed hour"),
        static_window: { start: iso(new Date(yesterday)), end: iso(new Date(yesterday + 3_600_000)) },
        category_tag: "personal",
        tags: ["personal"]
      });
    },
    async check(made) {
      const task = await readTask(made.task_id);
      const report = await call("GET", `${endpoints.TIME_BY_CATEGORY_PATH}?${new URLSearchParams({ schema_version: endpoints.TIME_BY_CATEGORY_SCHEMA_VERSION })}`);
      const row = report.categories.find((candidate) => candidate.category === "personal");
      if (!row || row.static_seconds < 3_600) {
        throw new StagingFailure(`the report's personal row does not carry yesterday's hour: ${JSON.stringify(report.categories)}`);
      }
      return `${task.payload.title} (${made.task_id}), one hour of personal in the last seven days`;
    }
  },
  advisory: {
    what: "advisory.endpoint and advisory.timeout_ms, so only the model name is left to choose",
    async make() {
      await putSetting("advisory.endpoint", process.env.UBU_ACCEPTANCE_ENDPOINT ?? "http://127.0.0.1:11434");
      await putSetting("advisory.timeout_ms", Number(process.env.UBU_ACCEPTANCE_TIMEOUT_MS ?? 600000));
      const model = process.env.UBU_ACCEPTANCE_MODEL;
      if (model) await putSetting("advisory.model", model);
      return { model };
    },
    async check(made) {
      const settings = (await call("GET", endpoints.SETTINGS_LIST_PATH)).settings;
      const named = (name) => settings.find((setting) => setting.name === name)?.value;
      if (!named("advisory.endpoint")) throw new StagingFailure("advisory.endpoint did not persist");
      if (!named("advisory.timeout_ms")) throw new StagingFailure("advisory.timeout_ms did not persist");
      return made.model
        ? `endpoint ${named("advisory.endpoint")}, timeout ${named("advisory.timeout_ms")} ms, model ${named("advisory.model")}`
        : `endpoint ${named("advisory.endpoint")}, timeout ${named("advisory.timeout_ms")} ms; SET advisory.model IN SETUP FIRST`;
    }
  },
  // ---- the switch rehearsal's week: rehearsal-week.mjs, staged the way the runner stages it
  week_colours: {
    what: "calendar.color.* for the three categories the week uses, and one colour left mapped to nothing",
    async make() {
      for (const [name, value] of week.settings) await putSetting(name, value);
    },
    async check() {
      const palette = (await call("GET", endpoints.SETTINGS_LIST_PATH)).palette;
      for (const [name, colour] of week.settings) {
        const category = name.replace("calendar.color.", "");
        const entry = palette.find((candidate) => candidate.category === category);
        if (entry?.color_id !== colour || entry?.origin !== "setting") {
          throw new StagingFailure(`${name} is not the Setting that was staged: ${JSON.stringify(entry)}`);
        }
      }
      if (palette.some((entry) => entry.color_id === week.unmappedColour)) {
        throw new StagingFailure(`colour ${week.unmappedColour} is still mapped to a category, so the lighthouse tour would not arrive uncategorised`);
      }
      const used = Object.entries(week.categoryOfColour).map(([colour, category]) => `${category} on colour ${colour}`).join(", ");
      return `${used}; colour ${week.unmappedColour} maps to nothing`;
    }
  },
  week_calendar: {
    what: "the week's calendar, captured in Mock: seven instances of one recurring commitment, which UbU cannot own, and two one-off events it can",
    async make() {
      return captureCalendar();
    },
    async check(made) {
      const seen = week.calendar.filter(inHorizon);
      const instances = week.recurring.filter(inHorizon);
      if (made.captured !== seen.length || made.skipped !== 0) {
        throw new StagingFailure(`capture took ${made.captured} and skipped ${made.skipped} of the ${seen.length} events inside the horizon: ${JSON.stringify(made.diagnostics)}`);
      }
      const bySource = {};
      for (const summary of await listTasks("active")) {
        const source = (await readTask(summary.task_id)).payload.provenance?.source;
        if (source?.source_kind === "google_calendar") bySource[source.source_id] = summary;
      }
      for (const event of seen) {
        const task = bySource[event.external_id];
        if (!task) throw new StagingFailure(`no Task was captured from calendar event ${event.external_id}`);
        if (task.placement !== "static") throw new StagingFailure(`the Task captured from ${event.external_id} is not Static`);
        const category = week.categoryOfColour[event.color_id] ?? null;
        if ((task.category_tag ?? null) !== category) {
          throw new StagingFailure(`the Task captured from ${event.external_id} has category ${task.category_tag ?? "none"}, not ${category ?? "none"}`);
        }
      }
      // One diagnostic for the whole capture: it names a single id, or the count and the first three.
      const occupancy = made.diagnostics.filter((diagnostic) => diagnostic.code === "capture_occupancy_only");
      const named = instances.slice(0, 3).every((event) => occupancy[0]?.message.includes(event.external_id));
      const counted = instances.length === 1 || occupancy[0]?.message.startsWith(`${instances.length} Calendar events`);
      if (occupancy.length !== 1 || !named || !counted) {
        throw new StagingFailure(`capture did not report the ${instances.length} unowned instance(s) once, as capture_occupancy_only: ${JSON.stringify(occupancy)}`);
      }
      const again = await captureCalendar();
      if (again.captured !== 0) throw new StagingFailure(`a second capture admitted ${again.captured} more Task(s)`);
      return (
        `${seen.length} of its ${week.calendar.length} events are inside the ${HORIZON} horizon and are Static Tasks; ` +
        `${instances.length} of them ${instances.length === 1 ? "is an instance" : "are instances"} of “${week.recurring[0].summary}”, ` +
        `the first at ${local(instances[0].start_at)}, each captured as its own Static Task of occupied time that UbU does not own; ` +
        `nothing in UbU knows they are one commitment`
      );
    }
  },
  week_routine: {
    what: "one daily routine, so the week has occurrences UbU made itself",
    async make() {
      return call("POST", endpoints.OBJECTIVE_CREATE_PATH, routineBody(week, week.routine, endpoints.OBJECTIVE_SCHEMA_VERSION), 201);
    },
    async check(made) {
      const objectives = (await call("GET", endpoints.OBJECTIVE_LIST_PATH)).objectives;
      if (!objectives.some((objective) => objective.title === week.routine.title)) {
        throw new StagingFailure(`the routine ${week.routine.title} is not listed`);
      }
      return `${week.routine.title} (${made.objective_id}), daily at ${week.routine.nominalStart.slice(0, 5)} ${ZONE} time`;
    }
  },
  week_night: {
    what: "the night: an Asleep routine in the sleep category, which is how UbU is told when no work may be placed",
    async make() {
      return call("POST", endpoints.OBJECTIVE_CREATE_PATH, routineBody(week, week.asleep, endpoints.OBJECTIVE_SCHEMA_VERSION), 201);
    },
    async check(made) {
      // Read back what was stored: these five values are the whole recipe in docs/AVAILABILITY.md.
      const stored = (await call("GET", fill(endpoints.OBJECTIVE_READ_PATH, { objective_id: made.objective_id }))).payload;
      const template = stored.routine_instance_template;
      const recipe = {
        timezone: stored.recurrence?.timezone,
        rule: stored.recurrence?.rule?.kind,
        nominal_start: template?.nominal_start,
        seconds: template?.duration_estimate?.seconds,
        placement: template?.placement,
        // Stored only when false: a routine occupies capacity unless it says otherwise.
        occupies_capacity: template?.occupies_capacity ?? true,
        category_tag: template?.category_tag ?? null
      };
      const wanted = { timezone: ZONE, rule: "daily", nominal_start: week.asleep.nominalStart, seconds: week.asleep.seconds, placement: "static", occupies_capacity: true, category_tag: week.asleep.category };
      if (JSON.stringify(recipe) !== JSON.stringify(wanted)) {
        throw new StagingFailure(`the Asleep routine was not stored as staged: ${JSON.stringify(recipe)}`);
      }
      return `${week.asleep.title} (${made.objective_id}), daily from 23:00 to 07:00 ${ZONE} time, Static, occupying capacity, category ${week.asleep.category}`;
    }
  },
  week_sleep_colour: {
    what: "calendar.color.sleep, the operator's own Setting: Graphite for the night, which the default palette already gives to location",
    async make() {
      return putSetting(week.sleepColour.setting, week.sleepColour.colour);
    },
    async check() {
      const listed = await call("GET", endpoints.SETTINGS_LIST_PATH);
      const entry = listed.palette.find((candidate) => candidate.category === week.asleep.category);
      if (entry?.color_id !== week.sleepColour.colour || entry?.origin !== "setting") {
        throw new StagingFailure(`${week.sleepColour.setting} is not the Setting that was staged: ${JSON.stringify(entry)}`);
      }
      // Judgment call 1, on record: the colour is shared, so it is a collision, and the inverse table says so.
      const inverse = listed.inverse.find((candidate) => candidate.color_id === week.sleepColour.colour);
      const shared = [week.sleepColour.sharedWith, week.asleep.category].sort().join();
      if (inverse?.status !== "collision" || [...inverse.categories].sort().join() !== shared) {
        throw new StagingFailure(`colour ${week.sleepColour.colour} is not reported as a collision between ${shared}: ${JSON.stringify(inverse)}`);
      }
      return `${week.asleep.category} on colour ${week.sleepColour.colour}, Graphite; that colour is now a collision with ${week.sleepColour.sharedWith}`;
    }
  },
  week_backlog: {
    what: "six Dynamic Tasks across three categories, one of them too long to fit anywhere, and a Preference between two",
    async make() {
      const ids = {};
      for (const task of week.backlog) {
        ids[task.key] = (await captureTask({ title: task.title, duration_estimate: task.duration_estimate, category_tag: task.category, tags: [task.category] })).task_id;
      }
      await call("POST", endpoints.PREFERENCE_CREATE_PATH, { schema_version: endpoints.PREFERENCE_SCHEMA_VERSION, task_a: ids[week.preference.before], task_b: ids[week.preference.after], order: "a_preferred_to_b" }, 201);
      return { ids };
    },
    async check(made) {
      const active = await listTasks("active");
      for (const task of week.backlog) {
        const row = active.find((candidate) => candidate.task_id === made.ids[task.key]);
        if (!row) throw new StagingFailure(`the backlog Task ${task.title} is not active`);
        if (row.placement !== "planned") throw new StagingFailure(`the backlog Task ${task.title} is not Dynamic`);
      }
      const title = (key) => week.backlog.find((task) => task.key === key).title;
      const preferences = (await call("GET", endpoints.PREFERENCE_LIST_PATH)).preferences;
      if (!preferences.some((preference) => preference.task_a_title === title(week.preference.before) && preference.task_b_title === title(week.preference.after))) {
        throw new StagingFailure("the Preference between two backlog Tasks is not listed");
      }
      return `${week.backlog.length} Dynamic Tasks, among them “${week.backlog.find((task) => task.tooLong).title}” at 30 hours; “${title(week.preference.before)}” is preferred to “${title(week.preference.after)}”`;
    }
  }
  // No Plan is staged. Next Task with no Plan recommends the earliest ready Task,
  // which is what `completable` promises; a staged Plan would make it recommend the
  // Plan's first placement instead. The operator generates the Plan in a step.
};

// --------------------------------------------------------------- the steps
//
// Each names the seeds it acts on. A step that names none is one whose
// precondition is genuinely an empty store or the app alone.

// Deterministic steps come first and the steps that depend on a model come
// last, and no step is a prerequisite of a later one unless it is deterministic.
// P1B-50's list put a model-dependent step in the middle; the model declined to
// ask, the step after it had nothing to show, and three steps were abandoned.
//
// From P1B-53 every step says exactly what to OPEN, what to CLICK, what to READ
// and what to COPY BACK, and none asks the operator to infer. "Report" is never
// used as a verb here: "Report:" has twice been read as the name of a screen.
const T = {
  completable: TITLE("— take the bins out"),
  interview: TITLE("— replace the kettle element"),
  described: TITLE("— already answered"),
  fence: week.backlog.find((task) => task.tooLong).title,
  council: week.recurring[0].summary
};
const STEPS = [
  {
    needs: [],
    name: "The app reaches this orchestrator",
    open: "Setup, in the navigation on the left.",
    click: "The button “Run self-check”, in the card headed “Self-check”.",
    read: "The badge beside the heading reads “3 of 3 reads answered”. Under the button are three numbered lines, each with the word “answered”, and then the sentence “Three reads were attempted and nothing was written.”",
    copy: "The badge text and the three numbered lines.",
    codes: []
  },
  {
    needs: ["described"],
    name: "A Task's notes",
    open: "Tasks, in the navigation.",
    click: `Under the heading “Backlog”, the line “Notes for ${T.described}”. It opens.`,
    read: "Two lines appear under it: “Q: Is this one already clarified?” and, on the next line, “A: y”. This is {described}.",
    copy: "The two lines, exactly as they appear.",
    codes: []
  },
  {
    needs: ["spent"],
    name: "Time by category",
    open: "Today, in the navigation.",
    click: "In the panel headed “Time by category”, the button “Show report”.",
    read: "The sentence under the button begins “Showing the last 7 days:”. In the table, the row “personal” shows “1 h” or more in the column “Time”. That hour is {spent}.",
    copy: "The sentence that begins “Showing the last 7 days:”, and every row of the table, the row “Total” included.",
    codes: [
      "no code: a line beginning “No recorded time between” means there is no recorded time in the range. It is not an error. Copy that line back instead of the table",
      "time_by_category_invalid_range: from is after to. The app never sends that. Copy the whole red box back"
    ]
  },
  {
    needs: ["completable"],
    name: "Complete, then undo",
    open: "Next Task, in the navigation.",
    click: "The button “Complete”, under the recommended Task. Then, in the panel headed “Loop State”, the button “Undo completion”.",
    read: `Before the first click the recommended Task is “${T.completable}”. After “Complete”, the panel “Loop State” says “complete recorded; Task status is completed.” After “Undo completion”, a line says “The completion was undone. The Task is active again.” and the recommended Task is “${T.completable}” again. This step comes before the Plan is generated on purpose: with a Plan, Next Task recommends the Plan's first placement instead.`,
    copy: "The title of the recommended Task before the first click, the title after the second click, and the sentence that begins “The completion was undone.”",
    codes: [
      "reopen_not_completed: “Undo completion” was clicked twice. There is nothing left to undo. Go on to the next step",
      "reopen_stale_completion: the app named a completion that is not the latest. Open Next Task again and do this step once more",
      `a recommended Task that is not “${T.completable}”: a Plan already exists in this store, because a later step was done first. Complete and undo the Task that is recommended, and write down its title`
    ]
  },
  {
    needs: ["week_calendar", "week_routine", "week_night", "week_backlog"],
    name: "A Plan with one Task that did not fit",
    open: "Today, in the navigation.",
    click: "The button “Generate Plan”.",
    read: `Under “Timed placements” every placement titled “Asleep” carries the badge “Static anchor”, and every placement whose title begins “Invented:” carries the badge “Skeleton”. Below the placements is a section headed “Not in this Plan”. It names “${T.fence}”, says “It is longer than any free interval in the planning horizon.”, and under “What can be done:” lists sentences, not code words. Nothing on the screen is red. DO NOT READ THE DATES AND TIMES beside the placements: they are wrong on this screen, which is a known defect written down in the P1B-53 report. The true times are in the next step. What is staged: {week_calendar}; {week_routine}; {week_night}; {week_backlog}.`,
    copy: "The whole section “Not in this Plan”. Any box that appears between the two buttons and the heading “Timed placements”. And the two times printed beside the first placement, exactly as shown, wrong as they are.",
    codes: [
      "no box above “Timed placements”: expected at the one-week horizon, which is the default. “Not in this Plan” still names the Task",
      "task_unplaceable, in a quiet grey box with the sentence first and the code in small print after it: expected at the one-day horizon. It is not an error"
    ]
  },
  {
    needs: ["week_calendar", "week_colours"],
    name: "The preview, and where the night is",
    open: "Calendar, in the navigation.",
    click: "The button “Take preview”, under the heading “1. Preview”.",
    read: `Every operation is headed “Create:”. Each one headed “Create: Asleep” has four lines: a “Window:” line with two times that are eight hours apart, “Placement: Static”, “Colour means: its category”, and “Window change means: move — the window follows the event”. Each one headed “Create: Invented:” reads “Placement: Dynamic”. The times on the “Window:” lines are true, and are in UTC. No operation is headed “${T.council}”: UbU does not own it and never writes to it. Above the operations is a quiet grey box, not a red one, with one sentence for each instance of “${T.council}”, each ending “cannot produce a valid Calendar event id; step skipped”.`,
    copy: "The first operation headed “Create: Asleep”, all four of its lines. The first operation headed “Create: Invented:”, all four of its lines. And the whole grey box above the operations.",
    codes: [
      `calendar_event_id_unmappable, in small print in the grey box: expected, once for each instance of “${T.council}” inside the horizon. It is the exclusion working, not a fault`,
      "calendar_mock_seed_with_live_export, in a red box: “Approve preview”, “Run capture” or “Run reconciliation” was clicked. THE REQUEST DID NOT RUN: this staged orchestrator refuses a Live calendar request, and nothing was written. Go on to the next step"
    ]
  },
  {
    needs: ["week_night", "week_sleep_colour"],
    name: "Sleep's colour, and what it collides with",
    open: "Setup, in the navigation.",
    click: "In the card headed “Colours”, the button “Reload colours”.",
    read: "In the table “Category colours”, the row “sleep” shows “8” in the column “Colour id” and “setting” in the column “Origin”. In the table “Colour to category at capture”, the row for colour id “8” reads “Collision: location, sleep — no category assigned.” That is {week_sleep_colour}. It is the consequence of the Setting and is expected: with it set, a real Graphite event is captured with no category.",
    copy: "The row “sleep” from the first table, and the row for colour id “8” from the second.",
    codes: []
  },
  {
    needs: ["interview", "described", "advisory"],
    name: "Clarify, with the selector left alone",
    open: "Review, in the navigation.",
    click: "In the panel headed “Clarify”, leave “Task to interview” on “The first Task without a description” and click “Run Clarify”. If a card with questions appears under “Decision queue”, answer each question and click “Save answers”.",
    read: `Under the button a box appears. Its “Selected Task” is “${T.interview}”, and not “${T.described}”. Which questions appear is the model's choice and is not checked. If the model asks nothing, the box says so in a sentence: that is a result to copy back, and the next step is still done.`,
    copy: `Everything in the box under the button “Run Clarify”: the lines “Run status” and “Candidates enqueued”, the Selected Task, and every sentence under them. If you saved answers, also open Tasks, click “Notes for ${T.interview}”, and copy the notes.`,
    codes: [
      "Candidates enqueued: 1, and no sentence under it: the run happened and there is a proposal to answer",
      "clarify_no_questions, with a sentence that begins “This is round one”: THE MODEL DECLINED TO ASK. The box says it is a result from the model and not a finished interview, and the button “Open Setup” appears. There is nothing to answer. Copy the box back and go on",
      "clarify_already_queued: a proposal for this Task is already waiting under “Decision queue”. Answer that one. This run did not ask the model",
      "advisory_unconfigured or advisory_endpoint_invalid, in a red box: the model is not configured. THE RUN DID NOT HAPPEN. Set advisory.model in Setup and do this step again",
      "advisory_http_failed, advisory_timeout, advisory_empty_response, advisory_malformed_result or advisory_connection_failed, in a red box: the model was asked and failed. Copy the box back and go on",
      "advisory_answer_required, clarify_invalid_answer or clarify_description_too_large, after “Save answers”: the answers were refused and nothing was written. Copy the message back"
    ]
  },
  {
    needs: ["interview", "advisory"],
    name: "Clarify again, with the Task chosen",
    open: "Review, in the navigation.",
    click: `In the panel headed “Clarify”, set “Task to interview” to “${T.interview}” and click “Run Clarify”.`,
    read: `This run can be made whatever the last step did. The box under the button names “${T.interview}” as the Selected Task. Each outcome listed under “codes” is a result to copy back, and none is a defect.`,
    copy: "Everything in the box under the button “Run Clarify”.",
    codes: [
      "Candidates enqueued: 1: a new set of questions. It is round two if you saved answers in the last step, and round one again if the model asked nothing there",
      "clarify_no_questions, with a sentence that begins “This is round one”: the model declined again. The button “Open Setup” appears",
      "clarify_no_questions, with a sentence that begins “The interview is finished”: it names the round, and no “Open Setup” button appears",
      "clarify_already_queued: the proposal from the last step is still waiting. Answer, defer or reject it, then do this step again",
      `a Selected Task that is not “${T.interview}”: THE RUN DID NOT INTERVIEW THIS TASK. “Task to interview” was left on “The first Task without a description”. Set it and click “Run Clarify” again`
    ]
  }
];

// ------------------------------------------------------------- the machinery

function portFree(port) {
  return new Promise((resolve) => {
    const probe = net.createConnection({ host: "127.0.0.1", port });
    probe.on("connect", () => {
      probe.destroy();
      resolve(false);
    });
    probe.on("error", () => resolve(true));
  });
}

let child = null;
async function startOrchestrator(dir) {
  mkdirSync(dir, { recursive: true });
  const calendarFile = join(dir, "mock-calendar-events.json");
  writeFileSync(calendarFile, JSON.stringify(week.calendar, null, 2));
  const log = openSync(join(dir, "orchestrator.log"), "a");
  child = spawn(binary, [], {
    cwd: dir,
    env: {
      PATH: process.env.PATH,
      HOME: dir,
      UBU_ORCHESTRATOR_PORT: String(PORT),
      UBU_DB_PATH: join(dir, "acceptance-store.db"),
      UBU_DEVICE_REGISTRATION: join(dir, "device-registration.json"),
      UBU_GITHUB_INGEST_MODE: "mock",
      UBU_GITHUB_PROJECTION_EXPORT_MODE: "mock",
      // What the mock Calendar observes. With this set a Live calendar request is
      // refused before any client exists, so the app cannot reach a real calendar from here.
      UBU_CALENDAR_MOCK_EVENTS: calendarFile,
      ...(process.env.UBU_PLANNING_HORIZON_SECONDS ? { UBU_PLANNING_HORIZON_SECONDS: process.env.UBU_PLANNING_HORIZON_SECONDS } : {}),
      NO_COLOR: "1"
    },
    stdio: ["ignore", log, log]
  });
  appendFileSync(join(workDir, "pids"), `${child.pid}\n`);
  let alive = true;
  child.once("exit", () => {
    alive = false;
  });
  const deadline = Date.now() + startupTimeoutMs;
  for (;;) {
    if (!alive) {
      const tail = readFileSync(join(dir, "orchestrator.log"), "utf8").split("\n").slice(-12).join("\n");
      throw new StagingFailure(`the orchestrator exited before it answered /health\n${tail}`);
    }
    try {
      await (await fetch(`${BASE}${endpoints.HEALTH_PATH}`)).arrayBuffer();
      return;
    } catch {
      if (Date.now() > deadline) throw new StagingFailure(`no answer on /health within ${startupTimeoutMs / 1000}s`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

// Every seed a step names must exist. This is a typo check, run before anything
// is built, so a step can never quietly reference a precondition nobody stages.
const undeclared = STEPS.flatMap((step) => step.needs).filter((need) => !(need in SEEDS));
if (undeclared.length > 0) {
  console.error(`FAIL: ${undeclared.length} step precondition(s) name no seed: ${[...new Set(undeclared)].join(", ")}`);
  process.exit(1);
}
const unused = Object.keys(SEEDS).filter((name) => !STEPS.some((step) => step.needs.includes(name)));

async function main() {
  if (!(await portFree(PORT))) {
    throw new StagingFailure(
      `something is already answering on ${BASE}. Stop the orchestrator you have running, then run this again — ` +
        `this harness must own the app's default port so the app reaches the staged store and not your own.`
    );
  }
  console.log(`store: ${join(workDir, "acceptance-store.db")}  (throwaway; your own store is never opened)`);
  await startOrchestrator(workDir);
  console.log(`up:    ${BASE}\n`);

  console.log(`horizon: ${HORIZON}${process.env.UBU_PLANNING_HORIZON_SECONDS ? "" : ", the orchestrator's default; UBU_PLANNING_HORIZON_SECONDS=86400 stages one day"}\n`);

  console.log("staging:");
  // Every seed is made before any is checked, so a check sees the whole staged
  // store: what Next Task recommends, and which Task Clarify picks, depend on
  // every Task there is and not only on the ones made so far.
  for (const [name, seed] of Object.entries(SEEDS)) {
    staged[name] = { made: await seed.make() };
  }
  for (const [name, seed] of Object.entries(SEEDS)) {
    try {
      staged[name].described = await seed.check(staged[name].made);
    } catch (error) {
      if (error instanceof StagingFailure) error.message = `seed ${name}: ${error.message}`;
      throw error;
    }
    console.log(`  OK  ${name}: ${staged[name].described}`);
    console.log(`      ${seed.what}`);
  }
  for (const name of unused) console.log(`  --  ${name}: staged but no step names it`);

  const title = (text) => text.replace(/\{(\w+)\}/g, (_, name) => staged[name]?.described ?? `{${name}}`);
  console.log("\nsteps: do these in the app, in order. Each says what to open, what to click, what to read and what to copy back.");
  console.log("       The first seven do not depend on a model. The last two do.\n");
  STEPS.forEach((step, index) => {
    console.log(`  ${index + 1}. ${title(step.name)}`);
    console.log(`     OPEN       ${title(step.open)}`);
    console.log(`     CLICK      ${title(step.click)}`);
    console.log(`     READ       ${title(step.read)}`);
    console.log(`     COPY BACK  ${title(step.copy)}`);
    // The diagnostic codes a step can meet, each with what it means, so an outcome is never
    // misread: in particular the one that means the run did not happen.
    console.log(step.codes.length === 0 ? "     codes      none; this step has no diagnostic to meet" : `     codes      ${title(step.codes[0])}`);
    for (const code of step.codes.slice(1)) console.log(`                ${title(code)}`);
    console.log("");
  });
  console.log("When a step cannot be completed, write down what the screen said and go on to the next step. Every step is done.\n");
  // --stage-only proves the staging and the preconditions without waiting for a
  // human. It is how these steps are checked before they are ever handed over.
  if (process.argv.includes("--stage-only")) {
    console.log(`staged and checked ${Object.keys(SEEDS).length} seed(s) for ${STEPS.length} step(s); not waiting for the app`);
    child.kill("SIGTERM");
    return;
  }
  console.log(`Start the app with: (cd ../ubu-ui && npm run tauri:dev)`);
  console.log(`Ctrl-C here when you are done; the staged store is then removed.\n`);
  await new Promise(() => {});
}

// Ctrl-C is how this harness ends by design, so it is the normal path: the
// orchestrator is stopped here, and acceptance.sh removes the staged store.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (child) child.kill("SIGTERM");
    console.log("\nstopping: the staged orchestrator; the store is removed next");
    process.exit(130);
  });
}

try {
  await main();
} catch (error) {
  console.error(`\nFAIL: ${error instanceof StagingFailure ? error.message : error}`);
  if (child) child.kill("SIGTERM");
  process.exit(1);
}
