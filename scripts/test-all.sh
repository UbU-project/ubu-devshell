#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPOS_FILE="${REPOS_FILE:-$ROOT_DIR/repos.toml}"
REPOS_DIR="${REPOS_DIR:-$(cd "$ROOT_DIR/.." && pwd)}"
export CARGO_NET_OFFLINE=true
export GOPROXY=off
export npm_config_offline=true
export NO_PROXY="127.0.0.1,localhost"
export no_proxy="$NO_PROXY"

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

repo_path() {
  local name="$1"
  printf '%s/%s\n' "$REPOS_DIR" "$(repo_dir_name "$name")"
}

require_repo() {
  local name="$1"
  local dir
  dir="$(repo_path "$name")"
  if [[ ! -d "$dir" ]]; then
    echo "error: required repo missing for standing diagnostics: $dir" >&2
    exit 1
  fi
  printf '%s\n' "$dir"
}

assert_offline_github_env() {
  echo "=== Offline GitHub projection guard ==="
  echo ""
  if [[ "${UBU_GITHUB_PROJECTION_EXPORT_MODE:-}" == "live" ]]; then
    echo "error: default tests must run with UBU_GITHUB_PROJECTION_EXPORT_MODE unset or non-live" >&2
    exit 1
  fi
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    echo "error: default tests must run without GITHUB_TOKEN in the environment" >&2
    exit 1
  fi
  echo "PASS live projection mode is off and no GitHub token is present"
  echo ""
}

run_hard_boundary_diagnostics() {
  local core_dir orchestrator_dir
  core_dir="$(require_repo ubu_core)"
  orchestrator_dir="$(require_repo ubu_orchestrator)"

  echo "=== Standing hard-boundary diagnostics ==="
  echo ""

  echo "core export gate: deny-by-default matrix + worker-authority"
  (cd "$core_dir" && cargo test --lib export_gate_denies_by_default_and_only_permits_worker_accepted_adjudication)

  echo "core export gate: redaction-identity export-boundary"
  (cd "$core_dir" && cargo test --lib denied_export_path_does_not_leak_compartment_names_or_labels)

  echo "orchestrator export gate: user-authority bypass resistance"
  (cd "$orchestrator_dir" && cargo test --lib user_authority_export_context_is_rejected_without_permit)

  echo "orchestrator export gate: deny path writes no worker export"
  (cd "$orchestrator_dir" && cargo test --test projection_preview rejected_projection_is_logged_and_not_written)

  echo "orchestrator export gate: accepted path uses automation_worker authority"
  (cd "$orchestrator_dir" && cargo test --test projection_preview reconciliation_surfaces_conflict_and_accepts_external_change)
}

run_static_bypass_guard() {
  local orchestrator_dir file count
  orchestrator_dir="$(require_repo ubu_orchestrator)"
  file="$orchestrator_dir/src/services/projection_service.rs"

  echo "=== Static bypass guard ==="
  echo ""
  echo "checking apply_managed_label_write call sites"

  count="$(
    awk '
      /apply_managed_label_write[[:space:]]*\(/ {
        count += 1
      }
      END { print count + 0 }
    ' "$file"
  )"

  if [[ "$count" -ne 1 ]]; then
    echo "error: expected exactly one gated call site for apply_managed_label_write; found $count" >&2
    awk '
      /apply_managed_label_write[[:space:]]*\(/ {
        printf "  %s:%d:%s\n", FILENAME, FNR, $0
      }
    ' "$file" >&2
    exit 1
  fi

  awk '
    /apply_managed_label_write[[:space:]]*\(/ &&
    /permit/ {
      ok = 1
    }
    END { exit ok ? 0 : 1 }
  ' "$file" || {
    echo "error: apply_managed_label_write call site does not pass the core export permit" >&2
    exit 1
  }

  awk '
    /adjudication\.permit\(\)/ {
      ok = 1
    }
    END { exit ok ? 0 : 1 }
  ' "$file" || {
    echo "error: export path does not visibly extract adjudication.permit()" >&2
    exit 1
  }

  echo "PASS static bypass guard: adapter export entry is reached through the permit path only"
  echo ""
}

run_fake_github_adapter_diagnostics() {
  local adapter_dir orchestrator_dir
  adapter_dir="$(require_repo ubu_github_adapter)"
  orchestrator_dir="$(require_repo ubu_orchestrator)"

  echo "=== Recording fake managed-label diagnostics ==="
  echo ""
  echo "adapter fake: exact managed-label write/read operations"
  (cd "$adapter_dir" && cargo test --test managed_label_write)

  echo "orchestrator fake path: preview -> approve -> reconcile over managed labels"
  (cd "$orchestrator_dir" && cargo test --test projection_preview)
  echo "PASS fake-backed managed-label projection diagnostics"
  echo ""
}

assert_offline_github_env

echo "Running tests under $REPOS_DIR"

while read -r name; do
  dir="$REPOS_DIR/$(repo_dir_name "$name")"
  if [[ ! -d "$dir" ]]; then
    echo "skip: $dir is missing"
    continue
  fi

  ran=0
  if [[ -f "$dir/Cargo.toml" ]]; then
    echo "cargo test: $dir"
    (cd "$dir" && cargo test --all-targets)
    ran=1
  fi
  if [[ -f "$dir/package.json" ]]; then
    echo "npm test --if-present: $dir"
    (cd "$dir" && npm test --if-present)
    ran=1
  fi
  if [[ -f "$dir/go.mod" ]]; then
    echo "go test: $dir"
    (cd "$dir" && go test ./...)
    ran=1
  fi
  if [[ "$ran" -eq 0 ]]; then
    echo "skip: no known test target in $dir"
  fi
done < <(repo_names)

run_static_bypass_guard
run_fake_github_adapter_diagnostics
run_hard_boundary_diagnostics

echo "=== Fixture demo standing diagnostic ==="
echo ""
"$SCRIPT_DIR/run-fixture-demo.sh"
