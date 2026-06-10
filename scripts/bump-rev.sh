#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: bump-rev.sh <consumer-repo-dir> <dependency-repo-name-or-url> <rev>

Examples:
  ./scripts/bump-rev.sh ../ubu-store ubu-core abc1234
  ./scripts/bump-rev.sh ../ubu-orchestrator https://github.com/UbU-project/ubu-core abc1234

Updates the matching UbU git dependency rev in <consumer-repo-dir>/Cargo.toml.
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" || "$#" -ne 3 ]]; then
  usage
  exit 2
fi

consumer_dir="$1"
dep="$2"
rev="$3"
cargo_toml="$consumer_dir/Cargo.toml"

if [[ ! -f "$cargo_toml" ]]; then
  echo "error: missing $cargo_toml"
  exit 1
fi

dep_repo="${dep##*/}"
dep_repo="${dep_repo%.git}"
dep_repo="${dep_repo//_/-}"
dep_crate="${dep_repo//-/_}"
dep_url="https://github.com/UbU-project/$dep_repo"
tmp_file="$(mktemp)"

awk -v dep_url="$dep_url" -v dep_repo="$dep_repo" -v dep_crate="$dep_crate" -v rev="$rev" '
  function matches(line) {
    return line ~ dep_url || line ~ dep_repo || line ~ dep_crate
  }
  function replace_rev(line) {
    sub(/rev[[:space:]]*=[[:space:]]*"[^"]+"/, "rev = \"" rev "\"", line)
    return line
  }
  function emit_block(    block_text, lines, count, i, changed) {
    block_text = block
    if (matched) {
      if (has_rev) {
        count = split(block_text, lines, "\n")
        for (i = 1; i <= count; i++) {
          if (lines[i] ~ /rev[[:space:]]*=/) {
            lines[i] = replace_rev(lines[i])
            changed = 1
          }
          if (i < count || lines[i] != "") {
            print lines[i]
          }
        }
      } else if (block_text ~ /\}/) {
        sub(/\}/, ", rev = \"" rev "\" }", block_text)
        printf "%s", block_text
      }
      updated = 1
    } else {
      printf "%s", block_text
    }
  }
  {
    if (!in_block && $0 ~ /^[[:space:]]*[A-Za-z0-9_-]+[[:space:]]*=/ && $0 ~ /\{/) {
      in_block = 1
      block = $0 ORS
      matched = matches($0)
      has_rev = ($0 ~ /rev[[:space:]]*=/)
      if ($0 ~ /\}/) {
        emit_block()
        in_block = 0
        block = ""
      }
      next
    }
    if (in_block) {
      block = block $0 ORS
      matched = matched || matches($0)
      has_rev = has_rev || ($0 ~ /rev[[:space:]]*=/)
      if ($0 ~ /\}/) {
        emit_block()
        in_block = 0
        block = ""
      }
      next
    }
    print
  }
  END {
    if (in_block) {
      emit_block()
    }
    if (!updated) {
      exit 3
    }
  }
' "$cargo_toml" > "$tmp_file" || {
  code="$?"
  rm -f "$tmp_file"
  if [[ "$code" -eq 3 ]]; then
    echo "error: no matching git dependency for $dep_url in $cargo_toml"
  else
    echo "error: failed to update $cargo_toml"
  fi
  exit 1
}

mv "$tmp_file" "$cargo_toml"
echo "updated: $cargo_toml dependency $dep_repo rev -> $rev"
