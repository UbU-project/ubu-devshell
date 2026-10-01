// check-ui-contract.mjs: the scenario walk behind check-ui-contract.sh.
//
// Run by that script, which builds the orchestrator and owns the temp
// directory. Node 22 or newer, built-in fetch and node:http only, no dependency.
//
// What this does NOT cover: the Tauri HTTP plugin transport, the capability
// scope, and anything rendered. Those remain the operator's acceptance surface.
//
// Every scenario gets its own store and its own orchestrator on its own
// ephemeral port. Nothing is carried from one scenario to the next.
//
// The path and schema-version constants are imported from ubu-ui's
// endpoints.ts, never copied, wherever ubu-ui has one. The request bodies are
// the shapes ubu-ui's client.ts sends; client.ts itself cannot be imported here
// because it imports the Tauri plugin. Routes ubu-ui has no constant for are
// named in ROUTES_WITHOUT_A_UI_CONSTANT below.
//
// Nothing here leaves the machine. Every request goes through `call`, which
// refuses any address that is not 127.0.0.1 on a port this run opened itself.
import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { eveningZone, localParts, rehearsalWeek, routineBody } from "./rehearsal-week.mjs";

function option(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || index + 1 >= process.argv.length) {
    throw new Error(`missing --${name}`);
  }
  return process.argv[index + 1];
}

class CheckFailure extends Error {}

const endpointsPath = option("endpoints");
const configPath = option("config");
const binary = option("binary");
const workDir = option("work-dir");
const startupTimeoutMs = Number(option("startup-timeout")) * 1000;
const verbose = process.env.UBU_CHECK_VERBOSE === "1";
// For working on one scenario: UBU_CHECK_ONLY=7,8. A partial walk says so and is not a pass of the whole.
const only = process.env.UBU_CHECK_ONLY
  ? new Set(process.env.UBU_CHECK_ONLY.split(",").map((number) => Number(number.trim())))
  : null;

const endpoints = await import(pathToFileURL(endpointsPath).href);

// ubu-ui names no constant for these; they are orchestrator routes all the same.
const ROUTES_WITHOUT_A_UI_CONSTANT = {
  OPENAPI: "/openapi.json",
  DECOMPOSE: "/task/{task_id}/decompose",
  CONTAINER_UNDO: "/container/{container_id}/undo",
  CONTAINER_LIST: "/containers"
};
const CONTAINER_SCHEMA_VERSION = "ubu.orchestrator.container.v1";

// ---------------------------------------------------------------- plumbing

const ownPorts = new Set();
const running = new Set();
let lastRequest = null;
let requestCount = 0;

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function ok(condition, description) {
  if (!condition) {
    throw new CheckFailure(`assertion failed: ${description}`);
  }
  console.log(`  ok: ${description}`);
}

// Objects are compared by content: key order is the serializer's, not a fact.
function canonical(value) {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function same(actual, expected, description) {
  const a = JSON.stringify(canonical(actual));
  const e = JSON.stringify(canonical(expected));
  if (a !== e) {
    throw new CheckFailure(`assertion failed: ${description}\n  expected: ${e}\n  actual:   ${a}`);
  }
  console.log(`  ok: ${description}: ${a}`);
}

/// Every request of the run. `expect` is the status the scenario requires.
async function call(base, method, path, body, expect = 200) {
  const url = `${base}${path}`;
  const target = new URL(url);
  if (target.hostname !== "127.0.0.1" || !ownPorts.has(Number(target.port))) {
    throw new CheckFailure(`refusing ${url}: this run only talks to 127.0.0.1 on ports it opened itself`);
  }
  const init = { method, headers: { Accept: "application/json" } };
  if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const response = await fetch(url, init);
  const text = await response.text();
  requestCount += 1;
  lastRequest = { method, url, sent: body, status: response.status, body: text };
  if (verbose) {
    console.log(`  ${response.status} ${method} ${url}`);
  }
  const accepted = Array.isArray(expect) ? expect : [expect];
  if (!accepted.includes(response.status)) {
    throw new CheckFailure(`${method} ${url} returned ${response.status}, expected ${accepted.join(" or ")}`);
  }
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new CheckFailure(`${method} ${url} returned ${response.status} with a body that is not JSON`);
  }
}

function fill(path, values) {
  return Object.entries(values).reduce(
    (filled, [name, value]) => filled.replace(`{${name}}`, encodeURIComponent(value)),
    path
  );
}

/// A scrubbed environment: no token, no Google credential and no operator
/// store can reach the process, and HOME is its own temp directory.
async function startOrchestrator(dir, extraEnv = {}) {
  mkdirSync(dir, { recursive: true });
  const port = await freePort();
  ownPorts.add(port);
  const log = openSync(join(dir, "orchestrator.log"), "a");
  const child = spawn(binary, [], {
    cwd: dir,
    env: {
      PATH: process.env.PATH,
      HOME: dir,
      UBU_ORCHESTRATOR_PORT: String(port),
      UBU_DB_PATH: join(dir, "store.db"),
      UBU_DEVICE_REGISTRATION: join(dir, "device-registration.json"),
      UBU_GITHUB_INGEST_MODE: "mock",
      UBU_GITHUB_PROJECTION_EXPORT_MODE: "mock",
      NO_COLOR: "1",
      ...extraEnv
    },
    stdio: ["ignore", log, log]
  });
  // The shell script kills anything listed here that outlives this process.
  appendFileSync(join(workDir, "pids"), `${child.pid}\n`);
  const exited = new Promise((resolve) => child.once("exit", resolve));
  let alive = true;
  exited.then(() => {
    alive = false;
  });
  const orchestrator = {
    base: `http://127.0.0.1:${port}`,
    dir,
    async stop() {
      running.delete(orchestrator);
      if (alive) {
        child.kill("SIGTERM");
        await exited;
      }
    }
  };
  running.add(orchestrator);

  const deadline = Date.now() + startupTimeoutMs;
  for (;;) {
    if (!alive) {
      const tail = readFileSync(join(dir, "orchestrator.log"), "utf8").split("\n").slice(-12).join("\n");
      throw new CheckFailure(`the orchestrator exited before it answered /health\n${tail}`);
    }
    try {
      const response = await fetch(`${orchestrator.base}${endpoints.HEALTH_PATH}`);
      await response.arrayBuffer();
      return orchestrator;
    } catch {
      if (Date.now() > deadline) {
        throw new CheckFailure(`the orchestrator did not answer /health within ${startupTimeoutMs / 1000}s`);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

async function stopEverything() {
  await Promise.all([...running].map((orchestrator) => orchestrator.stop()));
  await Promise.all([...stubs].map((stub) => stub.close()));
}

// ---------------------------------------------------------------- fixtures

// Whole seconds, as the orchestrator stores them.
const iso = (date) => date.toISOString().replace(/\.\d{3}Z$/, "Z");
const thisHour = Math.floor(Date.now() / 3_600_000) * 3_600_000;
/// A time `hours` from the top of this hour. Every window is in the near future,
/// inside the default planning horizon.
const at = (hours, minutes = 0) => iso(new Date(thisHour + hours * 3_600_000 + minutes * 60_000));
const timeOfDay = (hours, minutes = 0) => at(hours, minutes).slice(11, 19);

const fixed = (minutes) => ({ type: "fixed", seconds: minutes * 60 });

async function captureTask(o, fields) {
  return call(o.base, "POST", endpoints.TASK_CAPTURE_PATH, { schema_version: endpoints.TASK_CAPTURE_SCHEMA_VERSION, ...fields }, 201);
}

async function listTasks(o, status = "active") {
  const query = new URLSearchParams({ schema_version: endpoints.TASK_READ_SCHEMA_VERSION, status });
  return (await call(o.base, "GET", `${endpoints.TASK_LIST_PATH}?${query}`)).tasks;
}

async function readTask(o, taskId) {
  const query = new URLSearchParams({ schema_version: endpoints.TASK_READ_SCHEMA_VERSION });
  return call(o.base, "GET", `${fill(endpoints.TASK_PATH, { task_id: taskId })}?${query}`);
}

async function generatePlan(o) {
  const planned = await call(o.base, "POST", endpoints.PLANNING_GENERATE_PATH, {
    schema_version: endpoints.PLANNING_SCHEMA_VERSION,
    request: null
  });
  if (!planned?.plan) {
    throw new CheckFailure(`planning produced no Plan: ${JSON.stringify(planned?.diagnostics)}`);
  }
  return planned.plan;
}

const preview = (o) => call(o.base, "GET", endpoints.CALENDAR_PREVIEW_PATH);

// The body ubu-ui's approveCalendar sends, in Mock.
const approve = (o, previewId, expect = 200) =>
  call(
    o.base,
    "POST",
    endpoints.CALENDAR_APPROVE_PATH,
    { schema_version: endpoints.CALENDAR_APPROVAL_SCHEMA_VERSION, preview_id: previewId, authority_source: "user", export_mode: "mock" },
    expect
  );

const capture = (o) =>
  call(o.base, "POST", endpoints.CALENDAR_CAPTURE_PATH, { schema_version: endpoints.CALENDAR_CAPTURE_SCHEMA_VERSION, export_mode: "mock" });

const reconcile = (o) =>
  call(o.base, "POST", endpoints.CALENDAR_RECONCILE_PATH, {
    schema_version: endpoints.CALENDAR_RECONCILIATION_SCHEMA_VERSION,
    export_mode: "mock"
  });

const repair = (o, reconciliationId) =>
  call(o.base, "POST", fill(endpoints.CALENDAR_REPAIR_PATH, { reconciliation_id: reconciliationId }), {
    schema_version: endpoints.CALENDAR_REPAIR_SCHEMA_VERSION
  });

const putSetting = (o, name, value, expect = 200) =>
  call(o.base, "PUT", fill(endpoints.SETTING_PUT_PATH, { name }), { schema_version: endpoints.SETTING_SCHEMA_VERSION, value }, expect);

/// One Static and one Dynamic Task, planned and applied in Mock with no seed.
async function appliedDay(o) {
  const pinned = await captureTask(o, {
    title: "Synthetic fixed appointment",
    static_window: { start: at(3), end: at(3, 30) },
    category_tag: "personal",
    tags: ["personal"]
  });
  const flexible = await captureTask(o, { title: "Synthetic flexible errand", duration_estimate: fixed(30) });
  await generatePlan(o);
  const proposed = await preview(o);
  const result = await approve(o, proposed.preview_id);
  if (result.status !== "applied") {
    throw new CheckFailure(`the Mock apply did not apply: ${JSON.stringify(result)}`);
  }
  return { pinned: pinned.task_id, flexible: flexible.task_id, applied: result.applied_events };
}

/// The mock seed is read at startup, so changing it means a restart on the same store.
async function restartObserving(o, events) {
  await o.stop();
  const seed = join(o.dir, "mock-calendar-events.json");
  writeFileSync(seed, JSON.stringify(events, null, 2));
  return startOrchestrator(o.dir, { UBU_CALENDAR_MOCK_EVENTS: seed });
}

// An invented event id in Google's alphabet, and one in the shape Google gives
// an instance of a recurring event: {base32hex}_{timestamp}.
const FOREIGN_ID = "5n0q8c9h7g4k2m1p3r6t8v0a2c";
const RECURRING_ID = `7a1b2c3d4e5f6g7h8i9j0k1l2m_${at(6).replace(/[-:]/g, "")}`;
const observedEvent = (externalId, summary, hours) => ({
  external_id: externalId,
  summary,
  start_at: at(hours),
  end_at: at(hours, 30),
  color_id: null,
  transparent: false,
  reminders_minutes: []
});

// ------------------------------------------------ the stub model server (§E)

const stubs = new Set();

// The question sets the stub asks in clarify mode. Round one has a question that
// depends on a yes, one that depends on a no, and one that depends on nothing.
const ROUND_ONE = [
  { id: "q1", text: "Is there a deadline for the synthetic teapot?", kind: "YesNo" },
  { id: "q2", text: "What is the synthetic deadline?", kind: "ShortText", depends_on: ["q1", "y"] },
  { id: "q3", text: "Who is the synthetic teapot for?", kind: "ShortText" },
  { id: "q4", text: "Why is there no synthetic deadline?", kind: "ShortText", depends_on: ["q1", "n"] }
];
const ROUND_TWO = [{ id: "r1", text: "Is the synthetic teapot already bought?", kind: "YesNo" }];

/// Canned /api/generate answers on an ephemeral loopback port. `mode` selects
/// the answer: success, not_found, slow, empty or clarify. In clarify mode the
/// answer is made from the request: the round the prompt carries picks the questions.
async function startModelStub() {
  const stub = { mode: "success", requests: [], delayMs: 0 };
  const server = http.createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
    });
    request.on("end", () => {
      const body = raw ? JSON.parse(raw) : null;
      stub.requests.push({ method: request.method, url: request.url, body });
      const answer = (status, payload) => {
        response.writeHead(status, { "Content-Type": "application/json" });
        response.end(JSON.stringify(payload));
      };
      if (request.method !== "POST" || request.url !== "/api/generate") {
        answer(404, { error: "the stub serves POST /api/generate only" });
      } else if (stub.mode === "not_found") {
        answer(404, { error: `model '${body.model}' not found` });
      } else if (stub.mode === "empty") {
        answer(200, { model: body.model, done: true, response: "", thinking: "synthetic thinking that must never be echoed" });
      } else if (stub.mode === "slow") {
        const timer = setTimeout(() => answer(200, { model: body.model, done: true, response: '{"proposals":[]}' }), stub.delayMs);
        response.on("close", () => clearTimeout(timer));
      } else if (stub.mode === "clarify") {
        const { round } = JSON.parse(body.prompt);
        const set = round === 1 ? { questions: ROUND_ONE, done: false } : round === 2 ? { questions: ROUND_TWO, done: false } : { questions: [], done: true };
        answer(200, { model: body.model, done: true, response: JSON.stringify(set) });
      } else {
        const proposals = JSON.parse(body.prompt).map((task) => ({ id: task.id, category_tag: "grocery", confidence: 0.75 }));
        answer(200, { model: body.model, done: true, response: JSON.stringify({ proposals }) });
      }
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  ownPorts.add(port);
  stub.endpoint = `http://127.0.0.1:${port}`;
  stub.close = () =>
    new Promise((resolve) => {
      stubs.delete(stub);
      server.closeAllConnections();
      server.close(resolve);
    });
  stubs.add(stub);
  return stub;
}

const runAdvisory = (o) =>
  call(o.base, "POST", endpoints.ADVISORY_RUN_PATH, { schema_version: endpoints.ADVISORY_RUN_SCHEMA_VERSION, producer: "suggest_tags" });

const runClarify = (o, taskId) =>
  call(o.base, "POST", endpoints.ADVISORY_RUN_PATH, {
    schema_version: endpoints.ADVISORY_RUN_SCHEMA_VERSION,
    producer: "clarify",
    ...(taskId === undefined ? {} : { task_id: taskId })
  });

const recordAction = (o, taskId, action, expect = 200) =>
  call(o.base, "POST", fill(endpoints.RECORD_TASK_ACTION_PATH, { task_id: taskId }), { schema_version: endpoints.TASK_ACTION_SCHEMA_VERSION, action }, expect);

const reopenTask = (o, taskId, completionLogId, expect = 200) =>
  call(o.base, "POST", fill(endpoints.TASK_REOPEN_PATH, { task_id: taskId }), { schema_version: endpoints.TASK_ACTION_SCHEMA_VERSION, completion_log_id: completionLogId }, expect);

// ---------------------------------------------------------------- scenarios

const scenarios = [
  {
    name: "contract",
    async run(o) {
      const uiDefault = endpoints.DEFAULT_ORCHESTRATOR_PORT;
      ok(typeof uiDefault === "string", "ubu-ui exports DEFAULT_ORCHESTRATOR_PORT");
      const config = readFileSync(configPath, "utf8");
      const match = config.match(/env::var\("UBU_ORCHESTRATOR_PORT"\)[\s\S]*?\.unwrap_or\((\d+)\)/);
      ok(match !== null, "ubu-orchestrator's config.rs states its UBU_ORCHESTRATOR_PORT default");
      console.log(`  ubu-ui            DEFAULT_ORCHESTRATOR_PORT = ${uiDefault}`);
      console.log(`  ubu-orchestrator  UBU_ORCHESTRATOR_PORT unwrap_or = ${match[1]}`);
      if (uiDefault !== match[1]) {
        throw new CheckFailure(
          `DEFAULT PORTS DIFFER: ubu-ui defaults to ${uiDefault} but ubu-orchestrator defaults to ${match[1]}. ` +
            "With no override the app would call a port nothing is listening on."
        );
      }
      console.log("  ok: the two defaults agree");

      const health = await call(o.base, "GET", endpoints.HEALTH_PATH);
      ok(typeof health?.status === "string", `GET ${endpoints.HEALTH_PATH} reports a status`);
      const planned = await call(o.base, "POST", endpoints.PLANNING_GENERATE_PATH, { schema_version: endpoints.PLANNING_SCHEMA_VERSION, request: null });
      same(planned?.schema_version, endpoints.PLANNING_SCHEMA_VERSION, "planning answers the schema version ubu-ui sends");
      const nextQuery = new URLSearchParams({ schema_version: endpoints.NEXT_ACTION_SCHEMA_VERSION });
      const next = await call(o.base, "GET", `${endpoints.NEXT_ACTION_PATH}?${nextQuery}`);
      same(next?.schema_version, endpoints.NEXT_ACTION_SCHEMA_VERSION, "next-action answers the schema version ubu-ui sends");

      const spec = await call(o.base, "GET", ROUTES_WITHOUT_A_UI_CONSTANT.OPENAPI);
      const live = new Set(Object.keys(spec?.paths ?? {}));
      const constants = Object.entries(endpoints).filter(([name]) => name.endsWith("_PATH"));
      ok(constants.length > 0, "endpoints.ts exports path constants");
      const missing = [];
      for (const [name, path] of constants) {
        const present = live.has(path);
        console.log(`  ${present ? "ok     " : "MISSING"} ${name} = ${path}`);
        if (!present) {
          missing.push(`${name} = ${path}`);
        }
      }
      if (missing.length > 0) {
        throw new CheckFailure(`${missing.length} path constant(s) in endpoints.ts are not served by this orchestrator: ${missing.join(", ")}`);
      }
      for (const path of Object.values(ROUTES_WITHOUT_A_UI_CONSTANT).slice(1)) {
        ok(live.has(path), `the orchestrator serves ${path}, which later scenarios use`);
      }
      return `defaults agree on ${uiDefault}, ${constants.length} of ${constants.length} path constants are live`;
    }
  },
  {
    name: "task loop",
    async run(o) {
      const title = "Synthetic contract-check Task";
      const captured = await captureTask(o, { title, duration_estimate: fixed(25) });
      same(captured.schema_version, endpoints.TASK_CAPTURE_SCHEMA_VERSION, "capture answers the schema version ubu-ui sends");
      const row = (await listTasks(o)).find((task) => task.task_id === captured.task_id);
      ok(row !== undefined, "the captured Task is listed as active");
      same(row.title, title, "it is listed under its title");
      const path = fill(endpoints.TASK_PATH, { task_id: captured.task_id });
      const edit = (expectedVersion, newTitle, expect) =>
        call(o.base, "PATCH", path, { schema_version: endpoints.TASK_CAPTURE_SCHEMA_VERSION, expected_version: expectedVersion, title: newTitle }, expect);
      const edited = await edit(row.version, "Synthetic contract-check Task, edited", 200);
      same(edited.version, row.version + 1, "an edit with the listed version advances the version");
      const stale = await edit(row.version, "Synthetic edit from a stale list", 409);
      same(stale.diagnostics[0].code, "version_conflict", "an edit with a stale expected_version is refused with 409");
      same((await readTask(o, captured.task_id)).payload.title, "Synthetic contract-check Task, edited", "the refused edit changed nothing");
      return "capture, list, edit, and a stale expected_version is refused with 409 version_conflict";
    }
  },
  {
    name: "static window",
    async run(o) {
      const captured = await captureTask(o, { title: "Synthetic Task to pin", duration_estimate: fixed(30) });
      same((await listTasks(o))[0].placement, "planned", "a Task captured without a window is Dynamic");
      const window = { start: at(4), end: at(4, 45) };
      await call(o.base, "PATCH", fill(endpoints.TASK_PATH, { task_id: captured.task_id }), {
        schema_version: endpoints.TASK_CAPTURE_SCHEMA_VERSION,
        expected_version: 1,
        static_window: window
      });
      same((await readTask(o, captured.task_id)).payload.static_window, window, "PATCH stored the static window");
      same((await listTasks(o))[0].placement, "static", "the Task is now listed as Static");
      const step = (await generatePlan(o)).steps.find((candidate) => candidate.task_id === captured.task_id);
      ok(step !== undefined, "the Task is in the Plan");
      same(
        { static_anchor: step.static_anchor, start_at: step.start_at, end_at: step.end_at },
        { static_anchor: true, start_at: window.start, end_at: window.end },
        "it plans as a Static anchor at exactly its window"
      );
      const backwards = await call(
        o.base,
        "PATCH",
        fill(endpoints.TASK_PATH, { task_id: captured.task_id }),
        { schema_version: endpoints.TASK_CAPTURE_SCHEMA_VERSION, expected_version: 2, static_window: { start: at(5), end: at(4) } },
        400
      );
      same(backwards.error, "bad request: Task static_window.end must be strictly after start", "a window that ends before it starts is refused");
      same((await readTask(o, captured.task_id)).payload.static_window, window, "and the stored window is unchanged");
      return "a static_window set through PATCH makes the Task plan as Static at that window";
    }
  },
  {
    name: "routines",
    async run(o) {
      const routine = (title, start) => ({
        schema_version: endpoints.OBJECTIVE_SCHEMA_VERSION,
        mode: "evergreen",
        title,
        recurrence: { timezone: "UTC", rule: { kind: "daily" } },
        routine_instance_template: {
          title,
          duration_estimate: fixed(30),
          nominal_start: start,
          placement: "static",
          occupies_capacity: true,
          tags: [],
          reminder_minutes: []
        }
      });
      const first = await call(o.base, "POST", endpoints.OBJECTIVE_CREATE_PATH, routine("Synthetic morning review", timeOfDay(3)), 201);
      const refused = await call(o.base, "POST", endpoints.OBJECTIVE_CREATE_PATH, routine("Synthetic stand-up", timeOfDay(3, 15)), 400);
      same(refused.diagnostics.length, 1, "the overlapping routine is refused with one diagnostic");
      const { code, message } = refused.diagnostics[0];
      same(code, "objective_routine_overlap", "its code");
      ok(message.includes("(Synthetic stand-up)") && message.includes("(Synthetic morning review)"), "the refusal names both routines");
      ok(message.includes(`\`${first.objective_id}\``), "it names the existing routine by id");
      const date = message.match(/first on (\d{4}-\d{2}-\d{2})/);
      ok(date !== null, `it names the first colliding date: ${date?.[1]}`);
      const objectives = (await call(o.base, "GET", endpoints.OBJECTIVE_LIST_PATH)).objectives;
      same(objectives.map((objective) => objective.title), ["Synthetic morning review"], "nothing was written for the refused routine");
      const occurrence = (await generatePlan(o)).steps.find((step) => step.summary === "Synthetic morning review");
      ok(occurrence !== undefined, "the generated Plan contains the routine's occurrence");
      same(
        { static_anchor: occurrence.static_anchor, time_of_day: occurrence.start_at.slice(11, 19) },
        { static_anchor: true, time_of_day: timeOfDay(3) },
        "the occurrence is Static at the routine's nominal start"
      );
      const task = (await listTasks(o)).find((candidate) => candidate.task_id === occurrence.task_id);
      same(task.is_routine_occurrence, true, "the Task behind it is a routine occurrence");
      return "a Static routine is created, an overlapping one is refused naming both and the date, and the occurrence is planned";
    }
  },
  {
    name: "colour partition",
    async run(o) {
      const pinned = await captureTask(o, {
        title: "Synthetic fixed appointment",
        static_window: { start: at(3), end: at(3, 30) },
        category_tag: "personal",
        tags: ["personal"]
      });
      const flexible = await captureTask(o, { title: "Synthetic flexible errand", duration_estimate: fixed(30), category_tag: "work", tags: ["work"] });
      await generatePlan(o);
      const events = (await preview(o)).events;
      const event = (taskId) => events.find((candidate) => candidate.task_id === taskId);
      const palette = (await call(o.base, "GET", endpoints.SETTINGS_LIST_PATH)).palette;
      const colour = (category) => palette.find((entry) => entry.category === category).color_id;
      same(event(pinned.task_id).color_id, colour("personal"), "the Static event carries its category's colour");
      same(event(flexible.task_id).color_id, null, "the Dynamic event carries no colour, though its Task has a category");
      return "in the preview the Static step carries a color_id and the Dynamic step does not";
    }
  },
  {
    name: "apply",
    async run(o) {
      await captureTask(o, { title: "Synthetic fixed appointment", static_window: { start: at(3), end: at(3, 30) } });
      await captureTask(o, { title: "Synthetic flexible errand", duration_estimate: fixed(30) });
      await generatePlan(o);
      const before = await repair(o, (await reconcile(o)).reconciliation_id);
      same(before.applied_event_count, 0, "before the apply the applied record is empty");
      const proposed = await preview(o);
      same(proposed.operations.map((operation) => operation.kind), ["create", "create"], "the preview proposes two creates");
      const result = await approve(o, proposed.preview_id);
      same(result.status, "applied", "the Mock approve applies");
      same(result.applied_events.length, 2, "the applied record grew to two events");
      const next = await preview(o);
      same(next.operations, [], "a second preview proposes nothing");
      const replay = await approve(o, proposed.preview_id, 409);
      same(replay.diagnostics[0].code, "calendar_projection_conflict", "the superseded preview cannot be applied again");
      return "a Mock approve grows the applied record from 0 to 2, and a second preview proposes nothing";
    }
  },
  {
    name: "colour means done",
    seeded: true,
    async run(first) {
      const day = await appliedDay(first);
      const observed = day.applied.map((event) => (event.task_id === day.flexible ? { ...event, color_id: "10" } : event));
      const o = await restartObserving(first, observed);
      same((await listTasks(o)).map((task) => task.task_id).includes(day.flexible), true, "before capture the Dynamic Task is active");
      const captured = await capture(o);
      same(
        { captured: captured.captured, updated: captured.updated, unchanged: captured.unchanged, skipped: captured.skipped },
        { captured: 0, updated: 1, unchanged: 1, skipped: 0 },
        "capture changed one Task and left the Static one unchanged"
      );
      same((await readTask(o, day.flexible)).status, "completed", "the Dynamic Task whose event was coloured is completed");
      same((await listTasks(o)).map((task) => task.task_id), [day.pinned], "the Static Task, whose colour is its category, is still active");
      const again = await capture(o);
      same({ updated: again.updated, unchanged: again.unchanged }, { updated: 0, unchanged: 2 }, "a second capture of the same calendar completes nothing again");
      return "a colour on an applied Dynamic event completes its Task at capture, and only that Task";
    }
  },
  {
    name: "drag means move",
    seeded: true,
    async run(first) {
      const day = await appliedDay(first);
      const moved = { start: at(5), end: at(5, 30) };
      const observed = day.applied.map((event) => (event.task_id === day.pinned ? { ...event, start_at: moved.start, end_at: moved.end } : event));
      same((await readTask(first, day.pinned)).payload.static_window, { start: at(3), end: at(3, 30) }, "before the drag the Static Task's window is as captured");
      const o = await restartObserving(first, observed);
      const captured = await capture(o);
      same({ moved: captured.moved, updated: captured.updated, resized: captured.resized }, { moved: 1, updated: 1, resized: 0 }, "capture reports one move");
      same((await readTask(o, day.pinned)).payload.static_window, moved, "the Task's static_window followed the event");
      const step = (await generatePlan(o)).steps.find((candidate) => candidate.task_id === day.pinned);
      same({ start_at: step.start_at, end_at: step.end_at }, { start_at: moved.start, end_at: moved.end }, "the next Plan places it at the moved window");
      const back = (await preview(o)).operations.filter((operation) => (operation.event?.task_id ?? operation.task_id) === day.pinned);
      same(back, [], "the next preview proposes no write to the moved event: the calendar already has it there");
      return "a moved window on an applied Static event moves the Task's static_window at capture";
    }
  },
  {
    name: "foreign",
    seeded: true,
    async run(first) {
      const day = await appliedDay(first);
      const stranger = observedEvent(FOREIGN_ID, "Synthetic foreign meeting", 6);
      const o = await restartObserving(first, [...day.applied, stranger]);
      const reconciliation = await reconcile(o);
      same(reconciliation.status, "observed", "reconcile reports an observation, not drift");
      same(
        reconciliation.conflicts.map((conflict) => [conflict.conflict_type, conflict.external_id]),
        [["foreign", FOREIGN_ID]],
        "the event UbU never applied is the only conflict, and it is foreign"
      );
      same(reconciliation.conflicts[0].message, "this event was not created by UbU and will not be touched", "reconcile says it will not be touched");
      const repaired = await repair(o, reconciliation.reconciliation_id);
      same(
        { dropped_events: repaired.dropped_events, updated_events: repaired.updated_events, applied_event_count: repaired.applied_event_count },
        { dropped_events: 0, updated_events: 0, applied_event_count: 2 },
        "repair leaves the applied record at the two events UbU applied"
      );
      same((await listTasks(o)).map((task) => task.title).sort(), ["Synthetic fixed appointment", "Synthetic flexible errand"], "repair created no Task for the foreign event");
      const after = await reconcile(o);
      same(after.conflicts.map((conflict) => [conflict.conflict_type, conflict.external_id]), [["foreign", FOREIGN_ID]], "after repair the event is still foreign, so repair did not adopt it");
      same((await preview(o)).operations, [], "and the next preview proposes nothing against it");
      return "an event UbU never applied reconciles as foreign, and repair neither adopts nor touches it";
    }
  },
  {
    name: "recurring occupancy",
    seeded: true,
    async run(first) {
      const day = await appliedDay(first);
      ok(/^[0-9a-v]+_\d{8}T\d{6}Z$/.test(RECURRING_ID), `the seeded id has the {base32hex}_{timestamp} shape: ${RECURRING_ID}`);
      const o = await restartObserving(first, [...day.applied, observedEvent(RECURRING_ID, "Synthetic recurring instance", 6)]);
      ok(true, "the orchestrator started on the seed, so the event parsed");
      const notOwnable = `Calendar event \`${RECURRING_ID}\` cannot be captured: its id cannot be a UbU Task handle, so UbU cannot own it`;
      const reconciliation = await reconcile(o);
      same(reconciliation.conflicts.map((conflict) => [conflict.conflict_type, conflict.external_id]), [["foreign", RECURRING_ID]], "reconcile classifies it foreign");
      same(reconciliation.diagnostics, [{ code: "capture_event_not_ownable", message: notOwnable }], "reconcile says why it cannot be owned");
      const captured = await capture(o);
      same(
        captured.diagnostics,
        [
          { code: "capture_colour_absent", message: `Calendar event \`${RECURRING_ID}\` has no colour; no category assigned` },
          { code: "capture_occupancy_only", message: `Calendar event \`${RECURRING_ID}\` cannot be owned by UbU, so its time is recorded as an occupied window that UbU will never write back to or export` }
        ],
        "capture records it as occupied time with capture_occupancy_only, naming the id and never the title"
      );
      same({ captured: captured.captured, skipped: captured.skipped, unchanged: captured.unchanged }, { captured: 1, skipped: 0, unchanged: 2 }, "capture captured one and skipped nothing");
      const occupancy = (await listTasks(o)).find((task) => task.title === "Synthetic recurring instance");
      same(occupancy?.placement, "static", "a Static Task now holds its window");
      const stored = (await readTask(o, occupancy.task_id)).payload;
      same(stored.provenance.source, { source_kind: "google_calendar", source_id: RECURRING_ID }, "the Google id is its provenance source, the dedupe key");
      ok(!occupancy.task_id.includes(RECURRING_ID.split("_")[0]), `its handle is minted, not derived from the Google id: ${occupancy.task_id}`);
      const again = await capture(o);
      same({ captured: again.captured, updated: again.updated, unchanged: again.unchanged }, { captured: 0, updated: 0, unchanged: 3 }, "a second capture admits nothing");
      same((await listTasks(o)).length, 3, "and there is still one Task for it");
      const after = await reconcile(o);
      same(after.conflicts.map((conflict) => [conflict.conflict_type, conflict.external_id]), [["foreign", RECURRING_ID]], "after capture it is still foreign, so it is not in the applied record");
      same((await repair(o, after.reconciliation_id)).applied_event_count, 2, "the applied record still holds only the two events UbU applied");
      await generatePlan(o);
      const proposed = await preview(o);
      ok(!JSON.stringify([proposed.events, proposed.operations]).includes(RECURRING_ID), "the next preview neither desires nor operates on the event");
      ok(!proposed.events.some((event) => event.task_id === occupancy.task_id), "and the occupancy Task is in no desired event");
      return "a recurring instance parses, classifies foreign, is captured as occupied time under a minted handle, stays foreign and is never offered to the calendar";
    }
  },
  {
    name: "preferences",
    async run(o) {
      const ids = [];
      for (const title of ["Synthetic A", "Synthetic B", "Synthetic C"]) {
        ids.push((await captureTask(o, { title, duration_estimate: fixed(15) })).task_id);
      }
      const prefer = (a, b, expect) =>
        call(o.base, "POST", endpoints.PREFERENCE_CREATE_PATH, { schema_version: endpoints.PREFERENCE_SCHEMA_VERSION, task_a: a, task_b: b, order: "a_preferred_to_b" }, expect);
      const first = await prefer(ids[0], ids[1], 201);
      await prefer(ids[1], ids[2], 201);
      same((await call(o.base, "GET", endpoints.PREFERENCE_LIST_PATH)).preferences.length, 2, "two Preferences are stated");
      const refused = await prefer(ids[2], ids[0], 400);
      same(refused.diagnostics[0].code, "preference_cycle_rejected", "the third, which closes a cycle, is refused");
      same(
        refused.diagnostics[0].message,
        `Preference cycle among Tasks [${[ids[0], ids[1], ids[2], ids[0]].join(" -> ")}]; disable or delete a conflicting Preference first`,
        "the refusal names the members of the cycle in order"
      );
      await call(o.base, "DELETE", fill(endpoints.PREFERENCE_PATH, { preference_id: first.preference_id }), undefined, 204);
      const left = (await call(o.base, "GET", endpoints.PREFERENCE_LIST_PATH)).preferences;
      same(left.map((preference) => [preference.task_a_title, preference.task_b_title]), [["Synthetic B", "Synthetic C"]], "deleting one leaves the other");
      await prefer(ids[2], ids[0], 201);
      ok(true, "with the first deleted, the refused Preference is now accepted");
      return "two Preferences are created, a cycle is refused naming its members, and one is deleted";
    }
  },
  {
    name: "decomposition",
    async run(o) {
      const origin = await captureTask(o, { title: "Synthetic big job", duration_estimate: fixed(60) });
      const decomposed = await call(o.base, "POST", fill(ROUTES_WITHOUT_A_UI_CONSTANT.DECOMPOSE, { task_id: origin.task_id }), {
        schema_version: CONTAINER_SCHEMA_VERSION,
        expected_version: origin.version,
        children: [
          { title: "Synthetic step one", duration_estimate: fixed(20) },
          { title: "Synthetic step two", duration_estimate: fixed(20), blocked_by: ["child:1"] },
          { title: "Synthetic step three", duration_estimate: fixed(20), blocked_by: ["child:2"] }
        ]
      });
      same(decomposed.child_task_ids.length, 3, "the Task is decomposed into three children");
      const containers = (await call(o.base, "GET", ROUTES_WITHOUT_A_UI_CONSTANT.CONTAINER_LIST)).containers;
      same(containers[0].segments, [{ start: 0, end: 3 }], "the Container holds them as one segment");
      // A Task that would otherwise be free to sit between the children.
      await captureTask(o, { title: "Synthetic unrelated errand", duration_estimate: fixed(10) });
      const steps = (await generatePlan(o)).steps;
      const children = decomposed.child_task_ids.map((id) => steps.find((step) => step.task_id === id));
      ok(children.every((step) => step !== undefined), "all three children are in the Plan");
      ok(!steps.some((step) => step.task_id === origin.task_id), "the decomposed Task itself is not");
      same(
        [children[0].end_at === children[1].start_at, children[1].end_at === children[2].start_at],
        [true, true],
        "the segment's children are contiguous: each starts when the one before it ends"
      );
      const undone = await call(o.base, "POST", fill(ROUTES_WITHOUT_A_UI_CONSTANT.CONTAINER_UNDO, { container_id: decomposed.container_id }), {
        schema_version: CONTAINER_SCHEMA_VERSION
      });
      ok(undone.restored_task_id !== origin.task_id, `undo restores the Task under a new handle: ${undone.restored_task_id}`);
      same(undone.children_mooted, decomposed.child_task_ids, "undo reports the three children mooted");
      const active = await listTasks(o, "active");
      same(active.map((task) => task.title).sort(), ["Synthetic big job", "Synthetic unrelated errand"], "the restored Task is active under the original title");
      same(active.find((task) => task.title === "Synthetic big job").task_id, undone.restored_task_id, "and it is the new handle");
      const moot = (await listTasks(o, "moot")).map((task) => task.task_id).sort();
      same(moot, [origin.task_id, ...decomposed.child_task_ids].sort(), "the children, and the original handle, are moot");
      return "decomposed children are contiguous in the Plan; undo gives a new Task handle and moots the children";
    }
  },
  {
    name: "settings reach planning",
    async run(o) {
      const pinned = await captureTask(o, {
        title: "Synthetic fixed appointment",
        static_window: { start: at(3), end: at(3, 30) },
        category_tag: "personal",
        tags: ["personal"]
      });
      await generatePlan(o);
      const colourOf = async () => (await preview(o)).events.find((event) => event.task_id === pinned.task_id).color_id;
      const before = await colourOf();
      same(before, "3", "before the Setting the event carries the default colour for personal");
      await putSetting(o, "calendar.color.personal", "7");
      const entry = (await call(o.base, "GET", endpoints.SETTINGS_LIST_PATH)).palette.find((candidate) => candidate.category === "personal");
      same(entry, { category: "personal", color_id: "7", origin: "setting" }, "GET /settings reports the Setting");
      same(await colourOf(), "7", "the next preview carries it, with no restart and no new Plan");
      await call(o.base, "DELETE", fill(endpoints.SETTING_DELETE_PATH, { name: "calendar.color.personal" }), undefined, 204);
      same(await colourOf(), "3", "reverting the Setting returns the default on the next preview");
      return "a category colour changed through PUT /setting/:name is carried by the next preview with no restart";
    }
  },
  {
    name: "advisory",
    async run(o) {
      const stub = await startModelStub();
      await captureTask(o, { title: "Synthetic oat milk", duration_estimate: fixed(10) });
      await captureTask(o, { title: "Synthetic bin bags", duration_estimate: fixed(10) });
      const rows = async () => (await call(o.base, "GET", endpoints.ADVISORY_QUEUE_PATH)).candidates;

      const unconfigured = await runAdvisory(o);
      same(unconfigured.status, "unconfigured", "with nothing configured the run reports unconfigured");
      same(unconfigured.diagnostics.map((diagnostic) => diagnostic.code), ["advisory_unconfigured", "advisory_unconfigured"], "and names both missing Settings");
      same(stub.requests.length, 0, "without contacting the model");

      await putSetting(o, "advisory.model", "synthetic-model:1");
      await putSetting(o, "advisory.endpoint", stub.endpoint);
      await putSetting(o, "advisory.timeout_ms", 5000);

      const expectFailure = async (mode, status, code) => {
        stub.mode = mode;
        const asked = stub.requests.length;
        const failed = await runAdvisory(o);
        same({ status: failed.status, code: failed.diagnostics[0]?.code, enqueued: failed.candidates_enqueued }, { status, code, enqueued: 0 }, `a ${mode} answer reports ${code} and enqueues nothing`);
        same(stub.requests.length, asked + 1, "after one request to the model");
        same((await rows()).length, 0, "and the queue is still empty");
        return failed.diagnostics[0].message;
      };

      const notFound = await expectFailure("not_found", "worker_error", "advisory_http_failed");
      ok(notFound.includes("HTTP 404: model 'synthetic-model:1' not found"), `the server's 404 body reaches the diagnostic: ${notFound}`);

      const empty = await expectFailure("empty", "malformed_result", "advisory_empty_response");
      ok(empty.includes("thinking_present: true"), "the empty answer reports that thinking was present");
      ok(!empty.includes("synthetic thinking"), "and none of the thinking itself");

      stub.delayMs = 8000;
      const started = Date.now();
      await expectFailure("slow", "timeout", "advisory_timeout");
      const waited = Date.now() - started;
      ok(waited >= 4900 && waited < 7900, `the run gave up at its 5000 ms budget, before the answer due at 8000 ms: ${waited} ms`);

      stub.mode = "success";
      const good = await runAdvisory(o);
      same({ status: good.status, selected: good.selected.length, enqueued: good.candidates_enqueued }, { status: "ok", selected: 2, enqueued: 2 }, "a good answer enqueues a candidate for each selected Task");
      const sent = stub.requests.at(-1).body;
      same({ model: sent.model, stream: sent.stream, think: sent.think }, { model: "synthetic-model:1", stream: false, think: false }, "the request the model received");
      same(JSON.parse(sent.prompt).map((task) => Object.keys(task)), [["id", "title"], ["id", "title"]], "the prompt carries Task ids and titles only");
      const queue = await rows();
      same(queue.length, 2, "both are in the queue");
      const chosen = queue[0].candidate;
      const target = chosen.target_refs[0].id;
      same((await readTask(o, target)).payload.category_tag, undefined, "before admission the Task has no category");
      await call(o.base, "POST", fill(endpoints.ADVISORY_ADMIT_PATH, { candidate_id: chosen.advisory_candidate_id }), { observed_version: chosen.version });
      same((await readTask(o, target)).payload.category_tag, "grocery", "admitting the candidate sets the category");
      const other = queue[1].candidate.target_refs[0].id;
      same((await readTask(o, other)).payload.category_tag, undefined, "the Task whose candidate was not admitted is unchanged");
      return "unconfigured, a 404 body, an empty answer, a timeout and a good answer each report as they should, against a stub model";
    }
  },
  {
    name: "clarify",
    async run(o) {
      const stub = await startModelStub();
      stub.mode = "clarify";
      const captured = await captureTask(o, { title: "Synthetic lunar teapot", duration_estimate: fixed(10) });
      const task = captured.task_id;
      same((await readTask(o, task)).payload.description, undefined, "the captured Task has no description");
      await putSetting(o, "advisory.model", "synthetic-model:1");
      await putSetting(o, "advisory.endpoint", stub.endpoint);
      await putSetting(o, "advisory.timeout_ms", 5000);
      const waiting = async () => (await call(o.base, "GET", endpoints.ADVISORY_QUEUE_PATH)).candidates.map((entry) => entry.candidate);
      const prompt = (index) => JSON.parse(stub.requests[index].body.prompt);
      const answer = (candidate, answers, expect = 200) =>
        call(o.base, "POST", fill(endpoints.ADVISORY_ANSWER_PATH, { candidate_id: candidate.advisory_candidate_id }), { observed_version: candidate.version, answers }, expect);

      const first = await runClarify(o);
      same({ status: first.status, selected: first.selected, enqueued: first.candidates_enqueued, diagnostics: first.diagnostics }, { status: "ok", selected: [{ id: task, title: "Synthetic lunar teapot" }], enqueued: 1, diagnostics: [] }, "with no Task named, the run selects the Task with no description and enqueues one candidate");
      same(prompt(0), { id: task, title: "Synthetic lunar teapot", round: 1 }, "the prompt carried the Task's id, title and round 1, and no description");
      const sent = stub.requests[0].body;
      same({ model: sent.model, stream: sent.stream, think: sent.think }, { model: "synthetic-model:1", stream: false, think: false }, "the request the model received");

      const again = await runClarify(o);
      same({ status: again.status, enqueued: again.candidates_enqueued, code: again.diagnostics[0]?.code }, { status: "ok", enqueued: 0, code: "clarify_already_queued" }, "a second run is refused: the Task already has questions waiting");
      same(stub.requests.length, 1, "and the model received no further request");

      const queue = await waiting();
      same(queue.map((candidate) => [candidate.candidate_kind, candidate.lifecycle_state, candidate.normalized_proposal.round]), [["clarification_question", "proposed", 1]], "the queue holds one clarification candidate, round 1");
      same(queue[0].normalized_proposal.questions, ROUND_ONE, "carrying the four questions the model asked");
      const candidate = queue[0];

      const admitted = await call(o.base, "POST", fill(endpoints.ADVISORY_ADMIT_PATH, { candidate_id: candidate.advisory_candidate_id }), { observed_version: candidate.version }, 400);
      same(admitted.diagnostics[0].code, "advisory_answer_required", "plain Admit is refused: a clarification is admitted by answering it");
      const maybe = await answer(candidate, { q1: "maybe" }, 400);
      same(maybe.diagnostics[0].code, "clarify_invalid_answer", "a yes/no question answered `maybe` is refused");
      same((await readTask(o, task)).payload.description, undefined, "neither refusal wrote anything to the Task");
      same((await waiting()).map((waitingCandidate) => [waitingCandidate.lifecycle_state, waitingCandidate.version]), [["proposed", 1]], "and the candidate is still proposed");

      // q1 yes satisfies q2's dependency; q3 is left blank; q4 depends on a no and is answered anyway.
      const saved = await answer(candidate, { q4: "Synthetic reason that does not apply", q3: "  ", q2: " next synthetic Friday ", q1: "Y" });
      same(saved.candidate.lifecycle_state, "admitted", "a proper answer admits the candidate");
      const roundOne = "Q: Is there a deadline for the synthetic teapot?\nA: y\nQ: What is the synthetic deadline?\nA: next synthetic Friday\n";
      same((await readTask(o, task)).payload.description, roundOne, "the description is the questions answered, in question order, with the blank and the inapplicable answer dropped");
      same(await waiting(), [], "the queue is empty again");

      const unnamed = await runClarify(o);
      same(unnamed.diagnostics[0]?.code, "clarify_no_task", "with no Task named there is now nothing to interview: round two must name the Task");
      same(stub.requests.length, 1, "and the model was not asked");
      const second = await runClarify(o, task);
      same({ status: second.status, enqueued: second.candidates_enqueued }, { status: "ok", enqueued: 1 }, "naming the Task runs round two");
      same(prompt(1), { id: task, title: "Synthetic lunar teapot", description: roundOne, round: 2 }, "the prompt carried round 2 and the description written by round one");

      const next = (await waiting())[0];
      same(next.normalized_proposal.round, 2, "the new candidate is round 2");
      await answer(next, { r1: "n" });
      const both = (await readTask(o, task)).payload.description;
      same(both, `${roundOne}Q: Is the synthetic teapot already bought?\nA: n\n`, "the description grew by round two's answer");
      ok(both.startsWith(roundOne) && both.length > roundOne.length, "and round one's answers are still there: appended, not replaced");

      const done = await runClarify(o, task);
      same({ status: done.status, enqueued: done.candidates_enqueued, code: done.diagnostics[0]?.code }, { status: "ok", enqueued: 0, code: "clarify_no_questions" }, "when the model has nothing left to ask, the run is ok and enqueues nothing");
      same(prompt(2).round, 3, "having been asked as round 3");
      same(done.round, 3, "and the run reports that round, which is how the app tells a finished interview from a model that declined on round one");
      same((await readTask(o, task)).payload.description, both, "and the Task is unchanged");
      console.log(`  the composed description, verbatim: ${JSON.stringify(both)}`);
      return "an interview runs two rounds: one open at a time, admitted by answering, and its answers accumulate in the Task's description";
    }
  },
  {
    name: "reopen",
    async run(o) {
      const task = (await captureTask(o, { title: "Synthetic Task completed by mistake", duration_estimate: fixed(10) })).task_id;
      const other = (await captureTask(o, { title: "Synthetic other Task", duration_estimate: fixed(10) })).task_id;
      const completed = await recordAction(o, task, "complete");
      same({ status: completed.task_status, applied: completed.transition_applied }, { status: "completed", applied: true }, "completing the Task completes it");
      same((await readTask(o, task)).status, "completed", "the Task is completed");
      const elsewhere = await recordAction(o, other, "complete");

      const wrong = await reopenTask(o, task, elsewhere.log_id, 409);
      same(wrong.diagnostics[0].code, "reopen_stale_completion", "reopening with another Task's completion id is refused with 409");
      same((await readTask(o, task)).status, "completed", "and the Task is still completed");

      const reopened = await reopenTask(o, task, completed.log_id);
      same({ status: reopened.task_status, completion: reopened.completion_log_id, diagnostics: reopened.diagnostics }, { status: "active", completion: completed.log_id, diagnostics: [] }, "reopening with the right id undoes the completion");
      same((await readTask(o, task)).status, "active", "the Task is active");
      ok((await listTasks(o)).some((listed) => listed.task_id === task), "and is listed among the active Tasks again");

      const twice = await reopenTask(o, task, completed.log_id, 409);
      same(twice.diagnostics[0].code, "reopen_not_completed", "reopening again is refused with 409: there is nothing to undo");

      const again = await recordAction(o, task, "complete");
      same({ status: again.task_status, applied: again.transition_applied }, { status: "completed", applied: true }, "the reopened Task can be completed again");
      ok(again.log_id !== completed.log_id, "as a new completion, with its own id");
      same((await readTask(o, other)).status, "completed", "the other Task was never touched");
      return "a completion made by mistake is undone by naming it; a wrong id and a second undo are refused; the Task can be completed again";
    }
  },
  {
    name: "description",
    async run(o) {
      // The interview's own shape: a leading blank line, Q:/A: pairs, a blank line between rounds, trailing newlines.
      const roundOne = "\n\nQ: Is there a deadline for the synthetic teapot?\nA: y\nQ: What is the synthetic deadline?\nA: friday\n\nQ: Who is the synthetic teapot for?\nA: the synthetic neighbour\n\n";
      const captured = await captureTask(o, { title: "Synthetic teapot", description: roundOne, duration_estimate: fixed(20) });
      same((await readTask(o, captured.task_id)).payload.description, roundOne, "the captured description reads back byte for byte, newlines and blank lines included");
      console.log(`  description as read back: ${JSON.stringify((await readTask(o, captured.task_id)).payload.description)}`);
      const path = fill(endpoints.TASK_PATH, { task_id: captured.task_id });
      const roundTwo = `${roundOne}Q: Is the synthetic teapot already bought?\nA: n\n`;
      const grown = await call(o.base, "PATCH", path, { schema_version: endpoints.TASK_CAPTURE_SCHEMA_VERSION, expected_version: captured.version, description: roundTwo });
      same((await readTask(o, captured.task_id)).payload.description, roundTwo, "PATCHed to a longer narrative, it reads back as that narrative, byte for byte");
      const other = await readTask(o, captured.task_id);
      same({ title: other.payload.title, estimate: other.payload.duration_estimate }, { title: "Synthetic teapot", estimate: fixed(20) }, "and the fields the PATCH did not name are as they were");
      await call(o.base, "PATCH", path, { schema_version: endpoints.TASK_CAPTURE_SCHEMA_VERSION, expected_version: grown.version, description: null });
      same((await readTask(o, captured.task_id)).payload.description, undefined, "PATCHed to null, the description is gone: absent, not empty");
      // Capture must accept what the interview writes: long, many-lined, punctuated, non-ASCII.
      const awkward = "Q: Does the synthetic teapot need a lid — or not?\nA: yes: it's the \"blue\" one, 2 × 3 cm\n\n\n" + "Q: Repeated line?\nA: y\n".repeat(40);
      const accepted = await captureTask(o, { title: "Synthetic awkward notes", description: awkward, duration_estimate: fixed(5) });
      same((await readTask(o, accepted.task_id)).payload.description, awkward, "a long, punctuated, non-ASCII description is accepted and reads back whole");
      const blank = await captureTask(o, { title: "Synthetic no notes", duration_estimate: fixed(5) });
      same((await readTask(o, blank.task_id)).payload.description, undefined, "a Task captured without a description has none");
      return "a multi-line Q:/A: description round-trips byte for byte through capture, PATCH and null";
    }
  },
  {
    name: "time by category",
    async run(o) {
      const report = async (orchestrator, query = {}, expect = 200) =>
        call(orchestrator.base, "GET", `${endpoints.TIME_BY_CATEGORY_PATH}?${new URLSearchParams({ schema_version: endpoints.TIME_BY_CATEGORY_SCHEMA_VERSION, ...query })}`, undefined, expect);
      const rows = (body) => body.categories.map((row) => [row.category, row.seconds, row.static_seconds, row.completed_seconds, row.task_count]);
      // The range: seven days back from the top of this hour, ending three hours ahead, so every window and
      // every completion made during this scenario is inside it by construction.
      const to = at(3);
      const from = iso(new Date(thisHour - 7 * 86_400_000));
      const range = { from, to };

      // A Static Task straddling the range's start: an hour before, an hour after. Only the hour inside counts.
      await captureTask(o, { title: "Synthetic overnight shift", static_window: { start: iso(new Date(thisHour - 7 * 86_400_000 - 3_600_000)), end: iso(new Date(thisHour - 7 * 86_400_000 + 3_600_000)) }, category_tag: "work", tags: ["work"] });
      // A completed Dynamic Task with an observed window: it arrives through the Calendar, so it is completed by a coloured event.
      const observed = (await captureTask(o, { title: "Synthetic observed errand", duration_estimate: fixed(25), category_tag: "grocery", tags: ["grocery"] })).task_id;
      // A completed Dynamic Task with a fixed estimate and no observed window.
      const estimated = (await captureTask(o, { title: "Synthetic estimated errand", duration_estimate: fixed(10), category_tag: "grocery", tags: ["grocery"] })).task_id;
      // A completed Dynamic Task with a stochastic estimate: the mode counts, never the p95.
      const skewed = (await captureTask(o, { title: "Synthetic skewed job", duration_estimate: { type: "shifted_lognormal_p95", min_seconds: 600, mode_seconds: 1_200, p95_seconds: 7_200 }, category_tag: "work", tags: ["work"] })).task_id;
      // A completed Dynamic Task with neither: named, not counted.
      const unmeasured = (await captureTask(o, { title: "Synthetic phone call", category_tag: "work", tags: ["work"] })).task_id;
      // An uncategorised Task, Static so that it counts without a completion.
      await captureTask(o, { title: "Synthetic uncategorised block", static_window: { start: at(1), end: at(1, 45) } });
      const completions = {};
      for (const task of [estimated, skewed, unmeasured]) {
        completions[task] = await recordAction(o, task, "complete");
      }
      // The observed window comes from the calendar: apply the Plan, then observe the Dynamic event coloured.
      await generatePlan(o);
      const proposed = await preview(o);
      const applied = await approve(o, proposed.preview_id);
      same(applied.status, "applied", "the Plan's events are applied in Mock");
      const event = applied.applied_events.find((candidate) => candidate.task_id === observed);
      ok(event !== undefined, "the observed errand has an applied event");
      const seen = { ...event, color_id: "10", start_at: at(2), end_at: at(2, 50) };
      const restarted = await restartObserving(o, applied.applied_events.map((candidate) => (candidate.task_id === observed ? seen : candidate)));
      const captured = await capture(restarted);
      same({ updated: captured.updated }, { updated: 1 }, "capture completes it from the coloured event, with the window observed there");
      same((await readTask(restarted, observed)).status, "completed", "the observed errand is completed");

      const body = await report(restarted, range);
      console.log(`  time-by-category response: ${JSON.stringify(body)}`);
      same(
        rows(body),
        [["work", 4_800, 3_600, 1_200, 2], ["grocery", 3_600, 0, 3_600, 2], ["Uncategorized", 2_700, 2_700, 0, 1]],
        "every row: work is the overnight overlap plus the skewed mode, grocery the observed window plus the fixed estimate, Uncategorized the block"
      );
      same(body.unmeasured, [{ task_id: unmeasured, title: "Synthetic phone call", reason: "completed with no observed window and no duration estimate; the time it took is not recorded" }], "the Task with neither window nor estimate is named as unmeasured, with the reason");
      same(body.total_seconds, 11_100, "the total is the sum of the rows");
      same(rows(body).map((row) => row[0]), ["work", "grocery", "Uncategorized"], "rows are ordered by seconds descending");
      same({ from: body.from, to: body.to, schema: body.schema_version }, { from, to, schema: endpoints.TIME_BY_CATEGORY_SCHEMA_VERSION }, "the response states the range it covered");

      const defaulted = await report(restarted);
      // `to` is now, to the nanosecond; `from` is seven whole days before it.
      ok(Math.abs((new Date(defaulted.to) - new Date(defaulted.from)) / 1000 - 7 * 86_400) < 1, `with no bounds the range is the last seven days: ${defaulted.from} to ${defaulted.to}`);
      ok(Date.now() - new Date(defaulted.to).getTime() < 60_000, "ending now");
      const refused = await report(restarted, { from: to, to: from }, 400);
      same(refused.diagnostics[0].code, "time_by_category_invalid_range", "from after to is refused with 400");

      // Judgment call 4: complete, reopen, complete again, and the Task counts once.
      const grocery = async () => (await report(restarted, range)).categories.find((row) => row.category === "grocery").completed_seconds;
      same(await grocery(), 3_600, "before the undo, grocery counts the observed window and the fixed estimate");
      const reopened = await reopenTask(restarted, estimated, completions[estimated].log_id);
      same({ status: reopened.task_status, stored: (await readTask(restarted, estimated)).status }, { status: "active", stored: "active" }, "the estimated errand is reopened and active");
      same(await grocery(), 3_000, "reopened and left active, it contributes nothing: grocery drops by its 600 seconds");
      const again = await recordAction(restarted, estimated, "complete");
      ok(again.log_id !== completions[estimated].log_id, "completed again, with a new completion id");
      same(await grocery(), 3_600, "and it counts once: 600 seconds, not 1200, although two completion logs now exist");
      const final = await report(restarted, range);
      same(final.total_seconds, 11_100, "the total is back to what it was, not 600 more");
      return "six staged Tasks give the expected rows, the unmeasured entry, the order and the total; the default is seven days; a backwards range is refused; a Task completed, reopened and completed again counts once";
    }
  },
  {
    name: "a realistic week",
    seeded: true,
    // The switch rehearsal. One invented week, the whole daily loop, walked on its own store at each of two
    // planning horizons. The week is rehearsal-week.mjs; the acceptance harness stages the same one.
    //
    // The week lives in a timezone, because it has a night in it. Here that is a fixed-offset zone in which
    // the top of this hour is 21:00, so every walk is the same evening: two hours before Asleep, with more
    // work than fits before it. What does not fit tonight has to wait for the morning.
    async run(first) {
      await first.stop();
      const zone = eveningZone(thisHour);
      const week = rehearsalWeek(thisHour, zone);
      const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      /// A wall-clock time in the week's zone, as the operator would read it.
      const local = (seconds) => {
        const p = localParts(zone, seconds * 1000);
        const day = WEEKDAYS[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()];
        return `${day} ${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
      };
      const HORIZONS = [
        ["one day", 86_400],
        ["one week", 604_800]
      ];
      const fenceKey = week.backlog.find((task) => task.tooLong).key;

      async function rehearse(label, horizonSeconds) {
        const tag = `[${label}]`;
        const say = (what, value) => console.log(`  ${tag} ${what}: ${JSON.stringify(value)}`);
        const dir = join(first.dir, label.replace(" ", "-"));
        mkdirSync(dir, { recursive: true });
        const seed = join(dir, "mock-calendar-events.json");
        const start = (events) => {
          writeFileSync(seed, JSON.stringify(events, null, 2));
          return startOrchestrator(dir, { UBU_CALENDAR_MOCK_EVENTS: seed, UBU_PLANNING_HORIZON_SECONDS: String(horizonSeconds) });
        };
        /// What the calendar would hold after an approve: the operator's own events, and what UbU applied.
        const observing = async (running, applied) => {
          await running.stop();
          return start([...week.recurring, ...applied]);
        };
        let o = await start(week.calendar);
        const horizonEnd = Date.now() + horizonSeconds * 1000;
        const inHorizon = (event) => Date.parse(event.start_at) < horizonEnd;
        const instances = week.recurring.filter(inHorizon);
        const seen = week.calendar.filter(inHorizon);
        ok(seen.length >= 3, `${tag} the horizon holds ${seen.length} of the calendar's ${week.calendar.length} events, ${instances.length} of them instances of the recurring commitment`);

        // ---- the store: colours, the routine, the night, the backlog, the Preference
        for (const [name, value] of week.settings) await putSetting(o, name, value);
        for (const routine of [week.routine, week.asleep]) {
          await call(o.base, "POST", endpoints.OBJECTIVE_CREATE_PATH, routineBody(week, routine, endpoints.OBJECTIVE_SCHEMA_VERSION), 201);
        }
        const ids = {};
        for (const task of week.backlog) {
          ids[task.key] = (await captureTask(o, { title: task.title, duration_estimate: task.duration_estimate, category_tag: task.category, tags: [task.category] })).task_id;
        }
        const keyOf = Object.fromEntries(Object.entries(ids).map(([key, id]) => [id, key]));
        await call(o.base, "POST", endpoints.PREFERENCE_CREATE_PATH, { schema_version: endpoints.PREFERENCE_SCHEMA_VERSION, task_a: ids[week.preference.before], task_b: ids[week.preference.after], order: "a_preferred_to_b" }, 201);

        // ---- 1. capture: every event in the horizon is captured or diagnosed
        // One diagnostic for the whole capture: a single id is named, and of several the first three are named and the rest counted.
        const occupancyOnly = (events) => {
          const ids = events.map((event) => `\`${event.external_id}\``);
          const message = ids.length === 1
            ? `Calendar event ${ids[0]} cannot be owned by UbU, so its time is recorded as an occupied window that UbU will never write back to or export`
            : `${ids.length} Calendar events cannot be owned by UbU, so the time of each is recorded as an occupied window that UbU will never write back to or export: ${ids.slice(0, 3).join(", ")}${ids.length > 3 ? ` and ${ids.length - 3} more` : ""}`;
          return { code: "capture_occupancy_only", message };
        };
        const captured = await capture(o);
        say("capture diagnostics", captured.diagnostics);
        same({ captured: captured.captured, skipped: captured.skipped }, { captured: seen.length, skipped: 0 }, `${tag} every event inside the horizon is captured and none is skipped`);
        same(
          captured.diagnostics,
          [
            { code: "capture_colour_unmapped", message: `Calendar event \`${week.unmapped.external_id}\` has unmapped colour \`${week.unmappedColour}\`; no category assigned; map that colour in Settings to assign a category` },
            occupancyOnly(instances)
          ],
          `${tag} the unmapped colour is diagnosed, and the ${instances.length} unowned instance(s) are reported once, as capture_occupancy_only`
        );
        ok(!JSON.stringify(captured.diagnostics).includes("Invented"), `${tag} no diagnostic carries an event's title`);
        const bySource = {};
        for (const task of await listTasks(o)) {
          const source = (await readTask(o, task.task_id)).payload.provenance?.source;
          if (source?.source_kind === "google_calendar") bySource[source.source_id] = task;
        }
        same(Object.keys(bySource).sort(), seen.map((event) => event.external_id).sort(), `${tag} each of those events is now exactly one Task, keyed by its Google id`);
        same(
          seen.map((event) => [bySource[event.external_id].placement, bySource[event.external_id].category_tag ?? null]),
          seen.map((event) => ["static", week.categoryOfColour[event.color_id] ?? null]),
          `${tag} every one is Static, with the category its colour maps to, and none for the unmapped colour`
        );
        const unowned = instances.map((event) => bySource[event.external_id].task_id);
        const owned = [week.mapped, week.unmapped].map((event) => bySource[event.external_id].task_id);
        const again = await capture(o);
        same({ captured: again.captured, updated: again.updated, unchanged: again.unchanged, skipped: again.skipped }, { captured: 0, updated: 0, unchanged: seen.length, skipped: 0 }, `${tag} a second capture admits nothing new`);

        // ---- 2. generate: every backlog Task is placed or named as unplaced
        const generate = async () => {
          const planned = await call(o.base, "POST", endpoints.PLANNING_GENERATE_PATH, { schema_version: endpoints.PLANNING_SCHEMA_VERSION, request: null });
          if (!planned?.plan) throw new CheckFailure(`planning produced no Plan: ${JSON.stringify(planned?.diagnostics)}`);
          return planned;
        };
        const partition = (planned, backlogKeys) => {
          const placed = planned.plan.steps.map((step) => keyOf[step.task_id]).filter((key) => key !== undefined).sort();
          const unplaced = planned.unplaced_tasks.map((entry) => keyOf[entry.task_id]).filter((key) => key !== undefined).sort();
          same([...placed, ...unplaced].sort(), [...backlogKeys].sort(), `${tag} placed and unplaced together account for the whole backlog, each Task once`);
          return { placed, unplaced };
        };
        const planned = await generate();
        const steps = planned.plan.steps;
        say("plan", { status: planned.status, steps: steps.map((step) => [step.start_at, step.end_at, step.static_anchor ? "static" : "dynamic", step.summary]) });
        // The same placements as the operator would read them: local to the week's zone, with the nights marked.
        console.log(`  ${tag} placements, local to ${zone}:`);
        for (const step of steps) {
          const kind = step.summary === week.asleep.title ? "ASLEEP " : step.static_anchor ? "static " : "dynamic";
          console.log(`  ${tag}   ${local(step.start)} to ${local(step.end)}  ${kind}  ${step.summary}`);
        }
        say("unplaced", planned.unplaced_tasks.map(({ task_id, summary, reason, explanation, safe_alternatives }) => ({ task_id, summary, reason, explanation, alternatives: safe_alternatives.map((alternative) => alternative.action) })));
        say("planning diagnostics", planned.diagnostics);
        say("risk report", { level: planned.risk_report?.level, findings: (planned.risk_report?.findings ?? []).map(({ category, severity, detail }) => ({ category, severity, detail })) });
        const { placed, unplaced } = partition(planned, week.backlog.map((task) => task.key));
        same(unplaced, [fenceKey], `${tag} the one Task too long for any free interval is the one left out`);
        same(planned.status, "partial", `${tag} and the Plan says it is partial`);
        const fence = planned.unplaced_tasks.find((entry) => entry.task_id === ids[fenceKey]);
        ok(fence.reason.length > 0 && fence.explanation.includes(ids[fenceKey]) && fence.safe_alternatives.length > 0, `${tag} it is named, with a reason, an explanation and alternatives: ${fence.reason}`);
        const start_of = (key) => steps.find((step) => step.task_id === ids[key]).start;
        ok(start_of(week.preference.before) <= start_of(week.preference.after), `${tag} the Preference holds: ${week.preference.before} is placed no later than ${week.preference.after}`);
        const occurrences = steps.filter((step) => step.summary === week.routine.title);
        const clock = (seconds) => local(seconds).slice(4);
        ok(occurrences.length >= 1 && occurrences.every((step) => step.static_anchor && `${clock(step.start)}:00` === week.routine.nominalStart), `${tag} the routine has ${occurrences.length} occurrence(s) in the Plan, each Static at ${week.routine.nominalStart} local`);

        // ---- the night: Asleep materialises once per horizon day, and no work is placed inside it
        const nights = steps.filter((step) => step.summary === week.asleep.title);
        same(nights.length, horizonSeconds / 86_400, `${tag} Asleep materialises once for each day of the horizon`);
        same(
          nights.map((night) => [night.static_anchor, night.occupies_capacity, clock(night.start), night.end - night.start, night.category_tag ?? null]),
          nights.map(() => [true, true, "23:00", week.asleep.seconds, null]),
          `${tag} each is Static, occupies capacity, begins at 23:00 local, lasts eight hours and has no category`
        );
        ok(nights.every((night) => local(night.start).slice(0, 3) !== local(night.end).slice(0, 3) && clock(night.end) === "07:00"), `${tag} each spans midnight: ${nights.map((night) => `${local(night.start)} to ${local(night.end)}`).join(", ")}`);
        const working = steps.filter((step) => !step.static_anchor);
        same(
          working.flatMap((step) => nights.filter((night) => step.start < night.end && step.end > night.start).map(() => `${step.summary} at ${local(step.start)}`)),
          [],
          `${tag} no Dynamic placement falls inside any Asleep window`
        );
        // Not vacuous: the backlog is longer than the evening, so some of it has to cross the night.
        const tonight = working.filter((step) => step.end <= nights[0].start);
        const morning = working.filter((step) => step.start >= nights[0].end);
        ok(morning.length >= 1 && tonight.length + morning.length === working.length, `${tag} ${tonight.length} placement(s) fit before the night and ${morning.length} wait for the morning; the first of those begins ${local(Math.min(...morning.map((step) => step.start)))}`);
        ok(morning.every((step) => step.start >= nights[0].end), `${tag} and none of them begins before Asleep ends at ${local(nights[0].end)}`);

        // ---- 3. no overlap: no planned Dynamic step runs over any Static window
        const anchors = steps.filter((step) => step.static_anchor && step.occupies_capacity);
        const dynamic = steps.filter((step) => !step.static_anchor);
        same(anchors.filter((step) => unowned.includes(step.task_id)).length, instances.length, `${tag} every unowned window is in the Plan as a Static anchor that occupies capacity`);
        const collisions = dynamic.flatMap((step) => anchors.filter((anchor) => step.start < anchor.end && step.end > anchor.start).map((anchor) => `${step.summary} over ${anchor.summary}`));
        same(collisions, [], `${tag} none of the ${dynamic.length} Dynamic steps overlaps any of the ${anchors.length} Static windows, the unowned ones included`);
        same(dynamic.map((step) => keyOf[step.task_id]).sort(), placed, `${tag} the Dynamic steps are exactly the placed backlog`);

        // ---- 4. preview: the desired set holds the owned Tasks and no unowned one
        const proposed = await preview(o);
        const desired = proposed.events.map((event) => event.task_id);
        ok(owned.every((id) => desired.includes(id)), `${tag} both events UbU can own are in the desired set`);
        ok(placed.every((key) => desired.includes(ids[key])) && occurrences.every((step) => desired.includes(step.task_id)), `${tag} so is every placed Task and every routine occurrence`);
        // Judgment call 8: the night is exported, as a Busy block with no colour. On record, not a surprise.
        const exported = nights.map((night) => proposed.events.find((event) => event.task_id === night.task_id));
        same(
          exported.map((event) => [event?.summary, event?.color_id, event?.transparent]),
          nights.map(() => [week.asleep.title, null, false]),
          `${tag} each Asleep occurrence is a desired event with no colour and transparent false: a Busy block`
        );
        same(
          nights.map((night) => proposed.operations.filter((operation) => operation.kind === "create" && operation.event.task_id === night.task_id).length),
          nights.map(() => 1),
          `${tag} and the preview creates one event for each of them`
        );
        same(desired.filter((id) => unowned.includes(id)), [], `${tag} no unowned Task is in the desired set`);
        const mentionsUnowned = (value) => instances.some((event) => JSON.stringify(value).includes(event.external_id)) || unowned.some((id) => JSON.stringify(value).includes(id.slice(5)));
        ok(!mentionsUnowned(proposed.operations) && !mentionsUnowned(proposed.events), `${tag} no operation and no desired event names an unowned event or its Task`);
        same(proposed.operations.map((operation) => operation.kind), Array(placed.length + occurrences.length + nights.length).fill("create"), `${tag} the operations are creates for UbU's own work, and nothing against what it captured`);
        say("preview diagnostics", proposed.diagnostics);
        same(
          proposed.diagnostics.map((diagnostic) => diagnostic.code),
          unowned.map(() => "calendar_event_id_unmappable"),
          `${tag} the preview reports each unowned step as calendar_event_id_unmappable, and nothing else`
        );

        // ---- 5. approve in Mock: applied, with no write for an unowned Task
        const approved = await approve(o, proposed.preview_id);
        same(approved.status, "applied", `${tag} the Mock approve applies`);
        ok(approved.operation_results.every((result) => result.status === "applied"), `${tag} all ${approved.operation_results.length} operations were applied`);
        ok(!mentionsUnowned(approved.operation_results) && !mentionsUnowned(approved.applied_events), `${tag} no operation result and no applied event names an unowned event or its Task`);
        same(approved.applied_events.length, owned.length + placed.length + occurrences.length + nights.length, `${tag} the applied record holds the two owned captures and what was created, and no unowned window`);

        // ---- 6. reconcile: the unowned events are foreign and nothing else drifts
        o = await observing(o, approved.applied_events);
        const foreignOnly = instances.map((event) => ["foreign", event.external_id]);
        const reconciled = await reconcile(o);
        say("reconcile conflicts", reconciled.conflicts);
        same(reconciled.conflicts.map((conflict) => [conflict.conflict_type, conflict.external_id]), foreignOnly, `${tag} the only conflicts are the unowned instances, and each is foreign`);
        same(reconciled.status, "observed", `${tag} reconcile reports an observation, not drift`);
        same([...new Set(reconciled.diagnostics.map((diagnostic) => diagnostic.code))], ["capture_event_not_ownable"], `${tag} and still says why UbU cannot own them`);

        // ---- 7. next action, then complete
        const nextQuery = new URLSearchParams({ schema_version: endpoints.NEXT_ACTION_SCHEMA_VERSION });
        const recommendation = (await call(o.base, "GET", `${endpoints.NEXT_ACTION_PATH}?${nextQuery}`)).recommendation;
        ok(recommendation !== null && placed.includes(keyOf[recommendation.task_id]), `${tag} Next Task recommends a planned backlog Task: ${recommendation?.title}`);
        const done = week.backlog.find((task) => task.key === keyOf[recommendation.task_id]);
        const completion = await recordAction(o, recommendation.task_id, "complete");
        same({ applied: completion.transition_applied, status: completion.task_status, stored: (await readTask(o, recommendation.task_id)).status }, { applied: true, status: "completed", stored: "completed" }, `${tag} completing it transitions it to completed`);

        // ---- 8. report: the Static windows plus the completion
        const report = () => call(o.base, "GET", `${endpoints.TIME_BY_CATEGORY_PATH}?${new URLSearchParams({ schema_version: endpoints.TIME_BY_CATEGORY_SCHEMA_VERSION, from: week.at(0), to: week.at(168) })}`);
        const expected = {};
        const add = (category, staticSeconds, completedSeconds) => {
          const row = (expected[category] ??= { category, seconds: 0, static_seconds: 0, completed_seconds: 0, task_count: 0 });
          row.static_seconds += staticSeconds;
          row.completed_seconds += completedSeconds;
          row.seconds += staticSeconds + completedSeconds;
          row.task_count += 1;
        };
        const span = (event) => (Date.parse(event.end_at) - Date.parse(event.start_at)) / 1000;
        for (const event of seen) add(week.categoryOfColour[event.color_id] ?? "Uncategorized", span(event), 0);
        for (const _ of occurrences) add(week.routine.category, week.routine.seconds, 0);
        // The night has no category, so every hour of it is reported as Uncategorized.
        for (const _ of nights) add("Uncategorized", week.asleep.seconds, 0);
        add(done.category, 0, done.seconds);
        const rows = Object.values(expected).sort((a, b) => b.seconds - a.seconds || (a.category < b.category ? -1 : 1));
        const body = await report();
        say("time-by-category response", body);
        same(body.categories, rows, `${tag} the report is the Static windows plus the one completion; the unmapped-colour Task and the nights are in Uncategorized`);
        same({ total: body.total_seconds, unmeasured: body.unmeasured }, { total: rows.reduce((sum, row) => sum + row.seconds, 0), unmeasured: [] }, `${tag} the total is the sum of the rows and nothing is unmeasured`);
        const uncategorized = span(week.unmapped) + nights.length * week.asleep.seconds;
        same(body.categories.find((row) => row.category === "Uncategorized"), { category: "Uncategorized", seconds: uncategorized, static_seconds: uncategorized, completed_seconds: 0, task_count: 1 + nights.length }, `${tag} Uncategorized is the unmapped-colour Task's hour and eight hours for each night`);

        // ---- 9. repeat: a second full pass over the same store
        const before = (await listTasks(o)).length;
        const recaptured = await capture(o);
        same({ captured: recaptured.captured, skipped: recaptured.skipped }, { captured: 0, skipped: 0 }, `${tag} [repeat] capture admits nothing`);
        same(recaptured.diagnostics, [occupancyOnly(instances)], `${tag} [repeat] and still says, once, which events it does not own`);
        same((await listTasks(o)).length, before, `${tag} [repeat] no Task was created`);
        const replanned = await generate();
        const second = partition(replanned, week.backlog.map((task) => task.key).filter((key) => key !== done.key));
        same(second, { placed: placed.filter((key) => key !== done.key), unplaced }, `${tag} [repeat] the same Tasks are placed and the same one is left out, less the completed one`);
        const reproposed = await preview(o);
        say("[repeat] preview operations", reproposed.operations.map((operation) => [operation.kind, operation.event?.summary ?? operation.summary]));
        ok(!mentionsUnowned(reproposed.operations) && !mentionsUnowned(reproposed.events), `${tag} [repeat] the preview still names no unowned event`);
        ok(reproposed.operations.every((operation) => operation.kind !== "create"), `${tag} [repeat] and creates nothing: every event it needs already exists`);
        const reapproved = await approve(o, reproposed.preview_id);
        same(reapproved.status, "applied", `${tag} [repeat] the second approve applies`);
        ok(!mentionsUnowned(reapproved.operation_results) && !mentionsUnowned(reapproved.applied_events), `${tag} [repeat] with no write for an unowned Task`);
        same((await preview(o)).operations, [], `${tag} [repeat] a preview straight after it proposes nothing`);
        o = await observing(o, reapproved.applied_events);
        same((await reconcile(o)).conflicts.map((conflict) => [conflict.conflict_type, conflict.external_id]), foreignOnly, `${tag} [repeat] reconcile is unchanged: the unowned instances, foreign, and no drift`);
        same((await report()).categories, rows, `${tag} [repeat] the report is unchanged: nothing was counted twice`);
        await o.stop();
        return { instances: instances.length, captured: seen.length, occurrences: occurrences.length, nights: nights.length, placed, unplaced, reason: fence.reason, planningDiagnostics: planned.diagnostics.map((diagnostic) => diagnostic.code), total: body.total_seconds };
      }

      const results = {};
      for (const [label, seconds] of HORIZONS) results[label] = await rehearse(label, seconds);
      const [day, sevenDays] = [results["one day"], results["one week"]];
      console.log(`  horizons compared: ${JSON.stringify(results)}`);
      // Judgment call 9: where the two horizons legitimately differ, the difference is what is asserted.
      same({ placed: day.placed, unplaced: day.unplaced }, { placed: sevenDays.placed, unplaced: sevenDays.unplaced }, "at both horizons the same five Tasks are placed and the same one is left out");
      same([day.instances, sevenDays.instances], [1, week.recurring.length], "one day sees one instance of the recurring commitment; one week sees all seven");
      ok(sevenDays.occurrences > day.occurrences, `one week holds more routine occurrences than one day: ${sevenDays.occurrences} against ${day.occurrences}`);
      same([day.nights, sevenDays.nights], [1, 7], "one day holds one night and one week holds seven");
      ok(sevenDays.total > day.total, `so one week accounts for more Static time: ${sevenDays.total} seconds against ${day.total}`);
      ok(day.reason !== sevenDays.reason, `the too-long Task is left out for a different stated reason: ${day.reason} at one day, ${sevenDays.reason} at one week`);
      return `the daily loop holds over an invented week at one day and at one week: ${day.captured} and ${sevenDays.captured} events captured, ${day.placed.length} of ${week.backlog.length} backlog Tasks placed at both, the unowned windows never overlapped and never written`;
    }
  }
];

// ----------------------------------------------------- the live flags (§E)

// Off by default. Unset, each is reported as skipped, never as passed, and
// nothing in this file then reaches past 127.0.0.1 on a port this run opened.
const liveScenarios = [
  {
    name: "live Google Calendar",
    flag: "UBU_E2E_GOOGLE",
    needs: ["UBU_GOOGLE_CREDENTIALS_PATH", "UBU_GOOGLE_TOKEN_CACHE_PATH"],
    passthrough: ["UBU_GOOGLE_CREDENTIALS_PATH", "UBU_GOOGLE_TOKEN_CACHE_PATH", "UBU_GOOGLE_CALENDAR_ID"],
    // Read-only: one observation of the calendar. Nothing is approved, captured or repaired.
    async run(o) {
      await call(o.base, "POST", endpoints.GOOGLE_CALENDAR_SESSION_PATH, { schema_version: endpoints.DESKTOP_SESSION_SCHEMA_VERSION, enabled: true });
      const observed = await call(o.base, "POST", endpoints.CALENDAR_RECONCILE_PATH, {
        schema_version: endpoints.CALENDAR_RECONCILIATION_SCHEMA_VERSION,
        export_mode: "live"
      });
      ok(typeof observed.status === "string", `a live reconcile observed the calendar: ${observed.status}, ${observed.conflicts.length} conflict(s)`);
      return "one read-only live reconcile answered";
    }
  },
  {
    name: "live ollama",
    flag: "UBU_E2E_OLLAMA",
    needs: ["UBU_E2E_OLLAMA_MODEL"],
    passthrough: [],
    async run(o) {
      const endpoint = process.env.UBU_E2E_OLLAMA_ENDPOINT ?? "http://127.0.0.1:11434";
      await captureTask(o, { title: "Synthetic oat milk", duration_estimate: fixed(10) });
      await putSetting(o, "advisory.model", process.env.UBU_E2E_OLLAMA_MODEL);
      await putSetting(o, "advisory.endpoint", endpoint);
      await putSetting(o, "advisory.timeout_ms", Number(process.env.UBU_E2E_OLLAMA_TIMEOUT_MS ?? 600000));
      const result = await runAdvisory(o);
      same(result.diagnostics, [], "the live run reports no diagnostic");
      same(result.status, "ok", "and its status is ok");
      return `a live run against ${endpoint} answered ok, ${result.candidates_enqueued} candidate(s)`;
    }
  }
];

// ---------------------------------------------------------------- the walk

function describeFailure(error) {
  const lines = [error instanceof CheckFailure ? error.message : `unexpected error: ${error?.stack ?? error}`];
  if (lastRequest) {
    lines.push(`  last request: ${lastRequest.method} ${lastRequest.url}`);
    if (lastRequest.sent !== undefined) {
      lines.push(`  sent:         ${JSON.stringify(lastRequest.sent)}`);
    }
    lines.push(`  status:       ${lastRequest.status}`);
    lines.push(`  body:         ${lastRequest.body}`);
  }
  return lines.join("\n");
}

let interrupted = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    interrupted = true;
    stopEverything().finally(() => process.exit(130));
  });
}

let passed = 0;
let skipped = 0;
let failed = null;
const total = scenarios.length;

for (const [index, scenario] of scenarios.entries()) {
  const number = index + 1;
  const label = `${String(number).padStart(2)} ${scenario.name}`;
  if (only && !only.has(number)) {
    console.log(`NOT RUN ${label}: excluded by UBU_CHECK_ONLY`);
    continue;
  }
  console.log(`scenario ${number} of ${total}: ${scenario.name}${scenario.seeded ? " (seeded mock calendar)" : ""}`);
  lastRequest = null;
  try {
    const orchestrator = await startOrchestrator(join(workDir, `scenario-${String(number).padStart(2, "0")}`));
    const checked = await scenario.run(orchestrator);
    console.log(`PASS ${label}: ${checked}`);
    passed += 1;
  } catch (error) {
    if (!interrupted) {
      console.log(`FAIL ${label}: ${describeFailure(error)}`);
      failed = { number, scenario };
    }
  } finally {
    await stopEverything();
  }
  if (failed || interrupted) {
    break;
  }
}

if (!failed && !interrupted && !only) {
  for (const live of liveScenarios) {
    if (process.env[live.flag] !== "1") {
      console.log(`SKIP ${live.name}: ${live.flag} is not set to 1; this scenario did not run and proves nothing`);
      skipped += 1;
      continue;
    }
    console.log(`live scenario: ${live.name} (${live.flag}=1)`);
    lastRequest = null;
    try {
      const missing = live.needs.filter((name) => !process.env[name]);
      if (missing.length > 0) {
        throw new CheckFailure(`${live.flag}=1 also needs ${missing.join(" and ")}`);
      }
      const env = Object.fromEntries(live.passthrough.filter((name) => process.env[name]).map((name) => [name, process.env[name]]));
      const orchestrator = await startOrchestrator(join(workDir, `live-${live.flag.toLowerCase()}`), env);
      if (live.flag === "UBU_E2E_OLLAMA") {
        ownPorts.add(Number(new URL(process.env.UBU_E2E_OLLAMA_ENDPOINT ?? "http://127.0.0.1:11434").port));
      }
      console.log(`PASS live ${live.name}: ${await live.run(orchestrator)}`);
    } catch (error) {
      console.log(`FAIL live ${live.name}: ${describeFailure(error)}`);
      failed = { number: live.name, scenario: live };
    } finally {
      await stopEverything();
    }
    if (failed) {
      break;
    }
  }
}

if (interrupted) {
  console.log(`INTERRUPTED: ${passed} of ${total} scenarios had passed; the walk did not finish and is not a pass`);
  // The signal handler stops everything and exits 130.
  await new Promise(() => {});
}

if (failed) {
  const log = join(workDir, typeof failed.number === "number" ? `scenario-${String(failed.number).padStart(2, "0")}` : `live-${failed.scenario.flag.toLowerCase()}`, "orchestrator.log");
  try {
    const tail = readFileSync(log, "utf8").split("\n").slice(-20).join("\n");
    console.log(`--- orchestrator log (last 20 lines) ---\n${tail}\n--- end of orchestrator log ---`);
  } catch {
    // The orchestrator never started; the failure above says why.
  }
}
const partial = only ? `, PARTIAL WALK: only ${[...only].join(",")} selected` : "";
console.log(`RESULT: ${passed} of ${total} scenarios passed, ${failed ? 1 : 0} failed, ${skipped} skipped, ${requestCount} requests, all to 127.0.0.1${partial}`);
process.exitCode = failed ? 1 : 0;
