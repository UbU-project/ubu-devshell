#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPOS_DIR="${REPOS_DIR:-$(cd "$ROOT_DIR/.." && pwd)}"
UI_DIR="${UI_DIR:-$REPOS_DIR/ubu-ui}"

if [[ ! -d "$UI_DIR" ]]; then
  echo "error: missing UI repo at $UI_DIR"
  exit 1
fi

cd "$UI_DIR"
export HOST="${HOST:-127.0.0.1}"

if [[ -n "${UI_CMD:-}" ]]; then
  echo "run: $UI_CMD"
  exec bash -lc "$UI_CMD"
fi

if [[ -f package.json ]]; then
  echo "run: npm run dev -- --host 127.0.0.1 in $UI_DIR"
  exec npm run dev -- --host 127.0.0.1
fi

echo "error: no known UI run command for $UI_DIR"
exit 1
