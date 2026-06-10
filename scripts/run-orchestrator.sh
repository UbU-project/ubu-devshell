#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPOS_DIR="${REPOS_DIR:-$(cd "$ROOT_DIR/.." && pwd)}"
ORCHESTRATOR_DIR="${ORCHESTRATOR_DIR:-$REPOS_DIR/ubu-orchestrator}"

if [[ ! -d "$ORCHESTRATOR_DIR" ]]; then
  echo "error: missing orchestrator repo at $ORCHESTRATOR_DIR"
  exit 1
fi

cd "$ORCHESTRATOR_DIR"
export HOST="${HOST:-127.0.0.1}"
export BIND_ADDR="${BIND_ADDR:-127.0.0.1}"

if [[ -n "${ORCHESTRATOR_CMD:-}" ]]; then
  echo "run: $ORCHESTRATOR_CMD"
  exec bash -lc "$ORCHESTRATOR_CMD"
fi

if [[ -f Cargo.toml ]]; then
  echo "run: cargo run in $ORCHESTRATOR_DIR bound to 127.0.0.1"
  exec cargo run
fi

if [[ -f package.json ]]; then
  echo "run: npm run dev -- --host 127.0.0.1 in $ORCHESTRATOR_DIR"
  exec npm run dev -- --host 127.0.0.1
fi

echo "error: no known run command for $ORCHESTRATOR_DIR"
exit 1
