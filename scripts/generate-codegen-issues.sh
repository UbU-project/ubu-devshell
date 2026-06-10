#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="${CODEGEN_ISSUES_DIR:-$ROOT_DIR/artifacts/codegen-issues}"

mkdir -p "$OUT_DIR"

cat > "$OUT_DIR/ui-api-client.md" <<'EOF'
# Codegen Task: UI API Client

## Source

Pinned local source: `ubu-orchestrator/openapi/openapi.generated.json`

## Output

Target: `ubu-ui/src/api/generated`

## Notes

- No network fetch.
- Re-run through `ubu-devshell/scripts/generate-ui-api-client.sh`.
- Verify the generated client in the UI repository.
EOF

cat > "$OUT_DIR/ui-schema-types.md" <<'EOF'
# Codegen Task: UI Schema Types

## Source

Pinned local source: `ubu-schemas`

## Output

Target: `ubu-ui/src/types/generated`

## Notes

- No network fetch.
- Re-run through `ubu-devshell/scripts/generate-ui-schema-types.sh`.
- Verify the generated types in the UI repository.
EOF

echo "wrote: $OUT_DIR/ui-api-client.md"
echo "wrote: $OUT_DIR/ui-schema-types.md"
