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
const captureCalendar = () =>
  call("POST", endpoints.CALENDAR_CAPTURE_PATH, { schema_version: endpoints.CALENDAR_CAPTURE_SCHEMA_VERSION, export_mode: "mock" });
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
  fence: week.backlog.find((task) => task.tooLong).title,
  council: week.recurring[0].summary,
  globe: week.parked[0].summary,
  duck: week.parked[1].summary,
  mapped: week.mapped.summary,
  unmapped: week.unmapped.summary
};
// From P1B-55 the sixth rule prunes this list: a verification that has passed live is retired unless
// the ticket changes something that could affect it. Seven of the nine steps this printed until then
// are retired, each with a line in the ledger in docs/ACCEPTANCE.md, and the seeds only they needed
// are gone with them. What is left is what P1B-55 changed: what capture makes of an uncoloured event,
// how the Plan and the preview show it, and where the screen states the rule.
const STEPS = [
  {
    needs: ["week_calendar", "week_routine", "week_night", "week_backlog"],
    name: "The uncoloured events are work, and the Plan places them",
    open: "Today, in the navigation.",
    click: "The button “Generate Plan”.",
    read: `Under “Timed placements” there is a placement titled “${T.globe}” and one titled “${T.duck}”. Each carries the badge “Skeleton”, which is Dynamic work, and not the badge “Static anchor”. They are two events on the staged calendar that have no colour, parked at ${local(week.parked[0].start_at)} and ${local(week.parked[1].start_at)}, where they overlapped. The two times beside each are the ones the planner chose, and the two do not overlap. The placements titled “${T.mapped}”, “${T.unmapped}” and “${T.council}” carry “Static anchor”: those events have a colour, so they are commitments at their own times. No box above “Timed placements” says that fixed commitments overlap. Below the placements the section “Not in this Plan” names “${T.fence}”. Nothing on the screen is red. What is staged: {week_calendar}; {week_routine}; {week_night}; {week_backlog}.`,
    copy: `For “${T.globe}” and for “${T.duck}”: the title, the badge, and the two times beside it. Any box that appears between the two buttons and the heading “Timed placements”. And the whole section “Not in this Plan”.`,
    codes: [
      "no box above “Timed placements”: expected at the one-week horizon, which is the default",
      "task_unplaceable, in a quiet grey box: expected at the one-day horizon. It is not an error",
      "static_task_collision, in a quiet grey box that begins “Two fixed commitments overlap”: NOT EXPECTED HERE. The two uncoloured events were taken as commitments. Copy the whole box back"
    ]
  },
  {
    needs: ["week_calendar", "week_colours"],
    name: "The preview moves them, and gives them no colour",
    open: "Calendar, in the navigation.",
    click: "The button “Take preview”, under the heading “1. Preview”.",
    read: `Two operations are headed “Update:”, one for “${T.globe}” and one for “${T.duck}”. Each has four lines: a “Window:” line whose two times are the ones Today showed for that placement, written in UTC; “Placement: Dynamic”; “Colour means: a commitment at the time it then has, in that colour's category”; and “Window change means: resize — the duration changed”. No operation of any kind is headed with “${T.mapped}” or “${T.unmapped}”: those are commitments, and they stay where they are. Every other operation is headed “Create:”. No operation is headed “${T.council}”: UbU does not own it. Above the operations is a quiet grey box, not a red one, with one sentence for each instance of “${T.council}”, each ending “cannot produce a valid Calendar event id; step skipped”.`,
    copy: "The two operations headed “Update:”, all four lines of each. The number of operations headed “Create:”. And the whole grey box above the operations.",
    codes: [
      `calendar_event_id_unmappable, in small print in the grey box: expected, once for each instance of “${T.council}” inside the horizon. It is the exclusion working, not a fault`,
      "calendar_mock_seed_with_live_export, in a red box: “Approve preview”, “Run capture” or “Run reconciliation” was clicked. THE REQUEST DID NOT RUN: this staged orchestrator refuses a Live calendar request, and nothing was written. Go on to the next step"
    ]
  },
  {
    needs: [],
    name: "The rule, where capture is run",
    open: "Calendar, in the navigation. Then Setup.",
    click: "Nothing on Calendar: read the panel headed “3. Capture”, and do not click “Run capture”. On Setup, in the card headed “Colours”, the button “Reload colours”.",
    read: "On Calendar, the panel “3. Capture” has this sentence: “An event with no colour is taken as work for UbU to schedule. An event with a colour is taken as a commitment at its own time, and the colour is its category.” On Setup, under the heading “Colour to category at capture”, a sentence begins “An event with no colour is not a row here.”",
    copy: "The sentence from the panel “3. Capture”, and the sentence from Setup that begins “An event with no colour is not a row here.”",
    codes: [
      "calendar_mock_seed_with_live_export, in a red box: “Run capture” was clicked. THE REQUEST DID NOT RUN: this staged orchestrator refuses a Live calendar request, and nothing was written. The sentence is still on the panel; copy it back"
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
