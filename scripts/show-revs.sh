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

while read -r name; do
  dir="$REPOS_DIR/$(repo_dir_name "$name")"
  if [[ ! -d "$dir/.git" ]]; then
    printf '%-24s %s\n' "$name" "missing"
    continue
  fi
  if rev="$(git -C "$dir" rev-parse --short HEAD 2>/dev/null)"; then
    printf '%-24s %s\n' "$name" "$rev"
  else
    printf '%-24s %s\n' "$name" "no-head"
  fi
done < <(repo_names)
