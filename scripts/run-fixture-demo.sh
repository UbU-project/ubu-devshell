#!/usr/bin/env bash
# Fixture smoke test: exercises the full bootstrap-to-act loop and the gated
# projection loop against the store-backed orchestrator (O5: token intake and
# bootstrap/seed; O6: readiness next_action with explanation, action recording,
# and bounded diagnostic; O7: projection preview, approval, gated mock write,
# reconciliation, and gate-deny path).
# Creates a throwaway SQLite store under a temp directory; removed on exit,
# including on failure. Requires no live GitHub and no network egress.
#
# Governing decisions:
#   O4: MemoryState removed; all state through ubu_store (UBU_DB_PATH throwaway store)
#   O5: desktop token intake (/desktop/session/github-token) + bootstrap/seed endpoint
#   O6: readiness next_action with explanation; action recording; bounded diagnostics (UBU-D0210)
#   O7: gated managed-label projection loop, mock write, reconciliation, deny path
#   UBU-D0226: authority_source remains the authority-path enum
#   UBU-D0230: policy-summary guardrails and compartment_boundary_decided log vocabulary
#
# import_live is a Phase 1 stub (source=github_live_stub) that admits Tasks locally
# without any outbound HTTP. The fixture/dev token satisfies the token-availability
# check and is never sent to GitHub.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPOS_DIR="${REPOS_DIR:-$(cd "$ROOT_DIR/.." && pwd)}"
ORCHESTRATOR_DIR="${ORCHESTRATOR_DIR:-$REPOS_DIR/ubu-orchestrator}"
MANIFEST="$ROOT_DIR/fixtures/demo/phase1-demo-manifest.json"
GITHUB_FIXTURES_DIR="$ROOT_DIR/fixtures/github"
DEMO_PORT="${DEMO_PORT:-17878}"
DEMO_BASE="http://127.0.0.1:$DEMO_PORT"

# --- Prerequisites ---

fail_missing() { echo "error: $1"; exit 1; }

[[ -f "$MANIFEST" ]] \
  || fail_missing "fixture manifest not found: $MANIFEST"

ls "$GITHUB_FIXTURES_DIR"/*.json >/dev/null 2>&1 \
  || fail_missing "no *.json files in $GITHUB_FIXTURES_DIR (run-fixture-demo.sh requires fixtures)"

[[ -d "$ORCHESTRATOR_DIR" ]] \
  || fail_missing "orchestrator repo not found at $ORCHESTRATOR_DIR (run clone-all.sh first)"

command -v cargo   >/dev/null 2>&1 || fail_missing "cargo not found"
command -v curl    >/dev/null 2>&1 || fail_missing "curl not found"
command -v python3 >/dev/null 2>&1 || fail_missing "python3 not found"

echo "=== Fixture Demo: full bootstrap-to-act loop, store-backed ==="
echo "  O4: throwaway UBU_DB_PATH store"
echo "  O5: token intake + bootstrap/seed"
echo "  O6: readiness next_action, action recording, bounded diagnostic (UBU-D0210)"
echo "  O7: gated projection preview/approval/write/reconcile loop with deny path"
echo "orchestrator: $ORCHESTRATOR_DIR"
echo "manifest:     $MANIFEST"
echo "port:         $DEMO_PORT"
echo ""

# --- Temp dir and cleanup ---

DEMO_TMPDIR="$(mktemp -d)"
DEMO_DB="$DEMO_TMPDIR/ubu-demo.db"
ORCH_LOG="$DEMO_TMPDIR/orchestrator.log"
ORCH_PID=""

cleanup() {
  if [[ -n "$ORCH_PID" ]] && kill -0 "$ORCH_PID" 2>/dev/null; then
    kill "$ORCH_PID" 2>/dev/null || true
    wait "$ORCH_PID" 2>/dev/null || true
  fi
  rm -rf "$DEMO_TMPDIR"
  echo "cleanup: temp store removed"
}
trap cleanup EXIT

# --- Validate fixture files ---

echo "Checking fixture files..."
python3 - "$ROOT_DIR" "$MANIFEST" <<'PYEOF'
import json, sys, pathlib

root = pathlib.Path(sys.argv[1])
manifest_path = pathlib.Path(sys.argv[2])
manifest = json.loads(manifest_path.read_text())
base = manifest_path.parent

for rel in manifest.get("fixtures", []):
    p = (base / rel).resolve()
    if not p.exists():
        print(f"error: fixture missing: {p}", file=sys.stderr)
        sys.exit(1)
    print(f"  manifest fixture: {p}")
PYEOF

for f in "$GITHUB_FIXTURES_DIR"/*.json; do
  echo "  github fixture: $f"
done

# --- Build orchestrator ---

echo ""
echo "Building orchestrator (cargo build, uses cache if up-to-date)..."
(cd "$ORCHESTRATOR_DIR" && cargo build --quiet) || {
  echo "error: orchestrator build failed"
  exit 1
}

ORCH_BIN="$ORCHESTRATOR_DIR/target/debug/ubu_orchestrator"
[[ -x "$ORCH_BIN" ]] || fail_missing "orchestrator binary not found at $ORCH_BIN"

# --- Start orchestrator with throwaway store ---
# UBU_DB_PATH selects the SQLite path (O4: src/config.rs db_path() / UBU_DB_PATH).
# Migrations run on open inside UbuStore::connect(). No user store is touched.

echo ""
echo "Starting orchestrator with throwaway store..."
echo "  UBU_DB_PATH=$DEMO_DB"

UBU_DB_PATH="$DEMO_DB" \
UBU_ORCHESTRATOR_PORT="$DEMO_PORT" \
"$ORCH_BIN" >"$ORCH_LOG" 2>&1 &
ORCH_PID=$!

echo "Waiting for orchestrator to be ready..."
READY=0
for i in $(seq 1 60); do
  if curl -sf "$DEMO_BASE/health" >/dev/null 2>&1; then
    READY=1
    echo "  ready (attempt $i)"
    break
  fi
  if ! kill -0 "$ORCH_PID" 2>/dev/null; then
    echo "error: orchestrator process died before becoming ready; log:"
    cat "$ORCH_LOG" >&2
    exit 1
  fi
  sleep 1
done
if [[ "$READY" -ne 1 ]]; then
  echo "error: orchestrator did not become ready within 60s; log:"
  cat "$ORCH_LOG" >&2
  exit 1
fi

# --- Full bootstrap-to-act loop ---

echo ""
echo "Step 1: token intake (O5) — set fixture/dev token via desktop session endpoint"
TOKEN_RESP="$(curl -sf -X POST "$DEMO_BASE/desktop/session/github-token" \
  -H "content-type: application/json" \
  -d '{
    "schema_version": "ubu.orchestrator.desktop_session.v1",
    "github_token": "fixture-dev-token-ubu-demo"
  }')"
echo "  response: $TOKEN_RESP"
python3 - "$TOKEN_RESP" <<'PYEOF'
import json, sys
d = json.loads(sys.argv[1])
assert d.get("accepted") is True, \
    f"token intake: expected accepted=true, got: {d}"
assert d.get("token_available") is True, \
    f"token intake: expected token_available=true, got: {d}"
print("  PASS token intake: accepted=true  token_available=true")
PYEOF

echo ""
echo "Step 2: bootstrap/seed (O5/O6) — admit Objective, Preferences, and Tasks"
echo "  (import_live stub: creates Task locally, no outbound HTTP)"
SEED_RESP="$(curl -sf -X POST "$DEMO_BASE/bootstrap/seed" \
  -H "content-type: application/json" \
  -d '{
    "schema_version": "ubu.orchestrator.bootstrap.v1",
    "selected_repo": {"owner": "UbU-project", "repo": "ubu-design"},
    "answers": {
      "primary_objective": "Build and ship Phase 1 of UbU (fixture demo)",
      "work_style": "balanced",
      "planning_horizon_days": 7,
      "attention_preference": "mixed"
    }
  }')"
echo "  response: $SEED_RESP"
python3 - "$SEED_RESP" <<'PYEOF'
import json, sys
d = json.loads(sys.argv[1])
obj_ids  = d.get("objective_ids", [])
pref_ids = d.get("preference_ids", [])
imported = d.get("imported_tasks", {})
admitted = imported.get("admitted_to_store", 0)
assert len(obj_ids) >= 1, \
    f"seed: expected objective_ids non-empty, got: {d}"
assert len(pref_ids) >= 1, \
    f"seed: expected preference_ids non-empty, got: {d}"
assert admitted >= 1, \
    f"seed: expected imported_tasks.admitted_to_store >= 1, got: {d}"
print(f"  seed: objective_ids={obj_ids}")
print(f"  seed: preference_ids={pref_ids}")
print(f"  seed: imported_tasks.admitted_to_store={admitted}")
PYEOF

echo ""
echo "Step 3: next_action (O6) — assert ready Task with non-empty readiness explanation"
NEXT_SCHEMA="ubu.orchestrator.next_action.v1"
NEXT_RESP="$(curl -sf "$DEMO_BASE/next-action?schema_version=$NEXT_SCHEMA")"
echo "  response: $NEXT_RESP"
TASK_ID="$(python3 - "$NEXT_RESP" <<'PYEOF'
import json, sys
d = json.loads(sys.argv[1])
rec = d.get("recommendation")
assert rec is not None, \
    f"next_action: expected recommendation, got diagnostics-only response: {d}"
assert rec.get("readiness") == "ready", \
    f"next_action: expected readiness=ready, got: {rec.get('readiness')}"
msg = rec.get("explanation", {}).get("message", "")
assert msg.strip(), \
    f"next_action: expected non-empty explanation.message, got: {rec.get('explanation')}"
print(rec["task_id"])
PYEOF
)"
echo "  next_action: task_id=$TASK_ID  readiness=ready"
python3 - "$NEXT_RESP" <<'PYEOF'
import json, sys
rec = json.loads(sys.argv[1])["recommendation"]
print(f"  explanation: {rec['explanation']['message']}")
PYEOF

echo ""
echo "Step 4: action recording (O6) — record complete, assert completed + Log event admitted"
ACT_SCHEMA="ubu.orchestrator.task_action.v1"
ACT_RESP="$(curl -sf -X POST "$DEMO_BASE/task/$TASK_ID/action" \
  -H "content-type: application/json" \
  -d "{\"schema_version\":\"$ACT_SCHEMA\",\"action\":\"complete\"}")"
echo "  response: $ACT_RESP"
python3 - "$ACT_RESP" "$TASK_ID" <<'PYEOF'
import json, sys
d = json.loads(sys.argv[1])
expected_task_id = sys.argv[2]
assert d.get("log_id", ""), \
    f"action: expected non-empty log_id, got: {d}"
assert d.get("task_id") == expected_task_id, \
    f"action: task_id mismatch — expected {expected_task_id}, got: {d.get('task_id')}"
assert d.get("task_status") == "completed", \
    f"action: expected task_status=completed, got: {d.get('task_status')}"
assert d.get("transition_applied") is True, \
    f"action: expected transition_applied=true, got: {d.get('transition_applied')}"
print(f"  action: log_id={d['log_id']}")
print(f"  action: task_status={d['task_status']}  transition_applied={d['transition_applied']}")
PYEOF

echo ""
echo "Step 5: next_action bounded diagnostic (O6, UBU-D0210)"
echo "  Completing the only Task drives the store into a no-active-Tasks state."
echo "  Asserting bounded diagnostic is returned — not an opaque empty response."
NEXT_RESP2="$(curl -sf "$DEMO_BASE/next-action?schema_version=$NEXT_SCHEMA")"
echo "  response: $NEXT_RESP2"
python3 - "$NEXT_RESP2" <<'PYEOF'
import json, sys

BOUNDED_CODES = {
    "no_admitted_tasks",
    "no_active_tasks",
    "all_candidates_blocked_on_unmet_dependencies",
    "all_candidates_blocked_on_preconditions",
    "no_ready_task",
}

d = json.loads(sys.argv[1])
rec  = d.get("recommendation")
diags = d.get("diagnostics", [])
assert rec is None, \
    f"next_action (bounded): expected no recommendation after completing the only Task, got: {rec}"
assert len(diags) >= 1, \
    f"next_action (bounded): expected bounded diagnostic (UBU-D0210), got empty diagnostics: {d}"
code = diags[0].get("code", "")
assert code in BOUNDED_CODES, \
    f"next_action (bounded): unknown diagnostic code '{code}'; expected one of {sorted(BOUNDED_CODES)}"
print(f"  bounded diagnostic (UBU-D0210): code={code}")
print(f"  message: {diags[0].get('message', '')}")
PYEOF

echo ""
echo "Step 6: projection preview + approval (O7) — gated mock managed-label write"
PREVIEW_SCHEMA="ubu.orchestrator.projection_preview.v1"
APPROVAL_SCHEMA="ubu.orchestrator.projection_approval.v1"
RESULT_SCHEMA="ubu.orchestrator.projection_result.v1"
RECONCILE_SCHEMA="ubu.orchestrator.projection_reconciliation.v1"

PROJECTION_PREVIEW_RESP="$(curl -sf -X POST "$DEMO_BASE/projection/preview" \
  -H "content-type: application/json" \
  -d "{
    \"schema_version\":\"$PREVIEW_SCHEMA\",
    \"owner\":\"UbU-project\",
    \"repo\":\"ubu-orchestrator\",
    \"issue_number\":7,
    \"observed_labels\":[],
    \"desired_labels\":[\"ubu-managed\"],
    \"existing_repository_labels\":[\"ubu\",\"ubu-managed\"],
    \"reason\":\"fixture smoke test managed-label projection\"
  }")"
echo "  preview response: $PROJECTION_PREVIEW_RESP"
PROJECTION_PREVIEW_ID="$(python3 - "$PROJECTION_PREVIEW_RESP" <<'PYEOF'
import json, sys

d = json.loads(sys.argv[1])
assert d.get("schema_version") == "ubu.orchestrator.projection_preview.v1", d
assert d.get("requires_approval") is True, d
assert d.get("policy_summary", {}).get("legitimization") == "accepted", d
assert d.get("policy_summary", {}).get("no_external_export") is False, d
ops = d.get("operations", [])
assert ops, f"projection preview: expected at least one managed-label operation, got: {d}"
for op in ops:
    assert op.get("kind") == "label", f"projection preview: expected label-only operation, got: {op}"
    payload = op.get("payload", {})
    if payload.get("type") == "label":
        label = payload.get("label")
        assert label in {"ubu", "ubu-managed"}, f"unexpected label write: {label}"
print(d["preview_id"])
PYEOF
)"
echo "  projection preview: preview_id=$PROJECTION_PREVIEW_ID"

COUNTS_BEFORE_APPROVE="$(python3 - "$DEMO_DB" <<'PYEOF'
import sqlite3, sys
db = sys.argv[1]
con = sqlite3.connect(db)
cur = con.cursor()
for table in ("projection_worker_writes", "projection_approvals", "logs"):
    cur.execute(f"SELECT COUNT(*) FROM {table}")
    print(cur.fetchone()[0])
PYEOF
)"
WRITES_BEFORE="$(printf '%s\n' "$COUNTS_BEFORE_APPROVE" | sed -n '1p')"
APPROVALS_BEFORE="$(printf '%s\n' "$COUNTS_BEFORE_APPROVE" | sed -n '2p')"
LOGS_BEFORE="$(printf '%s\n' "$COUNTS_BEFORE_APPROVE" | sed -n '3p')"

PROJECTION_RESULT_RESP="$(curl -sf -X POST "$DEMO_BASE/projection/approve" \
  -H "content-type: application/json" \
  -d "{
    \"schema_version\":\"$APPROVAL_SCHEMA\",
    \"preview_id\":\"$PROJECTION_PREVIEW_ID\",
    \"approved\":true,
    \"authority_source\":\"user\"
  }")"
echo "  approval/result response: $PROJECTION_RESULT_RESP"
python3 - "$PROJECTION_RESULT_RESP" "$PROJECTION_PREVIEW_ID" <<'PYEOF'
import json, sys

d = json.loads(sys.argv[1])
preview_id = sys.argv[2]
assert d.get("schema_version") == "ubu.orchestrator.projection_result.v1", d
assert d.get("preview_id") == preview_id, d
assert d.get("status") == "applied", f"projection result: expected applied, got: {d}"
assert not d.get("diagnostics"), f"projection result: expected no diagnostics, got: {d}"
results = d.get("operation_results", [])
assert results, f"projection result: expected operation results, got: {d}"
for result in results:
    assert result.get("status") == "applied", result
    assert result.get("authority_source") == "automation_worker", result
print("  PASS projection result: status=applied  authority_source=automation_worker")
PYEOF

python3 - "$DEMO_DB" "$WRITES_BEFORE" "$APPROVALS_BEFORE" "$LOGS_BEFORE" <<'PYEOF'
import json, sqlite3, sys

db, writes_before, approvals_before, logs_before = sys.argv[1:5]
writes_before = int(writes_before)
approvals_before = int(approvals_before)
logs_before = int(logs_before)
con = sqlite3.connect(db)
cur = con.cursor()

cur.execute("SELECT COUNT(*) FROM projection_worker_writes")
writes_after = cur.fetchone()[0]
assert writes_after == writes_before + 1, (
    f"mock github-label-write: expected exactly one new worker write, "
    f"before={writes_before} after={writes_after}"
)

cur.execute("SELECT COUNT(*) FROM projection_approvals")
approvals_after = cur.fetchone()[0]
assert approvals_after == approvals_before + 1, (
    f"projection approval: expected one new approval, before={approvals_before} "
    f"after={approvals_after}"
)

cur.execute(
    "SELECT payload_json FROM projection_worker_writes ORDER BY created_at DESC LIMIT 1"
)
payload = json.loads(cur.fetchone()[0])
operation = payload.get("operation", {})
assert payload.get("schema_version") == "ubu.orchestrator.projection_result.v1", payload
assert payload.get("authority_source") == "automation_worker", payload
assert operation.get("kind") in {"apply_label", "managed_label_preflight"}, operation
op_payload = operation.get("payload", {})
labels = []
if op_payload.get("type") == "label":
    labels.append(op_payload.get("label"))
if op_payload.get("type") == "managed_label_preflight":
    labels.extend(op_payload.get("missing_labels", []))
assert labels, f"mock github-label-write: no managed labels found in payload: {payload}"
assert all(label in {"ubu", "ubu-managed"} for label in labels), (
    f"mock github-label-write: unmanaged label reached mock: {labels}"
)

cur.execute(
    """
    SELECT payload_json FROM logs
    WHERE event_type = 'compartment_boundary_decided'
    ORDER BY created_at DESC
    LIMIT 1
    """
)
log_payload = json.loads(cur.fetchone()[0])
cur.execute("SELECT COUNT(*) FROM logs")
logs_after = cur.fetchone()[0]
assert logs_after >= logs_before + 1, (
    f"compartment_boundary_decided: expected a new log entry, "
    f"before={logs_before} after={logs_after}"
)
assert log_payload.get("adjudication_result") == "accepted", log_payload
assert log_payload.get("member_evaluated") == "no_external_export", log_payload
assert log_payload.get("authority_source") == "automation_worker", log_payload
print("  PASS mock write: exactly one managed-label write recorded")
print("  PASS boundary log: compartment_boundary_decided accepted")
PYEOF

echo ""
echo "Step 7: projection reconciliation (O7) — mock reports managed-label drift"
WRITES_BEFORE_RECONCILE="$(python3 - "$DEMO_DB" <<'PYEOF'
import sqlite3, sys
con = sqlite3.connect(sys.argv[1])
cur = con.cursor()
cur.execute("SELECT COUNT(*) FROM projection_worker_writes")
print(cur.fetchone()[0])
PYEOF
)"
RECONCILE_RESP="$(curl -sf -X POST "$DEMO_BASE/projection/reconcile" \
  -H "content-type: application/json" \
  -d "{
    \"schema_version\":\"$RECONCILE_SCHEMA\",
    \"observed_labels\":[]
  }")"
echo "  reconciliation response: $RECONCILE_RESP"
python3 - "$RECONCILE_RESP" <<'PYEOF'
import json, sys

d = json.loads(sys.argv[1])
assert d.get("schema_version") == "ubu.orchestrator.projection_reconciliation.v1", d
assert d.get("status") in {"drifted", "missing"}, (
    f"reconciliation: expected drifted or missing, got: {d}"
)
assert d.get("conflicts"), f"reconciliation: expected conflicts to surface, got: {d}"
diagnostics = d.get("diagnostics", [])
assert diagnostics and diagnostics[0].get("code") == "projection_conflict", d
print(f"  PASS reconciliation: status={d['status']} conflicts={len(d['conflicts'])}")
PYEOF
python3 - "$DEMO_DB" "$WRITES_BEFORE_RECONCILE" <<'PYEOF'
import sqlite3, sys

db, writes_before = sys.argv[1], int(sys.argv[2])
con = sqlite3.connect(db)
cur = con.cursor()
cur.execute("SELECT COUNT(*) FROM projection_worker_writes")
writes_after = cur.fetchone()[0]
assert writes_after == writes_before, (
    f"reconciliation: expected no silent overwrite, before={writes_before} after={writes_after}"
)
cur.execute("SELECT COUNT(*) FROM projection_reconciliations WHERE status IN ('drifted', 'missing')")
assert cur.fetchone()[0] >= 1, "reconciliation: expected persisted drifted/missing record"
print("  PASS reconciliation: conflict persisted and no mock write occurred")
PYEOF

echo ""
echo "Step 8: projection gate deny path (O7/UBU-D0230) — no external export"
WRITES_BEFORE_DENY="$(python3 - "$DEMO_DB" <<'PYEOF'
import sqlite3, sys
con = sqlite3.connect(sys.argv[1])
cur = con.cursor()
cur.execute("SELECT COUNT(*) FROM projection_worker_writes")
print(cur.fetchone()[0])
PYEOF
)"
DENY_PREVIEW_RESP="$(curl -sf -X POST "$DEMO_BASE/projection/preview" \
  -H "content-type: application/json" \
  -d "{
    \"schema_version\":\"$PREVIEW_SCHEMA\",
    \"owner\":\"UbU-project\",
    \"repo\":\"ubu-orchestrator\",
    \"issue_number\":8,
    \"observed_labels\":[],
    \"desired_labels\":[\"ubu-managed\"],
    \"existing_repository_labels\":[\"ubu\",\"ubu-managed\"],
    \"no_external_export\":true,
    \"reason\":\"fixture smoke test deny path\"
  }")"
echo "  deny preview response: $DENY_PREVIEW_RESP"
DENY_PREVIEW_ID="$(python3 - "$DENY_PREVIEW_RESP" <<'PYEOF'
import json, sys

d = json.loads(sys.argv[1])
policy = d.get("policy_summary", {})
assert policy.get("legitimization") == "rejected", d
assert policy.get("no_external_export") is True, d
assert d.get("operations"), f"deny preview: expected operation requiring gate decision, got: {d}"
print(d["preview_id"])
PYEOF
)"
echo "  deny preview: preview_id=$DENY_PREVIEW_ID  legitimization=rejected"

DENY_RESULT_RESP="$(curl -sf -X POST "$DEMO_BASE/projection/approve" \
  -H "content-type: application/json" \
  -d "{
    \"schema_version\":\"$APPROVAL_SCHEMA\",
    \"preview_id\":\"$DENY_PREVIEW_ID\",
    \"approved\":true,
    \"authority_source\":\"user\"
  }")"
echo "  deny approval/result response: $DENY_RESULT_RESP"
python3 - "$DENY_RESULT_RESP" "$DENY_PREVIEW_ID" <<'PYEOF'
import json, sys

d = json.loads(sys.argv[1])
preview_id = sys.argv[2]
assert d.get("schema_version") == "ubu.orchestrator.projection_result.v1", d
assert d.get("preview_id") == preview_id, d
assert d.get("status") == "failed", f"deny result: expected failed, got: {d}"
diagnostics = d.get("diagnostics", [])
assert diagnostics and diagnostics[0].get("code") == "projection_denied", d
for result in d.get("operation_results", []):
    assert result.get("status") == "skipped", result
    assert result.get("authority_source") is None, result
print("  PASS deny result: status=failed diagnostics[0].code=projection_denied")
PYEOF

python3 - "$DEMO_DB" "$WRITES_BEFORE_DENY" <<'PYEOF'
import json, sqlite3, sys

db, writes_before = sys.argv[1], int(sys.argv[2])
con = sqlite3.connect(db)
cur = con.cursor()
cur.execute("SELECT COUNT(*) FROM projection_worker_writes")
writes_after = cur.fetchone()[0]
assert writes_after == writes_before, (
    f"deny path: github-label-write reached mock unexpectedly, "
    f"before={writes_before} after={writes_after}"
)
cur.execute(
    """
    SELECT payload_json FROM logs
    WHERE event_type = 'compartment_boundary_decided'
    ORDER BY created_at DESC
    LIMIT 1
    """
)
log_payload = json.loads(cur.fetchone()[0])
assert log_payload.get("adjudication_result") == "rejected", log_payload
assert log_payload.get("member_evaluated") == "no_external_export", log_payload
reason = log_payload.get("reason", "")
assert "no_external_export" in reason or "forbids external export" in reason, log_payload
print("  PASS deny path: no mock write and compartment_boundary_decided rejected")
PYEOF

echo ""
echo "PASS: full bootstrap-to-act and gated projection loops verified store-backed on throwaway store"
echo "  store=$DEMO_DB (ephemeral — removed on exit)"
