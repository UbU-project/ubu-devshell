#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="${CODEGEN_ISSUES_DIR:-$ROOT_DIR/artifacts/codegen-issues}"

mkdir -p "$OUT_DIR"

cat > "$OUT_DIR/ui-api-client.md" <<'EOF'
# Codegen Task: UI API Client

## Governing Decisions

Vocabulary changes in this area are governed by:
UBU-D0226, UBU-D0227, UBU-D0228, UBU-D0229, UBU-D0230.
Cite the relevant decision ID in any PR that touches API surface vocabulary.

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

## Governing Decisions

Vocabulary changes in this area are governed by:
UBU-D0226, UBU-D0227, UBU-D0228, UBU-D0229, UBU-D0230.
Cite the relevant decision ID in any PR that touches schema vocabulary.

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
