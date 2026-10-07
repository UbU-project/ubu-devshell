#!/usr/bin/env bash
# Operator-only launcher. Builds finish and release env.sh's lock before Node asks.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ "${1:-}" == --help ]]; then
  cat <<'HELP'
Usage: run-live-rehearsal.sh [--compare]
Required environment: UBU_DB_PATH (fresh absolute store path),
UBU_GOOGLE_CALENDAR_ID, UBU_GOOGLE_CREDENTIALS_PATH,
UBU_GOOGLE_TOKEN_CACHE_PATH (absolute paths, kept private).
Optional UBU_REHEARSAL_INPUTS: private JSON authoring instructions; see
 docs/LIVE_REHEARSAL_DRIVER.md. Optional UBU_REHEARSAL_BINARY: built binary.
Owns an orchestrator. Type live before startup; approval is a separate decision.
--compare forwards the appendix's UI actions once, without replaying them.
Reset your calendar yourself. No default store or calendar is selected.
HELP
  exit 0
fi
if [[ $# -gt 1 || ( $# -eq 1 && "$1" != --compare ) ]]; then
  echo 'REFUSED: unsupported argument; no approval flag exists.' >&2; exit 2
fi
[[ -t 0 ]] || { echo 'REFUSED: terminal required.' >&2; exit 2; }
for ubu_required in UBU_DB_PATH UBU_GOOGLE_CALENDAR_ID UBU_GOOGLE_CREDENTIALS_PATH UBU_GOOGLE_TOKEN_CACHE_PATH; do
  [[ -n "${!ubu_required:-}" ]] || { echo 'REFUSED: required configuration missing; see --help.' >&2; exit 2; }
done
# Same exclusion/containment as every other devshell build. Diagnostics stay private.
source "$SCRIPT_DIR/env.sh"
export ORCHESTRATOR_DIR="${ORCHESTRATOR_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)/ubu-orchestrator}"
if [[ -z "${UBU_REHEARSAL_BINARY:-}" ]]; then
  ubu_build_scratch="$(mktemp -d)"
  chmod 700 "$ubu_build_scratch"
  trap 'rm -rf "$ubu_build_scratch"' EXIT
  if ! (cd "$ORCHESTRATOR_DIR" && ubu_cargo_env &&
      unset UBU_REHEARSAL_INPUTS UBU_GOOGLE_CREDENTIALS_PATH UBU_GOOGLE_TOKEN_CACHE_PATH &&
      cargo build --locked --offline --message-format=json-render-diagnostics >"$ubu_build_scratch/build.json" 2>"$ubu_build_scratch/build.log"); then
    echo 'REFUSED: offline build unavailable, failed or excluded. Build details withheld.' >&2; exit 1
  fi
  UBU_REHEARSAL_BINARY="$(node -e '
    const fs=require("fs");
    const bins=fs.readFileSync(process.argv[1],"utf8").split("\n").filter(Boolean).map(JSON.parse)
      .filter(m=>m.reason==="compiler-artifact"&&m.executable&&m.target.name==="ubu_orchestrator");
    process.stdout.write(bins.at(-1)?.executable??"");
  ' "$ubu_build_scratch/build.json" 2>/dev/null)"
  rm -rf "$ubu_build_scratch"
  trap - EXIT
fi
export UBU_REHEARSAL_BINARY
exec node --experimental-strip-types --no-warnings "$SCRIPT_DIR/live-rehearsal.mjs" "$@"
