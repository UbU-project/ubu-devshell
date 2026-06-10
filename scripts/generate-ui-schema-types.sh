#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPOS_DIR="${REPOS_DIR:-$(cd "$ROOT_DIR/.." && pwd)}"
SCHEMAS_DIR="${SCHEMAS_DIR:-$REPOS_DIR/ubu-schemas}"
UI_DIR="${UI_DIR:-$REPOS_DIR/ubu-ui}"
DEST_DIR="${UI_SCHEMA_GENERATED_DIR:-$UI_DIR/src/types/generated}"

candidate_sources=(
  "$SCHEMAS_DIR/generated/typescript"
  "$SCHEMAS_DIR/typescript/generated"
  "$SCHEMAS_DIR/dist/typescript"
)

if [[ ! -d "$UI_DIR" ]]; then
  echo "error: missing UI repo: $UI_DIR"
  exit 1
fi

source_dir=""
for candidate in "${candidate_sources[@]}"; do
  if [[ -d "$candidate" ]]; then
    source_dir="$candidate"
    break
  fi
done

if [[ -z "$source_dir" ]]; then
  echo "error: no pinned schema type source found under $SCHEMAS_DIR"
  echo "looked for:"
  printf '  %s\n' "${candidate_sources[@]}"
  exit 1
fi

mkdir -p "$DEST_DIR"
find "$DEST_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -R "$source_dir/." "$DEST_DIR/"
cat > "$DEST_DIR/README.md" <<EOF
# Generated Schema Types

This directory was updated by ubu-devshell from:

\`\`\`text
$source_dir
\`\`\`

No network fetch was used.
EOF

echo "copied: $source_dir -> $DEST_DIR"
