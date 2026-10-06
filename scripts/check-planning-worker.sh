#!/usr/bin/env bash
# CPU oracle first; then the bounded owned-worker suite. Installs nothing.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPOS_DIR="${REPOS_DIR:-$(cd "$ROOT_DIR/.." && pwd)}"
KERNEL_DIR="$REPOS_DIR/ubu-planning-kernel"
KERNEL_REV="$(awk -F '"' '/^ubu_planning_kernel[[:space:]]*=/{print $2}' "$ROOT_DIR/pinned-revs.toml")"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ubu-planning-parity.XXXXXX")"
# EXIT is shell cleanup, not a signal handler installed by a worker test.
trap 'rm -rf "$WORK_DIR"' EXIT
mkdir -p "$WORK_DIR/src" "$WORK_DIR/examples"
sed "s/@KERNEL_REV@/$KERNEL_REV/g" "$ROOT_DIR/tools/planning-parity/Cargo.toml.in" > "$WORK_DIR/Cargo.toml"
cp "$ROOT_DIR/tools/planning-parity/src/lib.rs" "$WORK_DIR/src/lib.rs"
cp "$ROOT_DIR/tools/planning-parity/examples/"*.rs "$WORK_DIR/examples/"
# Start from the committed dependency versions, never resolve online.
cp "$KERNEL_DIR/Cargo.lock" "$WORK_DIR/Cargo.lock"
export UBU_PARITY_FIXTURES="$ROOT_DIR/fixtures/planning-worker"
export CARGO_NET_OFFLINE=true
# This temporary harness belongs to devshell, so it has devshell's target.
export CARGO_TARGET_DIR="${UBU_TARGET_ROOT:-$ROOT_DIR/.cache}/ubu-devshell"
if [[ "${1:-}" == "--freeze" ]]; then
  cargo run --offline --manifest-path "$WORK_DIR/Cargo.toml" --example freeze
  exit
fi
if [[ $# -ne 0 ]]; then echo "usage: check-planning-worker.sh [--freeze]" >&2; exit 2; fi
cargo test --offline --manifest-path "$WORK_DIR/Cargo.toml"
export UBU_WORKER_PID_FILE="$WORK_DIR/owned-worker.pid"
failed_status=0
cargo run --offline --manifest-path "$WORK_DIR/Cargo.toml" --example failing_owner > "$WORK_DIR/failing-owner.log" 2>&1 || failed_status=$?
if [[ -f "$UBU_WORKER_PID_FILE" ]]; then
  read -r owned_pid < "$UBU_WORKER_PID_FILE" || true
  [[ "$failed_status" -eq 101 ]] || { cat "$WORK_DIR/failing-owner.log"; exit 1; }
  [[ "$owned_pid" =~ ^[0-9]+$ && ! -d "/proc/$owned_pid" ]] || { echo "FAIL: child survived synthetic failing run" >&2; exit 1; }
  echo "PASS: synthetic failing run exited 101 and its owned child was reaped"
else
  [[ "$failed_status" -eq 0 ]] && rg -q '^SKIP: suitable local Python unavailable' "$WORK_DIR/failing-owner.log" || { cat "$WORK_DIR/failing-owner.log"; exit 1; }
  echo "SKIP: suitable local Python unavailable for failing-run process check"
fi
# A distinct, sequential invocation, with kernel's own environment/target.
(cd "$KERNEL_DIR" && source "$SCRIPT_DIR/env.sh" && cargo test --locked --offline -p ubu_planning_worker --test invocation -- --nocapture)
echo "PASS CPU-only parity and bounded worker boundary (Python checks skip if absent)"
