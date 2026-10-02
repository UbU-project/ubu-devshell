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


const captureTask = (fields) =>
  call("POST", endpoints.TASK_CAPTURE_PATH, { schema_version: endpoints.TASK_CAPTURE_SCHEMA_VERSION, ...fields }, 201);
const readTask = (taskId) =>
  call("GET", `${fill(endpoints.TASK_PATH, { task_id: taskId })}?${new URLSearchParams({ schema_version: endpoints.TASK_READ_SCHEMA_VERSION })}`);
const listTasks = async (status = "active") =>
  (await call("GET", `${endpoints.TASK_LIST_PATH}?${new URLSearchParams({ schema_version: endpoints.TASK_READ_SCHEMA_VERSION, status })}`)).tasks;
const putSetting = (name, value) =>
  call("PUT", fill(endpoints.SETTING_PUT_PATH, { name }), { schema_version: endpoints.SETTING_SCHEMA_VERSION, value });

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
// The kernel's default reactive horizon, which the orchestrator always sends: the span the coverage figure is about.
const REACTIVE_HORIZON_SECONDS = 3_600;
const captureCalendar = () =>
  call("POST", endpoints.CALENDAR_CAPTURE_PATH, { schema_version: endpoints.CALENDAR_CAPTURE_SCHEMA_VERSION, export_mode: "mock" });
// The one fact the harness records in the staged UniverseState. Invented, and nothing waits on it.
const UNIVERSE_FACT_KEY = "invented.kettle_descaled";
// What P1B-59's scenario records there. Invented too. One Task waits on the level.
const UNIVERSE_LITRES_KEY = "invented.litres";
const UNIVERSE_LEVEL_KEY = "invented.tank_level";
const UNIVERSE_LEVEL_NEEDED = 25;
const UNIVERSE_LEVEL_SET = 40;
const UNIVERSE_WAITING_TITLE = "Invented: water the imaginary bench";
const readUniverse = () => call("GET", endpoints.UNIVERSE_STATE_PATH);
const editUniverse = (mutations, expect = 200) =>
  call("PATCH", endpoints.UNIVERSE_STATE_PATH, { schema_version: endpoints.UNIVERSE_STATE_SCHEMA_VERSION, mutations }, expect);
// What every seed made and how its check described it, for the step titles.
const staged = {};

// --------------------------------------------------------------- the seeds
//
// `make` stages it. `check` asserts, over HTTP, that the state a step relies on
// actually holds — not that a request was accepted, but that the API now agrees.

const SEEDS = {
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
    what: "the week's calendar, captured in Mock: seven instances of one recurring commitment, which UbU cannot own; two coloured one-off events, which are commitments; and two uncoloured ones, which are work for UbU to schedule",
    async make() {
      return captureCalendar();
    },
    async check(made) {
      const seen = week.calendar.filter(inHorizon);
      const instances = week.recurring.filter(inHorizon);
      // The one skip is UbU's own leftover, which `week_leftover` checks.
      if (made.captured !== seen.length || made.skipped !== 1) {
        throw new StagingFailure(`capture took ${made.captured} and skipped ${made.skipped} of the ${seen.length} events of the operator's inside the horizon, where one skip was expected: ${JSON.stringify(made.diagnostics)}`);
      }
      const bySource = {};
      for (const summary of await listTasks("active")) {
        const source = (await readTask(summary.task_id)).payload.provenance?.source;
        if (source?.source_kind === "google_calendar") bySource[source.source_id] = summary;
      }
      for (const event of seen) {
        const task = bySource[event.external_id];
        if (!task) throw new StagingFailure(`no Task was captured from calendar event ${event.external_id}`);
        // A colour decides the placement: coloured is a commitment at its own time, uncoloured is Dynamic work.
        const wanted = event.color_id === null ? "planned" : "static";
        if (task.placement !== wanted) throw new StagingFailure(`the Task captured from ${event.external_id} is ${task.placement}, not ${wanted}`);
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
      const parked = week.parked.filter(inHorizon);
      const said = made.diagnostics.filter((diagnostic) => diagnostic.code === "capture_colour_absent");
      if (said.length !== parked.length || !parked.every((event) => said.some((diagnostic) => diagnostic.message.includes(event.external_id) && diagnostic.message.includes("work for UbU to schedule")))) {
        throw new StagingFailure(`capture did not say of each of the ${parked.length} uncoloured event(s) that it is work for UbU to schedule: ${JSON.stringify(said)}`);
      }
      const again = await captureCalendar();
      if (again.captured !== 0) throw new StagingFailure(`a second capture admitted ${again.captured} more Task(s)`);
      return (
        `${seen.length} of its ${week.calendar.length} events are inside the ${HORIZON} horizon; the coloured ones are Static Tasks, and the ${parked.length} uncoloured ones, ` +
        `${parked.map((event) => `“${event.summary}” parked at ${local(event.start_at)}`).join(" and ")}, are Dynamic Tasks for the planner to place; ` +
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
  },
  // ---- P1B-57: one scenario at the HTTP layer, on this staged store. The staged calendar holds
  // one event that UbU wrote in an earlier run, stamped with the Task it was minted for. No Task
  // here has that id. Capture must recognise it as UbU's own, make no Task of it, and say so.
  week_leftover: {
    what: "one event on the staged calendar that UbU itself wrote in an earlier run, carrying UbU's stamp: capture makes no Task of it and names it once",
    // Nothing more to stage: the event is in the calendar file, and `week_calendar` ran the capture.
    async make() {
      return null;
    },
    async check() {
      const captured = staged.week_calendar.made;
      const stale = captured.diagnostics.filter((diagnostic) => diagnostic.code === "capture_stale_export");
      const expected = `Calendar event \`${week.leftover.id}\` was created by UbU for a Task this store does not have, so it is left alone and becomes no Task`;
      if (stale.length !== 1 || stale[0].message !== expected) {
        throw new StagingFailure(`capture did not name UbU's leftover once, as capture_stale_export: ${JSON.stringify(captured.diagnostics)}`);
      }
      // One fewer Task than the calendar has events: the leftover is the difference.
      const fromCalendar = [];
      for (const summary of await listTasks("active")) {
        const source = (await readTask(summary.task_id)).payload.provenance?.source;
        if (source?.source_kind === "google_calendar") fromCalendar.push(source.source_id);
      }
      const onCalendar = week.seed.filter((entry) => Date.parse(entry.start_at ?? entry.start.dateTime) < Date.now() + HORIZON_SECONDS * 1000).length;
      if (fromCalendar.includes(week.leftover.id) || fromCalendar.length !== onCalendar - 1) {
        throw new StagingFailure(`the leftover was not the one event left out: ${fromCalendar.length} Task(s) from ${onCalendar} event(s) on the calendar`);
      }
      if ((await listTasks("active")).some((task) => task.title === week.leftover.summary)) {
        throw new StagingFailure("a Task was made from UbU's own leftover");
      }
      return `“${week.leftover.summary}” (${week.leftover.id}) is on the staged calendar with UbU's stamp; capture took ${fromCalendar.length} of the ${onCalendar} events, skipped ${captured.skipped}, and named it as capture_stale_export`;
    }
  },
  // ---- P1B-58: one scenario at the HTTP layer, on this staged store. The UniverseState is read,
  // one invented fact is set, it is read back changed, and a malformed mutation is refused with the
  // state left as it was. No staged Task waits on the fact, so the Plan below is not changed by it.
  // All of it happens in `make`, before the next seed edits the same state.
  week_universe: {
    what: "the staged store's UniverseState, read and edited over HTTP: one invented fact is set and read back, and a malformed mutation is refused and changes nothing",
    async make() {
      const before = await readUniverse();
      const written = await editUniverse([{ operation: "set_fact", target: `facts.${UNIVERSE_FACT_KEY}`, payload: true }]);
      const after = await readUniverse();
      const refused = await editUniverse(
        [
          { operation: "set_fact", target: "facts.invented.cup_rinsed", payload: true },
          { operation: "set_fact", target: "facts.invented..kettle", payload: true }
        ],
        400
      );
      const still = await readUniverse();
      return { before, written, after, refused, still };
    },
    async check({ before, written, after, refused, still }) {
      const collections = (state) => JSON.stringify(["facts", "numeric_values", "set_memberships", "event_markers"].map((name) => state[name]));
      // Read: a staged store has no UniverseState until this seed makes one.
      if (before.version !== null || collections(before) !== JSON.stringify([{}, {}, {}, {}])) {
        throw new StagingFailure(`the staged store held a UniverseState before this seed set anything: ${JSON.stringify(before)}`);
      }
      // Set: the edit answered with the fact, at the version after the seed.
      if (written.version !== 2 || written.facts[UNIVERSE_FACT_KEY] !== true || Object.keys(written.facts).length !== 1) {
        throw new StagingFailure(`the set_fact did not answer with the one fact at version 2: ${JSON.stringify(written)}`);
      }
      // Read back changed: a later read is what the edit answered with.
      if (JSON.stringify(after) !== JSON.stringify(written)) {
        throw new StagingFailure(`the UniverseState read back is not what the edit answered with: ${JSON.stringify(after)}`);
      }
      // Refused: a malformed mutation, behind a good one, and the state is unchanged.
      if (refused.diagnostics?.[0]?.code !== "universe_mutation_invalid") {
        throw new StagingFailure(`a malformed mutation was not refused as universe_mutation_invalid: ${JSON.stringify(refused)}`);
      }
      if (JSON.stringify(still) !== JSON.stringify(after)) {
        throw new StagingFailure(`a refused edit changed the UniverseState: ${JSON.stringify(still)}`);
      }
      return `one invented fact, facts.${UNIVERSE_FACT_KEY}, was set over HTTP at version ${written.version} and read back; a malformed mutation sent behind a good one was refused as universe_mutation_invalid and neither was applied`;
    }
  },
  // ---- P1B-59: the whole chain, end to end over HTTP, on this staged store. A number is set
  // outright and read back exactly; it is cleared and the key is gone; and a Task that waits on a
  // number being at least a value is not ready until the number is set above it, and is in the
  // next Plan once it is. Two Plans are generated here, and `week_risk` generates the staged one
  // after them, with this Task in it.
  week_measured: {
    what: "a measured number as a first-class fact: set to exactly the value sent, cleared outright, and a Task waiting on it with at_least that is not ready below the value and is planned above it",
    async make() {
      const litres = `numeric_values.${UNIVERSE_LITRES_KEY}`;
      const level = `numeric_values.${UNIVERSE_LEVEL_KEY}`;
      await editUniverse([{ operation: "set_numeric", target: litres, payload: 0.7 }]);
      const set = await editUniverse([{ operation: "set_numeric", target: litres, payload: 0.1 }]);
      const readBack = await readUniverse();
      const cleared = await editUniverse([{ operation: "clear_numeric", target: litres }]);
      const afterClear = await readUniverse();

      const task = await captureTask({
        title: UNIVERSE_WAITING_TITLE,
        duration_estimate: { type: "fixed", seconds: 600 },
        preconditions: { target: level, predicate: "at_least", expected: UNIVERSE_LEVEL_NEEDED }
      });
      const generate = () => call("POST", endpoints.PLANNING_GENERATE_PATH, { schema_version: endpoints.PLANNING_SCHEMA_VERSION, request: null });
      const absent = await generate();
      await editUniverse([{ operation: "set_numeric", target: level, payload: UNIVERSE_LEVEL_NEEDED - 1, provenance_kind: "measured" }]);
      const below = await generate();
      const raised = await editUniverse([{ operation: "set_numeric", target: level, payload: UNIVERSE_LEVEL_SET, provenance_kind: "measured" }]);
      const above = await generate();
      return { set, readBack, cleared, afterClear, taskId: task.task_id, absent, below, raised, above };
    },
    async check({ set, readBack, cleared, afterClear, taskId, absent, below, raised, above }) {
      // Set outright, read back exactly. This is the check that would have caught 0.09999999999999998.
      const drifted = 0.7 - (0.7 - 0.1);
      for (const [where, state] of [["the edit's answer", set], ["a later read", readBack]]) {
        const value = state.numeric_values[UNIVERSE_LITRES_KEY];
        if (value !== 0.1 || value === drifted) {
          throw new StagingFailure(`a number set from 0.7 to 0.1 is ${value} in ${where}, not exactly 0.1`);
        }
      }
      // Cleared: the key is gone, and so is its provenance.
      for (const [where, state] of [["the edit's answer", cleared], ["a later read", afterClear]]) {
        if (UNIVERSE_LITRES_KEY in state.numeric_values || `numeric_values.${UNIVERSE_LITRES_KEY}` in state.fact_provenance) {
          throw new StagingFailure(`a cleared number, or its provenance, is still there in ${where}: ${JSON.stringify(state)}`);
        }
      }
      // The whole chain: the same Task is not ready while the number is absent or below, and is planned once it is above.
      const blocked = (planned) => (planned.blocked_tasks ?? []).map((task) => task.task_id);
      const placed = (planned) => (planned.plan?.steps ?? []).some((step) => step.task_id === taskId);
      for (const [when, planned] of [["no number is recorded", absent], [`the number is ${UNIVERSE_LEVEL_NEEDED - 1}`, below]]) {
        if (!blocked(planned).includes(taskId) || placed(planned)) {
          throw new StagingFailure(`the Task waiting on at_least ${UNIVERSE_LEVEL_NEEDED} was not left out as not ready when ${when}: ${JSON.stringify(planned.blocked_tasks)}`);
        }
      }
      if (blocked(above).includes(taskId) || !placed(above)) {
        throw new StagingFailure(`the Task waiting on at_least ${UNIVERSE_LEVEL_NEEDED} is not in the Plan made after the number was set to ${UNIVERSE_LEVEL_SET}: ${JSON.stringify(above.blocked_tasks)}`);
      }
      // What the staged screen shows beside each value: a measured number, and an asserted fact.
      const words = raised.fact_provenance;
      if (words[`numeric_values.${UNIVERSE_LEVEL_KEY}`]?.kind !== "measured" || words[`facts.${UNIVERSE_FACT_KEY}`]?.kind !== "asserted") {
        throw new StagingFailure(`the staged UniverseState does not hold a measured number beside an asserted fact: ${JSON.stringify(words)}`);
      }
      const now = await readUniverse();
      const stale = Object.keys(now.fact_provenance).filter((target) => {
        const [collection, ...key] = target.split(".");
        return !(key.join(".") in now[collection]);
      });
      if (stale.length > 0) throw new StagingFailure(`provenance outlived its value for ${stale.join(", ")}`);
      return (
        `a number set from 0.7 to 0.1 read back as exactly 0.1, and was then cleared with its key gone; ` +
        `“${UNIVERSE_WAITING_TITLE}” (${taskId}) waits on numeric_values.${UNIVERSE_LEVEL_KEY} at_least ${UNIVERSE_LEVEL_NEEDED}: it was not ready with no number and at ${UNIVERSE_LEVEL_NEEDED - 1}, ` +
        `and is in the Plan made after the number was set to ${UNIVERSE_LEVEL_SET}; the staged UniverseState holds that number as measured beside one asserted fact`
      );
    }
  },
  // ---- P1B-56: two scenarios at the HTTP layer, on this staged store. One Plan is generated
  // here, last, so that every other seed is in it. The operator generates another in the step.
  week_risk: {
    what: "a Plan of the staged week, generated over HTTP: its risk report names no affect finding and is not high, and its coverage figure is about the next hour",
    async make() {
      const planned = await call("POST", endpoints.PLANNING_GENERATE_PATH, { schema_version: endpoints.PLANNING_SCHEMA_VERSION, request: null });
      // No later than this did the Plan start: generation rounds the start up to a whole minute.
      return { planned, latestStartMs: Date.now() + 60_000 };
    },
    async check({ planned, latestStartMs }) {
      if (!planned?.plan) throw new StagingFailure(`planning produced no Plan: ${JSON.stringify(planned?.diagnostics)}`);
      const findings = planned.risk_report?.findings ?? [];
      const named = findings.map((finding) => finding.category);

      // Scenario one. The staged week has no Snapshot, so its affect observation is a stand-in.
      // None of the findings that read the stand-in's margin may be raised, and the Plan-quality
      // report says nothing was projected.
      const affect = named.filter((category) => ["affect_margin", "post_plan_depletion", "destructive_pressure"].includes(category));
      if (affect.length > 0) throw new StagingFailure(`the risk report of a week with no Snapshot names an affect finding: ${JSON.stringify(affect)}`);
      const quality = planned.human_complete_plan_quality;
      if (quality?.post_plan_state_delta !== "neutral" || !quality.revision_suggestions[0]?.startsWith("Record how you are feeling:")) {
        throw new StagingFailure(`the Plan-quality report presents the stand-in as a measurement: ${JSON.stringify(quality)}`);
      }

      // Scenario two. The coverage figure is absent, or it is about the reactive horizon: every
      // boundary it names starts inside the next hour, and mass it calls uncovered has a boundary
      // in that hour to be attributed to. Before P1B-56 it was a figure about the whole week.
      const coverage = planned.selected_candidate?.coverage ?? null;
      const scopeEndMs = latestStartMs + REACTIVE_HORIZON_SECONDS * 1000;
      if (coverage) {
        const outside = coverage.boundaries.filter((boundary) => Date.parse(boundary.start_at) > scopeEndMs);
        if (outside.length > 0) throw new StagingFailure(`the coverage figure names a boundary outside the next ${REACTIVE_HORIZON_SECONDS / 60} minutes: ${JSON.stringify(outside)}`);
        if (coverage.below_threshold && coverage.boundaries.length === 0) {
          throw new StagingFailure(`the coverage figure is ${coverage.estimate} with no commitment in the next ${REACTIVE_HORIZON_SECONDS / 60} minutes to attribute it to`);
        }
      }

      // The level is not high. The one finding that may make it so is `low_coverage`, and only
      // when a commitment really is inside the next hour: then it is the report doing its job.
      const high = findings.filter((finding) => finding.severity === "high").map((finding) => finding.category);
      if (high.some((category) => category !== "low_coverage") || (high.length > 0 && !(coverage?.boundaries.length > 0))) {
        throw new StagingFailure(`the risk report of the staged week is high for a reason other than a commitment in the next hour: ${JSON.stringify(findings)}`);
      }
      if (!named.includes("unplaced_work")) throw new StagingFailure(`the risk report does not name the Task that did not fit: ${JSON.stringify(named)}`);

      const covered = coverage
        ? `coverage ${Math.round(coverage.estimate * 100)}% over the next ${REACTIVE_HORIZON_SECONDS / 60} minutes, with ${coverage.boundaries.length} commitment(s) in them`
        : "no coverage figure";
      return `risk ${planned.risk_report.level}; findings: ${[...new Set(named)].join(", ")}; no affect finding; post-plan state ${quality.post_plan_state_delta}; ${covered}`;
    }
  }
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
  fence: week.backlog.find((task) => task.tooLong).title
};
// The sixth rule prunes this list: a verification that has passed live is retired unless the ticket
// changes something that could affect it. P1B-55 retired seven of nine. P1B-56 retires the three
// P1B-55 left, which passed with that ticket and which P1B-56 does not touch; each has a line in the
// ledger in docs/ACCEPTANCE.md. What is left is what P1B-56 changed on the screen: the risk report,
// and the Plan-quality rows of a Plan made with no Snapshot.
// P1B-57, P1B-58 and P1B-59 add no step and retire none. Each adds one seed that is an HTTP scenario,
// `week_leftover`, `week_universe` and `week_measured`, and the step names all three so that they are
// checked before it is printed.
const STEPS = [
  {
    needs: ["week_colours", "week_calendar", "week_leftover", "week_routine", "week_night", "week_backlog", "week_universe", "week_measured", "week_risk"],
    name: "The risk report says what it means",
    open: "Today, in the navigation.",
    click: "The button “Generate Plan”.",
    read: `The panel headed “Plan risk” has a badge beside its heading. It reads “medium risk”. Under it each finding has a name in bold. One is named “unplaced work”, for “${T.fence}”. None is named “affect margin” or “post plan depletion”, and none is named “low coverage” unless a staged commitment starts within the next 60 minutes. Under the heading “Plan-quality signals”, the rows “Affect margin”, “Stretch pressure” and “Post-Plan state delta” each read “not recorded”, and one line under the rows begins “No Snapshot of how you are feeling has been taken”. Under “Model repair suggestions” the first line begins “Record how you are feeling:”. What was checked over HTTP before this was printed: {week_risk}.`,
    copy: "The words on the badge beside “Plan risk”. The bold name of every finding under it. And the three rows “Affect margin”, “Stretch pressure” and “Post-Plan state delta”, each with what it reads.",
    codes: [
      "“medium risk”, with “unplaced work” and no affect finding: expected",
      "“high risk”, with a finding named “low coverage” whose sentence names a commitment and “the next 60 minutes”: a staged commitment starts within the hour and uncertain work is placed in front of it. That is the report doing its job. Copy the whole finding back",
      "“high risk” for any other reason, or a finding named “affect margin” or “post plan depletion”: NOT EXPECTED. Copy the whole panel back",
      "a row that reads “0.000”, “depleted” or “sustainable stretch” where “not recorded” is expected: the panel is showing the stand-in as a measurement. Copy the three rows back"
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
  writeFileSync(calendarFile, JSON.stringify(week.seed, null, 2));
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
  console.log("       None of them depends on a model.\n");
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
