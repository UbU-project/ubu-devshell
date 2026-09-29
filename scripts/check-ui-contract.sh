#!/usr/bin/env bash
# check-ui-contract.sh: does ubu-ui's idea of the orchestrator match the
# orchestrator, and does the daily loop work over HTTP?
#
# Builds the real ubu-orchestrator and walks sixteen scenarios against it. Each
# scenario gets its own temporary store and its own orchestrator on an ephemeral
# loopback port, driven with the path and schema-version constants imported from
# ubu-ui/src/api/endpoints.ts. See docs/CONTRACT_CHECK.md.
#
# What this does NOT cover, and cannot:
#   - the Tauri HTTP plugin transport. Requests here are made by Node's fetch,
#     not by the plugin the app uses.
#   - the capability scope in ubu-ui/src-tauri/capabilities.
#   - anything rendered. No webview, no React, no screen is involved.
# Those three remain the operator's acceptance surface in `npm run tauri:dev`.
#
# Nothing here leaves the machine: the build is offline, each orchestrator binds
# 127.0.0.1 and runs in mock modes with no credentials in its environment, the
# model is a stub this run starts itself, and the Node script refuses any address
# that is not 127.0.0.1 on a port this run opened.
#
# Two live scenarios are opt-in and off by default: UBU_E2E_GOOGLE=1 and
# UBU_E2E_OLLAMA=1. Unset, they are reported as skipped, never as passed.
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

Builds ubu-orchestrator and walks sixteen scenarios against it, each with its
own temporary store and its own orchestrator on an ephemeral loopback port.
Prints one PASS or FAIL line per scenario, stops at the first failure with the
request, the status and the body, and exits non-zero on failure.

Does not cover the Tauri plugin transport, the capability scope or anything
rendered.

Environment overrides:
  REPOS_DIR                parent directory of all repos (default: ../)
  ORCHESTRATOR_DIR         path to ubu-orchestrator checkout
  UI_DIR                   path to ubu-ui checkout
  STARTUP_TIMEOUT_SECONDS  how long to wait for /health (default: 60)
  UBU_CHECK_VERBOSE=1      also print every request and its status
  UBU_CHECK_ONLY=7,8       walk only these scenarios; the result says it is partial

Live scenarios, off by default and reported as skipped when unset:
  UBU_E2E_GOOGLE=1         one read-only live reconcile; also needs
                           UBU_GOOGLE_CREDENTIALS_PATH and UBU_GOOGLE_TOKEN_CACHE_PATH
  UBU_E2E_OLLAMA=1         one live advisory run; also needs UBU_E2E_OLLAMA_MODEL,
                           and takes UBU_E2E_OLLAMA_ENDPOINT and UBU_E2E_OLLAMA_TIMEOUT_MS
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
CHECK_PID=""

# Runs on every exit path: success, failure, Ctrl-C and SIGTERM.
cleanup() {
  local status=$?
  trap - EXIT INT TERM
  if [[ -n "$CHECK_PID" ]] && kill -0 "$CHECK_PID" 2>/dev/null; then
    # The Node script stops its own orchestrators and stub when it is told to stop.
    kill "$CHECK_PID" 2>/dev/null || true
    wait "$CHECK_PID" 2>/dev/null || true
  fi
  # A backstop: any orchestrator the Node script started and did not stop. A pid
  # is only signalled while it is still a process running from the temp directory.
  if [[ -f "$WORK_DIR/pids" ]]; then
    while read -r pid; do
      if [[ -n "$pid" && "$(readlink "/proc/$pid/cwd" 2>/dev/null || true)" == "$WORK_DIR"/* ]]; then
        kill "$pid" 2>/dev/null || true
        echo "stopped: orchestrator pid $pid"
      fi
    done <"$WORK_DIR/pids"
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

echo "walk: every scenario gets its own store and orchestrator under $WORK_DIR"

# In the background and waited on, so a signal is handled at once rather than
# after the walk has finished.
status=0
node --experimental-strip-types --no-warnings "$SCRIPT_DIR/check-ui-contract.mjs" \
  --endpoints "$UI_DIR/src/api/endpoints.ts" \
  --config "$ORCHESTRATOR_DIR/src/config.rs" \
  --binary "$BINARY" \
  --work-dir "$WORK_DIR" \
  --startup-timeout "$STARTUP_TIMEOUT_SECONDS" &
CHECK_PID=$!
wait "$CHECK_PID" || status=$?
CHECK_PID=""
exit "$status"
