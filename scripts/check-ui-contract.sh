#!/usr/bin/env bash
# check-ui-contract.sh: does ubu-ui's idea of the orchestrator match the orchestrator?
#
# Builds the real ubu-orchestrator, starts it on an ephemeral loopback port with
# a temporary store, and drives it with the path and schema-version constants
# imported from ubu-ui/src/api/endpoints.ts. See docs/CONTRACT_CHECK.md.
#
# What this does NOT cover, and cannot:
#   - the Tauri HTTP plugin transport. Requests here are made by Node's fetch,
#     not by the plugin the app uses.
#   - the capability scope in ubu-ui/src-tauri/capabilities.
#   - anything rendered. No webview, no React, no screen is involved.
# Those three remain the operator's acceptance surface in `npm run tauri:dev`.
#
# Nothing here leaves the machine: the build is offline, the orchestrator binds
# 127.0.0.1, runs in mock GitHub modes with no credentials in its environment,
# and the Node script refuses any base URL that is not 127.0.0.1.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPOS_DIR="${REPOS_DIR:-$(cd "$ROOT_DIR/.." && pwd)}"
ORCHESTRATOR_DIR="${ORCHESTRATOR_DIR:-$REPOS_DIR/ubu-orchestrator}"
UI_DIR="${UI_DIR:-$REPOS_DIR/ubu-ui}"
STARTUP_TIMEOUT_SECONDS="${STARTUP_TIMEOUT_SECONDS:-60}"

usage() {
  cat <<'USAGE'
Usage: check-ui-contract.sh

Builds ubu-orchestrator, runs it on an ephemeral loopback port with a temporary
store, and checks ubu-ui's endpoints.ts against it. Prints one PASS or FAIL
line and exits non-zero on failure.

Does not cover the Tauri plugin transport, the capability scope or anything
rendered.

Environment overrides:
  REPOS_DIR                parent directory of all repos (default: ../)
  ORCHESTRATOR_DIR         path to ubu-orchestrator checkout
  UI_DIR                   path to ubu-ui checkout
  STARTUP_TIMEOUT_SECONDS  how long to wait for /health (default: 60)
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

fail() {
  echo "FAIL: $1"
  exit 1
}

[[ -f "$ORCHESTRATOR_DIR/Cargo.toml" ]] || fail "missing orchestrator repo at $ORCHESTRATOR_DIR"
[[ -f "$UI_DIR/src/api/endpoints.ts" ]] || fail "missing $UI_DIR/src/api/endpoints.ts"
command -v cargo >/dev/null 2>&1 || fail "cargo is required to build ubu-orchestrator"
command -v node >/dev/null 2>&1 || fail "node 22 or newer is required"
node_major="$(node -p 'process.versions.node.split(".")[0]')"
[[ "$node_major" -ge 22 ]] || fail "node 22 or newer is required, found $(node --version)"

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ubu-contract-check.XXXXXX")"
ORCHESTRATOR_PID=""
CHECK_PID=""

# Runs on every exit path: success, failure, Ctrl-C and SIGTERM.
cleanup() {
  local status=$?
  trap - EXIT INT TERM
  if [[ -n "$CHECK_PID" ]] && kill -0 "$CHECK_PID" 2>/dev/null; then
    kill "$CHECK_PID" 2>/dev/null || true
    wait "$CHECK_PID" 2>/dev/null || true
  fi
  if [[ -n "$ORCHESTRATOR_PID" ]] && kill -0 "$ORCHESTRATOR_PID" 2>/dev/null; then
    kill "$ORCHESTRATOR_PID" 2>/dev/null || true
    wait "$ORCHESTRATOR_PID" 2>/dev/null || true
    echo "stopped: orchestrator pid $ORCHESTRATOR_PID"
  fi
  rm -rf "$WORK_DIR"
  echo "removed: $WORK_DIR"
  exit "$status"
}
trap cleanup EXIT
trap 'echo "interrupted"; exit 130' INT TERM

echo "build: cargo build --locked --offline in $ORCHESTRATOR_DIR"
if ! (cd "$ORCHESTRATOR_DIR" && cargo build --locked --offline --message-format=json-render-diagnostics >"$WORK_DIR/build.json"); then
  fail "ubu-orchestrator did not build; the check cannot run without the real binary"
fi
BINARY="$(node -e '
  const lines = require("fs").readFileSync(process.argv[1], "utf8").split("\n");
  const bins = lines.filter(Boolean).map((line) => JSON.parse(line))
    .filter((m) => m.reason === "compiler-artifact" && m.executable && m.target.kind.includes("bin"));
  process.stdout.write(bins.length ? bins[bins.length - 1].executable : "");
' "$WORK_DIR/build.json")"
[[ -x "$BINARY" ]] || fail "the build produced no orchestrator binary"
echo "built: $BINARY"

PORT="$(node -e '
  const server = require("net").createServer();
  server.listen(0, "127.0.0.1", () => {
    const { port } = server.address();
    server.close(() => process.stdout.write(String(port)));
  });
')"
echo "start: orchestrator on ephemeral port $PORT, store in $WORK_DIR"

# A scrubbed environment: no token, no Google credential and no operator store
# can reach this process, and HOME is the temp directory.
(
  cd "$WORK_DIR"
  exec env -i \
    PATH="$PATH" \
    HOME="$WORK_DIR" \
    UBU_ORCHESTRATOR_PORT="$PORT" \
    UBU_DB_PATH="$WORK_DIR/contract-check.db" \
    UBU_DEVICE_REGISTRATION="$WORK_DIR/device-registration.json" \
    UBU_GITHUB_INGEST_MODE=mock \
    UBU_GITHUB_PROJECTION_EXPORT_MODE=mock \
    "$BINARY"
) >"$WORK_DIR/orchestrator.log" 2>&1 &
ORCHESTRATOR_PID=$!

# In the background and waited on, so a signal is handled at once rather than
# after the check has finished.
status=0
node --experimental-strip-types --no-warnings "$SCRIPT_DIR/check-ui-contract.mjs" \
  --endpoints "$UI_DIR/src/api/endpoints.ts" \
  --config "$ORCHESTRATOR_DIR/src/config.rs" \
  --base-url "http://127.0.0.1:$PORT" \
  --pid "$ORCHESTRATOR_PID" \
  --startup-timeout "$STARTUP_TIMEOUT_SECONDS" &
CHECK_PID=$!
wait "$CHECK_PID" || status=$?
CHECK_PID=""

if [[ "$status" -ne 0 ]]; then
  echo "--- orchestrator log (last 40 lines) ---"
  tail -n 40 "$WORK_DIR/orchestrator.log" || true
  echo "--- end of orchestrator log ---"
fi
exit "$status"
