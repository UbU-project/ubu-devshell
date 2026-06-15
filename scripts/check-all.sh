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

run_if_package_script() {
  local dir="$1"
  local script="$2"
  if [[ -f "$dir/package.json" ]]; then
    echo "npm run $script --if-present: $dir"
    (cd "$dir" && npm run "$script" --if-present)
  fi
}

# Map git %G? verification code to a human-readable label.
# "unverified-locally" means Git ran but could not check (no key, no gpg, etc.)
# — it does NOT mean the commit is bad.
sig_label() {
  local code="$1"
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

echo "=== Git state ==="
echo ""

while read -r name; do
  dir="$REPOS_DIR/$(repo_dir_name "$name")"
  if [[ ! -d "$dir/.git" ]]; then
    printf '[%s] missing\n\n' "$name"
    continue
  fi

  branch="$(git -C "$dir" rev-parse --abbrev-ref HEAD 2>/dev/null || printf '?')"
  head="$(git -C "$dir" rev-parse --short HEAD 2>/dev/null || printf 'no-head')"
  sig_code="$(git -C "$dir" log -1 --format="%G?" 2>/dev/null || printf '?')"
  sig="$(sig_label "$sig_code")"

  dirty_output="$(git -C "$dir" status --short 2>/dev/null)"
  if [[ -n "$dirty_output" ]]; then
    tree_label="DIRTY"
  else
    tree_label="clean"
  fi

  printf '[%s]  branch=%s  head=%s  sig=%s  tree=%s\n' \
    "$name" "$branch" "$head" "$sig" "$tree_label"

  if [[ -n "$dirty_output" ]]; then
    printf '  *** DIRTY — uncommitted changes:\n'
    printf '%s\n' "$dirty_output" | sed 's/^/  /'
  fi

  printf '  last commit signature (git log -1 --show-signature):\n'
  # Capture output; git may invoke gpg which can fail or print "Can't check".
  # Suppress gpg stderr to avoid misleading noise; the %G? code above is authoritative.
  sig_out="$(git -C "$dir" log -1 --show-signature 2>/dev/null || true)"
  if [[ -n "$sig_out" ]]; then
    printf '%s\n' "$sig_out" | sed 's/^/  /'
  else
    printf '  (no output)\n'
  fi
  if [[ "$sig_code" == "E" || "$sig_code" == "?" ]]; then
    printf '  NOTE: signature not verifiable locally (unverified-locally)\n'
  fi
  printf '\n'
done < <(repo_names)

echo "=== Build checks ==="
echo ""
echo "Running checks under $REPOS_DIR"

while read -r name; do
  dir="$REPOS_DIR/$(repo_dir_name "$name")"
  if [[ ! -d "$dir" ]]; then
    echo "skip: $dir is missing"
    continue
  fi

  ran=0
  if [[ -f "$dir/Cargo.toml" ]]; then
    echo "cargo check: $dir"
    (cd "$dir" && cargo check --all-targets)
    ran=1
  fi
  if [[ -f "$dir/package.json" ]]; then
    run_if_package_script "$dir" check
    run_if_package_script "$dir" lint
    ran=1
  fi
  if [[ -f "$dir/go.mod" ]]; then
    echo "go test compile check: $dir"
    (cd "$dir" && go test ./... -run '^$')
    ran=1
  fi
  if [[ "$ran" -eq 0 ]]; then
    echo "skip: no known check target in $dir"
  fi
done < <(repo_names)
