#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"
export CARGO_NET_OFFLINE=true
# Every repository, Git index and generated config is an isolated fixture.
PATCH_TOOL="$("$SCRIPT_DIR/build-patch-config-tool.sh")"
node "$SCRIPT_DIR/test-patch-config.mjs" "$SCRIPT_DIR/gen-patch-config.sh" "$PATCH_TOOL"
