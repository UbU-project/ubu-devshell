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
import { requestJson, TransportError } from "./loopback-json.mjs";
import { appendFileSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { eveningZone, localParts, rehearsalWeek, routineBody } from "./rehearsal-week.mjs";
import { rankingStatements } from "./synthetic-ranking.mjs";

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
// These pure functions are also used by the rendered UI. React rendering is
// covered by ubu-ui's tests; this runner checks the HTTP value and its wording.
const { matchingPlacementsSentence } = await import(new URL("../presentation/calendar-preview.ts", pathToFileURL(endpointsPath)).href);
const { numericComparisonWords } = await import(new URL("../presentation/precondition.ts", pathToFileURL(endpointsPath)).href);

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

/// Every request of the run. `expect` is the status the scenario requires. `plain` is for the one
/// kind of answer that is not JSON: the framework's own refusal of a body that is not the route's shape.
async function call(base, method, path, body, expect = 200, plain = false) {
  const url = `${base}${path}`;
  let result;
  try { result = await requestJson(base, method, path, body, { allowedPorts: ownPorts, plain }); }
  catch (error) {
    if (error instanceof TransportError) throw new CheckFailure(`${method} ${url}: ${error.code}`);
    throw error;
  }
  const { status, data, text } = result;
  requestCount += 1;
  lastRequest = { method, url, sent: body, status, body: text };
  if (verbose) console.log(`  ${status} ${method} ${url}`);
  const accepted = Array.isArray(expect) ? expect : [expect];
  if (!accepted.includes(status)) throw new CheckFailure(`${method} ${url} returned ${status}, expected ${accepted.join(" or ")}`);
  return data;
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
      } else if (stub.mode === "shared_selection") {
        const context = JSON.parse(body.prompt);
        const isVocabulary = Object.hasOwn(body.format.properties.proposals.items.properties, "target");
        const proposals = !stub.badSelectionProposal ? [] : isVocabulary
          ? [{ id: context.tasks[0].id, target: "facts.affect.synthetic" }]
          : [{ id: context.tasks[0].id, precondition: { target: context.targets[0], predicate: "equals" } }];
        answer(200, { model: body.model, done: true, response: JSON.stringify({ proposals }) });
      } else if (stub.mode === "vocabulary") {
        const context = JSON.parse(body.prompt);
        const names = stub.vocabularyNames ?? ["facts.synthetic.teapot_ready", "facts.affect.energy", "numeric_values.synthetic.teapot_charge"];
        const proposals = names.map((target) => ({ id: context.tasks[0].id, target }));
        answer(200, { model: body.model, done: true, response: JSON.stringify({ proposals }) });
      } else if (stub.mode === "precondition_review") {
        const context = JSON.parse(body.prompt);
        const reviews = context.tasks.map((task) => ({ id: task.id, verdict: "remove", reason: stub.reviewReason ?? "This synthetic inspection needs no charge, so the guard is unrelated." }));
        answer(200, { model: body.model, done: true, response: JSON.stringify({ reviews }) });
      } else if (stub.mode === "precondition_mixed") {
        const context = JSON.parse(body.prompt);
        const proposals = context.tasks.map((task) => ({ id: task.id, precondition: {
          target: stub.preconditionFactTarget, predicate: "equals",
          ...(task.id === stub.refusedTaskId ? {} : { expected: true })
        } }));
        answer(200, { model: body.model, done: true, response: JSON.stringify({ proposals }) });
      } else if (stub.mode === "precondition") {
        const context = JSON.parse(body.prompt);
        const proposals = context.tasks.filter((task) => !stub.preconditionTaskIds || stub.preconditionTaskIds.includes(task.id)).map((task) => ({ id: task.id, precondition: { target: "numeric_values.synthetic.orbital_teapot_charge", predicate: "at_least", expected: stub.preconditionMinimum ?? 25 } }));
        answer(200, { model: body.model, done: true, response: JSON.stringify({ proposals }) });
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
      await generatePlan(o);
      const retained = await preview(o);
      same(retained.matching_placements, 0, "the remaining match is Static; neither it nor completed history adds to the Dynamic count");
      same(retained.operations, [], "retained history produces no operation");
      ok(retained.events.some((event) => event.task_id === day.flexible), "the completed calendar event is still retained");
      return "a colour completes only the Dynamic Task, and its retained event is excluded from matching_placements";
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
      const o = await restartObserving(first, [...day.applied, { ...observedEvent(RECURRING_ID, "Synthetic recurring instance", 6), description: "Synthetic recurring orbital notes." }]);
      ok(true, "the orchestrator started on the seed, so the event parsed");
      const notOwnable = `Calendar event \`${RECURRING_ID}\` cannot be captured: its id cannot be a UbU Task handle, so UbU cannot own it`;
      const reconciliation = await reconcile(o);
      same(reconciliation.conflicts.map((conflict) => [conflict.conflict_type, conflict.external_id]), [["foreign", RECURRING_ID]], "reconcile classifies it foreign");
      same(reconciliation.diagnostics, [{ code: "capture_event_not_ownable", message: notOwnable }], "reconcile says why it cannot be owned");
      const captured = await capture(o);
      same(
        captured.diagnostics,
        [
          { code: "capture_colour_absent", message: `Calendar event \`${RECURRING_ID}\` has no colour, but UbU cannot own it and so cannot move it: it stays a commitment at its own time, with no category` },
          { code: "capture_occupancy_only", message: `Calendar event \`${RECURRING_ID}\` cannot be owned by UbU, so its time is recorded as an occupied window that UbU will never write back to or export` }
        ],
        "capture records it as occupied time with capture_occupancy_only, naming the id and never the title; uncoloured, it still stays where it is"
      );
      same({ captured: captured.captured, skipped: captured.skipped, unchanged: captured.unchanged }, { captured: 1, skipped: 0, unchanged: 2 }, "capture captured one and skipped nothing");
      const occupancy = (await listTasks(o)).find((task) => task.title === "Synthetic recurring instance");
      same(occupancy?.placement, "static", "a Static Task now holds its window");
      const stored = (await readTask(o, occupancy.task_id)).payload;
      same(stored.provenance.source, { source_kind: "google_calendar", source_id: RECURRING_ID }, "the Google id is its provenance source, the dedupe key");
      ok(!occupancy.task_id.includes(RECURRING_ID.split("_")[0]), `its handle is minted, not derived from the Google id: ${occupancy.task_id}`);
      const editedNotes = "Synthetic operator-authored orbital notes.";
      const beforeEdit = await readTask(o, occupancy.task_id);
      await call(o.base, "PATCH", fill(endpoints.TASK_PATH, { task_id: occupancy.task_id }), {
        schema_version: endpoints.TASK_CAPTURE_SCHEMA_VERSION, expected_version: beforeEdit.version, description: editedNotes
      });
      const again = await capture(o);
      same({ captured: again.captured, updated: again.updated, unchanged: again.unchanged }, { captured: 0, updated: 0, unchanged: 3 }, "a second capture admits nothing");
      ok((await readTask(o, occupancy.task_id)).payload.description === editedNotes, "recapture preserves edited Task notes without echoing them");
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
          return start([...week.recurring, week.leftover, ...applied]);
        };
        let o = await start(week.seed);
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
        // P1B-57: the one event on the calendar that UbU wrote itself, for a Task this store does not have.
        const staleLine = { code: "capture_stale_export", message: `Calendar event \`${week.leftover.id}\` was created by UbU for a Task this store does not have, so it is left alone and becomes no Task` };
        same({ captured: captured.captured, skipped: captured.skipped }, { captured: seen.length, skipped: 1 }, `${tag} every event of the operator's inside the horizon is captured, and the one UbU stamped in an earlier run is skipped`);
        // One line for each event whose colour says something, in id order, and then the occupancy line once.
        // No colour is not a deficiency: the line says the event was taken as work for UbU to schedule.
        const parked = week.parked.filter(inHorizon);
        same(parked.length, week.parked.length, `${tag} both uncoloured events are inside the horizon`);
        const colourLine = (event) =>
          event.color_id === null
            ? { code: "capture_colour_absent", message: `Calendar event \`${event.external_id}\` has no colour, so it is taken as work for UbU to schedule: a Dynamic Task of the event's length, at no fixed time` }
            : { code: "capture_colour_unmapped", message: `Calendar event \`${event.external_id}\` has unmapped colour \`${week.unmappedColour}\`; no category assigned; map that colour in Settings to assign a category` };
        same(
          captured.diagnostics,
          [...[week.unmapped, ...parked].sort((a, b) => (a.external_id < b.external_id ? -1 : 1)).map(colourLine), staleLine, occupancyOnly(instances)],
          `${tag} the unmapped colour is diagnosed, each uncoloured event is said to be work for UbU to schedule, UbU's own leftover is named once as capture_stale_export, and the ${instances.length} unowned instance(s) are reported once, as capture_occupancy_only`
        );
        ok(!JSON.stringify(captured.diagnostics).includes("Invented"), `${tag} no diagnostic carries an event's title`);
        const bySource = {};
        const payloadOf = {};
        for (const task of await listTasks(o)) {
          const payload = (await readTask(o, task.task_id)).payload;
          const source = payload.provenance?.source;
          if (source?.source_kind === "google_calendar") {
            bySource[source.source_id] = task;
            payloadOf[source.source_id] = payload;
          }
        }
        same(Object.keys(bySource).sort(), seen.map((event) => event.external_id).sort(), `${tag} each of those events is now exactly one Task, keyed by its Google id`);
        ok(!(await listTasks(o)).some((task) => task.title === week.leftover.summary) && bySource[week.leftover.id] === undefined, `${tag} the leftover became no Task`);
        // A colour decides the placement: coloured is Static, with the colour's category; uncoloured is Dynamic, with none.
        same(
          seen.map((event) => [bySource[event.external_id].placement, bySource[event.external_id].category_tag ?? null]),
          seen.map((event) => (event.color_id === null ? ["planned", null] : ["static", week.categoryOfColour[event.color_id] ?? null])),
          `${tag} every coloured event is Static, with the category its colour maps to and none for the unmapped colour; every uncoloured one is Dynamic, with none`
        );
        same(
          parked.map((event) => [payloadOf[event.external_id].duration_estimate, payloadOf[event.external_id].static_window ?? null, payloadOf[event.external_id].occupies_capacity]),
          parked.map((event) => [{ type: "fixed", seconds: event.seconds }, null, true]),
          `${tag} each uncoloured event keeps its length as a fixed duration, and has no static_window`
        );
        const unowned = instances.map((event) => bySource[event.external_id].task_id);
        const owned = [week.mapped, week.unmapped].map((event) => bySource[event.external_id].task_id);
        // The Dynamic work that came from the calendar, beside the backlog: Task id to its key, and to its event.
        const parkedKey = Object.fromEntries(parked.map((event) => [bySource[event.external_id].task_id, event.key]));
        const originOf = Object.fromEntries(parked.map((event) => [bySource[event.external_id].task_id, event.external_id]));
        const again = await capture(o);
        same({ captured: again.captured, updated: again.updated, unchanged: again.unchanged, skipped: again.skipped }, { captured: 0, updated: 0, unchanged: seen.length, skipped: 1 }, `${tag} a second capture admits nothing new, and skips the leftover again`);

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
        const startedAt = performance.now();
        const planned = await generate();
        const generateMs = Math.round(performance.now() - startedAt);
        say("POST /planning/generate took", `${generateMs} ms, for a Plan of ${planned.plan.steps.length} placements`);
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
        // ---- P1B-56: the risk report says what it means
        // This store has no Snapshot, so its affect observation is a stand-in. Nothing that reads the
        // stand-in's margin is reported, and nothing is projected from it.
        const riskCategories = (planned.risk_report?.findings ?? []).map((finding) => finding.category);
        same(riskCategories.filter((category) => ["affect_margin", "post_plan_depletion", "destructive_pressure"].includes(category)), [], `${tag} the risk report names no affect finding: nothing was recorded, so nothing is reported as at its limit`);
        ok(riskCategories.includes("unplaced_work"), `${tag} it names the work that did not fit`);
        same(
          { state: planned.human_complete_plan_quality.post_plan_state_delta, first: planned.human_complete_plan_quality.revision_suggestions[0].split(":")[0] },
          { state: "neutral", first: "Record how you are feeling" },
          `${tag} the Plan-quality report projects nothing from the stand-in, and says first that the figures are one`
        );
        // The coverage figure is about the next hour. Every boundary it names starts inside it, and
        // uncovered mass has a boundary there to be attributed to. Before P1B-56 it was about the week.
        const coverage = planned.selected_candidate?.coverage ?? null;
        const scopeEnd = Date.now() + 60_000 + 3_600_000;
        say("coverage", coverage && { scope: coverage.scope, estimate: coverage.estimate, below_threshold: coverage.below_threshold, boundaries: coverage.boundaries.map((boundary) => [boundary.summary, boundary.start_at, boundary.uncovered_mass]) });
        ok(coverage === null || coverage.boundaries.every((boundary) => Date.parse(boundary.start_at) <= scopeEnd), `${tag} every boundary of the coverage figure starts inside the next 60 minutes`);
        ok(coverage === null || !coverage.below_threshold || coverage.boundaries.length > 0, `${tag} and it reports no uncovered mass without a commitment in that hour to attribute it to`);
        const high = (planned.risk_report?.findings ?? []).filter((finding) => finding.severity === "high").map((finding) => finding.category);
        ok(high.every((category) => category === "low_coverage") && (high.length === 0 || coverage.boundaries.length > 0), `${tag} the risk level is ${planned.risk_report.level}: not high, unless a commitment inside the next hour is at stake`);
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
          nights.map(() => [true, true, "23:00", week.asleep.seconds, week.asleep.category]),
          `${tag} each is Static, occupies capacity, begins at 23:00 local, lasts eight hours and is in the sleep category`
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
        same(dynamic.map((step) => keyOf[step.task_id] ?? parkedKey[step.task_id]).sort(), [...placed, ...parked.map((event) => event.key)].sort(), `${tag} the Dynamic steps are exactly the placed backlog and the two uncoloured events`);
        // The two were parked at overlapping times. They are Dynamic, so nothing collides, and the planner chose their times.
        same(planned.diagnostics.filter((diagnostic) => diagnostic.code === "static_task_collision"), [], `${tag} two uncoloured events at overlapping times produce no static_task_collision`);
        const stepOfEvent = (event) => steps.find((step) => step.task_id === bySource[event.external_id].task_id);
        say("where the uncoloured events were placed", parked.map((event) => ({ event: event.summary, parked_at: event.start_at, placed_at: stepOfEvent(event).start_at, until: stepOfEvent(event).end_at })));
        ok(parked.every((event) => stepOfEvent(event).start_at !== event.start_at), `${tag} each is placed at a time the planner chose, not the time it was parked at`);
        same(parked.map((event) => stepOfEvent(event).end - stepOfEvent(event).start), parked.map((event) => event.seconds), `${tag} and each keeps its own length`);

        // ---- 4. preview: the desired set holds the owned Tasks and no unowned one
        const proposed = await preview(o);
        const desired = proposed.events.map((event) => event.task_id);
        ok(owned.every((id) => desired.includes(id)), `${tag} both events UbU can own are in the desired set`);
        ok(placed.every((key) => desired.includes(ids[key])) && occurrences.every((step) => desired.includes(step.task_id)), `${tag} so is every placed Task and every routine occurrence`);
        // The night is exported, as a Busy block, in Graphite. No Setting says so: `sleep` holds colour 8 in the default palette.
        const nightEvents = (previewed) => nights.map((night) => previewed.events.find((event) => event.task_id === night.task_id));
        same(
          nightEvents(proposed).map((event) => [event?.summary, event?.color_id, event?.transparent]),
          nights.map(() => [week.asleep.title, week.sleepColour.colour, false]),
          `${tag} with ${week.sleepColour.setting} unset, each Asleep occurrence is a desired event in colour ${week.sleepColour.colour}, the default for sleep, and transparent false: a Busy block`
        );
        // P1B-53: the preview says what the placement is, and does not leave it to the colour.
        const placementOf = (taskId) => proposed.operations.find((operation) => operation.event?.task_id === taskId)?.static_anchor;
        same(nights.map((night) => placementOf(night.task_id)), nights.map(() => true), `${tag} each of them is created as Static, which the preview says and no colour implies`);
        same(placed.map((key) => placementOf(ids[key])), placed.map(() => false), `${tag} and every placed backlog Task is created as Dynamic`);
        same(
          nights.map((night) => proposed.operations.filter((operation) => operation.kind === "create" && operation.event.task_id === night.task_id).length),
          nights.map(() => 1),
          `${tag} and the preview creates one event for each of them`
        );
        same(desired.filter((id) => unowned.includes(id)), [], `${tag} no unowned Task is in the desired set`);
        const mentionsUnowned = (value) => instances.some((event) => JSON.stringify(value).includes(event.external_id)) || unowned.some((id) => JSON.stringify(value).includes(id.slice(5)));
        ok(!mentionsUnowned(proposed.operations) && !mentionsUnowned(proposed.events), `${tag} no operation and no desired event names an unowned event or its Task`);
        const creates = proposed.operations.filter((operation) => operation.kind === "create");
        const moves = proposed.operations.filter((operation) => operation.kind === "update");
        same(creates.length, placed.length + occurrences.length + nights.length, `${tag} one create for each piece of UbU's own work, and nothing against a commitment it captured`);
        same(proposed.operations.length, creates.length + moves.length, `${tag} and no delete`);
        say("preview operations for the uncoloured events", moves.map((operation) => ({ kind: operation.kind, static_anchor: operation.static_anchor, summary: operation.event.summary, start_at: operation.event.start_at, end_at: operation.event.end_at, color_id: operation.event.color_id })));
        same(
          moves.map((operation) => [operation.event.external_id, operation.static_anchor, operation.event.color_id, operation.event.start_at, operation.event.end_at]).sort(),
          parked.map((event) => [event.external_id, false, null, stepOfEvent(event).start_at, stepOfEvent(event).end_at]).sort(),
          `${tag} each uncoloured event is one update: Dynamic, with no colour, to the window the Plan chose`
        );
        say("preview diagnostics", proposed.diagnostics);
        same(
          proposed.diagnostics.map((diagnostic) => diagnostic.code),
          unowned.map(() => "calendar_event_id_unmappable"),
          `${tag} the preview reports each unowned step as calendar_event_id_unmappable, and nothing else`
        );

        // ---- sleep is a category of the default palette, and Graphite is its alone
        const settings = () => call(o.base, "GET", endpoints.SETTINGS_LIST_PATH);
        const inverseOf = async (colour) => (await settings()).inverse.find((entry) => entry.color_id === colour);
        const graphite = () => inverseOf(week.sleepColour.colour);
        const mappedAlone = { color_id: week.sleepColour.colour, categories: [week.asleep.category], status: "mapped" };
        say(`Settings inverse entry for colour ${week.sleepColour.colour}, with no Setting for sleep`, await graphite());
        say("Settings inverse entry for colour 2", await inverseOf("2"));
        same(await graphite(), mappedAlone, `${tag} by default colour ${week.sleepColour.colour} belongs to ${week.asleep.category} alone: Graphite is not a collision`);
        same(await inverseOf("2"), { color_id: "2", categories: ["grocery"], status: "mapped" }, `${tag} and colour 2 belongs to grocery alone`);
        const palette = (await settings()).palette;
        same(palette.find((entry) => entry.category === week.asleep.category), { category: week.asleep.category, color_id: week.sleepColour.colour, origin: "default" }, `${tag} sleep is in the palette by default, so the app's Colours card and Category select offer it`);
        ok(!palette.some((entry) => entry.category === week.sleepColour.retired.category), `${tag} and ${week.sleepColour.retired.category}, which held that colour, is in the palette no longer`);
        // The colour is still the operator's to choose.
        await putSetting(o, week.sleepColour.setting, week.sleepColour.other);
        same(nightEvents(await preview(o)).map((event) => event?.color_id), nights.map(() => week.sleepColour.other), `${tag} with ${week.sleepColour.setting} set to ${week.sleepColour.other}, the Asleep events export in that colour`);
        same(await graphite(), { color_id: week.sleepColour.colour, categories: [], status: "unmapped" }, `${tag} and colour ${week.sleepColour.colour} is then mapped to nothing`);
        await call(o.base, "DELETE", fill(endpoints.SETTING_DELETE_PATH, { name: week.sleepColour.setting }), undefined, 204);
        same(nightEvents(await preview(o)).map((event) => event?.color_id), nights.map(() => week.sleepColour.colour), `${tag} with the Setting removed, the colour returns to the default`);
        // Retiring a default deletes no record: an operator's own Setting for the retired category is honoured.
        await putSetting(o, week.sleepColour.retired.setting, week.sleepColour.colour);
        const shared = await graphite();
        say(`Settings inverse entry for colour ${week.sleepColour.colour}, with ${week.sleepColour.retired.setting} set by the operator`, shared);
        same(shared, { color_id: week.sleepColour.colour, categories: [week.sleepColour.retired.category, week.asleep.category], status: "collision" }, `${tag} an operator's own ${week.sleepColour.retired.setting} is still honoured, and on colour ${week.sleepColour.colour} it shares Graphite with sleep`);
        await call(o.base, "DELETE", fill(endpoints.SETTING_DELETE_PATH, { name: week.sleepColour.retired.setting }), undefined, 204);
        same(await graphite(), mappedAlone, `${tag} and with that Setting removed, colour ${week.sleepColour.colour} is ${week.asleep.category}'s alone again`);

        // ---- 5. approve in Mock: applied, with no write for an unowned Task
        // The previews above stored previews of their own; the one approved is taken now.
        const approving = await preview(o);
        same(approving.operations, proposed.operations, `${tag} the preview to approve proposes what the first one did`);
        const approved = await approve(o, approving.preview_id);
        same(approved.status, "applied", `${tag} the Mock approve applies`);

        // ---- a re-plan inside the same minute writes nothing
        // The Plan starts on a whole minute, and an unchanged store planned twice in one minute is one
        // Plan. Two Plans are generated back to back here, with nothing changed between them. Whether
        // they fell in the same minute is read from the clock around each request, not inferred from
        // the result: if the clock crossed a minute, the windows legitimately moved, and that is said.
        const dynamicWindows = (plan) => plan.steps.filter((step) => !step.static_anchor).map((step) => [step.task_id, step.start, step.end]);
        const minuteOf = () => Math.ceil(Date.now() / 60_000);
        const timed = async () => {
          const before = minuteOf();
          const made = await generate();
          return { made, minute: before === minuteOf() ? before : null };
        };
        const one = await timed();
        // What the calendar holds from here on is what this approve applied.
        const settled = await approve(o, (await preview(o)).preview_id);
        same(settled.status, "applied", `${tag} the Plan the two are compared from is applied`);
        const two = await timed();
        const between = await preview(o);
        const sameMinute = one.minute !== null && one.minute === two.minute;
        say("operations between two Plans of an unchanged store", { same_minute: sameMinute, operations: between.operations.map((operation) => operation.kind) });
        if (sameMinute) {
          same(dynamicWindows(two.made.plan), dynamicWindows(one.made.plan), `${tag} two Plans made in the same minute have identical Dynamic windows`);
          same(between.operations, [], `${tag} and the preview between them proposes no operations`);
        } else {
          ok(between.operations.every((operation) => operation.kind === "update"), `${tag} the clock crossed a minute between the two Plans, so the Dynamic windows moved: ${between.operations.length} update(s) and nothing else`);
        }
        same(Math.min(...dynamicWindows(planned.plan).map(([, start]) => start)) % 60, 0, `${tag} the first Dynamic placement begins on a whole minute`);
        ok(approved.operation_results.every((result) => result.status === "applied"), `${tag} all ${approved.operation_results.length} operations were applied`);
        ok(!mentionsUnowned(approved.operation_results) && !mentionsUnowned(approved.applied_events), `${tag} no operation result and no applied event names an unowned event or its Task`);
        same(approved.applied_events.length, owned.length + parked.length + placed.length + occurrences.length + nights.length, `${tag} the applied record holds the owned captures, coloured and uncoloured, and what was created, and no unowned window`);

        // ---- 6. reconcile: the unowned events are foreign and nothing else drifts
        o = await observing(o, settled.applied_events);
        // The leftover retains the foreign group, with the truthful stamped-origin message; unowned instances stay foreign.
        const foreignOnly = [...instances.map((event) => event.external_id), week.leftover.id].sort().map((id) => ["foreign", id]);
        const reconciled = await reconcile(o);
        say("reconcile conflicts", reconciled.conflicts);
        same(reconciled.conflicts.map((conflict) => [conflict.conflict_type, conflict.external_id]), foreignOnly, `${tag} the only conflicts are the unowned instances and UbU's leftover, and each is foreign`);
        same(reconciled.status, "observed", `${tag} reconcile reports an observation, not drift`);
        same([...new Set(reconciled.diagnostics.map((diagnostic) => diagnostic.code))], ["capture_event_not_ownable"], `${tag} and still says why UbU cannot own them`);

        // ---- 7. next action, then complete
        const nextQuery = new URLSearchParams({ schema_version: endpoints.NEXT_ACTION_SCHEMA_VERSION });
        const recommendation = (await call(o.base, "GET", `${endpoints.NEXT_ACTION_PATH}?${nextQuery}`)).recommendation;
        // Planned Dynamic work, from either source: the backlog, or an uncoloured event.
        const done = week.backlog.find((task) => task.key === keyOf[recommendation?.task_id]) ?? parked.find((event) => event.key === parkedKey[recommendation?.task_id]);
        ok(recommendation !== null && done !== undefined && (placed.includes(done.key) || parkedKey[recommendation.task_id] !== undefined), `${tag} Next Task recommends planned Dynamic work: ${recommendation?.title}`);
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
        // Only a coloured event is a commitment with a window. An uncoloured one is Dynamic work, counted when it is done.
        for (const event of seen.filter((candidate) => candidate.color_id !== null)) add(week.categoryOfColour[event.color_id] ?? "Uncategorized", span(event), 0);
        for (const _ of occurrences) add(week.routine.category, week.routine.seconds, 0);
        // The night is in the sleep category, so its hours are reported as sleep.
        for (const _ of nights) add(week.asleep.category, week.asleep.seconds, 0);
        // Work that came from an uncoloured event has no category.
        add(done.category ?? "Uncategorized", 0, done.seconds);
        const rows = Object.values(expected).sort((a, b) => b.seconds - a.seconds || (a.category < b.category ? -1 : 1));
        const body = await report();
        say("time-by-category response", body);
        same(body.categories, rows, `${tag} the report is the Static windows plus the one completion, with the nights under sleep`);
        same({ total: body.total_seconds, unmeasured: body.unmeasured }, { total: rows.reduce((sum, row) => sum + row.seconds, 0), unmeasured: [] }, `${tag} the total is the sum of the rows and nothing is unmeasured`);
        const slept = nights.length * week.asleep.seconds;
        same(body.categories.find((row) => row.category === week.asleep.category), { category: week.asleep.category, seconds: slept, static_seconds: slept, completed_seconds: 0, task_count: nights.length }, `${tag} the sleep row carries eight hours for each night`);
        same(body.categories.find((row) => row.category === "Uncategorized"), expected.Uncategorized, `${tag} and Uncategorized is the unmapped-colour Task, and the completed work if it came from an uncoloured event`);
        same(expected.Uncategorized.static_seconds, span(week.unmapped), `${tag} its Static time is the unmapped-colour Task alone: an uncoloured event is not a commitment and adds none`);

        // ---- 9. repeat: a second full pass over the same store
        const before = (await listTasks(o)).length;
        const recaptured = await capture(o);
        same({ captured: recaptured.captured, skipped: recaptured.skipped }, { captured: 0, skipped: 1 }, `${tag} [repeat] capture admits nothing, and the leftover is the one skip`);
        same(recaptured.diagnostics, [staleLine, occupancyOnly(instances)], `${tag} [repeat] and still says, once each, which event is UbU's own leftover and which events it does not own`);
        same((await listTasks(o)).length, before, `${tag} [repeat] no Task was created`);
        const replanned = await generate();
        const second = partition(replanned, week.backlog.map((task) => task.key).filter((key) => key !== done.key));
        same(second, { placed: placed.filter((key) => key !== done.key), unplaced }, `${tag} [repeat] the same Tasks are placed and the same one is left out, less the completed one`);
        const reproposed = await preview(o);
        say("[repeat] preview operations", reproposed.operations.map((operation) => [operation.kind, operation.event?.summary ?? operation.summary]));
        ok(!mentionsUnowned(reproposed.operations) && !mentionsUnowned(reproposed.events), `${tag} [repeat] the preview still names no unowned event`);
        ok(reproposed.operations.every((operation) => operation.kind === "update"), `${tag} [repeat] it creates nothing and deletes nothing: every event it needs already exists`);
        // P1B-53: the completed Task's event is frozen. It is in no operation, and the preview says why, once.
        const completedEvent = originOf[recommendation.task_id] ?? recommendation.task_id.slice(5);
        ok(!JSON.stringify(reproposed.operations).includes(completedEvent), `${tag} [repeat] the completed Task's event is in no operation: it is neither updated nor deleted`);
        say("[repeat] retained-event diagnostic", reproposed.diagnostics.filter((diagnostic) => diagnostic.code === "calendar_event_retained"));
        same(
          reproposed.diagnostics.filter((diagnostic) => diagnostic.code === "calendar_event_retained"),
          [{ code: "calendar_event_retained", message: `Calendar event \`${completedEvent}\` is left as it is: it is the record of a completed Task, and is neither updated nor deleted` }],
          `${tag} [repeat] and the preview says so, once`
        );
        const reapproved = await approve(o, reproposed.preview_id);
        same(reapproved.status, "applied", `${tag} [repeat] the second approve applies`);
        ok(!mentionsUnowned(reapproved.operation_results) && !mentionsUnowned(reapproved.applied_events), `${tag} [repeat] with no write for an unowned Task`);
        ok(reapproved.applied_events.some((event) => event.external_id === completedEvent), `${tag} [repeat] and the completed Task's event is still in the applied record`);
        same((await preview(o)).operations, [], `${tag} [repeat] a preview straight after it proposes nothing`);
        o = await observing(o, reapproved.applied_events);
        same((await reconcile(o)).conflicts.map((conflict) => [conflict.conflict_type, conflict.external_id]), foreignOnly, `${tag} [repeat] reconcile is unchanged: the unowned instances and the leftover, foreign, and no drift`);
        same((await report()).categories, rows, `${tag} [repeat] the report is unchanged: nothing was counted twice`);
        await o.stop();
        return { instances: instances.length, captured: seen.length, occurrences: occurrences.length, nights: nights.length, placed, unplaced, reason: fence.reason, planningDiagnostics: planned.diagnostics.map((diagnostic) => diagnostic.code), generateMs, placements: steps.length, total: body.total_seconds };
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
      return `the daily loop holds over an invented week at one day and at one week: ${day.captured} and ${sevenDays.captured} events captured, the ${week.parked.length} uncoloured ones as Dynamic work, ${day.placed.length} of ${week.backlog.length} backlog Tasks placed at both, the unowned windows never overlapped and never written`;
    }
  },
  {
    name: "a fresh store",
    seeded: true,
    // The hazard of a store reset. UbU recognises the events it exported by two things in the store: the
    // applied record, and the Tasks its own event ids map back to. A new store has neither. From P1B-57
    // there is a third thing, on the calendar itself: the stamp an insert writes. With it a new store
    // knows the events for UbU's own and captures none. Without it, which is every event from before
    // P1B-57, it captures them as if they were someone else's.
    //
    // What it captures them AS follows the colour (P1B-55), and export decided the colour: a Static Task
    // is exported in its category's colour and a Dynamic one with none. So a categorised commitment comes
    // back as a commitment, pinned, beside whatever still generates it. Dynamic work comes back as Dynamic
    // work, which is the round trip closing. And a commitment with NO category was exported with no
    // colour, so it comes back as Dynamic work: the one case the round trip does not close.
    // One day of horizon, so there is one occurrence of the routine and the output can be read.
    async run(first) {
      await first.stop();
      const say = (what, value) => console.log(`  ${what}: ${JSON.stringify(value)}`);
      const start = (name, events) => {
        const dir = join(first.dir, name);
        mkdirSync(dir, { recursive: true });
        const seed = join(dir, "mock-calendar-events.json");
        writeFileSync(seed, JSON.stringify(events, null, 2));
        return startOrchestrator(dir, { UBU_CALENDAR_MOCK_EVENTS: seed, UBU_PLANNING_HORIZON_SECONDS: "86400" });
      };
      const REVIEW = "Synthetic evening review";
      const ERRAND = "Synthetic flexible errand";
      const BARE = "Synthetic uncategorised appointment";
      const routine = {
        schema_version: endpoints.OBJECTIVE_SCHEMA_VERSION,
        mode: "evergreen",
        title: REVIEW,
        recurrence: { timezone: "UTC", rule: { kind: "daily" } },
        // In a category, so its events are exported in that category's colour.
        routine_instance_template: { title: REVIEW, duration_estimate: fixed(30), nominal_start: timeOfDay(3), placement: "static", occupies_capacity: true, category_tag: "personal", tags: ["personal"], reminder_minutes: [] }
      };
      const generate = (o) => call(o.base, "POST", endpoints.PLANNING_GENERATE_PATH, { schema_version: endpoints.PLANNING_SCHEMA_VERSION, request: null });
      const counts = (result) => ({ captured: result.captured, updated: result.updated, unchanged: result.unchanged, skipped: result.skipped });

      // ---- 1. the old store: nothing captured; a routine, a Dynamic Task and a commitment with no category, exported in Mock
      let old = await start("old-store", []);
      same(counts(await capture(old)), { captured: 0, updated: 0, unchanged: 0, skipped: 0 }, "on an empty calendar, capture takes nothing");
      await call(old.base, "POST", endpoints.OBJECTIVE_CREATE_PATH, routine, 201);
      const errand = (await captureTask(old, { title: ERRAND, duration_estimate: fixed(30) })).task_id;
      await captureTask(old, { title: BARE, static_window: { start: at(5), end: at(5, 45) } });
      const oldPlan = await generatePlan(old);
      const occurrence = oldPlan.steps.find((step) => step.summary === REVIEW);
      ok(occurrence?.static_anchor === true, "the Plan holds the routine's occurrence, Static");
      const proposed = await preview(old);
      same(
        proposed.operations.map((operation) => [operation.kind, operation.event.summary, operation.static_anchor, operation.event.color_id]).sort(),
        [["create", REVIEW, true, "3"], ["create", ERRAND, false, null], ["create", BARE, true, null]],
        "the preview creates three events: the occurrence in its category's colour, and the Dynamic Task and the uncategorised commitment with none"
      );
      const approved = await approve(old, proposed.preview_id);
      same(approved.status, "applied", "the Mock approve applies: UbU now owns three events");
      const exported = approved.applied_events;
      const idOf = Object.fromEntries(exported.map((event) => [event.summary, event.external_id]));
      same(`task_${idOf[ERRAND]}`, errand, "an event UbU exports carries its Task's id: that mapping is how UbU knows its own");

      // ---- 2. the calendar holds them, and the store that exported them knows them
      old = await restartObserving(old, exported);
      same(counts(await capture(old)), { captured: 0, updated: 0, unchanged: 3, skipped: 0 }, "a second capture on the same store takes all three as unchanged, not as new");
      const oldTasks = await listTasks(old);
      same(oldTasks.map((task) => [task.title, task.placement]).sort(), [[REVIEW, "static"], [ERRAND, "planned"], [BARE, "static"]], "and there are still three Tasks, placed as they were");
      await old.stop();

      // ---- 3. the reset, as it is from P1B-57: the calendar holds what UbU inserted, stamped
      // An insert writes the Task it mints the event for as a private extended property. A new
      // store reads that stamp, sees that it has no such Task, and knows the event for UbU's own.
      const asInserted = (event) => ({
        id: event.external_id,
        summary: event.summary,
        start: { dateTime: event.start_at },
        end: { dateTime: event.end_at },
        ...(event.color_id ? { colorId: event.color_id } : {}),
        transparency: event.transparent ? "transparent" : "opaque",
        reminders: { useDefault: false, overrides: event.reminders_minutes.map((minutes) => ({ method: "popup", minutes })) },
        extendedProperties: { private: { ubu_task: event.task_id } }
      });
      const knowing = await start("stamped-store", exported.map(asInserted));
      const recognised = await capture(knowing);
      say("what a fresh store makes of stamped events", { ...counts(recognised), diagnostics: recognised.diagnostics });
      same(counts(recognised), { captured: 0, updated: 0, unchanged: 0, skipped: 3 }, "a new store captures none of UbU's stamped events: all three are skipped");
      same(
        recognised.diagnostics,
        [{ code: "capture_stale_export", message: `3 Calendar events were created by UbU for Tasks this store does not have, so each is left alone and becomes no Task: ${exported.map((event) => `\`${event.external_id}\``).sort().join(", ")}` }],
        "and it names them once, as capture_stale_export, by id"
      );
      same(await listTasks(knowing), [], "so the new store holds no Task, and nothing collides with anything");
      await knowing.stop();

      // ---- 3b. the same reset on a calendar whose events carry no stamp
      // Every event UbU wrote before P1B-57 is like this, and so is a copy made by a tool that
      // drops private properties. Without a stamp a leftover cannot be told from the operator's
      // own event, and the rest of this scenario is what follows.
      const fresh = await start("new-store", exported);
      same(await listTasks(fresh), [], "the new store holds no Task");

      // ---- 4. capture: UbU's own events are now foreign
      const taken = await capture(fresh);
      say("what the fresh store captured", { ...counts(taken), diagnostics: taken.diagnostics });
      same(counts(taken), { captured: 3, updated: 0, unchanged: 0, skipped: 0 }, "with no stamp to go by, the new store captures all three of UbU's own events as new");
      const copies = await listTasks(fresh);
      say("the Tasks it made", copies.map((task) => ({ title: task.title, task_id: task.task_id, placement: task.placement, is_routine_occurrence: task.is_routine_occurrence })));
      same(
        copies.map((task) => [task.title, task.placement, task.category_tag ?? null]).sort(),
        [[REVIEW, "static", "personal"], [ERRAND, "planned", null], [BARE, "planned", null]],
        "the coloured event is a commitment again, in its category; the Dynamic Task's uncoloured event is Dynamic work again; and the uncategorised commitment, exported with no colour, is Dynamic work too"
      );
      same(
        taken.diagnostics.map((diagnostic) => diagnostic.code),
        ["capture_colour_absent", "capture_colour_absent"],
        "capture says of each uncoloured event that it is taken as work for UbU to schedule"
      );
      for (const copy of copies) {
        const stored = (await readTask(fresh, copy.task_id)).payload;
        same(stored.provenance.source, { source_kind: "google_calendar", source_id: idOf[copy.title] }, `“${copy.title}” is keyed by the Google id of the event UbU exported`);
        ok(!oldTasks.some((task) => task.task_id === copy.task_id), `its handle is new: ${copy.task_id} is no Task of the old store`);
      }
      // ---- 5. the routine is authored again, as it would be on a new store, and meets its own copy
      await call(fresh.base, "POST", endpoints.OBJECTIVE_CREATE_PATH, routine, 201);
      const replanned = await generate(fresh);
      ok(replanned.plan !== null && replanned.plan !== undefined, "with the routine and its captured copy at the same time, the Plan is still built");
      const copyOf = Object.fromEntries(copies.map((task) => [task.title, task.task_id]));
      const reviews = replanned.plan.steps.filter((step) => step.summary === REVIEW);
      same(reviews.map((step) => [step.start_at, step.end_at, step.static_anchor]), Array(2).fill([occurrence.start_at, occurrence.end_at, true]), "the Plan holds the review twice at the same time: the routine's own occurrence, and the copy captured from the calendar");
      const regenerated = reviews.find((step) => step.task_id !== copyOf[REVIEW]).task_id;
      const overlaps = (planned) => planned.diagnostics.filter((diagnostic) => ["routine_occurrence_overlaps_commitment", "static_task_collision"].includes(diagnostic.code));
      say("what collided after one reset", overlaps(replanned));
      same(
        overlaps(replanned),
        [{ code: "routine_occurrence_overlaps_commitment", message: `Routine occurrence \`${regenerated}\` shares its time with commitment \`${copyOf[REVIEW]}\`; both stay on the Calendar and the whole span is busy` }],
        "the routine's occurrence collides with the copy of itself, and the warning says so"
      );
      const duplicating = await preview(fresh);
      same(duplicating.operations.filter((operation) => operation.kind === "create").map((operation) => operation.event.summary), [REVIEW], "and the next preview would create the review's event a second time: the copy on the calendar is not this store's occurrence");
      const others = duplicating.operations.filter((operation) => operation.kind !== "create");
      ok(others.every((operation) => operation.kind === "update" && operation.static_anchor === false && operation.event.color_id === null && [ERRAND, BARE].includes(operation.event.summary)), `every other operation moves Dynamic work to where this store planned it: ${JSON.stringify(others.map((operation) => [operation.kind, operation.event.summary]))}`);

      // ---- 6. approve that, and reset once more: the calendar now holds the review twice
      const doubled = await approve(fresh, duplicating.preview_id);
      same(doubled.status, "applied", "the approve applies");
      const calendarNow = [...new Map([...exported, ...doubled.applied_events].map((event) => [event.external_id, event])).values()];
      same(calendarNow.map((event) => event.summary).sort(), [REVIEW, REVIEW, ERRAND, BARE], "the calendar holds four events: the errand, the appointment, and the review twice at the same time");
      await fresh.stop();
      const newer = await start("newer-store", calendarNow);
      const takenAgain = await capture(newer);
      same(counts(takenAgain), { captured: 4, updated: 0, unchanged: 0, skipped: 0 }, "a third store captures all four as new");
      const work = (await captureTask(newer, { title: "Synthetic: sort the button jar", duration_estimate: fixed(30) })).task_id;
      const collided = await generate(newer);
      ok(collided.plan !== null && collided.plan !== undefined, "two fixed copies of one event collide, and the Plan is still built: before P1B-54 there was no Plan at all here");
      const twins = (await listTasks(newer)).filter((task) => task.title === REVIEW).map((task) => task.task_id).sort();
      say("what collided after two resets", overlaps(collided));
      same(
        overlaps(collided),
        [{ code: "static_task_collision", message: `Static Tasks “${REVIEW}” (\`${twins[0]}\`) and “${REVIEW}” (\`${twins[1]}\`) overlap; both keep their fixed windows and stay on the Calendar, and the whole span is busy` }],
        "the warning is static_task_collision, and it names both by title and by id: the duplicated title is the symptom"
      );
      const twinSteps = collided.plan.steps.filter((step) => step.summary === REVIEW);
      same(twinSteps.map((step) => [step.start_at, step.end_at, step.static_anchor]), Array(2).fill([occurrence.start_at, occurrence.end_at, true]), "both copies keep their window");
      const placedWork = collided.plan.steps.find((step) => step.task_id === work);
      ok(placedWork !== undefined && placedWork.static_anchor === false, "the Dynamic Task is in the Plan");
      ok(placedWork.end <= twinSteps[0].start || placedWork.start >= twinSteps[0].end, `and it is placed outside the span the two copies cover: ${placedWork.start_at} to ${placedWork.end_at}`);
      return "a store that exported three events recognises them; a new store recognises them too when they carry UbU's stamp, and captures none; without the stamp it captures the coloured one as a commitment and the uncoloured ones as Dynamic work, a routine collides with its own copy, and a second reset leaves two copies that collide: the Plan is built each time";

    }
  },
  {
    name: "a colour decides the placement",
    seeded: true,
    // P1B-55. At capture an event with no colour is work for UbU to schedule, and an event with any
    // colour is a commitment at its own time. It is the inverse of export, where a Static Task carries
    // its category colour and a Dynamic one carries none. Six invented events, one of each kind.
    async run(first) {
      await first.stop();
      const say = (what, value) => console.log(`  ${what}: ${JSON.stringify(value)}`);
      const plain = (external_id, summary, start, end, color_id) => ({ external_id, summary, start_at: start, end_at: end, color_id, transparent: false, reminders_minutes: [] });
      const FERN = plain("0inv3nt3dfernrep0t", "Invented: repot the plastic fern", at(4), at(4, 45), null);
      const JAR = plain("0inv3nt3djars0rt", "Invented: sort the button jar", at(4, 20), at(4, 50), null);
      const TEA = plain("0inv3nt3dteatasting", "Invented tea tasting", at(6), at(6, 30), "2");
      const TOUR = plain("0inv3nt3dc0llisi0n", "Invented lighthouse tour", at(7), at(7, 30), "3");
      const INSTANT = plain("0inv3nt3dinstant", "Invented instant", at(8), at(8), null);
      // An all-day event, in Google's own shape: a date and no time.
      const ALL_DAY = { id: "0inv3nt3da11day", summary: "Invented all-day fair", start: { date: at(24).slice(0, 10) }, end: { date: at(48).slice(0, 10) } };
      const seed = join(first.dir, "mock-calendar-events.json");
      const start = (events) => {
        writeFileSync(seed, JSON.stringify(events, null, 2));
        return startOrchestrator(first.dir, { UBU_CALENDAR_MOCK_EVENTS: seed });
      };
      const calendar = (fern = FERN) => [fern, JAR, TEA, TOUR, INSTANT, ALL_DAY];
      const counts = (result) => ({ captured: result.captured, updated: result.updated, unchanged: result.unchanged, skipped: result.skipped });
      const absent = (event) => ({ code: "capture_colour_absent", message: `Calendar event \`${event.external_id}\` has no colour, so it is taken as work for UbU to schedule: a Dynamic Task of the event's length, at no fixed time` });
      const allDay = { code: "capture_all_day_unsupported", message: `list event \`${ALL_DAY.id}\` entry 5: all-day event has no dateTime; it carries no duration, so it cannot be scheduled and is skipped` };
      const stored = async (o, event) => {
        for (const task of await listTasks(o)) {
          const read = await readTask(o, task.task_id);
          if (read.payload.provenance?.source?.source_id === event.external_id) return { task_id: task.task_id, version: read.version, payload: read.payload };
        }
        return undefined;
      };

      // ---- 1. the seed, and a palette in which colour 3 belongs to two categories
      let o = await start(calendar());
      await putSetting(o, "calendar.color.work", "3");
      const inverse = (await call(o.base, "GET", endpoints.SETTINGS_LIST_PATH)).inverse;
      same(
        [TEA, TOUR].map((event) => inverse.find((entry) => entry.color_id === event.color_id)),
        [{ color_id: "2", categories: ["grocery"], status: "mapped" }, { color_id: "3", categories: ["personal", "work"], status: "collision" }],
        "colour 2 maps to one category and colour 3 is a collision between two"
      );

      // ---- 2. capture
      const captured = await capture(o);
      say("capture response", captured);
      same(counts(captured), { captured: 4, updated: 0, unchanged: 0, skipped: 2 }, "four events are captured and two are not");
      same(
        captured.diagnostics,
        [
          allDay,
          { code: "capture_colour_ambiguous", message: `Calendar event \`${TOUR.external_id}\` has a colour shared by multiple categories; no category assigned` },
          absent(FERN),
          { code: "capture_event_invalid", message: "Calendar event has an unusable title or concrete time span; skipped" },
          absent(JAR)
        ],
        "the all-day event is skipped and says why, the collision colour and the two uncoloured events each say what was done, and the event of no length is refused"
      );
      const fern = await stored(o, FERN);
      const jar = await stored(o, JAR);
      say("the payload of one Dynamic capture", fern.payload);
      same(
        [fern, jar].map((task) => [task.payload.duration_estimate, task.payload.static_window ?? null, task.payload.category_tag ?? null, task.payload.occupies_capacity]),
        [[{ type: "fixed", seconds: 2_700 }, null, null, true], [{ type: "fixed", seconds: 1_800 }, null, null, true]],
        "the two overlapping uncoloured events are Dynamic Tasks: each has the event's length as its duration, no static_window and no category"
      );
      const tea = await stored(o, TEA);
      const tour = await stored(o, TOUR);
      same(
        [tea, tour].map((task) => [task.payload.static_window, task.payload.category_tag ?? null, task.payload.duration_estimate ?? null]),
        [[{ start: TEA.start_at, end: TEA.end_at }, "grocery", null], [{ start: TOUR.start_at, end: TOUR.end_at }, null, null]],
        "the mapped colour is a Static Task in its category, and the collision colour is a Static Task with none"
      );
      same([await stored(o, INSTANT), (await listTasks(o)).length], [undefined, 4], "the event of no length made no Task, and neither did the all-day one: four Tasks in all");

      // ---- 3. generate: nothing collides, and the planner chooses the times
      const planned = await call(o.base, "POST", endpoints.PLANNING_GENERATE_PATH, { schema_version: endpoints.PLANNING_SCHEMA_VERSION, request: null });
      ok(planned.plan !== null && planned.plan !== undefined, "the Plan is built");
      same(planned.diagnostics.filter((diagnostic) => ["static_task_collision", "static_tasks_share_committed_time"].includes(diagnostic.code)), [], "two uncoloured events at overlapping times produce no static_task_collision: neither is Static");
      const stepOf = (task) => planned.plan.steps.find((step) => step.task_id === task.task_id);
      same([fern, jar].map((task) => stepOf(task)?.static_anchor), [false, false], "both Dynamic Tasks are placed");
      ok(stepOf(fern).start_at !== FERN.start_at && stepOf(jar).start_at !== JAR.start_at, `each at a time the planner chose and not the time its event was parked at: ${stepOf(fern).start_at} and ${stepOf(jar).start_at}`);
      ok(stepOf(fern).end <= stepOf(jar).start || stepOf(jar).end <= stepOf(fern).start, "and the two no longer overlap");
      same([tea, tour].map((task) => [stepOf(task).static_anchor, stepOf(task).start_at]), [[true, TEA.start_at], [true, TOUR.start_at]], "the two commitments are Static, at their own times");

      // ---- 4. preview: the Dynamic captures move, with no colour; the commitments are left alone
      const proposed = await preview(o);
      say("preview operations", proposed.operations);
      same(
        proposed.operations.map((operation) => ({ kind: operation.kind, static_anchor: operation.static_anchor, external_id: operation.event.external_id, start_at: operation.event.start_at, end_at: operation.event.end_at, color_id: operation.event.color_id })).sort((a, b) => (a.external_id < b.external_id ? -1 : 1)),
        [fern, jar].map((task, index) => ({ kind: "update", static_anchor: false, external_id: [FERN, JAR][index].external_id, start_at: stepOf(task).start_at, end_at: stepOf(task).end_at, color_id: null })),
        "the two Dynamic Tasks are update operations carrying their new windows and no colour, and nothing is proposed for the Static ones"
      );

      // ---- 5. the operator colours one of the uncoloured events
      await o.stop();
      o = await start(calendar({ ...FERN, color_id: "2" }));
      const coloured = await capture(o);
      same(counts(coloured), { captured: 0, updated: 1, unchanged: 3, skipped: 2 }, "the recoloured event is one update, and the rest are unchanged");
      const pinned = await stored(o, FERN);
      say("the same Task after its event was given a colour", pinned.payload);
      same(
        { id: pinned.task_id, version: pinned.version, static_window: pinned.payload.static_window, category: pinned.payload.category_tag, duration: pinned.payload.duration_estimate ?? null },
        { id: fern.task_id, version: fern.version + 1, static_window: { start: FERN.start_at, end: FERN.end_at }, category: "grocery", duration: null },
        "the same Task is now Static at the event's own time, in the colour's category: its static_window is present and its duration is gone"
      );

      // ---- 6. and takes the colour away again
      await o.stop();
      o = await start(calendar());
      const uncoloured = await capture(o);
      same(counts(uncoloured), { captured: 0, updated: 1, unchanged: 3, skipped: 2 }, "the uncoloured event is one update again");
      same(uncoloured.diagnostics.filter((diagnostic) => diagnostic.code === "capture_colour_absent"), [absent(FERN)], "and capture says it is taken as work for UbU to schedule");
      const freed = await stored(o, FERN);
      say("the same Task after its event lost the colour again", freed.payload);
      same(
        { id: freed.task_id, version: freed.version, static_window: freed.payload.static_window ?? null, category: freed.payload.category_tag ?? null, duration: freed.payload.duration_estimate },
        { id: fern.task_id, version: fern.version + 2, static_window: null, category: null, duration: { type: "fixed", seconds: 2_700 } },
        "it is Dynamic again: the static_window is gone, the category with it, and the duration is the event's length"
      );
      same((await listTasks(o)).length, 4, "and through all of it there are still four Tasks");
      return "uncoloured events become Dynamic Tasks that do not collide and are moved by the preview with no colour; coloured ones stay commitments; an event of no length and an all-day event make no Task; and one Task goes Static and back as its event gains and loses a colour";
    }
  },
  {
    // The UniverseState screen, at the HTTP layer, from P1B-58, and from P1B-59 its real set and
    // clear and the provenance it shows. Every request here is one the screen makes, in the body
    // `editUniverseState` sends. P1B-68 also exposes leaf Task preconditions and measured
    // readings; this scenario additionally checks compound lists, other provenance kinds
    // and deliberately malformed bodies outside those forms. Every fact is invented.
    name: "the UniverseState screen",
    async run(o) {
    await putSetting(o, "universe.subject.invented", true);
      const read = () => call(o.base, "GET", endpoints.UNIVERSE_STATE_PATH);
      const edit = (mutations, expect = 200) =>
        call(o.base, "PATCH", endpoints.UNIVERSE_STATE_PATH, { schema_version: endpoints.UNIVERSE_STATE_SCHEMA_VERSION, mutations }, expect);
      const COLLECTIONS = ["facts", "numeric_values", "set_memberships", "event_markers"];
      const collections = (state) => Object.fromEntries(COLLECTIONS.map((name) => [name, state[name]]));
      // The word the screen shows beside each value: the kind, by target.
      const words = (state) => Object.fromEntries(Object.entries(state.fact_provenance).map(([target, entry]) => [target, entry.kind]));
      // No entry may outlive its value: every target with provenance resolves to a value.
      const stale = (state) =>
        Object.keys(state.fact_provenance).filter((target) => {
          const [collection, ...key] = target.split(".");
          return !(key.join(".") in state[collection]);
        });
      const blockedIds = async () =>
        ((await call(o.base, "POST", endpoints.PLANNING_GENERATE_PATH, { schema_version: endpoints.PLANNING_SCHEMA_VERSION, request: null })).blocked_tasks ?? []).map(
          (task) => task.task_id
        );

      // Entry on a new store: the empty state, with nothing stored.
      const empty = await read();
      same(empty.schema_version, endpoints.UNIVERSE_STATE_SCHEMA_VERSION, "the read answers the schema version ubu-ui sends on an edit");
      same(empty.version, null, "a new store has no UniverseState, and the read says so with a null version");
      same(collections(empty), { facts: {}, numeric_values: {}, set_memberships: {}, event_markers: {} }, "all four collections are present, and empty");
      same(empty.fact_provenance, {}, "and so is the provenance map");
      same((await read()).version, null, "reading again stored nothing");

      // A Task that waits on a fact. Today shows it as not ready, and links here.
      const fact = "facts.invented.kettle_descaled";
      const waiting = await captureTask(o, {
        title: "Synthetic: make the invented tea",
        duration_estimate: fixed(20),
        preconditions: { target: fact, predicate: "equals", expected: true }
      });
      await captureTask(o, { title: "Synthetic: rinse the invented cup", duration_estimate: fixed(10) });
      same(await blockedIds(), [waiting.task_id], "with nothing recorded, the Task that waits on the fact is blocked");

      // Set the fact, as the screen's “Set fact” does. The first edit creates the state.
      const set = await edit([{ operation: "set_fact", target: fact, payload: true }]);
      same({ version: set.version, facts: set.facts }, { version: 2, facts: { "invented.kettle_descaled": true } }, "the first edit seeds version 1 and answers with version 2, the fact under its key");
      same(words(set), { [fact]: "asserted" }, "a write that states no kind is recorded as asserted, which is the word the screen shows");
      ok(!Number.isNaN(Date.parse(set.fact_provenance[fact].recorded_at)), `and with the time it was written: ${set.fact_provenance[fact].recorded_at}`);
      same(await read(), set, "a later entry reads exactly what the edit answered with");
      same(await blockedIds(), [], "and the Task is blocked no longer");

      // A number is set outright, as the screen's “Set number” does: the value typed is the value sent.
      const litres = "numeric_values.invented.litres";
      same((await edit([{ operation: "set_numeric", target: litres, payload: 0.7 }])).numeric_values, { "invented.litres": 0.7 }, "a number that is not there is set to the value sent");
      const lowered = await edit([{ operation: "set_numeric", target: litres, payload: 0.1 }]);
      ok(lowered.numeric_values["invented.litres"] === 0.1, `from 0.7, a set to 0.1 is exactly 0.1: ${lowered.numeric_values["invented.litres"]}`);
      ok(0.7 - (0.7 - 0.1) !== 0.1, `where the difference P1B-58's screen sent would have landed on ${0.7 - (0.7 - 0.1)}`);
      same({ version: lowered.version, word: words(lowered)[litres] }, { version: 4, word: "asserted" }, "each edit is one version, and the number is asserted");

      // A reading states its kind, including the app's A reading choice.
      const measured = await edit([{ operation: "set_numeric", target: litres, payload: 0.4, provenance_kind: "measured" }]);
      same(words(measured), { [fact]: "asserted", [litres]: "measured" }, "a measured number and an asserted fact are different words");
      same(words(await edit([{ operation: "set_numeric", target: litres, payload: 0.5 }]))[litres], "asserted", "set again on someone's word, it is asserted again");

      // And cleared outright, as the screen's “Clear” on a number does: no payload.
      const gone = await edit([{ operation: "clear_numeric", target: litres }]);
      same({ numbers: gone.numeric_values, words: words(gone) }, { numbers: {}, words: { [fact]: "asserted" } }, "the number is gone, and its provenance with it");
      same((await edit([{ operation: "clear_numeric", target: litres }])).numeric_values, {}, "clearing what is not there is not an error");

      // A Task that waits on a number: not ready while it is absent or below, planned at or above.
      const level = "numeric_values.invented.tank_level";
      const thirsty = await captureTask(o, {
        title: "Synthetic: water the invented bench",
        duration_estimate: fixed(10),
        preconditions: { target: level, predicate: "at_least", expected: 25 }
      });
      same(await blockedIds(), [thirsty.task_id], "a number that was never recorded satisfies no comparison: the Task is not ready, and nothing is malformed");
      for (const [value, blocked] of [[24.5, true], [25, false], [40, false]]) {
        await edit([{ operation: "set_numeric", target: level, payload: value, provenance_kind: "measured" }]);
        same(await blockedIds(), blocked ? [thirsty.task_id] : [], `with the level at ${value}, at_least 25 ${blocked ? "does not hold" : "holds"}`);
      }

      // A set: members are added and removed as the values they are, and the set has one word.
      const toolbox = "set_memberships.invented.toolbox";
      await edit([{ operation: "add_membership", target: toolbox, payload: "spanner" }]);
      const two = await edit([{ operation: "add_membership", target: toolbox, payload: 7 }]);
      same([...two.set_memberships["invented.toolbox"]].sort(), [7, "spanner"], "a set holds the text and the number as themselves");
      const one = await edit([{ operation: "remove_membership", target: toolbox, payload: 7 }]);
      same(one.set_memberships, { "invented.toolbox": ["spanner"] }, "the number is removed as the number");
      same(words(one)[toolbox], "asserted", "and the set that is left has its word");
      const none = await edit([{ operation: "remove_membership", target: toolbox, payload: "spanner" }]);
      same({ sets: none.set_memberships, word: words(none)[toolbox] ?? null }, { sets: {}, word: null }, "a set that loses its last member is gone, and its provenance with it");
      same(stale(none), [], "no provenance entry is left for a value that is gone");

      // A refusal changes nothing: not the bad mutation, and not a good one sent with it.
      const before = await read();
      const good = { operation: "set_fact", target: "facts.invented.cup_rinsed", payload: true };
      const refusals = [
        [{ operation: "set_fact", target: "facts.invented..descaled", payload: true }, "mutation 1: malformed target `facts.invented..descaled`"],
        [{ operation: "polish_fact", target: fact, payload: true }, "mutation 1: unknown operation `polish_fact`"],
        [{ operation: "clear_fact", target: fact, payload: true }, "mutation 1: clear_fact does not accept a payload"],
        [{ operation: "clear_numeric", target: level, payload: 0 }, "mutation 1: clear_numeric does not accept a payload"],
        [{ operation: "clear_numeric", target: level, provenance_kind: "measured" }, "mutation 1: clear_numeric does not accept a provenance kind"],
        [{ operation: "set_numeric", target: level, payload: "full" }, "mutation 1: payload must be a JSON number"],
        [{ operation: "set_numeric", target: fact, payload: 1 }, "mutation 1: operation target must be in the numeric_values collection"],
        [{ operation: "add_membership", target: toolbox, payload: ["spanner"] }, "mutation 1: payload must be a JSON scalar"]
      ];
      for (const [bad, message] of refusals) {
        const refused = await edit([good, bad], 400);
        same(refused.diagnostics, [{ code: "universe_mutation_invalid", message }], `a list holding ${bad.operation} on ${bad.target} is refused whole`);
      }
      same((await edit([], 400)).diagnostics[0].code, "universe_mutations_empty", "an edit of nothing is refused");
      // A mutation has no `note`, and a kind is one of four words: neither body is the route's shape.
      const misshapen = (mutation) =>
        call(o.base, "PATCH", endpoints.UNIVERSE_STATE_PATH, { schema_version: endpoints.UNIVERSE_STATE_SCHEMA_VERSION, mutations: [mutation] }, 422, true);
      ok((await misshapen({ ...good, note: "nowhere to go" })).includes("unknown field `note`"), "a mutation that carries a note is refused: the field is gone, not ignored");
      ok((await misshapen({ ...good, provenance_kind: "guessed" })).includes("provenance_kind"), "a kind that is not one of the four is refused");
      same(await read(), before, "after eleven refusals the state is what it was, version and all");

      // Clear the fact, as the screen's “Clear” does: no payload. The Task waits again.
      const cleared = await edit([{ operation: "clear_fact", target: fact }]);
      same({ version: cleared.version, facts: cleared.facts }, { version: before.version + 1, facts: {} }, "the clear is the next version, and the fact is gone");
      same(words(cleared), { [level]: "measured" }, "its provenance went with it, and the measured level keeps its own");
      same(stale(cleared), [], "and still no entry is left for a value that is gone");
      same(await blockedIds(), [waiting.task_id], "and the Task that waits on the fact is blocked again");
      same(collections(await read()).event_markers, {}, "nothing the screen does appends an event marker");
      return "a new store reads as the empty state; a fact set over PATCH /universe-state unblocks the Task that waits on it and clearing it blocks it again; a number is set to exactly the value sent and cleared outright; a Task waiting on at_least 25 is not ready below it and planned at it; each write is recorded as asserted unless it says measured, and no record outlives its value; and eleven refused edits change nothing";
    }
  },
  {
    name: "what already matches and numeric precondition words",
    seeded: true,
    async run(first) {
      const observed = observedEvent(FOREIGN_ID, "Synthetic already placed work", 2);
      const o = await restartObserving(first, [observed]);
      same((await capture(o)).captured, 1, "one uncoloured synthetic event is captured");
      const tasks = await listTasks(o);
      same(tasks.length, 1, "the store holds only that Task");
      same(tasks[0].placement, "planned", "the captured Task is Dynamic");
      const planned = await call(o.base, "POST", endpoints.PLANNING_GENERATE_PATH, {
        schema_version: endpoints.PLANNING_SCHEMA_VERSION, request: null,
        horizon: { start: observed.start_at, end: at(3) }
      });
      ok(planned.plan.steps.some((step) => step.task_id === tasks[0].task_id), "the captured Task has a placement in this Plan");
      const matching = await preview(o);
      same(matching.operations, [], "capture's applied snapshot already matches the placement, without an intervening approval");
      same(matching.matching_placements, 1, "the response counts that matching placement");
      same(matchingPlacementsSentence(matching.matching_placements), "1 Dynamic placement already matches the calendar and needs no operation; Static commitments keep their fixed times.", "the shared UI wording explains why no operation is needed");
      same(matchingPlacementsSentence(14), "14 Dynamic placements already match the calendar and need no operation; Static commitments keep their fixed times.", "plural wording carries the server's number");
      same(matchingPlacementsSentence(0), "0 Dynamic placements already match the calendar and need no operation; Static commitments keep their fixed times.", "zero Dynamic matches is explicit without counting Static commitments");
      const comparisons = [["at_least", "is at least"], ["at_most", "is at most"], ["greater_than", "is greater than"], ["less_than", "is less than"]];
      const waiting = [];
      for (const [predicate, words] of comparisons) {
        const task = await captureTask(o, {
          title: `Synthetic comparison ${predicate}`, duration_estimate: fixed(5),
          preconditions: { target: "numeric_values.invented.level", predicate, expected: 25 }
        });
        waiting.push({ id: task.task_id, predicate, words });
      }
      const blocked = await call(o.base, "POST", endpoints.PLANNING_GENERATE_PATH, { schema_version: endpoints.PLANNING_SCHEMA_VERSION, request: null });
      for (const { id, predicate, words } of waiting) {
        const leaf = blocked.blocked_tasks.find((task) => task.task_id === id)?.precondition;
        same(leaf, { target: "numeric_values.invented.level", predicate, expected: 25 }, `HTTP returns the blocked ${predicate} precondition`);
        same(numericComparisonWords(leaf.predicate), words, `the UI says the returned ${predicate} in words`);
      }
      same(numericComparisonWords("invented_unknown"), null, "unknown predicates leave the raw fallback in charge");
      return "a captured Dynamic placement already matches with no operation, its count has the shared UI clause, and all four numeric predicates have words";
    }
  },
  {
    name: "advisor proposes a precondition over an existing fact",
    async run(o) {
    await putSetting(o, "universe.subject.synthetic", true);
      const target = "numeric_values.synthetic.orbital_teapot_charge";
      const task = await captureTask(o, { title: "Synthetic orbital teapot launch", description: "Synthetic orbital teapot launch requires at least 25 charge units.", duration_estimate: fixed(10) });
      await captureTask(o, { title: "Synthetic control task", duration_estimate: fixed(5) });
      const edit = (value) => call(o.base, "PATCH", endpoints.UNIVERSE_STATE_PATH, { schema_version: endpoints.UNIVERSE_STATE_SCHEMA_VERSION, mutations: [{ operation: "set_numeric", target, payload: value }] });
      const universe = await edit(0);
      const before = await readTask(o, task.task_id);
      const stub = await startModelStub(); stub.mode = "precondition";
      // The control now reaches the model too. This scenario's model chooses
      // a requirement only for the launch; scenario 26 proposes for title-only work.
      stub.preconditionTaskIds = [task.task_id];
      await putSetting(o, "advisory.model", "synthetic-precondition-model");
      await putSetting(o, "advisory.endpoint", stub.endpoint);
      const proposed = await call(o.base, "POST", endpoints.ADVISORY_RUN_PATH, { schema_version: endpoints.ADVISORY_RUN_SCHEMA_VERSION, producer: "precondition", limit: 25 });
      same(proposed.candidates_enqueued, 1, "one precondition candidate appears");
      same(JSON.parse(stub.requests[0].body.prompt).tasks.length, 2, "the title-only control is also eligible; the stub deliberately omits its proposal");
      same(await readTask(o, task.task_id), before, "proposal leaves the Task untouched");
      same(await call(o.base, "GET", endpoints.UNIVERSE_STATE_PATH), universe, "proposal leaves all facts and provenance untouched");
      const queued = await call(o.base, "GET", endpoints.ADVISORY_QUEUE_PATH);
      const candidate = queued.candidates[0].candidate;
      same(candidate.candidate_kind, "precondition", "the queue names the new kind");
      same(candidate.normalized_proposal, { target, predicate: "at_least", expected: 25 }, "the proposal is the precondition tree");
      const admitted = await call(o.base, "POST", fill(endpoints.ADVISORY_ADMIT_PATH, { candidate_id: candidate.advisory_candidate_id }), { observed_version: candidate.version });
      same(admitted.task.preconditions, candidate.normalized_proposal, "admission sets Task.preconditions");
      same(await call(o.base, "GET", endpoints.UNIVERSE_STATE_PATH), universe, "admission authors no fact or provenance");
      const blocked = await call(o.base, "POST", endpoints.PLANNING_GENERATE_PATH, { schema_version: endpoints.PLANNING_SCHEMA_VERSION, request: null });
      same(blocked.blocked_tasks.map((task) => task.task_id), [task.task_id], "the false fact blocks this Task");
      ok(!blocked.plan.steps.some((step) => step.task_id === task.task_id), "the blocked Task is not planned");
      await edit(25);
      const ready = await call(o.base, "POST", endpoints.PLANNING_GENERATE_PATH, { schema_version: endpoints.PLANNING_SCHEMA_VERSION, request: null });
      ok(ready.plan.steps.some((step) => step.task_id === task.task_id), "recording the sufficient number includes the Task in the next Plan");
      stub.preconditionMinimum = 50;
      const taskBeforeReplacement = await readTask(o, task.task_id);
      const factsBeforeReplacement = await call(o.base, "GET", endpoints.UNIVERSE_STATE_PATH);
      const replacement = await call(o.base, "POST", endpoints.ADVISORY_RUN_PATH, { schema_version: endpoints.ADVISORY_RUN_SCHEMA_VERSION, producer: "precondition", limit: 25 });
      same(replacement.candidates_enqueued, 1, "an existing precondition can receive a replacement proposal");
      same(await readTask(o, task.task_id), taskBeforeReplacement, "replacement proposal also leaves the Task untouched");
      const queueAfter = await call(o.base, "GET", endpoints.ADVISORY_QUEUE_PATH);
      const replacing = queueAfter.candidates.find((entry) => entry.candidate.advisory_candidate_id === replacement.candidate_ids[0]).candidate;
      same(replacing.normalized_proposal, { existing_precondition: { target, predicate: "at_least", expected: 25 }, proposed_precondition: { target, predicate: "at_least", expected: 50 } }, "review carries both current and proposed requirements");
      const replaced = await call(o.base, "POST", fill(endpoints.ADVISORY_ADMIT_PATH, { candidate_id: replacing.advisory_candidate_id }), { observed_version: replacing.version });
      same(replaced.task.preconditions, replacing.normalized_proposal.proposed_precondition, "explicit admission replaces only the reviewed condition");
      same(await call(o.base, "GET", endpoints.UNIVERSE_STATE_PATH), factsBeforeReplacement, "replacement authors no facts");
      return "stub proposals change only candidate state; explicit admission sets or visibly replaces the precondition; the next Plan excludes or includes the Task as the recorded fact changes";
    }
  },
  {
    name: "admitted precondition reviews restore work and snooze rejected critiques",
    async run(o) {
    await putSetting(o, "universe.subject.synthetic", true);
      const target = "numeric_values.synthetic.orbital_teapot_charge";
      await call(o.base, "PATCH", endpoints.UNIVERSE_STATE_PATH, { schema_version: endpoints.UNIVERSE_STATE_SCHEMA_VERSION, mutations: [{operation:"set_numeric",target,payload:0}] });
      const wrong = {target,predicate:"greater_than",expected:25};
      const task = await captureTask(o, {title:"Synthetic cold teapot inspection",description:"Inspect the synthetic cold unpowered teapot; no charge is required.",duration_estimate:fixed(10),preconditions:wrong});
      await captureTask(o,{title:"Synthetic review control",duration_estimate:fixed(5)});
      const generate = () => call(o.base,"POST",endpoints.PLANNING_GENERATE_PATH,{schema_version:endpoints.PLANNING_SCHEMA_VERSION,request:null});
      const blocked = await generate();
      ok(!blocked.plan.steps.some(s=>s.task_id===task.task_id),"the wrong comparison excludes the synthetic inspection");
      const stub = await startModelStub();stub.mode="precondition_review";
      await putSetting(o,"advisory.model","synthetic-review-model");await putSetting(o,"advisory.endpoint",stub.endpoint);
      const review = () => call(o.base,"POST",endpoints.ADVISORY_RUN_PATH,{schema_version:endpoints.ADVISORY_RUN_SCHEMA_VERSION,producer:"precondition_review",limit:25});
      const before=await readTask(o,task.task_id);const result=await review();same(result.candidates_enqueued,1,"the review creates one candidate");
      same(await readTask(o,task.task_id),before,"the review leaves the Task untouched");
      let queue=await call(o.base,"GET",endpoints.ADVISORY_QUEUE_PATH);let c=queue.candidates[0].candidate;
      same(c.normalized_proposal.operation,"clear_precondition","removal is an explicit operation");
      same(c.normalized_proposal.existing_precondition,wrong,"the reviewed tree is preserved");same(c.normalized_proposal.blocked_now,true,"the candidate says the requirement is blocking now");
      ok(!("proposed_precondition" in c.normalized_proposal),"removal contains no proposed tree");
      await call(o.base,"POST",fill(endpoints.ADVISORY_ADMIT_PATH,{candidate_id:c.advisory_candidate_id}),{observed_version:c.version});
      ok((await generate()).plan.steps.some(s=>s.task_id===task.task_id),"admitting removal restores the previously excluded Task to the Plan");
      await captureTask(o,{title:"Synthetic second cold inspection",description:"Inspect an unpowered synthetic dial; no charge is required.",duration_estimate:fixed(5),preconditions:wrong});
      same((await review()).candidates_enqueued,1,"another admitted guard is open to review");
      queue=await call(o.base,"GET",endpoints.ADVISORY_QUEUE_PATH);c=queue.candidates[0].candidate;
      same(queue.review_intervals[c.advisory_candidate_id].suggested_days,7,"blocking work caps the review at the seven-day seed");
      await call(o.base,"POST",fill(endpoints.ADVISORY_REJECT_PATH,{candidate_id:c.advisory_candidate_id}),{observed_version:c.version,reason:"The synthetic condition is intentional.",retention_policy:"retain",snooze_days:3});
      const asked=stub.requests.length;stub.reviewReason="Another wording of the same synthetic critique.";
      const held=await review();same(held.candidates_enqueued,0,"a rejected review stays held on the next normal run");
      ok(held.diagnostics.some(d=>d.code==="advisory_proposal_suppressed" && d.message.includes("held until")),"the hold diagnostic gives a return date");
      same(stub.requests.length,asked,"a held subject is not sent to the model again");
      return "an explicit removal restores planned work; rejection retains a finite subject snooze across normal runs";
    }
  },
  {
    name: "calendar capture supplies optional notes and title-only advisor input",
    seeded: true,
    async run(first) {
      // Deliberately use the calendar route, never the manual captureTask helper.
      const noted = { id: "0inv3nt3d0rbital", summary: "Synthetic orbital kettle inspection", description: "Synthetic orbital inspection requires the recorded charge threshold.", start: { dateTime: at(6) }, end: { dateTime: at(6, 30) } };
      const titleOnly = { id: "0inv3nt3dsaturn", summary: "Synthetic Saturn charge check", start: { dateTime: at(7) }, end: { dateTime: at(7, 30) } };
      const o = await restartObserving(first, [noted, titleOnly]);
      await putSetting(o, "universe.subject.synthetic", true);
      same((await capture(o)).captured, 2, "both uncoloured calendar events become Tasks");
      const captured = await listTasks(o);
      const described = captured.find((task) => task.title === noted.summary);
      const bare = captured.find((task) => task.title === titleOnly.summary);
      ok(described && bare, "the two captured titles identify the two Tasks");
      const withNotes = await readTask(o, described.task_id);
      const withoutNotes = await readTask(o, bare.task_id);
      ok(withNotes.payload.description === noted.description, "calendar notes reached the Task unchanged; their text is not printed");
      ok(!Object.hasOwn(withoutNotes.payload, "description"), "a title-only captured Task has no description key");
      const target = "numeric_values.synthetic.orbital_teapot_charge";
      await call(o.base, "PATCH", endpoints.UNIVERSE_STATE_PATH, { schema_version: endpoints.UNIVERSE_STATE_SCHEMA_VERSION, mutations: [{ operation: "set_numeric", target, payload: 40 }] });
      const stub = await startModelStub(); stub.mode = "precondition";
      await putSetting(o, "advisory.model", "synthetic-precondition-model");
      await putSetting(o, "advisory.endpoint", stub.endpoint);
      const result = await call(o.base, "POST", endpoints.ADVISORY_RUN_PATH, { schema_version: endpoints.ADVISORY_RUN_SCHEMA_VERSION, producer: "precondition", limit: 25 });
      same(result.candidates_enqueued, 2, "the advisor enqueues for both calendar-captured Tasks");
      const queue = await call(o.base, "GET", endpoints.ADVISORY_QUEUE_PATH);
      ok(queue.candidates.some(({ candidate }) => candidate.target_refs.some(({ id }) => id === bare.task_id)), "a candidate targets the Task with only a title");
      same(stub.requests.length, 1, "the model is asked once about these two Tasks");
      const context = JSON.parse(stub.requests[0].body.prompt);
      same(context.tasks.map(({ id, title }) => [id, title]).sort(), [[described.task_id, noted.summary], [bare.task_id, titleOnly.summary]].sort(), "the prompt carries both titles");
      ok(context.tasks.find(({ id }) => id === described.task_id).description === noted.description, "the described Task supplies its notes to the model without printing them");
      ok(!Object.hasOwn(context.tasks.find(({ id }) => id === bare.task_id), "description"), "the title-only model input omits description");
      same(context.tasks.filter((task) => Object.hasOwn(task, "description")).length, 1, "exactly one prompt Task has a description");
      const editedNotes = "Synthetic amended orbital inspection notes.";
      await call(o.base, "PATCH", fill(endpoints.TASK_PATH, { task_id: described.task_id }), { schema_version: endpoints.TASK_CAPTURE_SCHEMA_VERSION, expected_version: withNotes.version, description: editedNotes });
      const repeated = await capture(o);
      same({ updated: repeated.updated, unchanged: repeated.unchanged }, { updated: 0, unchanged: 2 }, "recapture declines calendar notes and counts both Tasks unchanged");
      ok((await readTask(o, described.task_id)).payload.description === editedNotes, "notes edited on Tasks survive recapture");
      await generatePlan(o);
      const proposed = await preview(o);
      same(proposed.operations.length, 2, "both parked Dynamic events need a move");
      ok(proposed.operations.every(({ kind, event }) => kind === "update" && !Object.hasOwn(event, "description")), "neither projected update carries a description");
      const applied = await approve(o, proposed.preview_id);
      same(applied.status, "applied", "explicit Mock approval applies both moves");
      same(applied.operation_results.length, 2, "both description-free operations are applied");
      ok(applied.applied_events.every((event) => !Object.hasOwn(event, "description")), "the approved Calendar projection contains no descriptions");
      // Pure Rust wire tests additionally assert event_body and both event_request
      // operations omit notes, and the recorder preserves Google's notes on PATCH.
      return "calendar capture supplies optional notes, title-only work reaches the model and queue, edited notes survive recapture, and approved projections omit descriptions";
    }
  },
  {
    name: "facts-only grammar and mixed precondition refusals preserve usable proposals",
    async run(o) {
    await putSetting(o, "universe.subject.synthetic", true);
      const tasks = [];
      for (const title of ["Synthetic lunar valve check", "Synthetic lunar seal check", "Synthetic lunar dial check"]) {
        tasks.push(await captureTask(o, { title, duration_estimate: fixed(5) }));
      }
      const target = "facts.synthetic.lunar_ready";
      const universe = await call(o.base, "PATCH", endpoints.UNIVERSE_STATE_PATH, { schema_version: endpoints.UNIVERSE_STATE_SCHEMA_VERSION, mutations: [{ operation: "set_fact", target, payload: true }] });
      const before = await Promise.all(tasks.map((task) => readTask(o, task.task_id)));
      const stub = await startModelStub(); stub.mode = "precondition_mixed";
      stub.preconditionFactTarget = target; stub.refusedTaskId = tasks[2].task_id;
      await putSetting(o, "advisory.model", "synthetic-mixed-precondition-model");
      await putSetting(o, "advisory.endpoint", stub.endpoint);
      const result = await call(o.base, "POST", endpoints.ADVISORY_RUN_PATH, { schema_version: endpoints.ADVISORY_RUN_SCHEMA_VERSION, producer: "precondition", limit: 25 });
      same(result.status, "ok", "one refused proposal leaves the run ok");
      same(result.candidates_enqueued, 2, "both independently usable proposals are enqueued");
      same(result.diagnostics.length, 1, "one refused Task produces one diagnostic");
      same(result.diagnostics[0], { code: "precondition_proposal_refused", message: `Task \`${tasks[2].task_id}\`: this predicate requires an expected value. No candidate was enqueued for this Task; the rest of the run stands.` }, "the refusal names the third Task and its code-authored reason");
      const queue = await call(o.base, "GET", endpoints.ADVISORY_QUEUE_PATH);
      same(queue.candidates.map(({ candidate }) => candidate.target_refs[0].id).sort(), tasks.slice(0, 2).map(({ task_id }) => task_id).sort(), "only the two usable Tasks have candidates");
      const sent = stub.requests[0].body;
      const context = JSON.parse(sent.prompt);
      same(context.targets, [target], "the model receives facts-only vocabulary");
      const branches = sent.format.$defs.leaf.oneOf;
      const predicates = branches.flatMap(({ properties }) => properties.predicate.enum ?? [properties.predicate.const]).sort();
      same(predicates, ["absent", "equals"], "facts-only grammar offers exactly equals and absent");
      same(branches.length, 2, "empty comparison and membership partitions add no branch");
      ok(!Object.hasOwn(branches[0].properties, "expected") && branches[0].additionalProperties === false, "absent cannot carry expected");
      ok(branches[1].required.includes("expected"), "equals must carry expected");
      console.log(`FORMAT_P1B64_FACTS_ONLY: ${JSON.stringify(sent.format)}`);
      const after = await Promise.all(tasks.map((task) => readTask(o, task.task_id)));
      ok(JSON.stringify(after) === JSON.stringify(before), "the proposal run changes no canonical Task");
      ok(JSON.stringify(await call(o.base, "GET", endpoints.UNIVERSE_STATE_PATH)) === JSON.stringify(universe), "the proposal run changes no UniverseState");
      return "facts-only schema constrains expected and predicates; a refused Task leaves two candidates, ok status, and canonical state unchanged";
    }
  },
  {
    name: "manual UniverseState writes refuse reserved namespaces and legacy keys can be cleared",
    async run(o) {
      const read = () => call(o.base, "GET", endpoints.UNIVERSE_STATE_PATH);
      const edit = (mutations, expect = 200) => call(o.base, "PATCH", endpoints.UNIVERSE_STATE_PATH,
        { schema_version: endpoints.UNIVERSE_STATE_SCHEMA_VERSION, mutations }, expect);
      for (const segment of ["facts", "numeric_values", "set_memberships", "event_markers", "affect"]) {
        const target = `facts.${segment}.invented_kettle`;
        const refused = await edit([{ operation: "set_fact", target, payload: true }], 400);
        const message = segment === "affect"
          ? `Key segment \`affect\` is reserved for intrinsic affect, which organization_mode and worker_mode refuse. The target would be \`${target}\`; the collection comes from the panel, not the key.`
          : `Key segment \`${segment}\` names a collection; the collection comes from the panel, not the key. The target would be \`${target}\`.`;
        same(refused.diagnostics, [{ code: "universe_target_namespace_invalid", message }], `${segment} is refused with its own grammar reason and the complete target`);
      }
      same((await read()).version, null, "five refusals seed no empty state");
      // Task effects keep core semantics, so this stages invented legacy keys
      // through existing HTTP contracts without a database editor or new route.
      const legacy = (await captureTask(o, {
        title: "Synthetic: stage an invented legacy kettle",
        duration_estimate: fixed(5),
        effects: { mutations: [
          { operation: "set_fact", target: "facts.facts.invented_kettle", payload: true },
          { operation: "set_fact", target: "facts.affect.invented_energy", payload: true },
          { operation: "set_numeric", target: "numeric_values.numeric_values.invented_jars", payload: 3 },
          { operation: "add_membership", target: "set_memberships.set_memberships.invented_tools", payload: "invented-spanner" }
        ] }
      })).task_id;
      same((await recordAction(o, legacy, "complete")).diagnostics, [], "unchanged Task effects stage the legacy fixture");
      const before = await read();
      same(before.facts, { "facts.invented_kettle": true, "affect.invented_energy": true }, "legacy doubled and reserved keys remain readable");
      const cleared = await edit([
        { operation: "clear_fact", target: "facts.facts.invented_kettle" },
        { operation: "clear_fact", target: "facts.affect.invented_energy" },
        { operation: "clear_numeric", target: "numeric_values.numeric_values.invented_jars" },
        { operation: "remove_membership", target: "set_memberships.set_memberships.invented_tools", payload: "invented-spanner" }
      ]);
      same([cleared.facts, cleared.numeric_values, cleared.set_memberships], [{}, {}, {}], "legacy clear and remove operations still work");
      same(cleared.version, before.version + 1, "cleanup is one version");
      same(await read(), cleared, "cleanup remains the current state");
      return "five reserved first segments refused without a write; legacy keys remain readable and clear/remove succeeds";
    }
  }

];

scenarios.push({
  name: "precondition proposal cap and review backlog boundary",
  async run(o) {
    await putSetting(o, "universe.subject.synthetic", true);
    const ids = [];
    for (let index = 0; index < 25; index += 1) {
      ids.push((await captureTask(o, { title: `Synthetic bounded teapot ${index}`, duration_estimate: fixed(5) })).task_id);
    }
    await call(o.base, "PATCH", endpoints.UNIVERSE_STATE_PATH, { schema_version: endpoints.UNIVERSE_STATE_SCHEMA_VERSION, mutations: [
      { operation: "set_numeric", target: "numeric_values.synthetic.orbital_teapot_charge", payload: 30 }
    ] });
    const stub = await startModelStub();
    stub.mode = "precondition";
    await putSetting(o, "advisory.model", "synthetic-bounded-model");
    await putSetting(o, "advisory.endpoint", stub.endpoint);
    const run = () => call(o.base, "POST", endpoints.ADVISORY_RUN_PATH, { schema_version: endpoints.ADVISORY_RUN_SCHEMA_VERSION, producer: "precondition", limit: 25 });
    const queue = () => call(o.base, "GET", endpoints.ADVISORY_QUEUE_PATH);
    const refuse = async () => {
      const before = stub.requests.length;
      const result = await run();
      same(result.diagnostics, [{ code: "precondition_queue_full", message: "10 precondition candidates are waiting in Review; review, defer or reject them before asking for more. No model was asked." }], "ten awaiting candidates refuse with the count and three dispositions");
      same([result.status, result.candidates_enqueued, result.selected, result.report], ["ok", 0, [], null], "the run did not happen");
      same(stub.requests.length, before, "the refusal asks no model");
    };
    stub.preconditionTaskIds = ids.slice(0, 4);
    const oversized = await run();
    same(oversized.status, "malformed_result", "four proposals refuse the whole response");
    same(oversized.candidates_enqueued, 0, "no part of that response is enqueued");
    same(JSON.parse(stub.requests[0].body.prompt).tasks.length, 25, "the run still considers 25 Tasks");
    same(stub.requests[0].body.format.properties.proposals.maxItems, 3, "the wire grammar caps proposals at three");
    ok(stub.requests[0].body.system.includes("The response is bounded to at most three proposals in total, regardless of how many Tasks are supplied."), "the system states the bound");
    for (let start = 0; start < 9; start += 3) {
      stub.preconditionTaskIds = ids.slice(start, start + 3);
      same((await run()).candidates_enqueued, 3, "a run can enqueue three distinct proposals");
    }
    same((await queue()).candidates.length, 9, "nine await review");
    stub.preconditionTaskIds = ids.slice(9, 10);
    same((await run()).candidates_enqueued, 1, "a run at nine is permitted and creates the tenth");
    const waiting = (await queue()).candidates.map((row) => row.candidate);
    same(waiting.length, 10, "ten now await review");
    await refuse();
    const first = waiting[0];
    const defer = (candidate, version) => call(o.base, "POST", fill(endpoints.ADVISORY_DEFER_PATH, { candidate_id: candidate.advisory_candidate_id }), { observed_version: version });
    await defer(first, first.version);
    stub.preconditionTaskIds = [];
    const asked = stub.requests.length;
    same((await run()).status, "ok", "deferring one permits a run at nine");
    same(stub.requests.length, asked + 1, "that permitted run asks the model");
    await call(o.base, "POST", fill(endpoints.ADVISORY_RESURFACE_PATH, { candidate_id: first.advisory_candidate_id }), { observed_version: first.version + 1, trigger: "user_request" });
    await refuse();
    for (const candidate of waiting) await defer(candidate, candidate.version + (candidate === first ? 2 : 0));
    same((await queue()).deferred_candidates.length, 10, "ten were explicitly deferred");
    const before = stub.requests.length;
    const result = await run();
    same([result.status, result.candidates_enqueued], ["ok", 0], "ten deferred candidates do not block another run");
    same(stub.requests.length, before + 1, "the all-deferred case reaches the model");
    return "three proposals per run; four refuse whole; nine awaiting permits, ten proposed/resurfaced refuses without a model call, ten deferred permits";
  }
});

scenarios.push({
  name: "vocabulary names, operator values, then a separate precondition run",
  async run(o) {
    await putSetting(o, "universe.subject.synthetic", true);
    const fact = "facts.synthetic.teapot_ready";
    const number = "numeric_values.synthetic.teapot_charge";
    const task = await captureTask(o, { title: "Synthetic orbital teapot launch", duration_estimate: fixed(10) });
    const stub = await startModelStub(); stub.mode = "vocabulary";
    await putSetting(o, "advisory.model", "synthetic-vocabulary-model");
    await putSetting(o, "advisory.endpoint", stub.endpoint);
    const run = (producer) => call(o.base, "POST", endpoints.ADVISORY_RUN_PATH, { schema_version: endpoints.ADVISORY_RUN_SCHEMA_VERSION, producer, limit: 25 });
    const before = await call(o.base, "GET", endpoints.UNIVERSE_STATE_PATH);
    same(before.version, null, "vocabulary starts with no canonical UniverseState");
    const result = await run("vocabulary");
    same([result.status,result.candidates_enqueued], ["ok",2], "one bad name costs one candidate in a three-proposal batch");
    same(result.diagnostics, [{code:"vocabulary_proposal_refused",message:`Task \`${task.task_id}\`: the first key segment names a reserved collection or intrinsic-affect namespace. No candidate was enqueued for this Task; the rest of the run stands.`}], "refusal has the code-authored reason");
    const body = stub.requests[0].body;
    const context = JSON.parse(body.prompt);
    same(context.targets, [], "cold-start existing names are empty");
    same(Object.keys(context.tasks[0]).sort(), ["id","title"], "title-only Task context carries no unrelated data");
    same(body.format.properties.proposals.maxItems,3,"at most three names are requested");
    same(body.format.properties.proposals.items.properties.target, {type:"string",pattern:"^(facts|numeric_values)\\.(github|operator|project|relationship|synthetic)\\.([A-Za-z0-9_-]+\\.)*[a-z][a-z0-9]*(_[a-z0-9]+)*$",maxLength:128}, "two-prefix grammar and length reach HTTP");
    const queue = await call(o.base,"GET",endpoints.ADVISORY_QUEUE_PATH);
    const candidates = queue.candidates.map((row)=>row.candidate);
    same(candidates.length,2,"two name-only candidates survive");
    for (const candidate of candidates) {
      same(Object.keys(candidate.normalized_proposal).sort(),["operation","target"],"candidate carries no value");
      same(candidate.target_refs,[{id:task.task_id,object_type:"Task"}],"Task is evidence, not write destination");
    }
    const chosen = candidates.find((candidate)=>candidate.normalized_proposal.target===number);
    const path = fill(endpoints.ADVISORY_ADMIT_PATH,{candidate_id:chosen.advisory_candidate_id});
    const missing = await call(o.base,"POST",path,{observed_version:1},400);
    same(missing.diagnostics,[{code:"vocabulary_value_required",message:"An operator-supplied value is required; no value is defaulted, inferred or derived"}],"no value cannot admit");
    same((await call(o.base,"GET",endpoints.UNIVERSE_STATE_PATH)).version,null,"failed admission leaves no seed");
    const value = 987654.125;
    const admitted = await call(o.base,"POST",path,{observed_version:1,value});
    same(admitted.task.id,task.task_id,"Task evidence remains available");
    same(admitted.universe_state.numeric_values["synthetic.teapot_charge"],value,"only the supplied observation is written");
    same(admitted.universe_state.fact_provenance[number].kind,"asserted","operator value is asserted");
    stub.mode="precondition"; stub.preconditionTaskIds=[];
    same((await run("precondition")).status,"ok","the second producer is a separate explicit click");
    const second = JSON.parse(stub.requests[1].body.prompt);
    same(second.targets,[number],"precondition context includes the admitted name");
    ok(!JSON.stringify(stub.requests[1].body).includes(String(value)),"the operator observation never reaches the second model request");
    stub.mode="vocabulary";stub.vocabularyNames=[fact,fact,fact,fact];
    const oversized = await run("vocabulary");
    same([oversized.status,oversized.candidates_enqueued],["malformed_result",0],"four vocabulary proposals refuse whole");
    return "cold-start title-only vocabulary is name-only and capped at three; a reserved middle proposal is refused independently; no-value admission fails without a seed; supplied value is asserted; the next separate precondition context carries the name and no observation";
  }
});

scenarios.push({
  name: "operator authors and clears one Task requirement through its existing PATCH",
  async run(o) {
    await putSetting(o, "universe.subject.synthetic", true);
    const target = "numeric_values.synthetic.teapot_charge";
    const task = await captureTask(o, { title: "Synthetic operator-owned teapot launch", duration_estimate: fixed(5), category_tag: "work", tags: ["work"] });
    await call(o.base,"PATCH",endpoints.UNIVERSE_STATE_PATH,{schema_version:endpoints.UNIVERSE_STATE_SCHEMA_VERSION,mutations:[{operation:"set_numeric",target,payload:0,provenance_kind:"measured"}]});
    const before = await readTask(o,task.task_id);
    ok(!before.payload.preconditions,"the new Task has no requirement");
    const path = fill(endpoints.TASK_PATH,{task_id:task.task_id});
    const leaf = {target,predicate:"greater_than",expected:0};
    await call(o.base,"PATCH",path,{schema_version:endpoints.TASK_CAPTURE_SCHEMA_VERSION,expected_version:before.version,preconditions:leaf});
    const authored = await readTask(o,task.task_id);
    same(authored.payload.preconditions,leaf,"the explicit operator-authored leaf is stored");
    for (const field of ["title","duration_estimate","category_tag","tags","description","static_window","effects","blocked_by"]) same(authored.payload[field],before.payload[field],`only the condition changes, preserving ${field}`);
    const planned = await call(o.base,"POST",endpoints.PLANNING_GENERATE_PATH,{schema_version:endpoints.PLANNING_SCHEMA_VERSION,request:null});
    ok(planned.blocked_tasks.some((row)=>row.task_id===task.task_id),"the false condition excludes the Task");
    const stale = await call(o.base,"PATCH",path,{schema_version:endpoints.TASK_CAPTURE_SCHEMA_VERSION,expected_version:before.version,preconditions:null},409);
    same(stale.diagnostics[0].code,"version_conflict","clearing still observes the Task version");
    await call(o.base,"PATCH",path,{schema_version:endpoints.TASK_CAPTURE_SCHEMA_VERSION,expected_version:authored.version,preconditions:null});
    const cleared = await readTask(o,task.task_id);ok(!Object.hasOwn(cleared.payload,"preconditions"),"explicit null removes the requirement");
    const unblocked = await generatePlan(o);ok(unblocked.steps.some((row)=>row.task_id===task.task_id),"the cleared Task is plannable again");
    return "operator leaf authoring and null clearing use the existing versioned Task PATCH, preserve other fields and change the ordinary precondition gate";
  }
});
scenarios.push({
  name: "one producer-neutral selection report for eight routine occurrences",
  async run(o) {
    await putSetting(o, "universe.subject.synthetic", true);
    for (let n=0;n<8;n+=1) await call(o.base,"POST",endpoints.OBJECTIVE_CREATE_PATH,{
      schema_version:endpoints.OBJECTIVE_SCHEMA_VERSION,mode:"evergreen",title:`Synthetic shared-gate routine ${n}`,
      recurrence:{timezone:"UTC",rule:{kind:"daily"}},routine_instance_template:{title:`Synthetic shared-gate occurrence ${n}`,duration_estimate:fixed(1),nominal_start:timeOfDay(n+1),placement:"static",occupies_capacity:true,tags:[],reminder_minutes:[]}
    },201);
    const chosen = await captureTask(o,{title:"Synthetic eligible teapot",duration_estimate:fixed(1)});
    await call(o.base,"POST",endpoints.PLANNING_GENERATE_PATH,{schema_version:endpoints.PLANNING_SCHEMA_VERSION,request:null,horizon:{start:at(0),end:at(24)}});
    same((await listTasks(o)).filter((t)=>t.is_routine_occurrence).length,8,"eight ineligible occurrences are staged through HTTP");
    await call(o.base,"PATCH",endpoints.UNIVERSE_STATE_PATH,{schema_version:endpoints.UNIVERSE_STATE_SCHEMA_VERSION,mutations:[{operation:"set_fact",target:"facts.synthetic.teapot_ready",payload:true}]});
    const stub = await startModelStub();stub.mode="shared_selection";
    await putSetting(o,"advisory.model","synthetic-shared-gate-model");await putSetting(o,"advisory.endpoint",stub.endpoint);
    const run = (producer)=>call(o.base,"POST",endpoints.ADVISORY_RUN_PATH,{schema_version:endpoints.ADVISORY_RUN_SCHEMA_VERSION,producer,limit:25});
    const notes=[];
    for (const producer of ["vocabulary","precondition"]) {
      const result=await run(producer);same(result.status,"ok","a shared gate skip is information");
      same(result.selected.map((t)=>t.id),[chosen.task_id],"only the ordinary Task is selected");
      const shared=result.diagnostics.filter((d)=>d.code==="advisory_task_skipped");same(shared.length,4,"one gate report has three names and one count");
      same(shared[3].message,"5 more Tasks were skipped: they are routine occurrences or have neither a title nor a description","aggregate gives the remainder without Task ids");
      ok(!shared[3].message.includes("task_"),"the aggregate contains no Task id");notes.push(shared);
    }
    same(notes[0],notes[1],"independent producer responses agree on the shared decision; UI deduplicates the latest report");
    stub.badSelectionProposal=true;
    for (const producer of ["vocabulary","precondition"]) {
      const result=await run(producer);same(result.diagnostics.filter((d)=>d.code==="advisory_task_skipped").length,4,"the gate decision is emitted once");
      ok(result.diagnostics.some((d)=>d.code===`${producer}_proposal_refused`),"proposal refusal retains its own producer code");
    }
    return "eight occurrences produce four shared selection notes in each independent run, and malformed proposals retain producer-specific refusals";
  }
});
scenarios.push({
  name: "reconcile a stamped export whose Task this store does not have",
  seeded: true,
  async run(first) {
    const id="018f3c8e9b2a7c4d8f1e2a3b4c5d6e70";
    const item=(externalId,title,hour,stamp)=>({id:externalId,summary:title,start:{dateTime:at(hour)},end:{dateTime:at(hour,30)},reminders:{useDefault:true},...(stamp?{extendedProperties:{private:{ubu_task:`task_${externalId}`}}}:{})});
    const o=await restartObserving(first,[item(id,"Synthetic stamped teapot export",1,true),item(FOREIGN_ID,"Synthetic ordinary teapot visit",2,false)]);
    const before=await reconcile(o);same(before.conflicts.map((c)=>c.conflict_type),["foreign","foreign"],"the known four-type UI grouping is preserved");
    const stale=before.conflicts.find((c)=>c.external_id===id);
    same(stale.message,`Calendar event \`${id}\` was created by UbU for a Task this store does not have, so it is left alone and becomes no Task`,"minted origin uses capture's exact sentence");
    same(before.conflicts.find((c)=>c.external_id===FOREIGN_ID).message,"this event was not created by UbU and will not be touched","genuinely foreign wording is unchanged");
    same((await listTasks(o)).length,0,"reconciliation adopts neither event");
    const captured=await capture(o);same([captured.captured,captured.skipped],[1,1],"capture skips the stamped echo and captures the ordinary event");
    same(captured.diagnostics.find((d)=>d.code==="capture_stale_export").message,stale.message,"capture and reconciliation tell the same origin story");
    const after=await reconcile(o);same(after.conflicts.map((c)=>[c.conflict_type,c.external_id]),[["foreign",id]],"the stamped echo never becomes an applied or owned event");
    return "stamp evidence changes only the truthful origin message; foreign grouping, ordering, capture and non-adoption remain intact";
  }
});

scenarios.push({
  name: "new-write subjects and predicates preserve legacy cleanup",
  async run(o) {
    const read = () => call(o.base,"GET",endpoints.UNIVERSE_STATE_PATH);
    const edit = (mutations,status=200) => call(o.base,"PATCH",endpoints.UNIVERSE_STATE_PATH,{schema_version:endpoints.UNIVERSE_STATE_SCHEMA_VERSION,mutations},status);
    for (const [target,code] of [["facts.teapot.ready","universe_target_subject_unknown"],["facts.single_leaf","universe_target_grammar_invalid"]]) {
      const error=await edit([{operation:"set_fact",target:"facts.operator.ready",payload:true},{operation:"set_fact",target,payload:true}],400);
      same(error.diagnostics[0].code,code,"new-write governance refuses one bad mutation and its entire list");
      same((await read()).version,null,"refusal leaves no empty seed or earlier write");
    }
    await putSetting(o,"universe.subject.teapot",true);
    const settings=await call(o.base,"GET",endpoints.SETTINGS_LIST_PATH);
    same(settings.settings.filter(s=>s.name.startsWith("universe.subject.")).map(s=>[s.name,s.value]),[["universe.subject.teapot",true]],"the registry stores provisional subjects only");
    await edit([
      {operation:"set_fact",target:"facts.operator.ready",payload:true},
      {operation:"set_fact",target:"facts.teapot.ready",payload:true},
      {operation:"set_fact",target:"facts.github.issue.14.pipeline_state",payload:"synthetic"}
    ]);
    const legacy=(await captureTask(o,{title:"Synthetic legacy fixture writer",duration_estimate:fixed(1),effects:{mutations:[
      {operation:"set_fact",target:"facts.legacy_leaf",payload:true},
      {operation:"set_numeric",target:"numeric_values.legacy_number",payload:3},
      {operation:"add_membership",target:"set_memberships.legacy_set",payload:"synthetic"}
    ]}})).task_id;
    same((await recordAction(o,legacy,"complete")).diagnostics,[],"unchanged Task effects create the invented pre-existing legacy state");
    const waiting=await captureTask(o,{title:"Synthetic legacy requirement",duration_estimate:fixed(1),preconditions:{target:"facts.legacy_leaf",predicate:"equals",expected:true}});
    ok((await generatePlan(o)).steps.some(s=>s.task_id===waiting.task_id),"a pre-existing single-segment target still evaluates");
    const stub=await startModelStub();stub.mode="precondition";stub.preconditionTaskIds=[];
    await putSetting(o,"advisory.model","synthetic-legacy-model");await putSetting(o,"advisory.endpoint",stub.endpoint);
    await call(o.base,"POST",endpoints.ADVISORY_RUN_PATH,{schema_version:endpoints.ADVISORY_RUN_SCHEMA_VERSION,producer:"precondition",limit:25});
    ok(JSON.parse(stub.requests[0].body.prompt).targets.includes("facts.legacy_leaf"),"recorded target enumeration retains the legacy name");
    const agenda=await call(o.base,"GET",endpoints.SETTINGS_LIST_PATH);
    const subject=agenda.settings.find(row=>row.name==="universe.subject.teapot");
    same(subject.subject_metadata.references,{universe_state_keys:1,fact_provenance_keys:1,task_precondition_targets:0},"registry metadata counts references without emitting their keys or values");
    const refusal=await call(o.base,"DELETE",fill(endpoints.SETTING_DELETE_PATH,{name:"universe.subject.teapot"}),undefined,409);
    same(refusal.diagnostics[0].code,"subject_referenced","referenced retirement is refused");
    const before=await edit([{operation:"clear_fact",target:"facts.teapot.ready"}]);
    await call(o.base,"DELETE",fill(endpoints.SETTING_DELETE_PATH,{name:"universe.subject.teapot"}),undefined,204);
    same((await edit([{operation:"set_fact",target:"facts.teapot.ready",payload:false}],400)).diagnostics[0].code,"universe_target_subject_unknown","retirement refuses new writes");
    same(await read(),before,"retirement never rewrites existing target data");
    await edit([
      {operation:"clear_fact",target:"facts.teapot.ready"},
      {operation:"clear_fact",target:"facts.legacy_leaf"},
      {operation:"clear_numeric",target:"numeric_values.legacy_number"},
      {operation:"remove_membership",target:"set_memberships.legacy_set",payload:"synthetic"}
    ]);
    const cleared=await read();same([cleared.numeric_values,cleared.set_memberships],[{},{}],"legacy numeric/set cleanup still works");
    same(cleared.facts,{"operator.ready":true,"github.issue.14.pipeline_state":"synthetic"},"legacy clearing preserves unrelated governed values");
    return "new writes require a known subject and predicate; explicit minting/retirement leaves legacy enumeration, evaluation and clear/remove intact";
  }
});
scenarios.push({
  name: "vocabulary schema constrains subjects without discarding survivors",
  async run(o) {
    await putSetting(o,"universe.subject.teapot",true);
    const task=await captureTask(o,{title:"Synthetic teapot readiness inspection",duration_estimate:fixed(1)});
    const before=await readTask(o,task.task_id);
    const stub=await startModelStub();stub.mode="vocabulary";
    stub.vocabularyNames=["facts.teapot.ready","facts.unminted.ready","facts.operator"];
    await putSetting(o,"advisory.model","synthetic-subject-model");await putSetting(o,"advisory.endpoint",stub.endpoint);
    const result=await call(o.base,"POST",endpoints.ADVISORY_RUN_PATH,{schema_version:endpoints.ADVISORY_RUN_SCHEMA_VERSION,producer:"vocabulary",limit:25});
    same([result.status,result.candidates_enqueued],["ok",1],"unknown subject and missing predicate lose only their own candidates");
    same(result.diagnostics.map(d=>d.code),["vocabulary_proposal_refused","vocabulary_proposal_refused"],"per-proposal refusals retain the producer's code");
    ok(result.diagnostics[0].message.includes("mint it explicitly"),"unknown subject names the operator's minting act");
    ok(result.diagnostics[1].message.includes("lowercase snake_case predicate"),"single-segment key names the missing grammar");
    const request=stub.requests[0].body,target=request.format.properties.proposals.items.properties.target;
    same(target,{type:"string",pattern:"^(facts|numeric_values)\\.(github|operator|project|relationship|teapot)\\.([A-Za-z0-9_-]+\\.)*[a-z][a-z0-9]*(_[a-z0-9]+)*$",maxLength:128},"actual HTTP request constrains the effective subject vocabulary minus affect");
    same(JSON.parse(request.prompt).subjects,["github","operator","project","relationship","teapot"],"only subject names reach model context");
    const matches=(name)=>name.length<=target.maxLength&&new RegExp(target.pattern).test(name);
    for(const name of ["facts.teapot.ready","numeric_values.operator.level","facts.github.issue.14.pipeline_state"]) ok(matches(name),"grammatical effective subjects are expressible");
    for(const name of ["facts.affect.energy","facts.unminted.ready","facts.operator","facts.teapot.Upper_leaf","facts.teapot."+"a".repeat(128)]) ok(!matches(name),"forbidden or malformed subject/predicate names are not expressible");
    same(await readTask(o,task.task_id),before,"the advisory run changes no Task");
    same((await call(o.base,"GET",endpoints.UNIVERSE_STATE_PATH)).version,null,"a proposal mints no subject and writes no observation");
    return "the real schema names exactly effective subjects minus affect with a final predicate; injected grammar violations keep ok status and the usable candidate";
  }
});

scenarios.push({
  name: "invocation provenance and unchanged pre-ticket Plan fields",
  async run(o) {
    const a = await captureTask(o, { title: "Synthetic golden copper teapot", duration_estimate: fixed(5) });
    const b = await captureTask(o, { title: "Synthetic golden silver shelf", duration_estimate: fixed(7) });
    const body = { schema_version: endpoints.PLANNING_SCHEMA_VERSION, request: {
      schema_version: endpoints.PLANNING_SCHEMA_VERSION, request_id: "fixture-golden", rng_seed: 17,
      compute_budget: { n_rollouts: 0, top_k: 3 }, time_window: { start: 1791331200, end: 1791338400 },
      tasks: [{ id: a.task_id, duration: 300 }, { id: b.task_id, duration: 420, depends_on: [a.task_id] }]
    } };
    const result = await call(o.base, "POST", endpoints.PLANNING_GENERATE_PATH, body);
    ok(result.plan, "the invented fixture store yielded a committed Plan");
    const replacements = [[a.task_id, "task_fixture_a"], [b.task_id, "task_fixture_b"], [result.plan.id, "plan_fixture"]];
    const volatileTimes = new Set(["created_at", "risk_report/generated_at", "human_complete_plan_quality/generated_at", "replay_metadata/generated_at"]);
    function normalized(value, path = []) {
      if (volatileTimes.has(path.join("/"))) {
        ok(typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value) && Number.isFinite(Date.parse(value)), `existing ${path.join("/")} remains a valid UTC timestamp`);
        return "2026-10-07T00:00:00Z";
      }
      if (Array.isArray(value)) return value.map((v, index) => normalized(v, [...path, String(index)]));
      if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((k) => [k, normalized(value[k], [...path, k])]));
      if (typeof value === "string") for (const [from, to] of replacements) value = value.replaceAll(from, to);
      return value;
    }
    const projection = { ...result.plan };
    delete projection.engine_provenance;
    delete projection.replay_metadata;
    const actualBytes = JSON.stringify(normalized(projection), null, 2) + "\n";
    const goldenBytes = readFileSync(new URL("../fixtures/planning-worker/pre-ticket-plan.json", import.meta.url), "utf8");
    ok(actualBytes === goldenBytes, "every pre-existing Plan field is byte-identical after only old volatile IDs and three explicit generation timestamps are normalized");
    const fullGoldenBytes = readFileSync(new URL("../fixtures/planning-worker/p1b70-complete-plan.json", import.meta.url), "utf8");
    ok(JSON.stringify(normalized(result.plan), null, 2) + "\n" === fullGoldenBytes, "the complete P1B-70 Plan including provenance and replay metadata remains byte-identical after only volatile IDs and four named generation timestamps are normalized");
    function cpuProvenance(response) {
      same(response.engine_provenance.backend_kind, "cpu_reference", "actual computation is CPU reference");
      same(response.engine_provenance.invocation_kind, "in_process_cpu", "actual invocation is in-process CPU");
      same(response.engine_provenance.cpu_certification_status, "certified", "CPU certification is recorded");
      same(response.engine_provenance.tolerance_profile, "boundary-v1", "the numeric profile travels on provenance");
      ok(!Object.hasOwn(response.engine_provenance, "framework"), "CPU provenance claims no framework");
      same(response.plan.engine_provenance, response.engine_provenance, "the admitted Plan carries the response provenance");
      for (const field of ["planner_version", "rng_seed_echo", "effective_time", "generated_at"]) same(response.plan.replay_metadata[field], response[field], `the admitted Plan retains ${field}`);
    }
    cpuProvenance(result);
    same(result.rng_seed_echo, 17, "the original fixture seed is echoed");
    const current = await call(o.base, "GET", endpoints.CALENDAR_CURRENT_PATH);
    same(current.plan_id, result.plan.id, "the current Calendar reads the persisted Plan");
    same(current.selected_candidate, result.selected_candidate, "persisted placements and scores survive the read");
    await putSetting(o, "planning.gpu_enabled", true);
    const enabled = await call(o.base, "POST", endpoints.PLANNING_GENERATE_PATH, body);
    cpuProvenance(enabled);
    const diagnostic = enabled.diagnostics.find((d) => d.code === "planning_gpu_unavailable");
    ok(diagnostic?.message.includes("unsupported_strategy"), "policy-on names the unchanged ChunkedSweep strategy's unsupported Stage 1 profile");
    ok(enabled.diagnostics.some((d) => d.code === "planning_gpu_fallback_unsupported_strategy"), "the public diagnostic code carries the fallback reason without message disclosure");
    same(enabled.selected_candidate, result.selected_candidate, "policy-on preserves the CPU selected candidate");
    await call(o.base, "DELETE", endpoints.SETTING_DELETE_PATH.replace("{name}", "planning.gpu_enabled"), undefined, 204);
    const restored = await call(o.base, "POST", endpoints.PLANNING_GENERATE_PATH, body);
    ok(!restored.diagnostics.some((d) => d.code === "planning_gpu_unavailable"), "withdrawal restores default-off without an environment probe diagnostic");
    return "complete old Plan-field golden preserved; CPU provenance and replay persist; policy-on reports unavailable GPU compute and still uses CPU";
  }
});

scenarios.push({
  name: "a seeded ranking layers the backlog",
  async run(o) {
    const ids=[],titles=new Map();
    for(let i=1;i<=12;i++) {
      const title=`Invented ranked ${String(i).padStart(2,"0")}`;
      const task=await captureTask(o,{title,duration_estimate:fixed(15)});
      ids.push(task.task_id);titles.set(task.task_id,title);
    }
    const ranking=rankingStatements(ids,{seed:7,layers:4});
    for(const statement of ranking.statements)await call(o.base,"POST",endpoints.PREFERENCE_CREATE_PATH,{schema_version:endpoints.PREFERENCE_SCHEMA_VERSION,...statement},201);
    same((await call(o.base,"GET",endpoints.PREFERENCE_LIST_PATH)).preferences.length,11,"the synthetic stand-in admits eleven pairwise statements");
    // Read the full response here; generatePlan deliberately returns only Plan.
    const response=await call(o.base,"POST",endpoints.PLANNING_GENERATE_PATH,{schema_version:endpoints.PLANNING_SCHEMA_VERSION,request:null});
    ok(response.plan,"the ranked invented backlog yields a Plan");
    same(response.task_priorities.length,12,"the server explains all twelve invented Tasks");
    same(response.task_priorities.map(row=>row.task_id).sort(),[...ids].sort(),"every invented Task has exactly one priority row");
    const expected=new Map(ranking.buckets.flatMap((bucket,p)=>bucket.map(id=>[id,{bucket:p,bucket_count:4,value:p===3?0.1:1.0-0.9*p/3}])));
    for(const row of response.task_priorities)same({bucket:row.bucket,bucket_count:row.bucket_count,value:row.value},expected.get(row.task_id),`${titles.get(row.task_id)}: the server's bucket and exact value`);
    same(response.diagnostics.filter(d=>["preference_cycle","preference_ignored_unknown_task"].includes(d.code)),[],"no cycle or ignored-Task diagnostic");
    same(rankingStatements([...ids].reverse(),{seed:7,layers:4}).statements,ranking.statements,"reordered listing with seed 7 retains identical statements");
    ok(JSON.stringify(rankingStatements(ids,{seed:8,layers:4}).statements)!==JSON.stringify(ranking.statements),"seed 8 produces different statements");
    return "synthetic_stand_in: eleven admitted statements yield twelve server priority rows in four buckets, with exact values and unchanged listing-order semantics";
  }
});

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
