#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPOS_DIR="${REPOS_DIR:-$(cd "$ROOT_DIR/.." && pwd)}"
ORCHESTRATOR_DIR="${ORCHESTRATOR_DIR:-$REPOS_DIR/ubu-orchestrator}"
UI_DIR="${UI_DIR:-$REPOS_DIR/ubu-ui}"
SOURCE="${OPENAPI_SOURCE:-$ORCHESTRATOR_DIR/openapi/openapi.generated.json}"
DEST_DIR="${UI_API_GENERATED_DIR:-$UI_DIR/src/api/generated}"

if [[ ! -f "$SOURCE" ]]; then
  echo "error: missing pinned OpenAPI source: $SOURCE"
  exit 1
fi
if [[ ! -d "$UI_DIR" ]]; then
  echo "error: missing UI repo: $UI_DIR"
  exit 1
fi

mkdir -p "$DEST_DIR"
cp "$SOURCE" "$DEST_DIR/openapi.generated.json"
cat > "$DEST_DIR/README.md" <<EOF
# Generated API Client Input

This directory was updated by ubu-devshell from:

\`\`\`text
$SOURCE
\`\`\`

No network fetch was used.
EOF

if [[ -f "$UI_DIR/package.json" ]]; then
  echo "copied: $SOURCE -> $DEST_DIR/openapi.generated.json"
  echo "note: run the UI repo's local generator if it defines one"
else
  echo "copied: $SOURCE -> $DEST_DIR/openapi.generated.json"
fi
