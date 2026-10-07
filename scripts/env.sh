# env.sh: the one place for build settings. SOURCE it; do not run it.
#
#   source ./scripts/env.sh        # from any repo, or from a script here
#
# It sets two variables and defines the Cargo exclusion/scope wrapper, only
# for the shell that sources it:
#
#   CARGO_BUILD_JOBS   how many rustc and link jobs cargo runs at once
#   CARGO_TARGET_DIR   where cargo builds, when UBU_TARGET_ROOT says where
#
# It exports nothing else. Sourcing writes no file; invoking Cargo creates the
# shared /tmp advisory lock. With no target root, repositories still build in
# their own `target`. Cargo runs with exclusion and an available user scope.
#
# No repo may commit a machine-specific path. The root comes from the
# environment of the machine, never from a file in a repository.

# ---- how parallel
#
# A full `cargo test` of ubu-orchestrator links about 55 test binaries with
# debug info. Left to itself cargo runs one job per core; on a 16-core machine
# with 30 GB that peaked at 24.4 GB, and the out-of-memory killer took the whole
# terminal with it. The terminal was killed under memory pressure while two
# four-job invocations overlapped during P1B-60. Default to one compile/link job
# and run Cargo invocations sequentially across repositories: this cap is per invocation,
# not machine-wide. Override deliberately by exporting CARGO_BUILD_JOBS first.
export CARGO_BUILD_JOBS="${CARGO_BUILD_JOBS:-1}"

# ---- where
#
# UBU_TARGET_ROOT, when set, is a directory that holds one target directory for
# each repository: $UBU_TARGET_ROOT/ubu-orchestrator, $UBU_TARGET_ROOT/ubu-ui and
# so on. Never one shared directory: workspaces that share a target directory
# rebuild each other's dependencies and wait on each other's lock.
#
# Pointing cargo at the directory, rather than symlinking `target/debug` to it,
# is what makes `cargo clean` correct: cargo cleans the directory it is
# configured to use. A symlink is removed by `cargo clean` and the artifacts
# behind it are left.
#
# Unset, nothing here touches CARGO_TARGET_DIR.

# The root must already exist. A drive that is not mounted must be an error that
# names the path, never a silent rebuild of 24 GB somewhere else. A mount point
# is usually still there, empty, when its drive is not mounted, so "the parent
# exists" is not enough to create the root: it is created by hand, once.
ubu_target_root_check() {
  [ -n "${UBU_TARGET_ROOT:-}" ] || return 0
  case "$UBU_TARGET_ROOT" in
    /*) ;;
    *)
      echo "env.sh: REFUSED: UBU_TARGET_ROOT is not an absolute path: $UBU_TARGET_ROOT" >&2
      return 1
      ;;
  esac
  if [ ! -d "$(dirname "$UBU_TARGET_ROOT")" ]; then
    echo "env.sh: REFUSED: UBU_TARGET_ROOT is $UBU_TARGET_ROOT, and its parent directory $(dirname "$UBU_TARGET_ROOT") does not exist." >&2
    echo "env.sh: Is the drive mounted? Nothing was set, and nothing will be built somewhere else instead." >&2
    return 1
  fi
  if [ ! -d "$UBU_TARGET_ROOT" ]; then
    echo "env.sh: REFUSED: UBU_TARGET_ROOT is $UBU_TARGET_ROOT, and that directory does not exist." >&2
    echo "env.sh: If the drive is mounted, create it once: mkdir \"$UBU_TARGET_ROOT\". Nothing was set." >&2
    return 1
  fi
  return 0
}

# Set CARGO_TARGET_DIR for the repository that holds the given directory, or
# the current one. An environment variable does not follow `cd`, so a script
# that visits several repositories calls this after each `cd` and before cargo,
# and a shell that moves to another repository sources this file again.
#
# A repository that builds nothing with cargo gets no target directory, and one
# left over from another repository is cleared rather than inherited: building
# one repository into another's directory is a full rebuild in the wrong place.
ubu_cargo_env() {
  [ -n "${UBU_TARGET_ROOT:-}" ] || return 0
  ubu_target_root_check || return 1
  local dir="${1:-$PWD}" top
  top="$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null)" || top="$dir"
  if [ -f "$top/Cargo.toml" ] || [ -f "$top/src-tauri/Cargo.toml" ]; then
    export CARGO_TARGET_DIR="$UBU_TARGET_ROOT/$(basename "$top")"
  else
    unset CARGO_TARGET_DIR
  fi
}

# Sourced from inside a repository, set that repository's target directory now.
ubu_target_root_check && ubu_cargo_env

# ---- exclusion and containment (Linux, P1B-71)
#
# Only invoking Cargo creates the shared /tmp lock. Sourcing still writes no
# file. An owned tensor worker takes this same flock without waiting; echo and
# metadata probes perform no device compute and do not take the compute lock.
# The wrapper is a subshell so its umask and descriptor policy do not leak.
cargo() (
  local ubu_cargo_bin ubu_lock_path ubu_lock_owner
  ubu_cargo_bin="$(type -P cargo)" || {
    echo "env.sh: cargo executable unavailable" >&2; return 127;
  }
  command -v flock >/dev/null 2>&1 || {
    echo "env.sh: REFUSED: flock unavailable; build/worker exclusion is required" >&2; return 75;
  }
  ubu_lock_path="/tmp/ubu-planning-build-worker-${EUID}.lock"
  if [[ ! -e "$ubu_lock_path" && ! -L "$ubu_lock_path" ]]; then
    (umask 077; set -o noclobber; : > "$ubu_lock_path") 2>/dev/null || {
      echo "env.sh: REFUSED: shared lock creation raced; retry explicitly" >&2; return 75;
    }
  fi
  [[ -f "$ubu_lock_path" && ! -L "$ubu_lock_path" ]] || {
    echo "env.sh: REFUSED: shared lock is not a regular file" >&2; return 75;
  }
  ubu_lock_owner="$(stat -c '%u' "$ubu_lock_path")" || return 75
  [[ "$ubu_lock_owner" == "$EUID" ]] || {
    echo "env.sh: REFUSED: shared lock has another owner" >&2; return 75;
  }
  local ubu_cargo_status=0
  if command -v systemd-run >/dev/null 2>&1 && command -v systemctl >/dev/null 2>&1 && systemctl --user show-environment >/dev/null 2>&1; then
    # Put the lock owner in Cargo's scope too. If the terminal disappears,
    # a surviving scoped build must keep excluding compute until it exits.
    systemd-run --user --scope --quiet -p MemoryHigh=16G -p MemoryMax=20G \
      -- flock --nonblock --conflict-exit-code 75 --close "$ubu_lock_path" \
      "$ubu_cargo_bin" "$@" || ubu_cargo_status=$?
  else
    echo "env.sh: user systemd scope unavailable; using exclusion lock alone" >&2
    flock --nonblock --conflict-exit-code 75 --close "$ubu_lock_path" \
      "$ubu_cargo_bin" "$@" || ubu_cargo_status=$?
  fi
  if [[ "$ubu_cargo_status" == 75 ]]; then
    echo "env.sh: REFUSED: build or compute session holds shared lock; no wait" >&2
  fi
  return "$ubu_cargo_status"
)
