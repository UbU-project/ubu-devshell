#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPOS_FILE="${REPOS_FILE:-$ROOT_DIR/repos.toml}"
REPOS_DIR="${REPOS_DIR:-$(cd "$ROOT_DIR/.." && pwd)}"

repo_entries() {
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

echo "Updating repos under $REPOS_DIR"

while read -r name; do
  dir="$REPOS_DIR/$(repo_dir_name "$name")"
  if [[ ! -d "$dir/.git" ]]; then
    echo "skip: $dir is missing"
    continue
  fi
  if [[ -n "$(git -C "$dir" status --porcelain)" ]]; then
    echo "dirty: $dir has local changes; refusing to pull"
    exit 1
  fi
  echo "fetch: $dir"
  git -C "$dir" fetch --all --prune
  echo "pull: $dir"
  git -C "$dir" pull --ff-only
done < <(repo_entries)
