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
      url = $0
      sub(/^[^=]*=[[:space:]]*"/, "", url)
      sub(/"[[:space:]]*$/, "", url)
      print key "\t" url
    }
  ' "$REPOS_FILE"
}

repo_dir_name() {
  local name="$1"
  printf '%s\n' "${name//_/-}"
}

mkdir -p "$REPOS_DIR"
echo "Cloning missing repos into $REPOS_DIR"

while IFS=$'\t' read -r name url; do
  dir="$REPOS_DIR/$(repo_dir_name "$name")"
  if [[ -d "$dir/.git" ]]; then
    echo "exists: $dir"
    continue
  fi
  if [[ -e "$dir" ]]; then
    echo "skip: $dir exists but is not a Git repo"
    continue
  fi
  echo "clone: $url -> $dir"
  git clone "$url" "$dir"
done < <(repo_entries)
