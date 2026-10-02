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

# Is the pinned commit on origin? Answered from the remote-tracking refs, which
# record what origin held at the last fetch or push. Nothing here contacts the
# network: a pin pushed from another machine shows as NO until `git fetch`.
#
# A pin that names a commit origin does not have is a pin nobody else can build.
# Until P1B-54 this script compared the pin with the local HEAD only, so a pin
# to a commit on an unpushed branch passed.
on_origin() {
  local dir="$1" rev="$2"
  git -C "$dir" cat-file -e "${rev}^{commit}" 2>/dev/null || { printf 'NO'; return; }
  if [[ -n "$(git -C "$dir" for-each-ref --contains "$rev" --count=1 refs/remotes/origin 2>/dev/null)" ]]; then
    printf 'yes'
  else
    printf 'NO'
  fi
}

mismatch=0
unpushed=()

printf 'Recorded R_* baseline: post-O20 R_orchestrator, post-GA2 R_adapter, post-S17 R_schemas, post-C12 R_core, post-ST7 R_store\n'
printf '\n'
printf '%-24s %-14s %-9s %-19s %-6s %-9s %-7s %s\n' \
  "REPO" "BRANCH" "HEAD" "SIG" "TREE" "PINNED" "ORIGIN" "STATUS"
printf '%-24s %-14s %-9s %-19s %-6s %-9s %-7s %s\n' \
  "----" "------" "----" "---" "----" "------" "------" "------"

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
    printf '%-24s %-14s %-9s %-19s %-6s %-9s %-7s %s\n' \
      "$name" "-" "missing" "-" "-" "${pinned:0:8}" "-" "$status"
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

  # The pin is checked against origin whatever the local HEAD is.
  origin="-"
  if [[ -n "$pinned" ]]; then
    origin="$(on_origin "$dir" "$pinned")"
    if [[ "$origin" == "NO" ]]; then
      unpushed+=("$name ${pinned}")
      mismatch=1
      if [[ "$status" == "OK" ]]; then
        status="UNPUSHED"
      else
        status="$status, UNPUSHED"
      fi
    fi
  fi

  pinned_short="${pinned:0:8}"
  printf '%-24s %-14s %-9s %-19s %-6s %-9s %-7s %s\n' \
    "$name" "$branch" "$actual" "$sig" "$tree" "${pinned_short:-(unset)}" "$origin" "$status"
done < <(repo_names)

if [[ "${#unpushed[@]}" -gt 0 ]]; then
  printf '\n'
  for entry in "${unpushed[@]}"; do
    printf 'UNPUSHED: the pin for %s, %s, is on no branch of origin as this checkout last saw it.\n' "${entry%% *}" "${entry#* }"
  done
  printf 'A pin that names a commit origin does not have is a pin nobody else can build.\n'
  printf 'Push the branch that holds it, or run git fetch if it was pushed from elsewhere, then run this again.\n'
fi

if [[ "$mismatch" -ne 0 ]]; then
  printf '\nWARN: one or more repos have MISSING, MISMATCH, UNPUSHED, or ERROR status.\n'
  exit 1
fi
