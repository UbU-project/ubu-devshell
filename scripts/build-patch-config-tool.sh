#!/usr/bin/env bash
# Private cached tool; no committed manifest, lockfile, patch or machine path.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WORK_DIR="$ROOT_DIR/.cache/patch-config-tool"
mkdir -p "$WORK_DIR/src"
copy_if_changed() {
  if [[ ! -f "$2" ]] || ! cmp -s "$1" "$2"; then cp "$1" "$2"; fi
}
copy_if_changed "$ROOT_DIR/tools/patch-config/Cargo.toml.in" "$WORK_DIR/Cargo.toml"
copy_if_changed "$ROOT_DIR/tools/patch-config/src/main.rs" "$WORK_DIR/src/main.rs"
export CARGO_NET_OFFLINE=true
export CARGO_TARGET_DIR="${UBU_TARGET_ROOT:-$ROOT_DIR/.cache}/ubu-devshell"
cargo build --offline --manifest-path "$WORK_DIR/Cargo.toml" >&2
printf '%s\n' "$CARGO_TARGET_DIR/debug/ubu_patch_config"
