#!/usr/bin/env bash
# Rehearsal refusals write the owned public artifact; pre-flight/help are read-only.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ubu_reason_recorded=0
refuse() {
  ubu_reason_recorded=1
  node "$SCRIPT_DIR/live-rehearsal-diagnostics.mjs" "$1" "${2:-}" || true
  exit 1
}
launcher_exit() {
  local status=$?
  [[ -z "${ubu_build_scratch:-}" ]] || rm -rf "$ubu_build_scratch"
  if [[ "$status" -ne 0 && "$ubu_reason_recorded" -eq 0 ]]; then
    node "$SCRIPT_DIR/live-rehearsal-diagnostics.mjs" launcher_failed || true
  fi
}
trap launcher_exit EXIT
if [[ "${1:-}" == --help && $# -eq 1 ]]; then
  cat <<'HELP'
Usage: run-live-rehearsal.sh [--check-inputs]
Required environment: UBU_DB_PATH (fresh absolute store path),
UBU_GOOGLE_CALENDAR_ID, UBU_GOOGLE_CREDENTIALS_PATH,
UBU_GOOGLE_TOKEN_CACHE_PATH (absolute paths, kept private).
Required UBU_REHEARSAL_INPUTS: private JSON with one chosen subject and a
mutation write under it; see
 docs/LIVE_REHEARSAL_DRIVER.md. Optional UBU_REHEARSAL_BINARY: built binary.
UBU_REHEARSAL_OUTPUT overrides ./live-rehearsal-copy-back.txt.
Owns an orchestrator. Type live before startup; approval is a separate decision.
Reset your calendar yourself. No default store or calendar is selected.
--check-inputs checks private inputs/files, advisory model availability and the
owned worker environment without building, starting a server or writing files.
HELP
  exit 0
fi
if [[ $# -eq 1 && "$1" == --check-inputs ]]; then
  exec node --experimental-strip-types --no-warnings "$SCRIPT_DIR/live-rehearsal.mjs" --check-inputs
fi
[[ $# -eq 0 ]] || refuse unsupported_argument
[[ -t 0 ]] || refuse terminal_required
for ubu_required in UBU_DB_PATH UBU_GOOGLE_CALENDAR_ID UBU_GOOGLE_CREDENTIALS_PATH UBU_GOOGLE_TOKEN_CACHE_PATH; do
  [[ -n "${!ubu_required:-}" ]] || refuse required_configuration_missing "$ubu_required"
  if [[ "$ubu_required" != UBU_GOOGLE_CALENDAR_ID && "${!ubu_required}" != /* ]]; then
    refuse absolute_path_required "$ubu_required"
  fi
done
[[ -n "${UBU_REHEARSAL_INPUTS:-}" ]] || refuse required_configuration_missing UBU_REHEARSAL_INPUTS
if ! source "$SCRIPT_DIR/env.sh" >/dev/null 2>&1; then refuse build_environment_unavailable; fi
export ORCHESTRATOR_DIR="${ORCHESTRATOR_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)/ubu-orchestrator}"
if [[ -z "${UBU_REHEARSAL_BINARY:-}" ]]; then
  ubu_build_scratch="$(mktemp -d)"
  chmod 700 "$ubu_build_scratch"
  if ! (cd "$ORCHESTRATOR_DIR" && ubu_cargo_env &&
      unset UBU_REHEARSAL_INPUTS UBU_GOOGLE_CREDENTIALS_PATH UBU_GOOGLE_TOKEN_CACHE_PATH &&
      cargo build --locked --offline --message-format=json-render-diagnostics >"$ubu_build_scratch/build.json" 2>"$ubu_build_scratch/build.log"); then
    refuse offline_build_failed
  fi
  UBU_REHEARSAL_BINARY="$(node -e '
    const fs=require("fs");
    const bins=fs.readFileSync(process.argv[1],"utf8").split("\n").filter(Boolean).map(JSON.parse)
      .filter(m=>m.reason==="compiler-artifact"&&m.executable&&m.target.name==="ubu_orchestrator");
    process.stdout.write(bins.at(-1)?.executable??"");
  ' "$ubu_build_scratch/build.json" 2>/dev/null)"
  rm -rf "$ubu_build_scratch"
  unset ubu_build_scratch
fi
export UBU_REHEARSAL_BINARY
exec node --experimental-strip-types --no-warnings "$SCRIPT_DIR/live-rehearsal.mjs"
