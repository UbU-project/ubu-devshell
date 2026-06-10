#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="${PUBLIC_ARTIFACT_DIR:-$ROOT_DIR/artifacts/public-package}"

mkdir -p "$OUT_DIR"

cat > "$OUT_DIR/manifest.json" <<'EOF'
{
  "package": "ubu-phase1-public-demo",
  "fixture": true,
  "public_safe": true,
  "generated_by": "ubu-devshell",
  "notes": "Placeholder package shape for public demo workflows."
}
EOF

cat > "$OUT_DIR/claim-register.json" <<'EOF'
{
  "claims": []
}
EOF

cat > "$OUT_DIR/evidence-index.json" <<'EOF'
{
  "evidence": []
}
EOF

cat > "$OUT_DIR/export-review.json" <<'EOF'
{
  "status": "placeholder",
  "reviewed_for_private_data": false
}
EOF

cat > "$OUT_DIR/approvals.json" <<'EOF'
{
  "approvals": []
}
EOF

cat > "$OUT_DIR/publication-plan.json" <<'EOF'
{
  "steps": []
}
EOF

cat > "$OUT_DIR/known-limitations.md" <<'EOF'
# Known Limitations

This is a placeholder public artifact package. It contains no domain claims,
private data, production credentials, or canonical schema definitions.
EOF

cat > "$OUT_DIR/demo-summary.md" <<'EOF'
# Demo Summary

Placeholder summary for the Phase 1 public fixture demo.
EOF

echo "wrote public artifact package: $OUT_DIR"
