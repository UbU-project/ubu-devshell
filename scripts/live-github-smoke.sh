#!/usr/bin/env bash
# Manual recursive live GitHub smoke for UBU-D0244/UBU-D0245.
#
# This script is deliberately not called by check-all.sh, test-all.sh, or the
# fixture demo. It starts a throwaway local orchestrator with live ingest and
# live projection modes explicitly enabled, submits the runtime token through
# the desktop session token endpoint, imports throwaway issues, runs planning to
# a next Task, previews exactly one managed-label add, requires a second
# explicit confirmation, approves the add, verifies by live reconciliation, then
# removes the managed label and verifies cleanup.
set +x
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPOS_DIR="${REPOS_DIR:-$(cd "$ROOT_DIR/.." && pwd)}"
ORCHESTRATOR_DIR="${ORCHESTRATOR_DIR:-$REPOS_DIR/ubu-orchestrator}"
SMOKE_PORT="${UBU_LIVE_GITHUB_SMOKE_PORT:-17879}"
SMOKE_BASE="http://127.0.0.1:$SMOKE_PORT"
export NO_PROXY="127.0.0.1,localhost"
export no_proxy="$NO_PROXY"
SMOKE_DB=""
SMOKE_TMPDIR=""
ORCH_PID=""

PREVIEW_SCHEMA="ubu.orchestrator.projection_preview.v1"
APPROVAL_SCHEMA="ubu.orchestrator.projection_approval.v1"
RECONCILE_SCHEMA="ubu.orchestrator.projection_reconciliation.v1"
DESKTOP_SCHEMA="ubu.orchestrator.desktop_session.v1"
NEXT_SCHEMA="ubu.orchestrator.next_action.v1"
MANAGED_LABEL="ubu-managed"

fail() {
  echo "error: $*" >&2
  exit 1
}

cleanup() {
  if [[ -n "$ORCH_PID" ]] && kill -0 "$ORCH_PID" 2>/dev/null; then
    kill "$ORCH_PID" 2>/dev/null || true
    wait "$ORCH_PID" 2>/dev/null || true
  fi
  if [[ -n "$SMOKE_TMPDIR" && -d "$SMOKE_TMPDIR" ]]; then
    rm -rf "$SMOKE_TMPDIR"
  fi
}
trap cleanup EXIT

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    fail "$name is required"
  fi
}

post_json() {
  local path="$1"
  curl -sf -X POST "$SMOKE_BASE$path" \
    -H "content-type: application/json" \
    --data-binary @-
}

import_body() {
  python3 - "$UBU_LIVE_GITHUB_OWNER" "$UBU_LIVE_GITHUB_REPO" <<'PYEOF'
import json
import sys

owner, repo = sys.argv[1:3]
print(json.dumps({
    "owner": owner,
    "repo": repo,
}))
PYEOF
}

preview_body() {
  local observed_json="$1"
  local desired_json="$2"
  python3 - "$PREVIEW_SCHEMA" "$UBU_LIVE_GITHUB_OWNER" "$UBU_LIVE_GITHUB_REPO" \
    "$UBU_LIVE_GITHUB_ISSUE_NUMBER" "$observed_json" "$desired_json" <<'PYEOF'
import json
import sys

schema, owner, repo, issue_number, observed_json, desired_json = sys.argv[1:7]
print(json.dumps({
    "schema_version": schema,
    "owner": owner,
    "repo": repo,
    "issue_number": int(issue_number),
    "observed_labels": json.loads(observed_json),
    "desired_labels": json.loads(desired_json),
    "existing_repository_labels": ["ubu", "ubu-managed"],
    "reason": "manual UBU-D0244/UBU-D0245 recursive live GitHub smoke"
}))
PYEOF
}

approve_body() {
  local preview_id="$1"
  python3 - "$APPROVAL_SCHEMA" "$preview_id" <<'PYEOF'
import json
import sys

schema, preview_id = sys.argv[1:3]
print(json.dumps({
    "schema_version": schema,
    "preview_id": preview_id,
    "approved": True,
    "authority_source": "user"
}))
PYEOF
}

reconcile_body() {
  python3 - "$RECONCILE_SCHEMA" <<'PYEOF'
import json
import sys

print(json.dumps({"schema_version": sys.argv[1]}))
PYEOF
}

extract_and_assert_single_label_op() {
  local response="$1"
  local expected_label="$2"
  local expected_action="$3"
  python3 - "$response" "$expected_label" "$expected_action" "$UBU_LIVE_GITHUB_ISSUE_NUMBER" <<'PYEOF'
import json
import sys

response, expected_label, expected_action, issue_number = sys.argv[1:5]
d = json.loads(response)
ops = d.get("operations", [])
assert len(ops) == 1, f"expected exactly one operation, got {ops}"
op = ops[0]
assert op.get("kind") == "label", op
assert op.get("target", {}).get("issue_number") == int(issue_number), op
payload = op.get("payload", {})
assert payload.get("type") == "label", payload
assert payload.get("label") == expected_label, payload
summary = op.get("summary", "")
if expected_action == "add":
    assert "Apply managed label" in summary, op
else:
    assert "Remove managed label" in summary, op
print(d["preview_id"])
PYEOF
}

print_operations() {
  local response="$1"
  python3 - "$response" <<'PYEOF'
import json
import sys

d = json.loads(sys.argv[1])
print(json.dumps(d["operations"], indent=2, sort_keys=True))
PYEOF
}

assert_result_applied_once() {
  local response="$1"
  local preview_id="$2"
  local expected_text="$3"
  python3 - "$response" "$preview_id" "$expected_text" <<'PYEOF'
import json
import sys

response, preview_id, expected_text = sys.argv[1:4]
d = json.loads(response)
assert d.get("preview_id") == preview_id, d
assert d.get("status") == "applied", d
assert not d.get("diagnostics"), d
results = d.get("operation_results", [])
assert len(results) == 1, results
result = results[0]
assert result.get("status") == "applied", result
assert result.get("authority_source") == "automation_worker", result
assert expected_text in (result.get("message") or ""), result
PYEOF
}

assert_import_admitted_target() {
  local response="$1"
  python3 - "$response" "$SMOKE_DB" "$UBU_LIVE_GITHUB_OWNER" "$UBU_LIVE_GITHUB_REPO" \
    "$UBU_LIVE_GITHUB_ISSUE_NUMBER" <<'PYEOF'
import json
import sqlite3
import sys

response, db, owner, repo, issue_number = sys.argv[1:6]
d = json.loads(response)
target_source_id = f"{owner}/{repo}#{issue_number}"
assert d.get("imported", 0) >= 1, f"expected at least one imported issue, got: {d}"
assert d.get("admitted_to_store", 0) >= 2, (
    "expected at least one Task plus one External Reference admitted, got: "
    f"{d}"
)
con = sqlite3.connect(db)
task_rows = con.execute(
    "SELECT id, payload_json FROM objects WHERE object_type = 'Task' AND status = 'active'"
).fetchall()
external_rows = con.execute(
    "SELECT source_type, source_id, url, payload_json FROM external_references"
).fetchall()
matched_task = None
for task_id, payload_json in task_rows:
    payload = json.loads(payload_json)
    source_refs = payload.get("provenance", {}).get("source_refs")
    if not source_refs:
        source = payload.get("provenance", {}).get("source", {})
        source_refs = [source]
    for ref in source_refs:
        if ref.get("source_kind") == "github_issue" and ref.get("source_id") == target_source_id:
            matched_task = task_id
            break
    if matched_task:
        break

matched_external = [
    row for row in external_rows
    if row[0] == "github_issue" and row[1] == target_source_id
]
assert matched_task, (
    f"target issue {target_source_id} was not admitted as an active Task; "
    f"active task count={len(task_rows)}"
)
assert len(matched_external) == 1, (
    f"expected exactly one External Reference for {target_source_id}, "
    f"got {len(matched_external)}"
)
print(f"  import admitted target Task={matched_task}")
print(f"  import admitted External Reference source_id={target_source_id}")
PYEOF
}

assert_plan_and_next_target() {
  local plan_response="$1"
  local next_response="$2"
  python3 - "$plan_response" "$next_response" "$UBU_LIVE_GITHUB_OWNER" "$UBU_LIVE_GITHUB_REPO" \
    "$UBU_LIVE_GITHUB_ISSUE_NUMBER" <<'PYEOF'
import json
import sys

plan_response, next_response, owner, repo, issue_number = sys.argv[1:6]
plan_body = json.loads(plan_response)
next_body = json.loads(next_response)
plan = plan_body.get("plan")
assert plan and plan.get("id"), f"planning did not return a plan id: {plan_body}"
steps = plan.get("steps") or []
assert steps, f"planning returned no steps: {plan_body}"

rec = next_body.get("recommendation")
assert rec is not None, f"next-action returned diagnostics only: {next_body}"
assert rec.get("readiness") == "ready", f"next-action was not ready: {rec}"
task_id = rec.get("task_id")
step_task_ids = {step.get("task_id") for step in steps}
assert task_id in step_task_ids, (
    f"next-action task {task_id} was not in the generated plan steps {step_task_ids}"
)

target_source_id = f"{owner}/{repo}#{issue_number}"
source_refs = rec.get("source_refs") or []
assert any(
    ref.get("source_kind") == "github_issue" and ref.get("source_id") == target_source_id
    for ref in source_refs
), f"next-action task does not target {target_source_id}: {rec}"

print(f"  plan_id={plan['id']} steps={len(steps)}")
print(f"  next_task={task_id} source_id={target_source_id}")
PYEOF
}

assert_reconcile_matched() {
  local response="$1"
  local phase="$2"
  python3 - "$response" "$phase" <<'PYEOF'
import json
import sys

d = json.loads(sys.argv[1])
phase = sys.argv[2]
assert d.get("status") == "matched", f"{phase}: expected matched reconciliation, got {d}"
assert not d.get("conflicts"), d
assert not d.get("diagnostics"), d
PYEOF
}

if [[ "${UBU_LIVE_GITHUB_SMOKE:-}" != "1" ]]; then
  fail "set UBU_LIVE_GITHUB_SMOKE=1 to opt in to the manual live smoke"
fi
if [[ "${UBU_GITHUB_INGEST_MODE:-}" != "live" ]]; then
  fail "set UBU_GITHUB_INGEST_MODE=live so the live ingest path is explicit"
fi
if [[ "${UBU_GITHUB_PROJECTION_EXPORT_MODE:-}" != "live" ]]; then
  fail "set UBU_GITHUB_PROJECTION_EXPORT_MODE=live so the server-side live path is explicit"
fi
require_env GITHUB_TOKEN
require_env UBU_LIVE_GITHUB_OWNER
require_env UBU_LIVE_GITHUB_REPO
require_env UBU_LIVE_GITHUB_ISSUE_NUMBER

[[ "$UBU_LIVE_GITHUB_ISSUE_NUMBER" =~ ^[0-9]+$ ]] \
  || fail "UBU_LIVE_GITHUB_ISSUE_NUMBER must be an integer"
[[ -d "$ORCHESTRATOR_DIR" ]] || fail "missing orchestrator repo at $ORCHESTRATOR_DIR"
command -v cargo >/dev/null 2>&1 || fail "cargo not found"
command -v curl >/dev/null 2>&1 || fail "curl not found"
command -v python3 >/dev/null 2>&1 || fail "python3 not found"

echo "=== UBU-D0244/UBU-D0245 recursive live GitHub smoke ==="
echo "target: ${UBU_LIVE_GITHUB_OWNER}/${UBU_LIVE_GITHUB_REPO}#${UBU_LIVE_GITHUB_ISSUE_NUMBER}"
echo "token: supplied from GITHUB_TOKEN at runtime; raw token is not printed or stored"
echo "mode:  UBU_GITHUB_INGEST_MODE=live  UBU_GITHUB_PROJECTION_EXPORT_MODE=live"
echo ""

echo "Building orchestrator offline from local checkout"
(cd "$ORCHESTRATOR_DIR" && cargo build --quiet --offline)
ORCH_BIN="$ORCHESTRATOR_DIR/target/debug/ubu_orchestrator"
[[ -x "$ORCH_BIN" ]] || fail "orchestrator binary not found at $ORCH_BIN"

SMOKE_TMPDIR="$(mktemp -d "${TMPDIR:-/tmp}/ubu-live-github-smoke.XXXXXX")"
SMOKE_DB="$SMOKE_TMPDIR/orchestrator.db"
ORCH_LOG="$SMOKE_TMPDIR/orchestrator.log"

echo "Starting local orchestrator on $SMOKE_BASE with a throwaway SQLite store"
env -u GITHUB_TOKEN \
  UBU_GITHUB_INGEST_MODE=live \
  UBU_GITHUB_PROJECTION_EXPORT_MODE=live \
  UBU_ORCHESTRATOR_PORT="$SMOKE_PORT" \
  UBU_DB_PATH="$SMOKE_DB" \
  "$ORCH_BIN" >"$ORCH_LOG" 2>&1 &
ORCH_PID=$!

for _ in $(seq 1 80); do
  if curl -sf "$SMOKE_BASE/health" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$ORCH_PID" 2>/dev/null; then
    cat "$ORCH_LOG" >&2
    fail "orchestrator exited before becoming healthy"
  fi
  sleep 0.25
done
curl -sf "$SMOKE_BASE/health" >/dev/null || {
  cat "$ORCH_LOG" >&2
  fail "orchestrator did not become healthy"
}

echo "Submitting runtime token to in-memory desktop session"
python3 - "$DESKTOP_SCHEMA" <<'PYEOF' | post_json "/desktop/session/github-token" >/dev/null
import json
import os
import sys

print(json.dumps({
    "schema_version": sys.argv[1],
    "github_token": os.environ["GITHUB_TOKEN"]
}))
PYEOF
echo "  token accepted into process memory"

echo ""
echo "Import: live GitHub issues from throwaway repository"
IMPORT_RESP="$(import_body | post_json "/github/import/live")"
echo "  response: $IMPORT_RESP"
assert_import_admitted_target "$IMPORT_RESP"

echo ""
echo "Planning: generate plan and select next Task from imported issue"
PLAN_RESP="$(printf '{}' | post_json "/planning/generate")"
NEXT_RESP="$(curl -sf "$SMOKE_BASE/next-action?schema_version=$NEXT_SCHEMA")"
assert_plan_and_next_target "$PLAN_RESP" "$NEXT_RESP"

echo ""
echo "Dry run: preview exactly one managed-label add"
ADD_PREVIEW_RESP="$(preview_body '[]' "[\"$MANAGED_LABEL\"]" | post_json "/projection/preview")"
echo "planned operations:"
print_operations "$ADD_PREVIEW_RESP"
ADD_PREVIEW_ID="$(extract_and_assert_single_label_op "$ADD_PREVIEW_RESP" "$MANAGED_LABEL" add)"
echo "  preview_id=$ADD_PREVIEW_ID"

CONFIRM_VALUE="approve-one-managed-label-add"
if [[ "${UBU_LIVE_GITHUB_SMOKE_APPROVE:-}" != "$CONFIRM_VALUE" ]]; then
  if [[ ! -t 0 ]]; then
    fail "set UBU_LIVE_GITHUB_SMOKE_APPROVE=$CONFIRM_VALUE, or run interactively and type it after preview"
  fi
  printf 'Type %s to approve the single live managed-label add: ' "$CONFIRM_VALUE"
  read -r typed_confirmation
  [[ "$typed_confirmation" == "$CONFIRM_VALUE" ]] || fail "confirmation did not match; aborting before live write"
fi

echo ""
echo "Approving exactly one live managed-label add"
ADD_RESULT_RESP="$(approve_body "$ADD_PREVIEW_ID" | post_json "/projection/approve")"
assert_result_applied_once "$ADD_RESULT_RESP" "$ADD_PREVIEW_ID" "$MANAGED_LABEL"
echo "  add applied"

echo "Verifying add by live reconciliation"
ADD_RECONCILE_RESP="$(reconcile_body | post_json "/projection/reconcile")"
assert_reconcile_matched "$ADD_RECONCILE_RESP" "add verification"
echo "  add verified"

echo ""
echo "Cleanup: preview and approve managed-label removal"
REMOVE_PREVIEW_RESP="$(preview_body "[\"$MANAGED_LABEL\"]" '[]' | post_json "/projection/preview")"
echo "cleanup operations:"
print_operations "$REMOVE_PREVIEW_RESP"
REMOVE_PREVIEW_ID="$(extract_and_assert_single_label_op "$REMOVE_PREVIEW_RESP" "$MANAGED_LABEL" remove)"
REMOVE_RESULT_RESP="$(approve_body "$REMOVE_PREVIEW_ID" | post_json "/projection/approve")"
assert_result_applied_once "$REMOVE_RESULT_RESP" "$REMOVE_PREVIEW_ID" "$MANAGED_LABEL"
echo "  managed label removed from throwaway issue"

echo "Verifying cleanup by live reconciliation"
REMOVE_RECONCILE_RESP="$(reconcile_body | post_json "/projection/reconcile")"
assert_reconcile_matched "$REMOVE_RECONCILE_RESP" "cleanup verification"
echo "  cleanup verified"

echo ""
echo "PASS live smoke complete. Revoke the fine-grained token immediately."
