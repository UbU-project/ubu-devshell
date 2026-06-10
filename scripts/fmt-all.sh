#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPOS_FILE="${REPOS_FILE:-$ROOT_DIR/repos.toml}"
REPOS_DIR="${REPOS_DIR:-$(cd "$ROOT_DIR/.." && pwd)}"

repo_names() {
  awk '
    /^\[repos\][[:space:]]*$/ { in_repos = 1; next }
    /^\[/ { in_repos = 0 }
    in_repos && /^[[:space:]]*[A-Za-z0-9_]+[[:space:]]*=/ {
      key = $1
      sub(/[[:space:]]*=.*/, "", key)
      print key
    }
  ' "$REPOS_FILE"
}

repo_dir_name() {
  local name="$1"
  printf '%s\n' "${name//_/-}"
}

echo "Running formatters under $REPOS_DIR"

while read -r name; do
  dir="$REPOS_DIR/$(repo_dir_name "$name")"
  if [[ ! -d "$dir" ]]; then
    echo "skip: $dir is missing"
    continue
  fi

  ran=0
  if [[ -f "$dir/Cargo.toml" ]]; then
    echo "cargo fmt: $dir"
    (cd "$dir" && cargo fmt --all)
    ran=1
  fi
  if [[ -f "$dir/package.json" ]]; then
    echo "npm run format --if-present: $dir"
    (cd "$dir" && npm run format --if-present)
    echo "npm run fmt --if-present: $dir"
    (cd "$dir" && npm run fmt --if-present)
    ran=1
  fi
  if [[ -f "$dir/go.mod" ]]; then
    echo "gofmt: $dir"
    find "$dir" -name '*.go' -not -path '*/vendor/*' -print0 | xargs -0r gofmt -w
    ran=1
  fi
  if [[ "$ran" -eq 0 ]]; then
    echo "skip: no known formatter in $dir"
  fi
done < <(repo_names)
