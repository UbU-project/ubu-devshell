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
# Build under Cargo's exclusion, then execute the existing bounded worker
# tests outside the build lock. Invocation now also asserts zero warnings from
# the worker's actual import path; successful resolution/nonzero-exit checks alone
# cannot verify a quiet torch/numpy install. The existing owned session is reused. A torch-positive test must not be hidden by
# the very lock that proves Cargo excludes compute. These are the same owned
# kernel worker tests; no orchestrator/UI/advisory process permission changes.
(cd "$KERNEL_DIR" && source "$SCRIPT_DIR/env.sh" && cargo test --locked --offline -p ubu_planning_worker --lib --tests --no-run --message-format=json > "$WORK_DIR/worker-tests.jsonl")
node -e '
  const fs = require("fs");
  const artifacts = fs.readFileSync(process.argv[1], "utf8").split("\n").filter(Boolean).map(JSON.parse)
    .filter(m => m.reason === "compiler-artifact" && m.executable && m.profile.test && ["ubu_planning_worker", "invocation", "stage1"].includes(m.target.name));
  if (artifacts.length !== 3) throw new Error("expected three owned worker test executables");
  for (const m of artifacts) process.stdout.write(m.executable + "\n");
' "$WORK_DIR/worker-tests.jsonl" > "$WORK_DIR/worker-tests.list"
while IFS= read -r executable; do
  "$executable" --nocapture
done < "$WORK_DIR/worker-tests.list"
echo "PASS CPU-only ChunkedSweep parity, exact atomic Stage 1 goldens and bounded worker boundary (Python/torch checks report skips when absent)"
