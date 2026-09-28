// check-ui-contract.mjs: the assertions behind check-ui-contract.sh.
//
// Run by that script, which owns the orchestrator process. Node 22 or newer,
// built-in fetch only, no dependency.
//
// What this does NOT cover: the Tauri HTTP plugin transport, the capability
// scope, and anything rendered. Those remain the operator's acceptance surface.
//
// The path and schema-version constants are imported from ubu-ui's
// endpoints.ts, never copied. The request bodies are the shapes ubu-ui's
// client.ts sends; client.ts itself cannot be imported here because it imports
// the Tauri plugin.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

function option(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || index + 1 >= process.argv.length) {
    throw new Error(`missing --${name}`);
  }
  return process.argv[index + 1];
}

class CheckFailure extends Error {}

function check(condition, message) {
  if (!condition) {
    throw new CheckFailure(message);
  }
}

const endpointsPath = option("endpoints");
const configPath = option("config");
const baseUrl = option("base-url");
const orchestratorPid = Number(option("pid"));
const startupTimeoutMs = Number(option("startup-timeout")) * 1000;

let requestCount = 0;

async function call(method, url, body) {
  const init = { method, headers: { Accept: "application/json" } };
  if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const response = await fetch(url, init);
  const text = await response.text();
  requestCount += 1;
  console.log(`  ${response.status} ${method} ${url}`);
  if (!response.ok) {
    throw new CheckFailure(`${method} ${url} returned ${response.status}\n  body: ${text}`);
  }
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new CheckFailure(`${method} ${url} returned ${response.status} with a body that is not JSON\n  body: ${text}`);
  }
}

function orchestratorIsRunning() {
  try {
    process.kill(orchestratorPid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitForHealth(url) {
  const deadline = Date.now() + startupTimeoutMs;
  while (Date.now() < deadline) {
    check(orchestratorIsRunning(), "the orchestrator exited before it answered /health");
    try {
      const response = await fetch(url);
      await response.arrayBuffer();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new CheckFailure(`the orchestrator did not answer ${url} within ${startupTimeoutMs / 1000}s`);
}

async function run() {
  check(new URL(baseUrl).hostname === "127.0.0.1", `refusing base URL ${baseUrl}: this check only talks to 127.0.0.1`);

  const endpoints = await import(pathToFileURL(endpointsPath).href);

  console.log("defaults:");
  const uiDefault = endpoints.DEFAULT_ORCHESTRATOR_PORT;
  check(typeof uiDefault === "string", `DEFAULT_ORCHESTRATOR_PORT is not exported by ${endpointsPath}`);
  const config = readFileSync(configPath, "utf8");
  const match = config.match(/env::var\("UBU_ORCHESTRATOR_PORT"\)[\s\S]*?\.unwrap_or\((\d+)\)/);
  check(match !== null, `could not find the UBU_ORCHESTRATOR_PORT unwrap_or(...) default in ${configPath}`);
  const orchestratorDefault = match[1];
  console.log(`  ubu-ui            DEFAULT_ORCHESTRATOR_PORT = ${uiDefault}`);
  console.log(`  ubu-orchestrator  UBU_ORCHESTRATOR_PORT unwrap_or = ${orchestratorDefault}`);
  check(
    uiDefault === orchestratorDefault,
    `DEFAULT PORTS DIFFER: ubu-ui defaults to ${uiDefault} but ubu-orchestrator defaults to ${orchestratorDefault}. ` +
      "With no override the app would call a port nothing is listening on."
  );
  console.log("  the two defaults agree");

  console.log(`requests against ${baseUrl}:`);
  await waitForHealth(`${baseUrl}${endpoints.HEALTH_PATH}`);

  const health = await call("GET", `${baseUrl}${endpoints.HEALTH_PATH}`);
  check(typeof health?.status === "string", `/health returned no status: ${JSON.stringify(health)}`);

  const title = "Synthetic contract-check Task";
  const captured = await call("POST", `${baseUrl}${endpoints.TASK_CAPTURE_PATH}`, {
    schema_version: endpoints.TASK_CAPTURE_SCHEMA_VERSION,
    title,
    duration_estimate: { type: "fixed", seconds: 1500 }
  });
  check(typeof captured?.task_id === "string", `capture returned no task_id: ${JSON.stringify(captured)}`);
  check(
    captured.schema_version === endpoints.TASK_CAPTURE_SCHEMA_VERSION,
    `capture answered schema_version ${captured.schema_version}, ubu-ui expects ${endpoints.TASK_CAPTURE_SCHEMA_VERSION}`
  );

  const listQuery = new URLSearchParams({ schema_version: endpoints.TASK_READ_SCHEMA_VERSION, status: "active" });
  const listed = await call("GET", `${baseUrl}${endpoints.TASK_LIST_PATH}?${listQuery}`);
  const row = listed?.tasks?.find((task) => task.task_id === captured.task_id);
  check(row !== undefined, `the captured Task ${captured.task_id} is not in GET ${endpoints.TASK_LIST_PATH}`);
  check(row.title === title, `the listed Task has title ${JSON.stringify(row.title)}, expected ${JSON.stringify(title)}`);

  const editedTitle = "Synthetic contract-check Task, edited";
  const taskUrl = `${baseUrl}${endpoints.TASK_PATH.replace("{task_id}", encodeURIComponent(captured.task_id))}`;
  const edited = await call("PATCH", taskUrl, {
    schema_version: endpoints.TASK_CAPTURE_SCHEMA_VERSION,
    expected_version: row.version,
    title: editedTitle
  });
  check(edited?.version > row.version, `the edit did not advance the version: ${JSON.stringify(edited)}`);

  const planned = await call("POST", `${baseUrl}${endpoints.PLANNING_GENERATE_PATH}`, {
    schema_version: endpoints.PLANNING_SCHEMA_VERSION,
    request: null
  });
  check(
    planned?.schema_version === endpoints.PLANNING_SCHEMA_VERSION,
    `planning answered schema_version ${planned?.schema_version}, ubu-ui expects ${endpoints.PLANNING_SCHEMA_VERSION}`
  );

  const nextQuery = new URLSearchParams({ schema_version: endpoints.NEXT_ACTION_SCHEMA_VERSION });
  const next = await call("GET", `${baseUrl}${endpoints.NEXT_ACTION_PATH}?${nextQuery}`);
  check(
    next?.schema_version === endpoints.NEXT_ACTION_SCHEMA_VERSION,
    `next-action answered schema_version ${next?.schema_version}, ubu-ui expects ${endpoints.NEXT_ACTION_SCHEMA_VERSION}`
  );

  console.log("paths in the live /openapi.json:");
  const spec = await call("GET", `${baseUrl}/openapi.json`);
  const live = new Set(Object.keys(spec?.paths ?? {}));
  const constants = Object.entries(endpoints).filter(([name]) => name.endsWith("_PATH"));
  check(constants.length > 0, `${endpointsPath} exports no *_PATH constant`);
  const missing = [];
  for (const [name, path] of constants) {
    const present = live.has(path);
    console.log(`  ${present ? "ok     " : "MISSING"} ${name} = ${path}`);
    if (!present) {
      missing.push(`${name} = ${path}`);
    }
  }
  check(
    missing.length === 0,
    `${missing.length} path constant(s) in endpoints.ts are not served by this orchestrator: ${missing.join(", ")}`
  );

  return `defaults agree on ${uiDefault}, ${requestCount} requests succeeded, ${constants.length} of ${constants.length} path constants are live`;
}

try {
  const summary = await run();
  console.log(`PASS: ubu-ui contract check: ${summary}`);
} catch (error) {
  const reason = error instanceof CheckFailure ? error.message : `unexpected error: ${error?.stack ?? error}`;
  console.log(`FAIL: ubu-ui contract check: ${reason}`);
  process.exitCode = 1;
}
