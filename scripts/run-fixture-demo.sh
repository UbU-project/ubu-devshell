#!/usr/bin/env bash
# Fixture smoke test: exercises the full bootstrap-to-act loop, the gated
# projection loop, canonical Plan generation / Compact Calendar /
# override-safe recalculation, and affect legitimization against the
# store-backed orchestrator (O5: token
# intake and bootstrap/seed; O6: readiness next_action with explanation, action
# recording, and bounded diagnostic; O7: projection preview, approval, gated
# mock write, reconciliation, and gate-deny path; S9/P3/P4/O9: canonical timed
# Plan, Compact Calendar, and repair-mode recalculation with override-safety).
# Creates a throwaway SQLite store under a temp directory; removed on exit,
# including on failure. Requires no live GitHub and no network egress.
#
# Governing decisions:
#   O4: MemoryState removed; all state through ubu_store (UBU_DB_PATH throwaway store)
#   O5: desktop token intake (/desktop/session/github-token) + bootstrap/seed endpoint
#   O6: readiness next_action with explanation; action recording; bounded diagnostics (UBU-D0210)
#   O7: gated managed-label projection loop, mock write, reconciliation, deny path
#   S9/P3/P4/O9: canonical timed Plan (/planning/generate), Compact Calendar
#               (/calendar/current), and repair-mode recalculation
#               (/planning/recalculate) that supersedes the prior Plan
#   S10/P5/O10: affect profile contract, Phase B affect legitimization, and
#               orchestrator affect-profile/snapshot wiring
#   UBU-D0226: authority_source remains the authority-path enum
#   UBU-D0227: persisted Task.status lifecycle (active/completed/failed/moot)
#              drives which Tasks are frozen and not re-placed on recalculation
#   UBU-D0230: policy-summary guardrails and compartment_boundary_decided log vocabulary
#
# import_live is a Phase 1 stub (source=github_live_stub) that admits Tasks locally
# without any outbound HTTP. The fixture/dev token satisfies the token-availability
# check and is never sent to GitHub. Plan generation and recalculation are
# fixture-driven and offline: the planner adapter is the in-process CPU strategy
# and the Compact Calendar window is seeded directly into the throwaway store.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPOS_DIR="${REPOS_DIR:-$(cd "$ROOT_DIR/.." && pwd)}"
ORCHESTRATOR_DIR="${ORCHESTRATOR_DIR:-$REPOS_DIR/ubu-orchestrator}"
MANIFEST="$ROOT_DIR/fixtures/demo/phase1-demo-manifest.json"
GITHUB_FIXTURES_DIR="$ROOT_DIR/fixtures/github"
PLANNING_FIXTURE="$ROOT_DIR/fixtures/demo/planning-candidates.json"
AFFECT_FIXTURE="$ROOT_DIR/fixtures/demo/affect-legitimization-cases.json"
SCORING_FIXTURE="$ROOT_DIR/fixtures/demo/scoring-selection-cases.json"
DEMO_PORT="${DEMO_PORT:-17878}"
DEMO_BASE="http://127.0.0.1:$DEMO_PORT"
export NO_PROXY="127.0.0.1,localhost"
export no_proxy="$NO_PROXY"

# --- Prerequisites ---

fail_missing() { echo "error: $1"; exit 1; }

[[ -f "$MANIFEST" ]] \
  || fail_missing "fixture manifest not found: $MANIFEST"

ls "$GITHUB_FIXTURES_DIR"/*.json >/dev/null 2>&1 \
  || fail_missing "no *.json files in $GITHUB_FIXTURES_DIR (run-fixture-demo.sh requires fixtures)"

[[ -f "$PLANNING_FIXTURE" ]] \
  || fail_missing "planning fixture not found: $PLANNING_FIXTURE (required for Plan/Calendar/recalculation steps)"

[[ -f "$AFFECT_FIXTURE" ]] \
  || fail_missing "affect legitimization fixture not found: $AFFECT_FIXTURE (required for Phase B affect smoke steps)"

[[ -f "$SCORING_FIXTURE" ]] \
  || fail_missing "scoring selection fixture not found: $SCORING_FIXTURE (required for C-1 scoring and selection smoke steps)"

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
echo "  S9/P3/P4/O9: canonical timed Plan, Compact Calendar, override-safe recalculation"
echo "  S10/P5/O10: affect legitimization feasible/enforce/warn_only/stale paths"
echo "  C-1/P7/P8/O12: bounded candidates, Stage 3 scoring, pruning, composite selection"
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
python3 - "$AFFECT_FIXTURE" <<'PYEOF'
import json, sys, pathlib

path = pathlib.Path(sys.argv[1])
fixture = json.loads(path.read_text())
cases = fixture.get("cases", [])
required = {"feasible-enforce", "infeasible-enforce", "infeasible-warn-only"}
names = {case.get("name") for case in cases}
missing = sorted(required - names)
assert not missing, f"affect fixture missing required cases: {missing}"
for case in cases:
    assert case.get("request"), f"affect fixture case missing request: {case}"
    assert case.get("expected"), f"affect fixture case missing expected: {case}"
print(f"  affect fixture: {path} ({len(cases)} cases)")
PYEOF
python3 - "$SCORING_FIXTURE" <<'PYEOF'
import json, sys, pathlib

path = pathlib.Path(sys.argv[1])
fixture = json.loads(path.read_text())
cases = fixture.get("cases", [])
required = {
    "abundant-slack-utility-heavy",
    "abundant-slack-diversity-heavy",
    "static-anchor-reject-obvious-prune",
}
names = {case.get("name") for case in cases}
missing = sorted(required - names)
assert not missing, f"scoring fixture missing required cases: {missing}"
for case in cases:
    assert case.get("request"), f"scoring fixture case missing request: {case}"
    assert case.get("expected"), f"scoring fixture case missing expected result: {case}"
print(f"  scoring fixture: {path} ({len(cases)} cases)")
PYEOF

# --- Build orchestrator ---

echo ""
echo "Building orchestrator offline (cargo build --offline, uses cached dependencies)..."
(cd "$ORCHESTRATOR_DIR" && cargo build --quiet --offline) || {
  echo "error: offline orchestrator build failed (required dependencies must already be cached)"
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
echo "Step 9: affect legitimization fixtures (S10/P5/O10) — feasible, enforce, warn_only"
echo "  (offline fixture requests: $AFFECT_FIXTURE; posted only to loopback /planning/generate)"
python3 - "$AFFECT_FIXTURE" "$DEMO_BASE" <<'PYEOF'
import json
import sys
import urllib.error
import urllib.request

fixture_path, base_url = sys.argv[1:3]
assert base_url.startswith("http://127.0.0.1:"), \
    f"affect fixture refuses non-loopback endpoint: {base_url}"
fixture = json.loads(open(fixture_path, encoding="utf-8").read())
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

for case in fixture["cases"]:
    name = case["name"]
    expected = case["expected"]
    body = json.dumps({"request": case["request"]}).encode("utf-8")
    request = urllib.request.Request(
        f"{base_url}/planning/generate",
        data=body,
        headers={"content-type": "application/json"},
        method="POST",
    )
    try:
        with opener.open(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise AssertionError(f"{name}: /planning/generate failed: {exc.code} {detail}") from exc

    plan = payload.get("plan")
    plan_present = plan is not None
    assert plan_present is expected["plan_present"], (
        f"{name}: plan_present={plan_present}, expected {expected['plan_present']}: {payload}"
    )

    legitimization = payload.get("legitimization")
    if legitimization is None:
        assert plan_present is False and expected["plan_present"] is False, (
            f"{name}: legitimization is absent outside the all-candidates-filtered path: {payload}"
        )
        assert payload.get("selected_candidate") is None, (
            f"{name}: missing legitimization despite a selected candidate: {payload}"
        )
        assert payload.get("alternatives", []) == [], (
            f"{name}: enforce failure exposed scored alternatives: {payload}"
        )
        print(
            f"  PASS affect {name}: enforce failure filtered every candidate; "
            "plan_present=False"
        )
        continue
    assert legitimization.get("result") == expected["result"], (
        f"{name}: result={legitimization.get('result')}, expected {expected['result']}: {payload}"
    )
    assert legitimization.get("mode") == expected["mode"], (
        f"{name}: mode={legitimization.get('mode')}, expected {expected['mode']}: {payload}"
    )
    assert legitimization.get("affect_feasible") is expected["affect_feasible"], (
        f"{name}: affect_feasible={legitimization.get('affect_feasible')}, "
        f"expected {expected['affect_feasible']}: {payload}"
    )
    assert legitimization.get("violated_dimensions", []) == expected["violated_dimensions"], (
        f"{name}: violated_dimensions={legitimization.get('violated_dimensions')}, "
        f"expected {expected['violated_dimensions']}: {payload}"
    )
    if expected.get("affect_margin_sign") == "negative":
        margin = legitimization.get("affect_margin")
        assert margin is not None and margin < 0, (
            f"{name}: expected negative affect_margin, got {margin}: {payload}"
        )
    if plan_present:
        plan_legitimization = plan.get("legitimization")
        assert plan_legitimization is not None, (
            f"{name}: admitted plan did not persist legitimization: {payload}"
        )
        assert plan_legitimization.get("violated_dimensions", []) == expected["violated_dimensions"], (
            f"{name}: persisted plan violation mismatch: {payload}"
        )
    print(
        "  PASS affect {name}: result={result} mode={mode} feasible={feasible} "
        "violations={violations} plan_present={plan_present}".format(
            name=name,
            result=legitimization["result"],
            mode=legitimization["mode"],
            feasible=legitimization["affect_feasible"],
            violations=legitimization.get("violated_dimensions", []),
            plan_present=plan_present,
        )
    )
PYEOF

echo ""
echo "Step 10: import planning candidates (S9/P3) — admit active Tasks via fixture import"
echo "  (offline fixture import: $PLANNING_FIXTURE; no outbound HTTP)"
IMPORT_RESP="$(curl -sf -X POST "$DEMO_BASE/github/import/fixture" \
  -H "content-type: application/json" \
  -d "{\"fixture_path\":\"$PLANNING_FIXTURE\"}")"
echo "  response: $IMPORT_RESP"
PLAN_TASK_IDS="$(python3 - "$IMPORT_RESP" <<'PYEOF'
import json, sys
d = json.loads(sys.argv[1])
assert d.get("admitted_to_store", 0) >= 3, \
    f"import: expected >=3 admitted planning candidates, got: {d}"
ids = [c["task_id"] for c in d.get("candidates", [])]
assert len(ids) >= 3, f"import: expected >=3 candidate task_ids, got: {d}"
print("\n".join(ids[:3]))
PYEOF
)"
TASK_A="$(printf '%s\n' "$PLAN_TASK_IDS" | sed -n '1p')"
TASK_B="$(printf '%s\n' "$PLAN_TASK_IDS" | sed -n '2p')"
TASK_C="$(printf '%s\n' "$PLAN_TASK_IDS" | sed -n '3p')"
echo "  admitted Tasks: A=$TASK_A  B=$TASK_B  C=$TASK_C"

echo ""
echo "Step 11: canonical timed Plan + Compact Calendar with stale-affect handling (S9/P3/P4/O9/S10/P5/O10)"
CAL_WINDOW_START="2026-06-17T09:00:00Z"
CAL_WINDOW_END="2026-06-17T17:00:00Z"
echo "  seeding Compact Calendar window [$CAL_WINDOW_START .. $CAL_WINDOW_END] into throwaway store"
# Phase A: the Compact Calendar window is a deterministic skeleton. The
# orchestrator has no API to create one in Phase 1, so the fixture seeds the
# throwaway store directly (offline; mirrors the O9 planning contract test).
python3 - "$DEMO_DB" "$CAL_WINDOW_START" "$CAL_WINDOW_END" <<'PYEOF'
import sqlite3, sys
db, w_start, w_end = sys.argv[1], sys.argv[2], sys.argv[3]
con = sqlite3.connect(db)
con.execute(
    "INSERT INTO calendars (id, plan_id, window_start, window_end, payload_json, created_at) "
    "VALUES (?, ?, ?, ?, ?, ?)",
    (
        "cal_demo_window",
        "plan_demo_window",
        w_start,
        w_end,
        '{"windows": [{"start": "%s", "end": "%s"}]}' % (w_start, w_end),
        "2026-06-17T08:00:00Z",
    ),
)
con.commit()
PYEOF
echo "  seeding stale live affect observation and freshness preference into throwaway store"
python3 - "$DEMO_DB" <<'PYEOF'
import json, sqlite3, sys

db = sys.argv[1]
con = sqlite3.connect(db)
preference_payload = {
    "id": "pref_demo_affect_freshness",
    "name": "affect_freshness_seconds",
    "value": 60,
    "authority_source": "system",
    "provenance": {
        "created_at": "2026-06-17T08:00:00Z",
        "authority_source": "system",
        "source": {
            "source_kind": "fixture_demo",
            "source_id": "stale-affect-freshness"
        }
    }
}
snapshot_payload = {
    "id": "snap_demo_stale_affect",
    "captured_at": "2026-06-17T08:00:00Z",
    "objects": [],
    "affect": {
        "source_kind": "live_observation",
        "observed_at": "2026-06-17T08:00:00Z",
        "dimensions": {
            "energy": {
                "dimension": "energy",
                "direction": "higher_is_better",
                "value": 1.0,
                "scale": {"min": 0, "max": 10},
                "threshold": {"warning_delta": 1.0, "critical_delta": 2.0}
            },
            "stress": {
                "dimension": "stress",
                "direction": "lower_is_better",
                "value": 10.0,
                "scale": {"min": 0, "max": 10},
                "threshold": {"warning_delta": 1.0, "critical_delta": 2.0}
            },
            "mood_intensity": {
                "dimension": "mood_intensity",
                "direction": "lower_is_better",
                "value": 10.0,
                "scale": {"min": 0, "max": 10},
                "threshold": {"warning_delta": 1.0, "critical_delta": 2.0}
            }
        }
    }
}
con.execute(
    """
    INSERT INTO objects
      (id, object_type, version, status, compartment_label, payload_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """,
    (
        "pref_demo_affect_freshness",
        "Preference",
        1,
        "active",
        "fixture-demo",
        json.dumps(preference_payload, separators=(",", ":")),
        "2026-06-17T08:00:00Z",
        "2026-06-17T08:00:00Z",
    ),
)
con.execute(
    """
    INSERT INTO objects
      (id, object_type, version, status, compartment_label, payload_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """,
    (
        "snap_demo_stale_affect",
        "Snapshot",
        1,
        "active",
        "fixture-demo",
        json.dumps(snapshot_payload, separators=(",", ":")),
        "2026-06-17T08:00:00Z",
        "2026-06-17T08:00:00Z",
    ),
)
con.commit()
print("  stale affect setup: live observation at 2026-06-17T08:00:00Z, window starts 2026-06-17T09:00:00Z, freshness_seconds=60")
PYEOF

PLAN_RESP="$(curl -sf -X POST "$DEMO_BASE/planning/generate" \
  -H "content-type: application/json" \
  -d '{}')"
echo "  plan response: $PLAN_RESP"
PLAN_ID="$(python3 - "$PLAN_RESP" "$CAL_WINDOW_START" "$CAL_WINDOW_END" "$TASK_A" "$TASK_B" "$TASK_C" <<'PYEOF'
import json, sys
from datetime import datetime


def minutes(ts):
    dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    return int(dt.timestamp()) // 60


resp = json.loads(sys.argv[1])
w_start = minutes(sys.argv[2])
w_end = minutes(sys.argv[3])
expected = set(sys.argv[4:7])

assert resp.get("schema_version") == "planning-kernel-contract/0.1", \
    f"plan: unexpected schema_version: {resp.get('schema_version')}"
# The stale fixture intentionally emits StaleAffect once per evaluated candidate;
# these and the Phase A NotYetImplemented diagnostics are advisory, not failures.
ADVISORY_CODES = {"NotYetImplemented", "StaleAffect"}
unexpected = [d for d in resp.get("diagnostics", []) if d.get("code") not in ADVISORY_CODES]
assert not unexpected, f"plan: unexpected diagnostics: {unexpected}"
plan = resp.get("plan")
assert plan is not None, f"plan: expected a generated Plan, got: {resp}"
assert plan.get("status") == "admitted", f"plan: expected admitted, got: {plan.get('status')}"
assert plan.get("id"), f"plan: expected non-empty id, got: {plan}"
assert "tasks" not in plan, \
    f"plan: expected canonical PlanBody (no kernel 'tasks' field), got: {plan}"

legitimization = resp.get("legitimization")
assert legitimization is not None, f"plan: expected affect legitimization report, got: {resp}"
assert legitimization.get("result") == "passed", \
    f"stale affect: bootstrap default substitution should pass, got: {legitimization}"
assert legitimization.get("mode") == "warn_only", \
    f"stale affect: expected warn_only after stale observation fallback, got: {legitimization}"
assert legitimization.get("affect_feasible") is True, \
    f"stale affect: expected bootstrap default feasible=true, got: {legitimization}"
assert legitimization.get("violated_dimensions", []) == [], \
    f"stale affect: stale live observation was treated as a violation: {legitimization}"
assert legitimization.get("stale_dimensions", []) == [], \
    f"stale affect: stale live observation was presented as current state: {legitimization}"
warning = legitimization.get("stale_affect_warning", "")
assert "stale affect observation" in warning and "bootstrap default profile observation" in warning, \
    f"stale affect: expected marked bootstrap fallback warning, got: {legitimization}"
for dimension, detail in legitimization.get("dimensions", {}).items():
    assert detail.get("stale") in (False, None), \
        f"stale affect: dimension {dimension} was exposed as stale current state: {detail}"
    assert detail.get("margin", 0) >= 0, \
        f"stale affect: infeasible stale live value appears to have been used: {detail}"

plan_legitimization = plan.get("legitimization")
assert plan_legitimization is not None, f"plan: expected persisted legitimization: {plan}"
assert plan_legitimization.get("stale_affect_warning") == warning, \
    f"plan: persisted stale warning mismatch: {plan_legitimization}"

steps = plan.get("steps", [])
assert len(steps) == 3, f"plan: expected 3 timed steps, got {len(steps)}: {steps}"

# Canonical timed Plan: contiguous indexes, non-empty summaries, valid intervals,
# and every placement inside the seeded Compact Calendar window.
seen = []
for i, step in enumerate(sorted(steps, key=lambda s: s["index"])):
    assert step["index"] == i, f"plan: step indexes must be contiguous, got: {steps}"
    assert step.get("summary", "").strip(), f"plan: step summary required: {step}"
    assert step["start"] < step["end"], f"plan: impossible interval: {step}"
    assert w_start <= step["start"] < step["end"] <= w_end, \
        f"plan: placement {step['start']}..{step['end']} outside calendar window {w_start}..{w_end}"
    seen.append(step["task_id"])

# Compact Calendar skeleton: placements do not overlap.
by_start = sorted(steps, key=lambda s: (s["start"], s["end"]))
for a, b in zip(by_start, by_start[1:]):
    assert a["end"] <= b["start"], f"plan: overlapping placements: {a} {b}"

assert set(seen) == expected, f"plan: planned task set {set(seen)} != imported {expected}"
print(plan["id"])
PYEOF
)"
echo "  PASS plan: canonical timed Plan id=$PLAN_ID with 3 placements inside the Calendar window"
echo "  PASS stale affect: warn_only bootstrap fallback marked; stale live observation not presented as current"

CAL_RESP="$(curl -sf "$DEMO_BASE/calendar/current")"
echo "  calendar response: $CAL_RESP"
python3 - "$CAL_RESP" "$PLAN_RESP" <<'PYEOF'
import json, sys
cal = json.loads(sys.argv[1])
plan = json.loads(sys.argv[2])["plan"]
assert cal.get("plan_id") == plan["id"], \
    f"calendar: plan_id {cal.get('plan_id')} != generated plan {plan['id']}"
cal_steps = {s["task_id"]: (s["start"], s["end"]) for s in cal.get("steps", [])}
plan_steps = {s["task_id"]: (s["start"], s["end"]) for s in plan["steps"]}
assert cal_steps == plan_steps, \
    f"calendar: timed steps {cal_steps} do not match the Plan {plan_steps}"
legitimization = cal.get("legitimization")
assert legitimization is not None, f"calendar: expected legitimization report, got: {cal}"
assert legitimization.get("mode") == "warn_only", f"calendar: expected warn_only, got: {legitimization}"
assert "stale affect observation" in legitimization.get("stale_affect_warning", ""), \
    f"calendar: expected stale affect warning, got: {legitimization}"
print(f"  PASS calendar: /calendar/current serves {len(cal_steps)} timed steps matching the Plan")
PYEOF

echo ""
echo "Step 12: recalculation in repair mode (task_completed) — completed Task not re-placed"
# Complete Task A (UBU-D0227 lifecycle transition). It must stay frozen at its
# prior placement when the Plan is recalculated.
COMPLETE_RESP="$(curl -sf -X POST "$DEMO_BASE/task/$TASK_A/action" \
  -H "content-type: application/json" \
  -d "{\"schema_version\":\"$ACT_SCHEMA\",\"action\":\"complete\"}")"
python3 - "$COMPLETE_RESP" "$TASK_A" <<'PYEOF'
import json, sys
d = json.loads(sys.argv[1])
assert d.get("task_status") == "completed", f"recalc setup: expected completed, got: {d}"
assert d.get("task_id") == sys.argv[2], f"recalc setup: task_id mismatch: {d}"
print("  completed Task A (frozen for recalculation)")
PYEOF

RECALC_SCHEMA="ubu.orchestrator.recalculation.v1"
RECALC_RESP="$(curl -sf -X POST "$DEMO_BASE/planning/recalculate" \
  -H "content-type: application/json" \
  -d "{
    \"schema_version\":\"$RECALC_SCHEMA\",
    \"triggered_at\":\"2026-06-17T12:00:00Z\",
    \"trigger_type\":\"task_completed\",
    \"objects\":[{\"id\":\"$TASK_A\",\"object_type\":\"Task\"}]
  }")"
echo "  recalculation response: $RECALC_RESP"
PLAN2_ID="$(python3 - "$RECALC_RESP" "$PLAN_RESP" "$PLAN_ID" "$TASK_A" <<'PYEOF'
import json, sys
recalc = json.loads(sys.argv[1])
prior = json.loads(sys.argv[2])["plan"]
prior_id = sys.argv[3]
task_a = sys.argv[4]

assert recalc.get("schema_version") == "ubu.orchestrator.recalculation.v1", recalc
assert recalc.get("repair_scope") == "remaining_window", \
    f"recalc: expected remaining_window scope for task_completed, got: {recalc.get('repair_scope')}"
assert recalc.get("prior_plan_id") == prior_id, \
    f"recalc: prior_plan_id {recalc.get('prior_plan_id')} != {prior_id}"
plan = recalc.get("plan")
assert plan is not None, f"recalc: expected a repair-mode Plan, got: {recalc}"
assert plan["id"] != prior_id, "recalc: repair Plan must have a new id"
assert plan.get("supersedes_plan_id") == prior_id, \
    f"recalc: supersedes_plan_id {plan.get('supersedes_plan_id')} != {prior_id}"

prior_a = next(s for s in prior["steps"] if s["task_id"] == task_a)
new_a = next((s for s in plan["steps"] if s["task_id"] == task_a), None)
assert new_a is not None, f"recalc: completed Task A missing from repair Plan: {plan}"
assert (new_a["start"], new_a["end"]) == (prior_a["start"], prior_a["end"]), \
    f"recalc: completed Task A was re-placed {new_a} != prior {prior_a}"
print(plan["id"])
PYEOF
)"
echo "  PASS recalc: repair Plan $PLAN2_ID supersedes $PLAN_ID; completed Task A not re-placed"
python3 - "$DEMO_DB" "$PLAN_ID" <<'PYEOF'
import sqlite3, sys
con = sqlite3.connect(sys.argv[1])
cur = con.cursor()
cur.execute("SELECT status FROM plans WHERE id = ?", (sys.argv[2],))
row = cur.fetchone()
assert row is not None, "recalc: prior plan row missing"
assert row[0] == "superseded", f"recalc: prior plan status={row[0]}, expected superseded"
print("  PASS recalc: prior Plan persisted as superseded")
PYEOF

echo ""
echo "Step 13: override-safety — user_override placement survives recalculation"
# Apply a user_override placement on Task B (authority_source=user_override).
# It must be carried over unchanged when the Plan is recalculated again.
OVERRIDE_RESP="$(curl -sf -X POST "$DEMO_BASE/task/$TASK_B/action" \
  -H "content-type: application/json" \
  -d "{\"schema_version\":\"$ACT_SCHEMA\",\"action\":\"override\"}")"
echo "  override response: $OVERRIDE_RESP"
python3 - "$OVERRIDE_RESP" "$TASK_B" <<'PYEOF'
import json, sys
d = json.loads(sys.argv[1])
assert d.get("authority_source") == "user_override", \
    f"override: expected authority_source=user_override, got: {d}"
assert d.get("task_id") == sys.argv[2], f"override: task_id mismatch: {d}"
print("  applied user_override placement on Task B")
PYEOF

RECALC2_RESP="$(curl -sf -X POST "$DEMO_BASE/planning/recalculate" \
  -H "content-type: application/json" \
  -d "{
    \"schema_version\":\"$RECALC_SCHEMA\",
    \"triggered_at\":\"2026-06-17T13:00:00Z\",
    \"trigger_type\":\"user_override\",
    \"objects\":[{\"id\":\"$TASK_B\",\"object_type\":\"Task\"}]
  }")"
echo "  recalculation response: $RECALC2_RESP"
python3 - "$RECALC2_RESP" "$RECALC_RESP" "$PLAN2_ID" "$TASK_B" "$TASK_A" <<'PYEOF'
import json, sys
recalc2 = json.loads(sys.argv[1])
prior = json.loads(sys.argv[2])["plan"]  # the repair Plan from Step 12
prior_id = sys.argv[3]
task_b = sys.argv[4]
task_a = sys.argv[5]

assert recalc2.get("repair_scope") == "override_placement", \
    f"override recalc: expected override_placement scope, got: {recalc2.get('repair_scope')}"
assert recalc2.get("prior_plan_id") == prior_id, \
    f"override recalc: prior_plan_id {recalc2.get('prior_plan_id')} != {prior_id}"
plan = recalc2.get("plan")
assert plan is not None, f"override recalc: expected a repair Plan, got: {recalc2}"
assert plan.get("supersedes_plan_id") == prior_id, \
    f"override recalc: supersedes_plan_id {plan.get('supersedes_plan_id')} != {prior_id}"

prior_b = next(s for s in prior["steps"] if s["task_id"] == task_b)
new_b = next((s for s in plan["steps"] if s["task_id"] == task_b), None)
assert new_b is not None, f"override recalc: overridden Task B missing from repair Plan: {plan}"
assert (new_b["start"], new_b["end"]) == (prior_b["start"], prior_b["end"]), \
    f"override recalc: user_override placement was clobbered {new_b} != {prior_b}"

# The completed Task A also remains frozen at its placement across this repair.
prior_a = next(s for s in prior["steps"] if s["task_id"] == task_a)
new_a = next((s for s in plan["steps"] if s["task_id"] == task_a), None)
assert new_a is not None, f"override recalc: completed Task A missing: {plan}"
assert (new_a["start"], new_a["end"]) == (prior_a["start"], prior_a["end"]), \
    f"override recalc: completed Task A was re-placed {new_a} != {prior_a}"
print("  PASS override-safety: user_override placement survived recalculation unchanged")
PYEOF

echo ""
echo "Step 14: C-1 bounded candidates, Stage 3 scoring, pruning, and composite selection (C-1/P7/P8/O12)"
echo "  (offline fixture requests: $SCORING_FIXTURE; posted only to loopback /planning/generate)"
python3 - "$SCORING_FIXTURE" "$DEMO_BASE" <<'PYEOF'
import json
import sys
import urllib.error
import urllib.request

fixture_path, base_url = sys.argv[1:3]
assert base_url.startswith("http://127.0.0.1:"), \
    f"scoring fixture refuses non-loopback endpoint: {base_url}"
fixture = json.loads(open(fixture_path, encoding="utf-8").read())
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
winners = {}

for case in fixture["cases"]:
    name = case["name"]
    expected = case["expected"]
    body = json.dumps({"request": case["request"]}).encode("utf-8")
    request = urllib.request.Request(
        f"{base_url}/planning/generate",
        data=body,
        headers={"content-type": "application/json"},
        method="POST",
    )
    try:
        with opener.open(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise AssertionError(f"{name}: /planning/generate failed: {exc.code} {detail}") from exc

    selected = payload.get("selected_candidate")
    alternatives = payload.get("alternatives")
    assert selected is not None, f"{name}: missing selected_candidate: {payload}"
    assert isinstance(alternatives, list), f"{name}: alternatives must be a list: {payload}"
    candidates = [selected, *alternatives]
    assert 1 < len(candidates) <= 16, \
        f"{name}: expected 2..16 scored candidates, got {len(candidates)}"
    assert len(candidates) == expected["scored_candidate_count"], (
        f"{name}: scored candidate count {len(candidates)} != fixture expectation "
        f"{expected['scored_candidate_count']}"
    )

    totals = []
    for rank, candidate in enumerate(candidates, start=1):
        assert candidate.get("rank") == rank, \
            f"{name}: candidate ranks are not contiguous from 1: {candidates}"
        assert isinstance(candidate.get("candidate_role"), str) and candidate["candidate_role"], \
            f"{name}: candidate rank {rank} missing candidate_role: {candidate}"
        summary = candidate.get("score_summary")
        assert isinstance(summary, dict), \
            f"{name}: candidate rank {rank} missing score_summary: {candidate}"
        total = summary.get("total_score")
        assert isinstance(total, (int, float)), \
            f"{name}: candidate rank {rank} missing numeric total_score: {candidate}"
        totals.append(total)
    assert totals == sorted(totals, reverse=True), \
        f"{name}: candidates are not ranked by total_score descending: {totals}"
    assert selected["rank"] == 1 and selected["score_summary"]["total_score"] == max(totals), \
        f"{name}: selected candidate is not rank 1 by total_score: {selected}"
    assert payload.get("plan", {}).get("steps") == selected.get("steps"), \
        f"{name}: admitted Plan does not use selected rank-1 steps: {payload}"

    with opener.open(f"{base_url}/calendar/current", timeout=30) as response:
        calendar = json.loads(response.read().decode("utf-8"))
    assert calendar.get("selected_candidate") == selected, \
        f"{name}: Calendar did not persist the rank-1 candidate: {calendar}"
    assert calendar.get("steps") == selected.get("steps"), \
        f"{name}: Calendar steps do not use the rank-1 candidate: {calendar}"

    expected_winner = expected.get("selected_candidate_id")
    if expected_winner is not None:
        assert selected.get("candidate_id") == expected_winner, (
            f"{name}: selected {selected.get('candidate_id')} != expected {expected_winner}"
        )
        winners[name] = selected["candidate_id"]

    pruned = set(expected.get("pruned_candidate_ids", []))
    if pruned:
        generated_count = expected["generated_candidate_count"]
        assert generated_count > len(candidates), \
            f"{name}: fixture does not establish any generated candidate was pruned"
        assert generated_count - len(candidates) == len(pruned), \
            f"{name}: generated/scored delta does not match expected reject_obvious set"
        scored_ids = {candidate["candidate_id"] for candidate in candidates}
        assert pruned.isdisjoint(scored_ids), \
            f"{name}: reject_obvious candidate reached scored set: {pruned & scored_ids}"
        assert all(
            candidate.get("semi_legitimization_summary", {}).get("result") != "reject_obvious"
            for candidate in candidates
        ), f"{name}: scored set contains reject_obvious semi-legitimization result"
        print(
            f"  PASS {name}: {len(pruned)} reject_obvious candidates absent from "
            f"{len(candidates)}-candidate scored set"
        )
    else:
        print(
            f"  PASS {name}: {len(candidates)} bounded scored candidates; "
            f"rank-1={selected['candidate_id']} total_score={totals[0]}"
        )

utility = winners["abundant-slack-utility-heavy"]
diversity = winners["abundant-slack-diversity-heavy"]
assert utility != diversity, \
    f"scoring_policy weighting did not change rank-1 selection: {utility}"
print(f"  PASS scoring_policy weighting: utility rank-1={utility}; diversity rank-1={diversity}")
PYEOF

echo ""
echo "PASS: bootstrap-to-act, gated projection, affect legitimization, Plan/Calendar/recalculation,"
echo "      and C-1 scoring/selection loops"
echo "      verified store-backed on throwaway store"
echo "  store=$DEMO_DB (ephemeral — removed on exit)"
