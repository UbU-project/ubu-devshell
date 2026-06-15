#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPOS_DIR="${REPOS_DIR:-$(cd "$ROOT_DIR/.." && pwd)}"
ORCHESTRATOR_DIR="${ORCHESTRATOR_DIR:-$REPOS_DIR/ubu-orchestrator}"
UI_DIR="${UI_DIR:-$REPOS_DIR/ubu-ui}"
SOURCE="${OPENAPI_SOURCE:-$ORCHESTRATOR_DIR/openapi/openapi.generated.json}"
DEST_DIR="${UI_API_GENERATED_DIR:-$UI_DIR/src/api/generated}"
ORCHESTRATOR_URL="${ORCHESTRATOR_URL:-http://127.0.0.1:8080}"

usage() {
  cat <<'USAGE'
Usage: generate-ui-api-client.sh [--from-server]

Default (no flag):
  Copies the pinned OpenAPI file from:
    ubu-orchestrator/openapi/openapi.generated.json
  into:
    ubu-ui/src/api/generated/openapi.generated.json

--from-server:
  Fetches /openapi.json from a running orchestrator instead.
  Requires curl. Uses $ORCHESTRATOR_URL (default: http://127.0.0.1:8080).
  Start the orchestrator first: ./scripts/run-orchestrator.sh

No network fetch is used in the default mode.
No private credentials are required.

Environment overrides:
  REPOS_DIR             parent directory of all repos (default: ../)
  ORCHESTRATOR_DIR      path to ubu-orchestrator checkout
  UI_DIR                path to ubu-ui checkout
  OPENAPI_SOURCE        path to the pinned openapi.generated.json file
  UI_API_GENERATED_DIR  destination directory inside ubu-ui
  ORCHESTRATOR_URL      base URL for --from-server mode
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

FROM_SERVER=0
if [[ "${1:-}" == "--from-server" ]]; then
  FROM_SERVER=1
  shift
fi

# Safety: destination must resolve inside the UI repo.
if [[ ! -d "$UI_DIR" ]]; then
  echo "error: missing UI repo: $UI_DIR"
  exit 1
fi
ui_real="$(realpath "$UI_DIR")"
dest_real="$(realpath -m "$DEST_DIR")"
if [[ "$dest_real" != "$ui_real"/* && "$dest_real" != "$ui_real" ]]; then
  echo "error: DEST_DIR ($DEST_DIR) resolves outside UI repo ($UI_DIR); aborting"
  exit 1
fi

mkdir -p "$DEST_DIR"

if [[ "$FROM_SERVER" -eq 1 ]]; then
  if ! command -v curl >/dev/null 2>&1; then
    echo "error: --from-server requires curl; install curl or use the default file mode"
    exit 1
  fi
  server_url="$ORCHESTRATOR_URL/openapi.json"
  echo "fetching: $server_url"
  if ! curl -fsSL "$server_url" -o "$DEST_DIR/openapi.generated.json"; then
    echo "error: failed to fetch $server_url"
    echo "ensure ubu-orchestrator is running (./scripts/run-orchestrator.sh)"
    exit 1
  fi
  echo "fetched:  $server_url -> $DEST_DIR/openapi.generated.json"
  echo "note: run the UI repo's local generator if it defines one"
  exit 0
fi

# Default: copy pinned static file.
if [[ ! -f "$SOURCE" ]]; then
  echo "error: missing pinned OpenAPI source: $SOURCE"
  echo "ensure ubu-orchestrator is checked out and has generated its OpenAPI file"
  exit 1
fi

cp "$SOURCE" "$DEST_DIR/openapi.generated.json"
cat > "$DEST_DIR/README.md" <<EOF
# Generated API Client Input

This directory was updated by ubu-devshell from:

\`\`\`text
$SOURCE
\`\`\`

No network fetch was used.
EOF

echo "copied:   $SOURCE -> $DEST_DIR/openapi.generated.json"
if [[ -f "$UI_DIR/package.json" ]]; then
  echo "note: run the UI repo's local generator if it defines one"
fi
