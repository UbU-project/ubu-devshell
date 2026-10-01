#!/usr/bin/env bash
# acceptance.sh: stage the store the operator's acceptance steps need, and hold
# one orchestrator up on the app's default port while the operator drives the app.
#
# Builds the real ubu-orchestrator, makes a throwaway store in a temp directory,
# starts one orchestrator on the app's default port so `npm run tauri:dev`
# reaches it with no configuration anywhere, stages the seeds each acceptance
# step declares it needs, checks every seed over HTTP, prints the numbered steps
# with the staged objects named in them, and waits for Ctrl-C.
# See docs/ACCEPTANCE.md.
#
# What this deliberately does NOT do:
#   - assert anything about behaviour. Assertions belong in check-ui-contract.sh;
#     a step whose outcome can be asserted over HTTP is not a manual step.
#   - drive the app. The rendered layer is the one reason a human opens it.
#   - open the operator's own store. HOME and UBU_DB_PATH are both inside the
#     temp directory, the modes are mock, and no credential is in the
#     environment, so ubu-orchestrator.db in the repo cannot be read or written.
#
# Nothing here leaves the machine: the build is offline and the orchestrator
# binds 127.0.0.1. The harness refuses to start if something already answers on
# the default port, so the app can never be talking to a real orchestrator
# while the operator follows steps written for a staged one.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Build settings: how parallel cargo is, and where it builds. See docs/BUILD_ENV.md.
# shellcheck source=scripts/env.sh
source "$SCRIPT_DIR/env.sh"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPOS_DIR="${REPOS_DIR:-$(cd "$ROOT_DIR/.." && pwd)}"
ORCHESTRATOR_DIR="${ORCHESTRATOR_DIR:-$REPOS_DIR/ubu-orchestrator}"
UI_DIR="${UI_DIR:-$REPOS_DIR/ubu-ui}"
STARTUP_TIMEOUT_SECONDS="${STARTUP_TIMEOUT_SECONDS:-60}"

usage() {
  cat <<'USAGE'
Usage: acceptance.sh [--stage-only]

Stages a throwaway store with the seeds the current acceptance steps declare,
checks each seed over HTTP, prints the steps with the staged objects named, and
holds one orchestrator on the app's default port until Ctrl-C. Start the app
with `npm run tauri:dev` in ubu-ui and follow the steps.

  --stage-only   stage, check, print the steps and exit without waiting.
                 This is how a step list is checked before it is handed over.

It asserts nothing about behaviour (that is check-ui-contract.sh), it does not
drive the app, and it never opens the operator's own store: the store it
stages is under a temp directory that is removed on exit, including Ctrl-C.

Seeds:
  UBU_ACCEPTANCE_MODEL       advisory.model to stage; unset, choose it in Setup
  UBU_ACCEPTANCE_ENDPOINT    advisory.endpoint (default: http://127.0.0.1:11434)
  UBU_ACCEPTANCE_TIMEOUT_MS  advisory.timeout_ms (default: 600000)

Environment overrides:
  REPOS_DIR                parent directory of all repos (default: ../)
  ORCHESTRATOR_DIR         path to ubu-orchestrator checkout
  UI_DIR                   path to ubu-ui checkout
  STARTUP_TIMEOUT_SECONDS  how long to wait for /health (default: 60)
USAGE
}

STAGE_ONLY=""
for argument in "$@"; do
  case "$argument" in
    -h|--help) usage; exit 0 ;;
    --stage-only) STAGE_ONLY="--stage-only" ;;
    *) echo "unknown argument: $argument"; usage; exit 2 ;;
  esac
done

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

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ubu-acceptance.XXXXXX")"
HARNESS_PID=""

# Runs on every exit path. Ctrl-C is the normal way this script ends, so the
# interrupt path is the path that matters: stop the orchestrator, remove the store.
cleanup() {
  local status=$?
  trap - EXIT INT TERM
  if [[ -n "$HARNESS_PID" ]] && kill -0 "$HARNESS_PID" 2>/dev/null; then
    kill "$HARNESS_PID" 2>/dev/null || true
    wait "$HARNESS_PID" 2>/dev/null || true
  fi
  # A backstop: the orchestrator the harness started, if it is still running from
  # the temp directory. A pid is only signalled while that is so.
  if [[ -f "$WORK_DIR/pids" ]]; then
    while read -r pid; do
      if [[ -n "$pid" && "$(readlink "/proc/$pid/cwd" 2>/dev/null || true)" == "$WORK_DIR"/* ]]; then
        kill "$pid" 2>/dev/null || true
        wait "$pid" 2>/dev/null || true
        echo "stopped: orchestrator pid $pid"
      fi
    done <"$WORK_DIR/pids"
  fi
  rm -rf "$WORK_DIR"
  echo "removed: $WORK_DIR (the staged store is gone; your own store was never opened)"
  exit "$status"
}
trap cleanup EXIT
trap 'echo; echo "interrupted"; exit 130' INT TERM

echo "build: cargo build --locked --offline in $ORCHESTRATOR_DIR"
if ! (cd "$ORCHESTRATOR_DIR" && ubu_cargo_env && cargo build --locked --offline --message-format=json-render-diagnostics >"$WORK_DIR/build.json"); then
  fail "ubu-orchestrator did not build; the harness cannot run without the real binary"
fi
BINARY="$(node -e '
  const lines = require("fs").readFileSync(process.argv[1], "utf8").split("\n");
  const bins = lines.filter(Boolean).map((line) => JSON.parse(line))
    .filter((m) => m.reason === "compiler-artifact" && m.executable && m.target.kind.includes("bin"));
  process.stdout.write(bins.length ? bins[bins.length - 1].executable : "");
' "$WORK_DIR/build.json")"
[[ -x "$BINARY" ]] || fail "the build produced no orchestrator binary"
echo "built: $BINARY"

# In the background and waited on, so Ctrl-C is handled at once.
status=0
node --experimental-strip-types --no-warnings "$SCRIPT_DIR/acceptance.mjs" \
  --endpoints "$UI_DIR/src/api/endpoints.ts" \
  --binary "$BINARY" \
  --work-dir "$WORK_DIR" \
  --startup-timeout "$STARTUP_TIMEOUT_SECONDS" \
  $STAGE_ONLY &
HARNESS_PID=$!
wait "$HARNESS_PID" || status=$?
HARNESS_PID=""
exit "$status"
