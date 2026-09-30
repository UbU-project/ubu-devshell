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
import { appendFileSync, mkdirSync, openSync, readFileSync } from "node:fs";
import net from "node:net";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

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

// --------------------------------------------------------------- the seeds
//
// `make` stages it. `check` asserts, over HTTP, that the state a step relies on
// actually holds — not that a request was accepted, but that the API now agrees.

const SEEDS = {
  completable: {
    what: "a ready Task that Next Task recommends, to complete and then undo",
    async make() {
      // Created FIRST, because with no explicit priority next_action_service
      // orders by created_at then id, so the earliest ready Task is recommended.
      // It carries a description so Clarify's default skips over it: step 5 must
      // not act on the Task steps 2 to 4 are interviewing.
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
      if (!recommendation) throw new StagingFailure("Next Task recommends nothing: step 5 would have no Complete button");
      if (recommendation.task_id !== made.task_id) {
        throw new StagingFailure(
          `Next Task recommends ${recommendation.title} (${recommendation.task_id}), not the Task staged for step 5 — ` +
            `step 5 would act on a Task another step is using`
        );
      }
      return `${task.payload.title} (${made.task_id}), recommended now`;
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
    what: "an active Task that already has a description, so Clarify's default has something to skip over",
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
  }
};

// --------------------------------------------------------------- the steps
//
// Each names the seeds it acts on. A step that names none is one whose
// precondition is genuinely an empty store or the app alone.

const STEPS = [
  {
    needs: [],
    title: "Setup → Run self-check",
    expect: "Three reads answered, nothing written. This proves the Tauri transport reaches this staged orchestrator.",
    codes: []
  },
  {
    needs: ["interview", "described", "advisory"],
    title: "Review → Clarify → Run, with the selector left on its default",
    expect: "The selected Task is {interview}, not {described}. A proposal appears in the queue with its questions.",
    codes: [
      "candidates_enqueued: 1 and no diagnostic: the run happened and there is a proposal to answer",
      "clarify_already_queued: a proposal for it is already waiting below; answer that one, this run did not ask the model",
      "advisory_unconfigured or advisory_endpoint_invalid: the model is not configured; set advisory.model in Setup, the run did not happen",
      "advisory_http_failed, advisory_timeout, advisory_empty_response or advisory_connection_failed: the model was asked and failed; the diagnostic says what to change"
    ]
  },
  {
    needs: ["interview"],
    title: "Answer that proposal: fill in the questions and Save answers",
    expect: "The card leaves the queue and the run result says the answers were saved. Which questions appear, and whether one depends on another, is the model's choice and is not checked here; that a dependent question shows only when its dependency is answered is asserted by the runner's clarify scenario and ubu-ui test 66.",
    codes: [
      "advisory_answer_required: Save was pressed with nothing answered; answer at least one question",
      "clarify_invalid_answer: a yes/no question was answered with something else; use Yes or No",
      "clarify_description_too_large: the interview has outgrown the Task's notes; nothing was written"
    ]
  },
  {
    needs: ["interview"],
    title: "Tasks → expand “Notes for {interview}”",
    expect: "The notes hold the Q:/A: pairs you just answered, in the order asked, whole and readable. Edit the Task: the same text is in the Notes field. Cancel without saving.",
    codes: []
  },
  {
    needs: ["interview", "advisory"],
    title: "Review → Clarify → Run again, with the selector set to {interview}",
    expect: "One of three outcomes, and each is a result to report, not a defect: a second round of questions; the model is done; or the run did not happen because the selector was not set.",
    codes: [
      "candidates_enqueued: 1: a second round, a new question set that does not repeat the first",
      "clarify_no_questions with candidates_enqueued: 0: the model has nothing more to ask, the interview is finished",
      "clarify_no_task: THE RUN DID NOT HAPPEN. The selector was left on its default, and on its default Clarify takes only a Task with no description; set the selector to {interview} and run again"
    ]
  },
  {
    needs: ["completable"],
    title: "Next Task → Complete, then Undo completion",
    expect: "{completable} is completed, then active again, and comes back as the recommendation.",
    codes: [
      "reopen_not_completed: Undo was pressed twice; there is nothing left to undo",
      "reopen_stale_completion: the app named a completion that is not the latest; reload Next Task and try once"
    ]
  },
  {
    needs: ["spent", "completable"],
    title: "Today → Time by category → Show report",
    expect: "The range reads as the last 7 days. A row for personal carries at least 1 h, from {spent}. {completable} appears in no row: it was completed and then reopened, and a reopened Task contributes nothing. Change the days to 1 and reload: the personal row is still there, since yesterday's hour is inside one day.",
    codes: [
      "no code: an empty report says there is no recorded time in the range, and is not an error",
      "time_by_category_invalid_range: from is after to; the app never sends that, so report it as a defect"
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

  console.log("staging:");
  const staged = {};
  for (const [name, seed] of Object.entries(SEEDS)) {
    const made = await seed.make();
    const described = await seed.check(made);
    staged[name] = { made, described };
    console.log(`  OK  ${name}: ${described}`);
    console.log(`      ${seed.what}`);
  }
  for (const name of unused) console.log(`  --  ${name}: staged but no step names it`);

  const title = (text) => text.replace(/\{(\w+)\}/g, (_, name) => staged[name]?.described ?? `{${name}}`);
  console.log("\nsteps: run these in the app, in order.\n");
  STEPS.forEach((step, index) => {
    console.log(`  ${index + 1}. ${title(step.title)}`);
    console.log(`     expect: ${title(step.expect)}`);
    // The diagnostic codes a step can meet, each with what it means, so an outcome is never
    // misread: in particular the one that means the run did not happen.
    console.log(step.codes.length === 0 ? "     codes:  none; this step has no diagnostic to meet" : `     codes:  ${title(step.codes[0])}`);
    for (const code of step.codes.slice(1)) console.log(`             ${title(code)}`);
    console.log("");
  });
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
