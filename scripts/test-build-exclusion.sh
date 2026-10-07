#!/usr/bin/env bash
# Fake Cargo only; no compilation, framework, network, or signal handler.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK_DIR="$(mktemp -d /tmp/ubu-build-exclusion-test.XXXXXX)"
owned_pid=""
cleanup() {
  # Release and reap the bounded fake on failures too, without a signal hook.
  if [[ -n "$owned_pid" ]]; then
    : > "$WORK_DIR/release"
    wait "$owned_pid" || true
  fi
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT
mkdir "$WORK_DIR/bin"
cat > "$WORK_DIR/bin/cargo" <<'FAKE'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$@" > "$UBU_FAKE_ARGUMENTS"
if [[ "${1:-}" == build ]]; then
  : > "$UBU_FAKE_HELD"
  for ((attempt=0; attempt<200; attempt++)); do
    [[ ! -f "$UBU_FAKE_RELEASE" ]] || exit 0
    sleep 0.01
  done
  exit 1
fi
FAKE
cat > "$WORK_DIR/bin/systemctl" <<'FAKE'
#!/usr/bin/env bash
# Simulates the ticket's unavailable-user-manager fallback.
exit 1
FAKE
chmod +x "$WORK_DIR/bin/"*
export PATH="$WORK_DIR/bin:$PATH"
export UBU_FAKE_ARGUMENTS="$WORK_DIR/arguments" UBU_FAKE_HELD="$WORK_DIR/held" UBU_FAKE_RELEASE="$WORK_DIR/release"
source "$SCRIPT_DIR/env.sh"
[[ "$CARGO_BUILD_JOBS" == 1 ]]
lock_path="/tmp/ubu-planning-build-worker-${EUID}.lock"
cargo metadata 'argument with spaces' '$literal' > "$WORK_DIR/first.log" 2>&1
[[ "$(cat "$UBU_FAKE_ARGUMENTS")" == $'metadata\nargument with spaces\n$literal' ]]
cargo build > "$WORK_DIR/build.log" 2>&1 &
owned_pid=$!
for ((attempt=0; attempt<200; attempt++)); do
  [[ ! -f "$UBU_FAKE_HELD" ]] || break
  sleep 0.01
done
[[ -f "$UBU_FAKE_HELD" ]]
status=0
flock --nonblock --conflict-exit-code 75 "$lock_path" true || status=$?
[[ "$status" == 75 ]]
status=0
cargo metadata > "$WORK_DIR/contended.log" 2>&1 || status=$?
[[ "$status" == 75 ]]
rg -q 'no wait' "$WORK_DIR/contended.log"
# A failed acquisition did not invoke fake Cargo or overwrite its arguments.
[[ "$(cat "$UBU_FAKE_ARGUMENTS")" == build ]]
: > "$UBU_FAKE_RELEASE"
wait "$owned_pid"
owned_pid=""
flock --nonblock "$lock_path" true
rg -q 'using exclusion lock alone' "$WORK_DIR/build.log"
echo 'PASS build/worker flock interoperability, nonblocking contention, argument preservation, release and unavailable-scope fallback'
