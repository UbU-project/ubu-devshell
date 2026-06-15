#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPOS_FILE="${REPOS_FILE:-$ROOT_DIR/repos.toml}"
REPOS_DIR="${REPOS_DIR:-$(cd "$ROOT_DIR/.." && pwd)}"
PINNED_FILE="${PINNED_FILE:-$ROOT_DIR/pinned-revs.toml}"

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

pinned_rev() {
  local name="$1"
  if [[ ! -f "$PINNED_FILE" ]]; then
    printf ''
    return
  fi
  awk -v key="$name" '
    /^\[pinned\][[:space:]]*$/ { in_pinned = 1; next }
    /^\[/ { in_pinned = 0 }
    in_pinned && /^[[:space:]]*[A-Za-z0-9_]+[[:space:]]*=/ {
      k = $1
      sub(/[[:space:]]*=.*/, "", k)
      if (k == key) {
        val = $0
        sub(/^[^=]*=[[:space:]]*"/, "", val)
        sub(/".*/, "", val)
        print val
        exit
      }
    }
  ' "$PINNED_FILE"
}

mismatch=0

printf '%-24s %-10s %-10s %s\n' "REPO" "ACTUAL" "PINNED" "STATUS"
printf '%-24s %-10s %-10s %s\n' "----" "------" "------" "------"

while read -r name; do
  dir="$REPOS_DIR/$(repo_dir_name "$name")"
  pinned="$(pinned_rev "$name")"

  if [[ ! -d "$dir/.git" ]]; then
    actual="missing"
    if [[ -n "$pinned" ]]; then
      status="MISSING"
      mismatch=1
    else
      status="unset"
    fi
  elif actual="$(git -C "$dir" rev-parse --short HEAD 2>/dev/null)"; then
    if [[ -z "$pinned" ]]; then
      status="unset"
    elif [[ "$actual" == "$pinned"* || "$pinned" == "$actual"* ]]; then
      status="OK"
    else
      status="MISMATCH"
      mismatch=1
    fi
  else
    actual="no-head"
    status="ERROR"
    mismatch=1
  fi

  printf '%-24s %-10s %-10s %s\n' "$name" "$actual" "${pinned:-(unset)}" "$status"
done < <(repo_names)

if [[ "$mismatch" -ne 0 ]]; then
  printf '\nWARN: one or more repos have MISSING, MISMATCH, or ERROR status.\n'
  exit 1
fi
