#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPOS_DIR="${REPOS_DIR:-$(cd "$ROOT_DIR/.." && pwd)}"
SCHEMAS_DIR="${SCHEMAS_DIR:-$REPOS_DIR/ubu-schemas}"
UI_DIR="${UI_DIR:-$REPOS_DIR/ubu-ui}"
DEST_DIR="${UI_SCHEMA_GENERATED_DIR:-$UI_DIR/src/types/generated}"

usage() {
  cat <<'USAGE'
Usage: generate-ui-schema-types.sh

Copies TypeScript schema types from ubu-schemas into:
  ubu-ui/src/types/generated/

Source candidates tried in order:
  ubu-schemas/generated/typescript
  ubu-schemas/typescript/generated
  ubu-schemas/dist/typescript

No network fetch is used. No private credentials are required.

Environment overrides:
  REPOS_DIR               parent directory of all repos (default: ../)
  SCHEMAS_DIR             path to ubu-schemas checkout
  UI_DIR                  path to ubu-ui checkout
  UI_SCHEMA_GENERATED_DIR destination directory inside ubu-ui
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

candidate_sources=(
  "$SCHEMAS_DIR/generated/typescript"
  "$SCHEMAS_DIR/typescript/generated"
  "$SCHEMAS_DIR/dist/typescript"
)

if [[ ! -d "$SCHEMAS_DIR" ]]; then
  echo "error: missing schemas repo: $SCHEMAS_DIR"
  echo "ensure ubu-schemas is checked out (./scripts/clone-all.sh)"
  exit 1
fi

if [[ ! -d "$UI_DIR" ]]; then
  echo "error: missing UI repo: $UI_DIR"
  exit 1
fi

# Safety: destination must resolve inside the UI repo.
ui_real="$(realpath "$UI_DIR")"
dest_real="$(realpath -m "$DEST_DIR")"
if [[ "$dest_real" != "$ui_real"/* && "$dest_real" != "$ui_real" ]]; then
  echo "error: DEST_DIR ($DEST_DIR) resolves outside UI repo ($UI_DIR); aborting"
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
  echo "error: no TypeScript schema types found under $SCHEMAS_DIR"
  echo "looked for:"
  printf '  %s\n' "${candidate_sources[@]}"
  echo "ensure ubu-schemas has generated its TypeScript output"
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

echo "copied:   $source_dir -> $DEST_DIR"
