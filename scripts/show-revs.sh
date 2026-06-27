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

# Map git %G? code to a human-readable label.
# Reports "unverified-locally" when Git cannot check (missing key, no gpg, etc.)
sig_label() {
  local dir="$1"
  local code
  code="$(git -C "$dir" log -1 --format="%G?" 2>/dev/null)" || { printf 'error'; return; }
  case "$code" in
    G) printf 'signed-ok' ;;
    B) printf 'BAD-SIG' ;;
    U) printf 'unverified-key' ;;
    X) printf 'sig-expired' ;;
    Y) printf 'key-expired' ;;
    R) printf 'key-revoked' ;;
    E) printf 'unverified-locally' ;;
    N) printf 'unsigned' ;;
    *) printf 'unknown(%s)' "$code" ;;
  esac
}

tree_state() {
  local dir="$1"
  if [[ -n "$(git -C "$dir" status --short 2>/dev/null)" ]]; then
    printf 'DIRTY'
  else
    printf 'clean'
  fi
}

mismatch=0

printf 'Recorded R_* baseline: post-O20 R_orchestrator, post-GA2 R_adapter, post-S17 R_schemas, post-C12 R_core, post-ST7 R_store\n'
printf '\n'
printf '%-24s %-14s %-9s %-19s %-6s %-9s %s\n' \
  "REPO" "BRANCH" "HEAD" "SIG" "TREE" "PINNED" "STATUS"
printf '%-24s %-14s %-9s %-19s %-6s %-9s %s\n' \
  "----" "------" "----" "---" "----" "------" "------"

while read -r name; do
  dir="$REPOS_DIR/$(repo_dir_name "$name")"
  pinned="$(pinned_rev "$name")"

  if [[ ! -d "$dir/.git" ]]; then
    if [[ -n "$pinned" ]]; then
      status="MISSING"
      mismatch=1
    else
      status="unset"
    fi
    printf '%-24s %-14s %-9s %-19s %-6s %-9s %s\n' \
      "$name" "-" "missing" "-" "-" "${pinned:0:8}" "$status"
    continue
  fi

  branch="$(git -C "$dir" rev-parse --abbrev-ref HEAD 2>/dev/null || printf '?')"
  actual_full="$(git -C "$dir" rev-parse HEAD 2>/dev/null || printf 'no-head')"
  actual="${actual_full:0:8}"
  sig="$(sig_label "$dir")"
  tree="$(tree_state "$dir")"

  if [[ "$actual_full" == "no-head" ]]; then
    status="ERROR"
    mismatch=1
  elif [[ -z "$pinned" ]]; then
    status="unset"
  elif [[ "$actual_full" == "$pinned" ]]; then
    status="OK"
  else
    status="MISMATCH"
    mismatch=1
  fi

  pinned_short="${pinned:0:8}"
  printf '%-24s %-14s %-9s %-19s %-6s %-9s %s\n' \
    "$name" "$branch" "$actual" "$sig" "$tree" "${pinned_short:-(unset)}" "$status"
done < <(repo_names)

if [[ "$mismatch" -ne 0 ]]; then
  printf '\nWARN: one or more repos have MISSING, MISMATCH, or ERROR status.\n'
  exit 1
fi
