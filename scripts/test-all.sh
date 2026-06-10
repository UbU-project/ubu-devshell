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

echo "Running tests under $REPOS_DIR"

while read -r name; do
  dir="$REPOS_DIR/$(repo_dir_name "$name")"
  if [[ ! -d "$dir" ]]; then
    echo "skip: $dir is missing"
    continue
  fi

  ran=0
  if [[ -f "$dir/Cargo.toml" ]]; then
    echo "cargo test: $dir"
    (cd "$dir" && cargo test --all-targets)
    ran=1
  fi
  if [[ -f "$dir/package.json" ]]; then
    echo "npm test --if-present: $dir"
    (cd "$dir" && npm test --if-present)
    ran=1
  fi
  if [[ -f "$dir/go.mod" ]]; then
    echo "go test: $dir"
    (cd "$dir" && go test ./...)
    ran=1
  fi
  if [[ "$ran" -eq 0 ]]; then
    echo "skip: no known test target in $dir"
  fi
done < <(repo_names)
