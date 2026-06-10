#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MANIFEST="$ROOT_DIR/fixtures/demo/phase1-demo-manifest.json"

echo "Running public-safe fixture demo placeholder"

if [[ ! -f "$MANIFEST" ]]; then
  echo "error: missing $MANIFEST"
  exit 1
fi

echo "manifest: $MANIFEST"
echo "next: wire this to the orchestrator and UI once their public demo commands exist"
