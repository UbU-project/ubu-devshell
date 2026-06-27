#!/usr/bin/env bash
# Fixture smoke test: exercises the full bootstrap-to-act loop, bootstrap-seeded
# UniverseState fact recording, the self-sustaining precondition/effects loop,
# the gated projection loop, canonical Plan generation / Compact Calendar /
# override-safe recalculation, precondition-gated planning, and affect legitimization against the
# store-backed orchestrator (O5: token
# intake and bootstrap/seed; O6: readiness next_action with explanation, action
# recording, and bounded diagnostic; O7/O19: projection preview, approval,
# recording-fake managed-label write, reconciliation, and gate-deny path;
# S9/P3/P4/O9: canonical timed
# Plan, Compact Calendar, and repair-mode recalculation with override-safety).
# Creates a throwaway SQLite store under a temp directory; removed on exit,
# including on failure. Requires no live GitHub and no network egress.
#
# Governing decisions:
#   O4: MemoryState removed; all state through ubu_store (UBU_DB_PATH throwaway store)
#   O5: desktop token intake (/desktop/session/github-token) + bootstrap/seed endpoint
#   O6: readiness next_action with explanation; action recording; bounded diagnostics (UBU-D0210)
#   O7/O19: gated managed-label projection loop through the adapter recording
#              fake, reconciliation, deny path
#   S9/P3/P4/O9: canonical timed Plan (/planning/generate), Compact Calendar
#               (/calendar/current), and repair-mode recalculation
#               (/planning/recalculate) that supersedes the prior Plan
#   S10/P5/O10: affect profile contract, Phase B affect legitimization, and
#               orchestrator affect-profile/snapshot wiring
#   D11 (minimal re-issue): fixed-duration O13 candidate retention,
#               not_estimated proxy robustness, and full rollout quality
#   D12/UBU-D0239: stochastic-duration rollout, rollout re-rank, correlation
#               effect, fixed-seed reproducibility, and not_estimated
#   D13/UBU-D0240: derived risk and human-complete plan-quality reports;
#               blocking findings drive Calendar staleness and recalculation
#   D14/UBU-D0241: UniverseState four-collection facts container,
#               mutation semantics, and precondition evaluation
#   D15/UBU-D0242: Task preconditions partition planning into eligible,
#               blocked, and invalid against UniverseState
#   D16/UBU-D0242: completed Task effects mutate the current UniverseState
#               (Wiring-B); organization/worker mode reject intrinsic-affect
#               targets while user_mode permits them
#   D17/UBU-D0242/UBU-D0243: bootstrap admits the mapped UniverseState facts;
#               planning preconditions and completion effects then run against
#               those bootstrap-seeded facts
#   UBU-D0226: authority_source remains the authority-path enum
#   UBU-D0227: persisted Task.status lifecycle (active/completed/failed/moot)
#              drives which Tasks are frozen and not re-placed on recalculation
#   UBU-D0230: policy-summary guardrails and compartment_boundary_decided log vocabulary
#
# import_live runs in default mock ingest mode against the adapter recording fake
# seeded from a raw GitHub issue fixture. It admits Tasks and External References
# locally without any outbound HTTP. The fixture/dev token satisfies the
# session-token availability check and is never sent to GitHub because live
# ingest/projection modes are forbidden here. Plan generation and recalculation
# are fixture-driven and offline: the planner adapter is the in-process CPU
# strategy and the Compact Calendar window is seeded directly into the
# throwaway store.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPOS_DIR="${REPOS_DIR:-$(cd "$ROOT_DIR/.." && pwd)}"
ORCHESTRATOR_DIR="${ORCHESTRATOR_DIR:-$REPOS_DIR/ubu-orchestrator}"
CORE_DIR="${CORE_DIR:-$REPOS_DIR/ubu-core}"
STORE_DIR="${STORE_DIR:-$REPOS_DIR/ubu-store}"
MANIFEST="$ROOT_DIR/fixtures/demo/phase1-demo-manifest.json"
GITHUB_FIXTURES_DIR="$ROOT_DIR/fixtures/github"
PLANNING_FIXTURE="$ROOT_DIR/fixtures/demo/planning-candidates.json"
AFFECT_FIXTURE="$ROOT_DIR/fixtures/demo/affect-legitimization-cases.json"
SCORING_FIXTURE="$ROOT_DIR/fixtures/demo/scoring-selection-cases.json"
STOCHASTIC_FIXTURE="$ROOT_DIR/fixtures/demo/stochastic-rollout-cases.json"
REPORTS_FIXTURE="$ROOT_DIR/fixtures/demo/risk-plan-quality-cases.json"
UNIVERSE_FIXTURE="$ROOT_DIR/fixtures/demo/universe-state-semantics.json"
PRECONDITION_PLANNING_FIXTURE="$ROOT_DIR/fixtures/demo/precondition-planning-cases.json"
MODE_EFFECTS_FIXTURE="$ROOT_DIR/fixtures/demo/intrinsic-affect-mode-cases.json"
DEMO_PORT="${DEMO_PORT:-17878}"
DEMO_BASE="http://127.0.0.1:$DEMO_PORT"
export CARGO_NET_OFFLINE=true
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

[[ -f "$STOCHASTIC_FIXTURE" ]] \
  || fail_missing "stochastic rollout fixture not found: $STOCHASTIC_FIXTURE (required for D12 stochastic rollout smoke steps)"

[[ -f "$REPORTS_FIXTURE" ]] \
  || fail_missing "risk and plan-quality fixture not found: $REPORTS_FIXTURE (required for D13 derived-report smoke steps)"

[[ -f "$UNIVERSE_FIXTURE" ]] \
  || fail_missing "UniverseState fixture not found: $UNIVERSE_FIXTURE (required for D14 UniverseState smoke steps)"

[[ -f "$PRECONDITION_PLANNING_FIXTURE" ]] \
  || fail_missing "precondition planning fixture not found: $PRECONDITION_PLANNING_FIXTURE (required for D15 precondition-gated planning)"

[[ -f "$MODE_EFFECTS_FIXTURE" ]] \
  || fail_missing "intrinsic-affect/effects fixture not found: $MODE_EFFECTS_FIXTURE (required for D16 effect application and mode rejection)"

[[ -d "$ORCHESTRATOR_DIR" ]] \
  || fail_missing "orchestrator repo not found at $ORCHESTRATOR_DIR (run clone-all.sh first)"

[[ -d "$CORE_DIR" ]] \
  || fail_missing "ubu-core repo not found at $CORE_DIR (required for D14 UniverseState semantics)"

[[ -d "$STORE_DIR" ]] \
  || fail_missing "ubu-store repo not found at $STORE_DIR (required for D14 UniverseState admission)"

command -v cargo   >/dev/null 2>&1 || fail_missing "cargo not found"
command -v curl    >/dev/null 2>&1 || fail_missing "curl not found"
command -v python3 >/dev/null 2>&1 || fail_missing "python3 not found"

if [[ "${UBU_GITHUB_PROJECTION_EXPORT_MODE:-}" == "live" ]]; then
  echo "error: fixture demo is offline-only; unset UBU_GITHUB_PROJECTION_EXPORT_MODE or use a non-live value" >&2
  exit 1
fi
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  echo "error: fixture demo is offline-only; run without GITHUB_TOKEN in the environment" >&2
  exit 1
fi

echo "=== Fixture Demo: full bootstrap-to-act loop, store-backed ==="
echo "  O4: throwaway UBU_DB_PATH store"
echo "  O5: token intake + bootstrap/seed"
echo "  O6: readiness next_action, action recording, bounded diagnostic (UBU-D0210)"
echo "  O7/O19: gated projection preview/approval/write/reconcile loop through recording fake"
echo "  S9/P3/P4/O9: canonical timed Plan, Compact Calendar, override-safe recalculation"
echo "  S10/P5/O10: affect legitimization feasible/enforce/warn_only/stale paths"
echo "  C-1/P7/P8/O12: bounded candidates, Stage 3 scoring, pruning, composite selection"
echo "  D11/O13: fixed-duration candidate retention, not_estimated, full rollout quality"
echo "  D12/UBU-D0239: stochastic rollout, re-rank, correlation effect, reproducibility"
echo "  D13/UBU-D0240: derived risk and plan-quality reports with blocking recalculation"
echo "  D14/UBU-D0241: UniverseState facts container round-trip and semantics"
echo "  D15/UBU-D0242: precondition-gated planning partitions eligible/blocked/invalid Tasks"
echo "  D16/UBU-D0242: effect application on completion (Wiring-B) and intrinsic-affect mode rejection"
echo "  D17/UBU-D0242/UBU-D0243: bootstrap fact recording and self-sustaining precondition/effects loop"
echo "orchestrator: $ORCHESTRATOR_DIR"
echo "core:         $CORE_DIR"
echo "store:        $STORE_DIR"
echo "manifest:     $MANIFEST"
echo "preconditions: $PRECONDITION_PLANNING_FIXTURE"
echo "port:         $DEMO_PORT"
echo "github mode:  offline mock/fake path (live mode off, no GITHUB_TOKEN env)"
echo ""

# --- Temp dir and cleanup ---

DEMO_TMPDIR="$(mktemp -d)"
DEMO_DB="$DEMO_TMPDIR/ubu-demo.db"
DEMO_UNIVERSE_DB="$DEMO_TMPDIR/universe-state-smoke.db"
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
python3 - "$STOCHASTIC_FIXTURE" <<'PYEOF'
import json, sys, pathlib

path = pathlib.Path(sys.argv[1])
fixture = json.loads(path.read_text())
cases = fixture.get("cases", [])
required = {
    "stochastic-rerank",
    "independent-durations",
    "shared-correlated-durations",
}
names = {case.get("name") for case in cases}
missing = sorted(required - names)
assert not missing, f"stochastic rollout fixture missing required cases: {missing}"
for case in cases:
    assert case.get("request"), f"stochastic fixture case missing request: {case}"
    assert case.get("expected"), f"stochastic fixture case missing expected result: {case}"
    for task in case["request"].get("tasks", []):
        estimate = task.get("duration_estimate")
        assert estimate and estimate.get("type") == "shifted_lognormal_p95", \
            f"stochastic fixture task lacks shifted_lognormal_p95 estimate: {task}"
print(f"  stochastic rollout fixture: {path} ({len(cases)} cases)")
PYEOF

python3 - "$REPORTS_FIXTURE" <<'PYEOF'
import json, pathlib, sys
path = pathlib.Path(sys.argv[1])
fixture = json.loads(path.read_text())
cases = fixture.get("cases", [])
required = {
    "tight-deadline",
    "near-affect-limits",
    "recommendation-skeleton-failure",
    "clean",
}
names = {case.get("name") for case in cases}
missing = sorted(required - names)
assert not missing, f"risk/quality fixture missing required cases: {missing}"
assert fixture.get("store_setup", {}).get("tasks"), \
    "risk/quality fixture requires deadline Task store setup"
assert fixture.get("store_setup", {}).get("recent_logs"), \
    "risk/quality fixture requires a recent failure Log"
for case in cases:
    assert case.get("request"), f"risk/quality fixture case missing request: {case}"
    assert case.get("expected"), f"risk/quality fixture case missing expected result: {case}"
print(f"  risk/quality fixture: {path} ({len(cases)} cases)")
PYEOF

python3 - "$UNIVERSE_FIXTURE" <<'PYEOF'
import json, pathlib, sys

path = pathlib.Path(sys.argv[1])
fixture = json.loads(path.read_text())
required_top = {
    "round_trip_state",
    "mutations",
    "expected_after_mutations",
    "invalid_mutations",
    "preconditions",
}
missing = sorted(required_top - fixture.keys())
assert not missing, f"UniverseState fixture missing required keys: {missing}"
operations = {item.get("operation") for item in fixture["mutations"]}
required_ops = {
    "set_fact",
    "clear_fact",
    "increment_numeric",
    "decrement_numeric",
    "add_membership",
    "remove_membership",
    "append_event_marker",
}
missing_ops = sorted(required_ops - operations)
assert not missing_ops, f"UniverseState fixture missing mutation operations: {missing_ops}"
expected = fixture["expected_after_mutations"]
for collection in ("facts", "numeric_values", "set_memberships", "event_markers"):
    assert collection in expected, f"UniverseState expected result missing {collection}"
assert "missing_increment" in expected["numeric_values"], \
    "UniverseState fixture must assert increment against a missing numeric key"
assert "missing_decrement" in expected["numeric_values"], \
    "UniverseState fixture must assert decrement against a missing numeric key"
assert expected["event_markers"].get("empty_timeline"), \
    "UniverseState fixture must assert append to an empty marker list"
for name in ("satisfied", "unsatisfied", "unknown_absent", "numeric_malformed"):
    assert name in fixture["preconditions"], \
        f"UniverseState fixture missing precondition case: {name}"
print(f"  UniverseState fixture: {path} ({len(fixture['mutations'])} mutations)")
PYEOF

python3 - "$PRECONDITION_PLANNING_FIXTURE" <<'PYEOF'
import json, pathlib, sys

path = pathlib.Path(sys.argv[1])
fixture = json.loads(path.read_text())
assert fixture.get("decision") == "UBU-D0242", \
    f"precondition planning fixture must cite UBU-D0242: {fixture.get('decision')}"
state = fixture.get("universe_state")
assert isinstance(state, dict), "precondition planning fixture missing universe_state"
tasks = fixture.get("tasks", [])
assert len(tasks) == 5, f"precondition planning fixture expected five tasks, got {len(tasks)}"
cases = {task.get("case"): task for task in tasks}
required = {"no_preconditions", "satisfied", "failed", "malformed", "absent_target"}
missing = sorted(required - cases.keys())
assert not missing, f"precondition planning fixture missing cases: {missing}"
assert "preconditions" not in cases["no_preconditions"], \
    "no_preconditions case must omit preconditions"
for case in ("satisfied", "failed", "malformed", "absent_target"):
    assert cases[case].get("preconditions"), f"{case} case missing preconditions"
expected = fixture.get("expected", {})
assert set(expected.get("eligible_cases", [])) == {"no_preconditions", "satisfied", "absent_target"}
assert set(expected.get("blocked_cases", [])) == {"failed"}
assert set(expected.get("invalid_cases", [])) == {"malformed"}
assert set(expected.get("diagnostic_codes", [])) == {
    "task_precondition_blocked",
    "task_precondition_invalid",
}
print(f"  precondition planning fixture: {path} ({len(tasks)} tasks)")
PYEOF

# --- UniverseState facts container smoke (D14/UBU-D0241) ---

echo ""
echo "Step 0: UniverseState fixture smoke (D14/UBU-D0241) — store round-trip, mutations, preconditions"
echo "  (offline local crates: $UNIVERSE_FIXTURE; throwaway store: $DEMO_UNIVERSE_DB)"
UNIVERSE_SMOKE_DIR="$DEMO_TMPDIR/universe-state-smoke"
mkdir -p "$UNIVERSE_SMOKE_DIR/src"
cat >"$UNIVERSE_SMOKE_DIR/Cargo.toml" <<EOF
[package]
name = "ubu_universe_state_fixture_smoke"
version = "0.1.0"
edition = "2021"
publish = false

[dependencies]
serde_json = "1.0"
tokio = { version = "1.38", features = ["macros", "rt-multi-thread"] }
ubu_core = { path = "$CORE_DIR" }
ubu_store = { path = "$STORE_DIR" }

[patch."https://github.com/UbU-project/ubu-core"]
ubu_core = { path = "$CORE_DIR" }
EOF
cat >"$UNIVERSE_SMOKE_DIR/src/main.rs" <<'EOF'
use std::env;
use std::fs;

use serde_json::{json, Value};
use ubu_core::core::{
    apply_universe_mutations, evaluate_universe_precondition, UniverseEventMarkers,
    UniverseFacts, UniverseMutation, UniverseNumericValues, UniversePrecondition,
    UniverseSetMemberships, UniverseState,
};
use ubu_core::id_registry::ObjectType;
use ubu_core::UbuId;
use ubu_store::models::object_record::NewObjectRecord;
use ubu_store::{queries, UbuStore};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    assert_eq!(args.len(), 3, "usage: smoke <fixture-json> <sqlite-path>");
    let fixture: Value = serde_json::from_str(&fs::read_to_string(&args[1])?)?;
    let store = UbuStore::connect(&args[2]).await?;

    let state = fixture_state(&fixture)?;
    let payload = store_payload(&state);

    queries::admit_object(
        store.pool(),
        NewObjectRecord {
            id: state.id.to_string(),
            object_type: ObjectType::UniverseState.as_str().to_owned(),
            version: 1,
            status: "active".to_owned(),
            compartment_label: "fixture-demo".to_owned(),
            payload: payload.clone(),
            created_at: "2026-06-22T13:00:00Z".to_owned(),
            updated_at: "2026-06-22T13:00:00Z".to_owned(),
        },
    )
    .await?;

    let fetched = queries::get_current_state(store.pool(), &state.id.to_string())
        .await?
        .expect("admitted UniverseState is readable");
    let stored_payload: Value = serde_json::from_str(&fetched.payload_json)?;
    assert_eq!(stored_payload, payload, "store payload round-trip changed JSON");
    let round_tripped: UniverseState = serde_json::from_value(stored_payload)?;
    assert_eq!(round_tripped, state, "UniverseState deep equality failed");
    println!("  PASS UniverseState store round-trip: four collections deeply equal");

    let mutations: Vec<UniverseMutation> =
        serde_json::from_value(fixture["mutations"].clone())?;
    let mutated = apply_universe_mutations(&state, &mutations)?;
    assert_expected_collections(&fixture["expected_after_mutations"], &mutated)?;
    println!("  PASS UniverseState mutations: all seven operations, missing numeric keys, empty marker append");

    let invalid_mutations: Vec<UniverseMutation> =
        serde_json::from_value(fixture["invalid_mutations"].clone())?;
    let before_invalid = state.clone();
    let rejected = apply_universe_mutations(&state, &invalid_mutations);
    assert!(rejected.is_err(), "invalid mutation list was accepted");
    assert!(
        !state.facts.contains_key("invalid.should_not_apply"),
        "fixture baseline unexpectedly contains invalid mutation target"
    );
    assert_eq!(
        state, before_invalid,
        "validate-then-apply rejection changed the source state"
    );
    println!("  PASS UniverseState mutations: invalid list rejected as a whole");

    let preconditions = &fixture["preconditions"];
    let satisfied: UniversePrecondition =
        serde_json::from_value(preconditions["satisfied"].clone())?;
    assert_eq!(
        evaluate_universe_precondition(&mutated, &satisfied)?,
        true,
        "satisfied precondition tree evaluated false"
    );

    let unsatisfied: UniversePrecondition =
        serde_json::from_value(preconditions["unsatisfied"].clone())?;
    assert_eq!(
        evaluate_universe_precondition(&mutated, &unsatisfied)?,
        false,
        "unsatisfied precondition tree evaluated true"
    );

    let unknown_absent: UniversePrecondition =
        serde_json::from_value(preconditions["unknown_absent"].clone())?;
    assert_eq!(
        evaluate_universe_precondition(&mutated, &unknown_absent)?,
        true,
        "unknown target did not evaluate as absent"
    );

    let numeric_malformed: UniversePrecondition =
        serde_json::from_value(preconditions["numeric_malformed"].clone())?;
    assert!(
        evaluate_universe_precondition(&mutated, &numeric_malformed).is_err(),
        "numeric target with non-equality/non-absence predicate was not malformed"
    );
    println!("  PASS UniverseState preconditions: all_of/any_of, equals/member_of/absent, absent unknown, malformed numeric");

    Ok(())
}

fn fixture_state(fixture: &Value) -> Result<UniverseState, serde_json::Error> {
    let mut value = fixture["round_trip_state"].clone();
    value["id"] = json!(UbuId::new(ObjectType::UniverseState).to_string());
    serde_json::from_value(value)
}

fn store_payload(state: &UniverseState) -> Value {
    let mut payload = serde_json::to_value(state).expect("UniverseState serializes");
    payload["schema_version"] = json!("core/universe-state/0.1");
    payload["provenance"] = json!({
        "created_at": "2026-06-22T13:00:00Z",
        "created_by": "fixture-demo-d14",
        "authority_source": "user"
    });
    payload
}

fn assert_expected_collections(
    expected: &Value,
    actual: &UniverseState,
) -> Result<(), serde_json::Error> {
    let facts: UniverseFacts = serde_json::from_value(expected["facts"].clone())?;
    assert_eq!(actual.facts, facts, "facts collection mismatch");

    let numeric_values: UniverseNumericValues =
        serde_json::from_value(expected["numeric_values"].clone())?;
    assert_eq!(
        actual.numeric_values, numeric_values,
        "numeric_values collection mismatch"
    );

    let set_memberships: UniverseSetMemberships =
        serde_json::from_value(expected["set_memberships"].clone())?;
    assert_eq!(
        actual.set_memberships, set_memberships,
        "set_memberships collection mismatch"
    );

    let event_markers: UniverseEventMarkers =
        serde_json::from_value(expected["event_markers"].clone())?;
    assert_eq!(
        actual.event_markers, event_markers,
        "event_markers collection mismatch"
    );

    assert!(
        actual.numeric_values.contains_key("missing_increment"),
        "increment_numeric did not initialize a missing key"
    );
    assert!(
        actual.numeric_values.contains_key("missing_decrement"),
        "decrement_numeric did not initialize a missing key"
    );
    assert_eq!(
        actual
            .event_markers
            .get("empty_timeline")
            .map(Vec::len),
        Some(1),
        "append_event_marker did not append to the empty marker list"
    );

    Ok(())
}
EOF
CARGO_NET_OFFLINE=true cargo run --quiet --offline \
  --manifest-path "$UNIVERSE_SMOKE_DIR/Cargo.toml" \
  -- "$UNIVERSE_FIXTURE" "$DEMO_UNIVERSE_DB"

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

# --- Precondition-gated planning smoke (D15/UBU-D0242) ---

echo ""
echo "Step 0b: precondition-gated planning (D15/UBU-D0242) — eligible, blocked, invalid"
echo "  (offline fixture seed: $PRECONDITION_PLANNING_FIXTURE; posted only to loopback /planning/generate)"
python3 - "$DEMO_DB" "$PRECONDITION_PLANNING_FIXTURE" <<'PYEOF'
import json, sqlite3, sys

db, fixture_path = sys.argv[1:3]
fixture = json.loads(open(fixture_path, encoding="utf-8").read())
con = sqlite3.connect(db)
now = "2026-06-23T12:00:00Z"

state = fixture["universe_state"]
con.execute(
    """
    INSERT INTO objects
      (id, object_type, version, status, compartment_label, payload_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """,
    (
        state["id"],
        "UniverseState",
        1,
        "active",
        "fixture-demo-d15",
        json.dumps(state, separators=(",", ":")),
        now,
        now,
    ),
)

for task in fixture["tasks"]:
    payload = {
        "id": task["id"],
        "title": task["title"],
        "status": "active",
        "duration_minutes": task["duration_minutes"],
        "provenance": {
            "created_at": now,
            "authority_source": "user",
            "source": {
                "source_kind": "fixture_demo",
                "source_id": task["case"],
            },
        },
    }
    if "preconditions" in task:
        payload["preconditions"] = task["preconditions"]
    con.execute(
        """
        INSERT INTO objects
          (id, object_type, version, status, compartment_label, payload_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            task["id"],
            "Task",
            1,
            "active",
            "fixture-demo-d15",
            json.dumps(payload, separators=(",", ":")),
            now,
            now,
        ),
    )

con.commit()
print("  seeded UniverseState and five D15 precondition Tasks")
PYEOF

PRECONDITION_PLAN_RESP="$(curl -sf -X POST "$DEMO_BASE/planning/generate" \
  -H "content-type: application/json" \
  -d "{\"schema_version\":\"planning-kernel-contract/0.1\",\"request_id\":\"fixture-d15-preconditions\"}")"
echo "  plan response: $PRECONDITION_PLAN_RESP"
python3 - "$PRECONDITION_PLAN_RESP" "$PRECONDITION_PLANNING_FIXTURE" <<'PYEOF'
import json, sys

resp = json.loads(sys.argv[1])
fixture = json.loads(open(sys.argv[2], encoding="utf-8").read())
by_case = {task["case"]: task for task in fixture["tasks"]}
case_by_id = {task["id"]: task["case"] for task in fixture["tasks"]}
expected = fixture["expected"]

assert resp.get("schema_version") == "planning-kernel-contract/0.1", resp
plan = resp.get("plan")
assert plan is not None, f"precondition planning: expected admitted Plan, got {resp}"
planned_ids = {step["task_id"] for step in plan.get("steps", [])}
planned_cases = {case_by_id[task_id] for task_id in planned_ids if task_id in case_by_id}
assert planned_cases == set(expected["eligible_cases"]), (
    f"precondition planning: planned cases {planned_cases} != {set(expected['eligible_cases'])}"
)
for case in expected["blocked_cases"] + expected["invalid_cases"]:
    assert by_case[case]["id"] not in planned_ids, \
        f"precondition planning: excluded case {case} appeared in plan"

blocked_cases = {
    case_by_id[item["task_id"]]: item
    for item in resp.get("blocked_tasks", [])
    if item["task_id"] in case_by_id
}
invalid_cases = {
    case_by_id[item["task_id"]]: item
    for item in resp.get("invalid_tasks", [])
    if item["task_id"] in case_by_id
}
assert set(blocked_cases) == set(expected["blocked_cases"]), (
    f"precondition planning: blocked cases {set(blocked_cases)} != {set(expected['blocked_cases'])}"
)
assert set(invalid_cases) == set(expected["invalid_cases"]), (
    f"precondition planning: invalid cases {set(invalid_cases)} != {set(expected['invalid_cases'])}"
)
assert blocked_cases["failed"]["precondition"]["target"] == "facts.ticket.status", blocked_cases
assert "malformed precondition" in invalid_cases["malformed"]["error"], invalid_cases
assert "not_a_collection" in invalid_cases["malformed"]["error"], invalid_cases

diagnostic_codes = {
    diagnostic.get("code")
    for diagnostic in resp.get("diagnostics", [])
    if diagnostic.get("code") in expected["diagnostic_codes"]
}
assert diagnostic_codes == set(expected["diagnostic_codes"]), (
    f"precondition planning: diagnostic codes {diagnostic_codes} != {set(expected['diagnostic_codes'])}"
)
assert "absent_target" in planned_cases, \
    "precondition planning: absent target must be eligible under absent rule"
print(
    "  PASS precondition planning: eligible={eligible} blocked={blocked} invalid={invalid}".format(
        eligible=sorted(planned_cases),
        blocked=sorted(blocked_cases),
        invalid=sorted(invalid_cases),
    )
)
PYEOF

python3 - "$DEMO_DB" "$PRECONDITION_PLANNING_FIXTURE" "$PRECONDITION_PLAN_RESP" <<'PYEOF'
import json, sqlite3, sys

db, fixture_path, response_json = sys.argv[1:4]
fixture = json.loads(open(fixture_path, encoding="utf-8").read())
ids = [task["id"] for task in fixture["tasks"]]
plan_id = json.loads(response_json)["plan"]["id"]
con = sqlite3.connect(db)
con.executemany(
    "UPDATE objects SET status = 'completed', updated_at = '2026-06-23T12:05:00Z' WHERE id = ?",
    [(task_id,) for task_id in ids],
)
row = con.execute("SELECT payload_json FROM plans WHERE id = ?", (plan_id,)).fetchone()
assert row is not None, f"D15 Plan not found for cleanup: {plan_id}"
payload = json.loads(row[0])
payload["status"] = "superseded"
con.execute(
    "UPDATE plans SET status = 'superseded', payload_json = ? WHERE id = ?",
    (json.dumps(payload, separators=(",", ":")), plan_id),
)
con.commit()
print("  retired D15 fixture Tasks and superseded its temporary Plan before the bootstrap-to-act loop")
PYEOF

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
echo "  (mock import_live: recording fake seeded from raw issue fixture; no outbound HTTP)"
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
universe_state_id = d.get("universe_state_id", "")
imported = d.get("imported_tasks", {})
admitted = imported.get("admitted_to_store", 0)
assert len(obj_ids) >= 1, \
    f"seed: expected objective_ids non-empty, got: {d}"
assert len(pref_ids) >= 1, \
    f"seed: expected preference_ids non-empty, got: {d}"
assert universe_state_id.startswith("ustate_"), \
    f"seed: expected canonical universe_state_id, got: {d}"
assert admitted >= 1, \
    f"seed: expected imported_tasks.admitted_to_store >= 1, got: {d}"
print(f"  seed: objective_ids={obj_ids}")
print(f"  seed: preference_ids={pref_ids}")
print(f"  seed: universe_state_id={universe_state_id}")
print(f"  seed: imported_tasks.admitted_to_store={admitted}")
PYEOF

echo ""
echo "Step 2b: bootstrap UniverseState facts (D17/UBU-D0243) — deep-check mapped entries"
BOOTSTRAP_UNIVERSE_ID="$(python3 - "$SEED_RESP" <<'PYEOF'
import json, sys
print(json.loads(sys.argv[1])["universe_state_id"])
PYEOF
)"
python3 - "$DEMO_DB" "$BOOTSTRAP_UNIVERSE_ID" <<'PYEOF'
import json, sqlite3, sys

db, universe_state_id = sys.argv[1:3]
expected_facts = {
    "facts.operator.work_style": "balanced",
    "facts.operator.attention_preference": "mixed",
    "facts.project.repository": "UbU-project/ubu-design",
    "facts.project.objective": "Build and ship Phase 1 of UbU (fixture demo)",
}
expected_numeric = {
    "numeric_values.operator.planning_horizon_days": 7.0,
}

con = sqlite3.connect(db)
row = con.execute(
    """
    SELECT id, version, status, compartment_label, payload_json
    FROM objects
    WHERE id = ? AND object_type = 'UniverseState'
    """,
    (universe_state_id,),
).fetchone()
assert row is not None, f"bootstrap UniverseState not found: {universe_state_id}"
id_, version, status, compartment_label, payload_json = row
payload = json.loads(payload_json)
assert id_ == universe_state_id and payload["id"] == universe_state_id, payload
assert version == 1, f"bootstrap UniverseState starts at version 1, got {version}"
assert status == "active", f"bootstrap UniverseState status={status}"
assert compartment_label == "bootstrap", f"bootstrap UniverseState compartment={compartment_label}"
assert payload["schema_version"] == "core/universe-state/0.1", payload
assert payload["provenance"]["authority_source"] == "user", payload
assert payload["provenance"]["source"]["source_kind"] == "bootstrap", payload
assert payload["facts"] == expected_facts, (
    f"bootstrap facts mismatch:\nexpected={expected_facts}\nactual={payload['facts']}"
)
assert payload["numeric_values"] == expected_numeric, (
    f"bootstrap numeric_values mismatch:\nexpected={expected_numeric}\nactual={payload['numeric_values']}"
)
assert payload["set_memberships"] == {}, payload
assert payload["event_markers"] == {}, payload
print("  PASS bootstrap UniverseState: exactly 4 facts, 1 numeric value, empty set_memberships/event_markers")
PYEOF

echo ""
echo "Step 2c: re-seed guard (O18/D17) — second bootstrap seed is rejected"
RESEED_STATUS_AND_BODY="$(curl -sS -X POST "$DEMO_BASE/bootstrap/seed" \
  -H "content-type: application/json" \
  -w '\n%{http_code}' \
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
RESEED_BODY="$(printf '%s\n' "$RESEED_STATUS_AND_BODY" | sed '$d')"
RESEED_STATUS="$(printf '%s\n' "$RESEED_STATUS_AND_BODY" | tail -n 1)"
echo "  response status: $RESEED_STATUS"
echo "  response body: $RESEED_BODY"
python3 - "$RESEED_STATUS" "$RESEED_BODY" "$DEMO_DB" <<'PYEOF'
import json, sqlite3, sys

status, body_json, db = sys.argv[1:4]
body = json.loads(body_json)
assert status == "409", f"re-seed: expected HTTP 409, got {status}: {body}"
assert body["diagnostics"][0]["code"] == "bootstrap_already_seeded", body
con = sqlite3.connect(db)
count = con.execute(
    """
    SELECT COUNT(*)
    FROM objects
    WHERE object_type IN ('Objective', 'Preference', 'UniverseState')
      AND payload_json LIKE '%"source_kind":"bootstrap"%'
    """
).fetchone()[0]
assert count == 5, f"re-seed guard: expected 5 bootstrap objects, got {count}"
print("  PASS re-seed guard: rejected consistently and did not duplicate bootstrap objects")
PYEOF

echo ""
echo "Step 2d: self-sustaining loop from bootstrap facts (D17/UBU-D0242/UBU-D0243)"
echo "  seeding Tasks whose preconditions/effects reference bootstrap-seeded UniverseState facts"
python3 - "$DEMO_DB" <<'PYEOF'
import json, sqlite3, sys

db = sys.argv[1]
con = sqlite3.connect(db)
now = "2026-06-24T14:00:00Z"
tasks = [
    {
        "id": "task_00000000020170008000000000000000",
        "title": "D17 eligible bootstrap repository precondition",
        "duration_minutes": 10,
        "preconditions": {
            "target": "facts.facts.project.repository",
            "predicate": "equals",
            "expected": "UbU-project/ubu-design",
        },
    },
    {
        "id": "task_00000000020270008000000000000000",
        "title": "D17 blocked bootstrap repository precondition",
        "duration_minutes": 10,
        "preconditions": {
            "target": "facts.facts.project.repository",
            "predicate": "equals",
            "expected": "UbU-project/ubu-orchestrator",
        },
    },
    {
        "id": "task_00000000020370008000000000000000",
        "title": "D17 mutate bootstrap work style",
        "duration_minutes": 10,
        "preconditions": {
            "target": "facts.facts.operator.work_style",
            "predicate": "equals",
            "expected": "balanced",
        },
        "effects": {
            "mutations": [
                {
                    "operation": "set_fact",
                    "target": "facts.facts.operator.work_style",
                    "payload": "responsive",
                }
            ]
        },
    },
]
for task in tasks:
    payload = {
        "id": task["id"],
        "title": task["title"],
        "status": "active",
        "duration_minutes": task["duration_minutes"],
        "preconditions": task["preconditions"],
        "provenance": {
            "created_at": now,
            "authority_source": "user",
            "source": {
                "source_kind": "fixture_demo",
                "source_id": "d17-bootstrap-loop",
            },
        },
    }
    if "effects" in task:
        payload["effects"] = task["effects"]
    con.execute(
        """
        INSERT INTO objects
          (id, object_type, version, status, compartment_label, payload_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            task["id"],
            "Task",
            1,
            "active",
            "fixture-demo-d17",
            json.dumps(payload, separators=(",", ":")),
            now,
            now,
        ),
    )
con.commit()
print("  seeded D17 eligible, blocked, and effectful Tasks")
PYEOF
D17_PLAN_RESP="$(curl -sf -X POST "$DEMO_BASE/planning/generate" \
  -H "content-type: application/json" \
  -d "{\"schema_version\":\"planning-kernel-contract/0.1\",\"request_id\":\"fixture-d17-bootstrap-facts\"}")"
echo "  plan response: $D17_PLAN_RESP"
python3 - "$D17_PLAN_RESP" <<'PYEOF'
import json, sys

resp = json.loads(sys.argv[1])
eligible_id = "task_00000000020170008000000000000000"
blocked_id = "task_00000000020270008000000000000000"
effect_id = "task_00000000020370008000000000000000"
plan = resp.get("plan")
assert plan is not None, f"D17 precondition planning expected a Plan, got: {resp}"
planned_ids = {step["task_id"] for step in plan.get("steps", [])}
assert eligible_id in planned_ids, f"D17 eligible bootstrap-fact Task missing from plan: {planned_ids}"
assert effect_id in planned_ids, f"D17 effectful bootstrap-fact Task missing from plan: {planned_ids}"
assert blocked_id not in planned_ids, f"D17 blocked bootstrap-fact Task appeared in plan: {planned_ids}"
blocked = {item["task_id"]: item for item in resp.get("blocked_tasks", [])}
assert blocked_id in blocked, f"D17 blocked bootstrap-fact Task missing from blocked_tasks: {resp}"
assert blocked[blocked_id]["precondition"]["target"] == "facts.facts.project.repository", blocked
assert not any(item.get("task_id") in {eligible_id, effect_id} for item in resp.get("invalid_tasks", [])), resp
assert any(d.get("code") == "task_precondition_blocked" for d in resp.get("diagnostics", [])), resp
print("  PASS D17 planning: bootstrap-fact preconditions partition eligible and blocked Tasks")
print(plan["id"])
PYEOF
D17_PLAN_ID="$(python3 - "$D17_PLAN_RESP" <<'PYEOF'
import json, sys
print(json.loads(sys.argv[1])["plan"]["id"])
PYEOF
)"
ACT_SCHEMA="ubu.orchestrator.task_action.v1"
D17_EFFECT_TASK="task_00000000020370008000000000000000"
D17_EFFECT_RESP="$(curl -sf -X POST "$DEMO_BASE/task/$D17_EFFECT_TASK/action" \
  -H "content-type: application/json" \
  -d "{\"schema_version\":\"$ACT_SCHEMA\",\"action\":\"complete\"}")"
echo "  effect action response: $D17_EFFECT_RESP"
python3 - "$D17_EFFECT_RESP" "$D17_EFFECT_TASK" <<'PYEOF'
import json, sys
d = json.loads(sys.argv[1])
assert d["task_id"] == sys.argv[2], d
assert d["task_status"] == "completed", d
assert d["transition_applied"] is True, d
assert d.get("diagnostics", []) == [], d
print("  PASS D17 effect action: completion accepted without diagnostics")
PYEOF
python3 - "$DEMO_DB" "$BOOTSTRAP_UNIVERSE_ID" "$D17_PLAN_ID" <<'PYEOF'
import json, sqlite3, sys

db, universe_state_id, plan_id = sys.argv[1:4]
con = sqlite3.connect(db)
row = con.execute(
    "SELECT version, payload_json FROM objects WHERE id = ?",
    (universe_state_id,),
).fetchone()
assert row is not None, f"D17 UniverseState missing after effect: {universe_state_id}"
version, payload_json = row
payload = json.loads(payload_json)
assert version == 2, f"D17 effect should persist a new UniverseState version, got {version}"
assert payload["facts"]["facts.operator.work_style"] == "responsive", payload["facts"]
assert payload["facts"]["facts.project.repository"] == "UbU-project/ubu-design", payload["facts"]
assert payload["numeric_values"] == {"numeric_values.operator.planning_horizon_days": 7.0}, payload
assert payload.get("set_memberships", {}) == {}, payload
assert payload.get("event_markers", {}) == {}, payload
assert payload["provenance"]["authority_source"] == "user", payload["provenance"]
con.execute(
    "UPDATE objects SET updated_at = '2026-06-24T14:05:00Z' WHERE id = ?",
    (universe_state_id,),
)

for task_id in (
    "task_00000000020170008000000000000000",
    "task_00000000020270008000000000000000",
    "task_00000000020370008000000000000000",
):
    con.execute(
        "UPDATE objects SET status = 'completed', updated_at = '2026-06-24T14:05:00Z' WHERE id = ?",
        (task_id,),
    )
row = con.execute("SELECT payload_json FROM plans WHERE id = ?", (plan_id,)).fetchone()
assert row is not None, f"D17 Plan not found for cleanup: {plan_id}"
plan_payload = json.loads(row[0])
plan_payload["status"] = "superseded"
con.execute(
    "UPDATE plans SET status = 'superseded', payload_json = ? WHERE id = ?",
    (json.dumps(plan_payload, separators=(",", ":")), plan_id),
)
con.commit()
print("  PASS D17 effect: bootstrap-seeded fact mutated and unrelated mapped entries preserved")
print("  retired D17 fixture Tasks and superseded its temporary Plan before next_action")
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
echo "Step 6: projection preview + approval (O7/O19) — gated recording-fake managed-label write"
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
assert len(ops) == 1, f"projection preview: expected exactly one managed-label add op, got: {ops}"
for op in ops:
    assert op.get("kind") == "label", f"projection preview: expected label-only operation, got: {op}"
    assert op.get("target", {}).get("issue_number") == 7, op
    payload = op.get("payload", {})
    assert payload.get("type") == "label", f"projection preview: expected issue label op, got: {payload}"
    assert payload.get("label") == "ubu-managed", f"unexpected label write: {payload}"
print(d["preview_id"])
PYEOF
)"
echo "  projection preview: preview_id=$PROJECTION_PREVIEW_ID"

COUNTS_BEFORE_APPROVE="$(python3 - "$DEMO_DB" <<'PYEOF'
import sqlite3, sys
db = sys.argv[1]
con = sqlite3.connect(db)
cur = con.cursor()
for table in ("projection_worker_writes", "projection_approvals", "projection_results", "logs"):
    cur.execute(f"SELECT COUNT(*) FROM {table}")
    print(cur.fetchone()[0])
PYEOF
)"
WRITES_BEFORE="$(printf '%s\n' "$COUNTS_BEFORE_APPROVE" | sed -n '1p')"
APPROVALS_BEFORE="$(printf '%s\n' "$COUNTS_BEFORE_APPROVE" | sed -n '2p')"
RESULTS_BEFORE="$(printf '%s\n' "$COUNTS_BEFORE_APPROVE" | sed -n '3p')"
LOGS_BEFORE="$(printf '%s\n' "$COUNTS_BEFORE_APPROVE" | sed -n '4p')"

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
assert len(results) == 1, f"projection result: expected one operation result, got: {results}"
result = results[0]
assert result.get("status") == "applied", result
assert result.get("authority_source") == "automation_worker", result
assert "ubu-managed" in (result.get("message") or ""), result
print("  PASS projection result: status=applied  authority_source=automation_worker")
PYEOF

python3 - "$DEMO_DB" "$WRITES_BEFORE" "$APPROVALS_BEFORE" "$RESULTS_BEFORE" "$LOGS_BEFORE" <<'PYEOF'
import json, sqlite3, sys

db, writes_before, approvals_before, results_before, logs_before = sys.argv[1:6]
writes_before = int(writes_before)
approvals_before = int(approvals_before)
results_before = int(results_before)
logs_before = int(logs_before)
con = sqlite3.connect(db)
cur = con.cursor()

cur.execute("SELECT COUNT(*) FROM projection_worker_writes")
writes_after = cur.fetchone()[0]
assert writes_after == writes_before, (
    f"recording fake path: legacy projection_worker_writes changed unexpectedly, "
    f"before={writes_before} after={writes_after}"
)

cur.execute("SELECT COUNT(*) FROM projection_approvals")
approvals_after = cur.fetchone()[0]
assert approvals_after == approvals_before + 1, (
    f"projection approval: expected one new approval, before={approvals_before} "
    f"after={approvals_after}"
)

cur.execute("SELECT COUNT(*) FROM projection_results")
results_after = cur.fetchone()[0]
assert results_after == results_before + 1, (
    f"projection result: expected one new persisted result, before={results_before} "
    f"after={results_after}"
)

cur.execute(
    "SELECT payload_json FROM projection_results ORDER BY created_at DESC LIMIT 1"
)
payload = json.loads(cur.fetchone()[0])
result = payload.get("result", {})
assert payload.get("schema_version") == "ubu.orchestrator.projection_result.v1", payload
assert payload.get("diagnostics") == [], payload
op_results = result.get("operation_results", [])
assert len(op_results) == 1, payload
assert op_results[0].get("status") == "applied", payload
assert "ubu-managed" in (op_results[0].get("message") or ""), payload

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
print("  PASS projection result: exactly one managed-label add applied through the fake-backed path")
print("  PASS legacy mock table: no projection_worker_writes rows were created")
print("  PASS boundary log: compartment_boundary_decided accepted")
PYEOF

echo ""
echo "Step 7: projection reconciliation (O7/O19) — seeded fake observation reports managed-label drift"
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
print("  PASS reconciliation: conflict persisted and no extra fake write occurred")
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
    f"deny path: legacy projection_worker_writes changed unexpectedly, "
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
print("  PASS deny path: no fake write and compartment_boundary_decided rejected")
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
echo "Step 14: C-1 scoring plus minimal fixed-duration O13 verification (D11 re-issue)"
echo "  (offline fixture requests: $SCORING_FIXTURE; posted only to loopback /planning/generate)"
python3 - "$SCORING_FIXTURE" "$DEMO_BASE" <<'PYEOF'
import json
import copy
import sys
import urllib.error
import urllib.request

fixture_path, base_url = sys.argv[1:3]
assert base_url.startswith("http://127.0.0.1:"), \
    f"scoring fixture refuses non-loopback endpoint: {base_url}"
fixture = json.loads(open(fixture_path, encoding="utf-8").read())
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
winners = {}


def post_planning(request_body, name):
    body = json.dumps({"request": request_body}).encode("utf-8")
    request = urllib.request.Request(
        f"{base_url}/planning/generate",
        data=body,
        headers={"content-type": "application/json"},
        method="POST",
    )
    try:
        with opener.open(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise AssertionError(
            f"{name}: /planning/generate failed: {exc.code} {detail}"
        ) from exc


def candidate_set(payload, name):
    selected = payload.get("selected_candidate")
    alternatives = payload.get("alternatives")
    assert selected is not None, f"{name}: missing selected_candidate: {payload}"
    assert isinstance(alternatives, list), f"{name}: alternatives must be a list: {payload}"
    return selected, [selected, *alternatives]


def contains_value(value, sought):
    if isinstance(value, dict):
        return any(contains_value(item, sought) for item in value.values())
    if isinstance(value, list):
        return any(contains_value(item, sought) for item in value)
    return value == sought

for case in fixture["cases"]:
    name = case["name"]
    expected = case["expected"]
    zero_payload = None
    zero_candidates = None
    if name.startswith("abundant-slack-"):
        zero_request = copy.deepcopy(case["request"])
        zero_request["compute_budget"] = {"n_rollouts": 0, "top_k": 3}
        zero_payload = post_planning(zero_request, f"{name}-zero-rollouts")
        _, zero_candidates = candidate_set(zero_payload, f"{name}-zero-rollouts")
    payload = post_planning(case["request"], name)
    selected, candidates = candidate_set(payload, name)
    assert 1 < len(candidates) <= 16, \
        f"{name}: expected 2..16 scored candidates, got {len(candidates)}"
    assert len(candidates) == expected["scored_candidate_count"], (
        f"{name}: scored candidate count {len(candidates)} != fixture expectation "
        f"{expected['scored_candidate_count']}"
    )

    # Minimal re-issued D11: abundant slack yields all sixteen C-1 candidates.
    # Skipping Stage 4 exposes the C-1 proxy without fabricating probabilities;
    # the default fixed-duration rollout must retain that exact candidate set.
    if name.startswith("abundant-slack-"):
        assert zero_payload is not None and zero_candidates is not None
        assert len(zero_candidates) == expected["scored_candidate_count"] == 16, (
            f"{name}: zero-rollout C-1 set was not the full bounded set: "
            f"{len(zero_candidates)}"
        )
        zero_ids = {candidate["candidate_id"] for candidate in zero_candidates}
        default_ids = {candidate["candidate_id"] for candidate in candidates}
        assert default_ids == zero_ids, (
            f"{name}: rollout response did not retain the C-1 candidate set: "
            f"missing={sorted(zero_ids - default_ids)} extra={sorted(default_ids - zero_ids)}"
        )
        proxy_by_id = {}
        for candidate in zero_candidates:
            assert candidate.get("probability_quality") == "not_estimated", candidate
            assert candidate.get("display_probability") is None, candidate
            assert candidate.get("probability_interval_low") is None, candidate
            assert candidate.get("probability_interval_high") is None, candidate
            proxy = candidate.get("robustness_score")
            assert isinstance(proxy, (int, float)), \
                f"{name}: missing numeric C-1 proxy robustness: {candidate}"
            assert proxy == candidate.get("score_summary", {}).get("robustness_score"), \
                f"{name}: exposed robustness is not the C-1 proxy: {candidate}"
            proxy_by_id[candidate["candidate_id"]] = proxy
        assert not contains_value(zero_payload, "estimated"), \
            f"{name}: zero-rollout response contains forbidden estimated quality"

        finalists = candidates[:3]
        non_finalists = candidates[3:]
        assert len(finalists) == 3 and non_finalists, \
            f"{name}: expected three finalists plus retained non-finalists"
        for candidate in finalists:
            assert candidate.get("probability_quality") == "full", candidate
            assert isinstance(candidate.get("display_probability"), (int, float)), candidate
            assert isinstance(candidate.get("probability_interval_low"), (int, float)), candidate
            assert isinstance(candidate.get("probability_interval_high"), (int, float)), candidate
        for candidate in non_finalists:
            assert candidate.get("probability_quality") == "not_estimated", candidate
            assert candidate.get("display_probability") is None, candidate
            assert candidate.get("probability_interval_low") is None, candidate
            assert candidate.get("probability_interval_high") is None, candidate
            assert candidate.get("robustness_score") == proxy_by_id[candidate["candidate_id"]], \
                f"{name}: non-finalist C-1 proxy robustness changed: {candidate}"
        assert not contains_value(payload, "estimated"), \
            f"{name}: default rollout response contains forbidden estimated quality"
        print(
            f"  PASS {name}: retained all {len(candidates)} C-1 candidates; "
            "zero rollouts not_estimated; 3 fixed-duration finalists full"
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
    # O13 retains separate finalist and non-finalist cohorts. Preserve the D10
    # ordering check within each cohort; D12 exercises stochastic re-ranking.
    finalist_totals = totals[:3]
    non_finalist_totals = totals[3:]
    assert finalist_totals == sorted(finalist_totals, reverse=True), \
        f"{name}: finalists are not ranked by total_score descending: {finalist_totals}"
    assert non_finalist_totals == sorted(non_finalist_totals, reverse=True), \
        f"{name}: non-finalists are not ranked by total_score descending: {non_finalist_totals}"
    assert selected["rank"] == 1, f"{name}: selected candidate is not rank 1: {selected}"
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
echo "Step 15: D12 stochastic rollout, re-rank, correlation effect, and reproducibility"
echo "  (offline fixture requests: $STOCHASTIC_FIXTURE; posted only to loopback /planning/generate)"
python3 - "$STOCHASTIC_FIXTURE" "$DEMO_BASE" <<'PYEOF'
import copy
import json
import sys
import urllib.error
import urllib.request

fixture_path, base_url = sys.argv[1:3]
assert base_url.startswith("http://127.0.0.1:"), \
    f"stochastic fixture refuses non-loopback endpoint: {base_url}"
fixture = json.loads(open(fixture_path, encoding="utf-8").read())
cases = {case["name"]: case for case in fixture["cases"]}
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def post_planning(request_body, name):
    body = json.dumps({"request": request_body}).encode("utf-8")
    request = urllib.request.Request(
        f"{base_url}/planning/generate",
        data=body,
        headers={"content-type": "application/json"},
        method="POST",
    )
    try:
        with opener.open(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise AssertionError(
            f"{name}: /planning/generate failed: {exc.code} {detail}"
        ) from exc


def candidates(payload, name):
    selected = payload.get("selected_candidate")
    alternatives = payload.get("alternatives")
    assert selected is not None, f"{name}: missing selected candidate: {payload}"
    assert isinstance(alternatives, list), f"{name}: alternatives must be a list"
    result = [selected, *alternatives]
    assert [candidate.get("rank") for candidate in result] == list(range(1, len(result) + 1)), \
        f"{name}: candidate ranks are not contiguous: {result}"
    return result


def assert_full(candidate, name):
    probability = candidate.get("display_probability")
    low = candidate.get("probability_interval_low")
    high = candidate.get("probability_interval_high")
    robustness = candidate.get("robustness_score")
    assert candidate.get("probability_quality") == "full", candidate
    assert isinstance(probability, (int, float)), f"{name}: missing probability: {candidate}"
    assert isinstance(low, (int, float)) and isinstance(high, (int, float)), \
        f"{name}: missing Wilson interval: {candidate}"
    assert 0.0 <= low <= probability <= high <= 1.0 and low < high, \
        f"{name}: invalid Wilson interval [{low}, {high}] for {probability}"
    assert isinstance(robustness, (int, float)), f"{name}: missing p10 robustness: {candidate}"
    assert robustness == candidate.get("score_summary", {}).get("robustness_score"), \
        f"{name}: exposed p10 robustness disagrees with score summary: {candidate}"


rerank_case = cases["stochastic-rerank"]
full_request = rerank_case["request"]
zero_request = copy.deepcopy(full_request)
zero_request["compute_budget"]["n_rollouts"] = 0

zero_payload = post_planning(zero_request, "stochastic-rerank-zero-rollouts")
zero_candidates = candidates(zero_payload, "stochastic-rerank-zero-rollouts")
expected_count = rerank_case["expected"]["candidate_count"]
assert len(zero_candidates) == expected_count == 16, \
    f"stochastic-rerank: expected full bounded C-1 set, got {len(zero_candidates)}"
for candidate in zero_candidates:
    assert candidate.get("probability_quality") == "not_estimated", candidate
    assert candidate.get("display_probability") is None, candidate
    assert candidate.get("probability_interval_low") is None, candidate
    assert candidate.get("probability_interval_high") is None, candidate
    proxy = candidate.get("robustness_score")
    assert isinstance(proxy, (int, float)), f"missing C-1 proxy: {candidate}"
    assert proxy == candidate.get("score_summary", {}).get("robustness_score"), \
        f"not_estimated robustness is not the C-1 proxy: {candidate}"

first_payload = post_planning(full_request, "stochastic-rerank-first")
second_payload = post_planning(full_request, "stochastic-rerank-reproducibility")
first_candidates = candidates(first_payload, "stochastic-rerank-first")
second_candidates = candidates(second_payload, "stochastic-rerank-reproducibility")
assert first_candidates == second_candidates, \
    "stochastic-rerank: fixed-seed candidate projections were not reproducible"
assert len(first_candidates) == expected_count, \
    f"stochastic-rerank: rollout did not retain all {expected_count} candidates"
assert {candidate["candidate_id"] for candidate in first_candidates} == {
    candidate["candidate_id"] for candidate in zero_candidates
}, "stochastic-rerank: rollout changed the bounded C-1 candidate set"
assert first_candidates[0]["candidate_id"] != zero_candidates[0]["candidate_id"], (
    "stochastic-rerank: rollout rank-1 did not differ from the C-1 composite rank-1"
)
finalist_count = rerank_case["expected"]["finalist_count"]
for candidate in first_candidates[:finalist_count]:
    assert_full(candidate, "stochastic-rerank")
for candidate in first_candidates[finalist_count:]:
    assert candidate.get("probability_quality") == "not_estimated", candidate
    assert candidate.get("display_probability") is None, candidate
    assert candidate.get("probability_interval_low") is None, candidate
    assert candidate.get("probability_interval_high") is None, candidate

with opener.open(f"{base_url}/calendar/current", timeout=30) as response:
    calendar = json.loads(response.read().decode("utf-8"))
assert calendar.get("selected_candidate") == second_payload["selected_candidate"], \
    "stochastic-rerank: Calendar did not persist rollout-grounded rank-1"
assert calendar.get("steps") == second_payload["selected_candidate"]["steps"], \
    "stochastic-rerank: Calendar steps do not follow rollout-grounded rank-1"
print(
    "  PASS stochastic-rerank: "
    f"C-1 rank-1={zero_candidates[0]['candidate_id']}; "
    f"rollout rank-1={first_candidates[0]['candidate_id']}; "
    "16 retained; fixed-seed projection reproduced"
)

probabilities = {}
for name in ("independent-durations", "shared-correlated-durations"):
    payload = post_planning(cases[name]["request"], name)
    candidate = candidates(payload, name)[0]
    assert_full(candidate, name)
    probabilities[name] = candidate["display_probability"]

independent = probabilities["independent-durations"]
correlated = probabilities["shared-correlated-durations"]
expected = cases["shared-correlated-durations"]["expected"]
assert expected["probability_direction_vs_independent"] == "higher"
assert correlated > independent, \
    f"correlation effect direction changed: correlated={correlated}, independent={independent}"
assert correlated - independent >= expected["minimum_probability_delta"], \
    f"correlation effect was not material: correlated={correlated}, independent={independent}"
print(
    "  PASS correlation effect: "
    f"shared={correlated:.3f} > independent={independent:.3f} "
    f"(delta={correlated - independent:.3f})"
)
print("  PASS not_estimated: zero rollouts exposed C-1 proxies without probability")
PYEOF

echo ""
echo "Step 16: D13 derived risk and human-complete plan-quality reports (UBU-D0240)"
echo "  (offline fixture requests: $REPORTS_FIXTURE; posted only to loopback /planning/generate)"
python3 - "$REPORTS_FIXTURE" "$DEMO_BASE" "$DEMO_DB" <<'PYEOF'
import json
import sqlite3
import sys
import urllib.error
import urllib.request

fixture_path, base_url, db_path = sys.argv[1:4]
assert base_url.startswith("http://127.0.0.1:"), \
    f"risk/quality fixture refuses non-loopback endpoint: {base_url}"
fixture = json.loads(open(fixture_path, encoding="utf-8").read())
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def post_planning(request_body, name):
    body = json.dumps({"request": request_body}).encode("utf-8")
    request = urllib.request.Request(
        f"{base_url}/planning/generate",
        data=body,
        headers={"content-type": "application/json"},
        method="POST",
    )
    try:
        with opener.open(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise AssertionError(
            f"{name}: /planning/generate failed: {exc.code} {detail}"
        ) from exc


def get_calendar():
    with opener.open(f"{base_url}/calendar/current", timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def recalculation_count(connection):
    return connection.execute(
        "SELECT COUNT(*) FROM logs WHERE event_type = 'recalculation_requested'"
    ).fetchone()[0]


connection = sqlite3.connect(db_path, timeout=30)
setup = fixture["store_setup"]
for task in setup["tasks"]:
    payload = dict(task)
    connection.execute(
        """
        INSERT INTO objects
          (id, object_type, version, status, compartment_label, payload_json, created_at, updated_at)
        VALUES (?, 'Task', 1, 'active', 'fixture-demo', ?, ?, ?)
        """,
        (
            task["id"],
            json.dumps(payload, separators=(",", ":")),
            "2026-06-22T00:00:00Z",
            "2026-06-22T00:00:00Z",
        ),
    )
for log in setup["recent_logs"]:
    connection.execute(
        """
        INSERT INTO logs
          (id, event_type, object_refs_json, payload_json, provenance_json, created_at)
        VALUES (?, ?, '[]', ?, ?, ?)
        """,
        (
            log["id"],
            log["event_type"],
            json.dumps(log["payload"], separators=(",", ":")),
            json.dumps({"authority_source": "system"}, separators=(",", ":")),
            log["created_at"],
        ),
    )
connection.commit()

failure_patterns = {
    "none",
    "wrong_estimates",
    "missing_dependencies",
    "stale_affect",
    "interruption",
    "overload",
    "changed_objective",
}

for case in fixture["cases"]:
    name = case["name"]
    expected = case["expected"]
    trigger_count_before = recalculation_count(connection)
    payload = post_planning(case["request"], name)
    plan = payload.get("plan")
    assert (plan is not None) is expected["plan_present"], \
        f"{name}: plan presence mismatch: {payload}"

    report = payload.get("risk_report")
    assert report is not None, f"{name}: missing risk_report: {payload}"
    assert report.get("level") == expected["risk_level"], \
        f"{name}: risk level {report.get('level')} != {expected['risk_level']}"
    findings = report.get("findings")
    assert isinstance(findings, list), f"{name}: findings must be a list: {report}"
    for wanted in expected.get("findings", []):
        assert any(
            all(finding.get(key) == value for key, value in wanted.items())
            for finding in findings
        ), f"{name}: missing expected finding {wanted}: {findings}"
    if expected.get("no_blocking_findings"):
        assert not any(finding.get("blocking") is True for finding in findings), \
            f"{name}: clean fixture returned a blocking finding: {findings}"

    quality = payload.get("human_complete_plan_quality")
    if plan is not None:
        assert quality is not None, f"{name}: admitted Plan missing plan-quality assessment"
        stretch = expected.get("stretch_pressure")
        if stretch is not None:
            allowed = stretch if isinstance(stretch, list) else [stretch]
            assert quality.get("stretch_pressure") in allowed, \
                f"{name}: stretch_pressure {quality.get('stretch_pressure')} not in {allowed}"
        delta = expected.get("post_plan_state_delta")
        if delta is not None:
            allowed = delta if isinstance(delta, list) else [delta]
            assert quality.get("post_plan_state_delta") in allowed, \
                f"{name}: post_plan_state_delta {quality.get('post_plan_state_delta')} not in {allowed}"
        failure_pattern = quality.get("failure_pattern")
        assert failure_pattern in failure_patterns, \
            f"{name}: failure_pattern is not a model-cause enum: {failure_pattern!r}"
        assert "you" not in failure_pattern and " " not in failure_pattern, \
            f"{name}: failure_pattern contains user-directed text: {failure_pattern!r}"
        if "failure_pattern" in expected:
            assert failure_pattern == expected["failure_pattern"], \
                f"{name}: recent failure Log did not yield {expected['failure_pattern']}: {quality}"

    connection.commit()
    trigger_count_after = recalculation_count(connection)
    if expected.get("blocking_recalculation"):
        assert trigger_count_after == trigger_count_before + 1, \
            f"{name}: blocking set did not append exactly one recalculation request"
    else:
        assert trigger_count_after == trigger_count_before, \
            f"{name}: non-blocking report unexpectedly requested recalculation"

    if "calendar_stale" in expected:
        calendar = get_calendar()
        assert calendar.get("plan_id") == plan["id"], \
            f"{name}: Calendar does not serve the generated Plan: {calendar}"
        assert calendar.get("stale") is expected["calendar_stale"], \
            f"{name}: Calendar stale={calendar.get('stale')} expected {expected['calendar_stale']}"
        assert calendar.get("risk_report") == report, \
            f"{name}: Calendar risk report differs from generated Plan"

    categories = [finding.get("category") for finding in findings]
    print(
        f"  PASS {name}: risk={report['level']} findings={categories}"
        + (f" quality={quality['stretch_pressure']}/{quality['post_plan_state_delta']}"
           if quality is not None else "")
    )

connection.close()
print("  PASS blocking reports: recalculation_requested Log appended; admitted blocking Plans mark Calendar stale")
print("  PASS failure_pattern: recent failure Log maps only to the bounded model-cause enum")
PYEOF

echo ""
echo "Step 17a: intrinsic-affect mode rejection (D16/UBU-D0242, Wiring-B) — offline ubu-core validators"
echo "  (offline local crate: $MODE_EFFECTS_FIXTURE; pure validate_*_for_mode across all three instance modes)"
echo "  The running orchestrator is fixed to user_mode (MVP_INSTANCE_MODE); organization/worker-mode"
echo "  rejection is asserted directly against the canonical ubu-core validators, which is authoritative."
MODE_SMOKE_DIR="$DEMO_TMPDIR/mode-rejection-smoke"
mkdir -p "$MODE_SMOKE_DIR/src"
cat >"$MODE_SMOKE_DIR/Cargo.toml" <<EOF
[package]
name = "ubu_mode_rejection_smoke"
version = "0.1.0"
edition = "2021"
publish = false

[dependencies]
serde_json = "1.0"
ubu_core = { path = "$CORE_DIR" }
EOF
cat >"$MODE_SMOKE_DIR/src/main.rs" <<'EOF'
use std::env;
use std::fs;

use serde_json::Value;
use ubu_core::core::{
    validate_mutations_for_mode, validate_precondition_for_mode, InstanceMode, ModeValidationError,
    UniverseMutation, UniversePrecondition,
};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    assert_eq!(args.len(), 2, "usage: mode-smoke <fixture-json>");
    let fixture: Value = serde_json::from_str(&fs::read_to_string(&args[1])?)?;

    assert_eq!(fixture["decision"], "UBU-D0242", "fixture must cite UBU-D0242");
    assert_eq!(fixture["wiring"], "Wiring-B", "fixture must cite Wiring-B");

    let mr = &fixture["mode_rejection"];
    let intrinsic_precondition: UniversePrecondition =
        serde_json::from_value(mr["intrinsic_affect_precondition"].clone())?;
    let intrinsic_mutations: Vec<UniverseMutation> =
        serde_json::from_value(mr["intrinsic_affect_mutations"].clone())?;
    let non_affect_precondition: UniversePrecondition =
        serde_json::from_value(mr["non_affect_precondition"].clone())?;
    let non_affect_mutations: Vec<UniverseMutation> =
        serde_json::from_value(mr["non_affect_mutations"].clone())?;
    let expected_precondition_target = mr["expected_precondition_target"]
        .as_str()
        .expect("expected_precondition_target");
    let expected_mutation_target = mr["expected_mutation_target"]
        .as_str()
        .expect("expected_mutation_target");

    let permissive: Vec<InstanceMode> =
        serde_json::from_value(fixture["modes"]["permissive"].clone())?;
    let rejecting: Vec<InstanceMode> =
        serde_json::from_value(fixture["modes"]["rejecting"].clone())?;
    assert!(!permissive.is_empty(), "fixture defines no permissive mode");
    assert!(!rejecting.is_empty(), "fixture defines no rejecting mode");

    // Rejecting modes (organization_mode, worker_mode) do not model intrinsic
    // affect: an intrinsic-affect precondition target (found anywhere in the
    // tree) and an intrinsic-affect mutation target are both rejected, while
    // non-affect targets continue to pass.
    for mode in &rejecting {
        match validate_precondition_for_mode(*mode, &intrinsic_precondition) {
            Err(ModeValidationError::IntrinsicAffectForbidden { mode: m, target }) => {
                assert_eq!(m, *mode, "rejection reported the wrong mode");
                assert_eq!(
                    target, expected_precondition_target,
                    "rejection reported the wrong precondition target"
                );
            }
            other => panic!("{mode} accepted an intrinsic-affect precondition: {other:?}"),
        }
        match validate_mutations_for_mode(*mode, &intrinsic_mutations) {
            Err(ModeValidationError::IntrinsicAffectForbidden { mode: m, target }) => {
                assert_eq!(m, *mode, "rejection reported the wrong mode");
                assert_eq!(
                    target, expected_mutation_target,
                    "rejection reported the wrong mutation target"
                );
            }
            other => panic!("{mode} accepted an intrinsic-affect mutation: {other:?}"),
        }
        assert!(
            validate_precondition_for_mode(*mode, &non_affect_precondition).is_ok(),
            "{mode} wrongly rejected a non-affect precondition"
        );
        assert!(
            validate_mutations_for_mode(*mode, &non_affect_mutations).is_ok(),
            "{mode} wrongly rejected non-affect mutations"
        );
        println!(
            "  PASS mode {mode}: intrinsic-affect precondition and effect mutation rejected as invalid; non-affect permitted"
        );
    }

    // Permissive modes (user_mode) model intrinsic affect: every target passes.
    for mode in &permissive {
        assert!(
            validate_precondition_for_mode(*mode, &intrinsic_precondition).is_ok(),
            "{mode} wrongly rejected an intrinsic-affect precondition"
        );
        assert!(
            validate_mutations_for_mode(*mode, &intrinsic_mutations).is_ok(),
            "{mode} wrongly rejected intrinsic-affect mutations"
        );
        assert!(
            validate_precondition_for_mode(*mode, &non_affect_precondition).is_ok(),
            "{mode} wrongly rejected a non-affect precondition"
        );
        assert!(
            validate_mutations_for_mode(*mode, &non_affect_mutations).is_ok(),
            "{mode} wrongly rejected non-affect mutations"
        );
        println!("  PASS mode {mode}: intrinsic-affect precondition and effect mutation permitted");
    }

    Ok(())
}
EOF
CARGO_NET_OFFLINE=true cargo run --quiet --offline \
  --manifest-path "$MODE_SMOKE_DIR/Cargo.toml" \
  -- "$MODE_EFFECTS_FIXTURE"

echo ""
echo "Step 17b: effect application on completion (D16/UBU-D0242, Wiring-B) — store-backed, user_mode"
echo "  (offline fixture seed: $MODE_EFFECTS_FIXTURE; completions posted only to loopback /task/{id}/action)"
APPLY_TASK="$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['effects_demo']['ids']['apply_task'])" "$MODE_EFFECTS_FIXTURE")"
PROB_TASK="$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['effects_demo']['ids']['probabilistic_task'])" "$MODE_EFFECTS_FIXTURE")"
FAILED_TASK="$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['effects_demo']['ids']['failed_task'])" "$MODE_EFFECTS_FIXTURE")"
EFFECT_UNIVERSE_ID="$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['effects_demo']['ids']['universe_state'])" "$MODE_EFFECTS_FIXTURE")"

python3 - "$DEMO_DB" "$MODE_EFFECTS_FIXTURE" <<'PYEOF'
import json, sqlite3, sys

db, fixture_path = sys.argv[1:3]
demo = json.loads(open(fixture_path, encoding="utf-8").read())["effects_demo"]
ids = demo["ids"]
con = sqlite3.connect(db)
# A late same-day timestamp keeps this the current UniverseState ahead of the
# D15-seeded one (2026-06-23); read_current_universe_state selects by updated_at.
seed_ts = "2026-06-24T23:50:00Z"

state = dict(demo["universe_state"])
state["id"] = ids["universe_state"]
state["provenance"] = {
    "created_at": seed_ts,
    "created_by": "fixture-demo-d16",
    "authority_source": "user",
}
con.execute(
    """
    INSERT INTO objects
      (id, object_type, version, status, compartment_label, payload_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """,
    (
        state["id"],
        "UniverseState",
        1,
        "active",
        "fixture-demo-d16",
        json.dumps(state, separators=(",", ":")),
        seed_ts,
        seed_ts,
    ),
)

seeds = [
    (ids["apply_task"], "active", demo["apply_effect"], "apply"),
    (ids["probabilistic_task"], "active", demo["probabilistic_effect"], "probabilistic"),
    (ids["failed_task"], "failed", demo["failed_effect"], "failed"),
]
for task_id, status, effect, case in seeds:
    payload = {
        "id": task_id,
        "title": f"D16 effect task ({case})",
        "status": status,
        "effects": effect,
        "provenance": {
            "created_at": seed_ts,
            "authority_source": "user",
            "source": {"source_kind": "fixture_demo", "source_id": case},
        },
    }
    con.execute(
        """
        INSERT INTO objects
          (id, object_type, version, status, compartment_label, payload_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            task_id,
            "Task",
            1,
            status,
            "fixture-demo-d16",
            json.dumps(payload, separators=(",", ":")),
            seed_ts,
            seed_ts,
        ),
    )

con.commit()

# Defensive: the orchestrator selects the current UniverseState by updated_at;
# assert the row it will mutate is the one this step seeded, not the D15 one.
row = con.execute(
    "SELECT id FROM objects WHERE object_type = 'UniverseState' "
    "ORDER BY updated_at DESC, created_at DESC LIMIT 1"
).fetchone()
assert row is not None and row[0] == ids["universe_state"], (
    f"D16 seeded UniverseState is not the current one: {row}"
)
print("  seeded current UniverseState and three D16 effect Tasks (active apply, active probabilistic, failed)")
PYEOF

# (1) Complete a Task with effects and a payload; assert UniverseState reflects every mutation.
APPLY_RESP="$(curl -sf -X POST "$DEMO_BASE/task/$APPLY_TASK/action" \
  -H "content-type: application/json" \
  -d "{\"schema_version\":\"$ACT_SCHEMA\",\"action\":\"complete\"}")"
echo "  apply response: $APPLY_RESP"
python3 - "$APPLY_RESP" "$DEMO_DB" "$EFFECT_UNIVERSE_ID" "$MODE_EFFECTS_FIXTURE" <<'PYEOF'
import json, sqlite3, sys

resp = json.loads(sys.argv[1])
db, uid, fixture_path = sys.argv[2:5]
expected = json.loads(open(fixture_path, encoding="utf-8").read())["effects_demo"]["expected_after_apply"]

assert resp.get("task_status") == "completed", f"apply: expected completed, got {resp}"
assert resp.get("transition_applied") is True, f"apply: expected transition_applied, got {resp}"
codes = [d.get("code") for d in resp.get("diagnostics", [])]
assert codes == [], f"apply: unexpected effect diagnostics {codes}"

con = sqlite3.connect(db)
row = con.execute("SELECT version, payload_json FROM objects WHERE id = ?", (uid,)).fetchone()
assert row is not None, "apply: current UniverseState row missing"
version, payload = row[0], json.loads(row[1])
assert version == 2, f"apply: expected persisted version 2, got {version}"

facts = payload["facts"]
for key, value in expected["facts"].items():
    assert facts.get(key) == value, f"apply: facts[{key}]={facts.get(key)} != {value}"
assert facts["ticket.result"] == {"merged": True, "pr_number": 42}, \
    f"apply: object payload not deep-applied: {facts.get('ticket.result')}"
assert payload["numeric_values"]["available_minutes"] == 90.0, \
    f"apply: numeric increment not applied: {payload['numeric_values']}"
assert set(payload["set_memberships"]["labels"]) == {"reviewed", "todo"}, \
    f"apply: membership add not applied: {payload['set_memberships']}"
assert payload["event_markers"]["completions"] == expected["event_markers"]["completions"], \
    f"apply: event marker not appended: {payload['event_markers']}"
assert payload["provenance"]["authority_source"] == "user", \
    f"apply: expected user authority on persisted state, got {payload['provenance']}"
print("  PASS apply effect: all mutations (incl. object payload) applied; version=2; authority_source=user; untouched facts preserved")
PYEOF

# (2) Complete a Task whose effect.success_probability is below 1; assert the effect still applies.
PROB_RESP="$(curl -sf -X POST "$DEMO_BASE/task/$PROB_TASK/action" \
  -H "content-type: application/json" \
  -d "{\"schema_version\":\"$ACT_SCHEMA\",\"action\":\"complete\"}")"
echo "  probabilistic response: $PROB_RESP"
python3 - "$PROB_RESP" "$DEMO_DB" "$EFFECT_UNIVERSE_ID" "$MODE_EFFECTS_FIXTURE" <<'PYEOF'
import json, sqlite3, sys

resp = json.loads(sys.argv[1])
db, uid, fixture_path = sys.argv[2:5]
demo = json.loads(open(fixture_path, encoding="utf-8").read())["effects_demo"]
prob = demo["probabilistic_effect"]["success_probability"]
expected = demo["expected_after_probabilistic"]
assert prob < 1.0, f"probabilistic fixture must declare success_probability < 1, got {prob}"

assert resp.get("task_status") == "completed", f"probabilistic: expected completed, got {resp}"
codes = [d.get("code") for d in resp.get("diagnostics", [])]
assert codes == [], f"probabilistic: unexpected effect diagnostics {codes}"

con = sqlite3.connect(db)
version, payload = con.execute(
    "SELECT version, payload_json FROM objects WHERE id = ?", (uid,)
).fetchone()
payload = json.loads(payload)
assert version == 3, f"probabilistic: expected persisted version 3, got {version}"
assert payload["numeric_values"]["available_minutes"] == expected["numeric_values"]["available_minutes"], \
    f"probabilistic: decrement not applied: {payload['numeric_values']}"
assert payload["facts"]["ticket.phase"] == "verified", \
    f"probabilistic: fact not applied: {payload['facts'].get('ticket.phase')}"
print(f"  PASS probabilistic effect: success_probability={prob} (<1) still applied; version=3")
PYEOF

# (3) Transition to failed leaves UniverseState unchanged: completing a failed Task is rejected.
SNAPSHOT_BEFORE="$(python3 - "$DEMO_DB" "$EFFECT_UNIVERSE_ID" <<'PYEOF'
import json, sqlite3, sys
db, uid = sys.argv[1:3]
version, payload = sqlite3.connect(db).execute(
    "SELECT version, payload_json FROM objects WHERE id = ?", (uid,)
).fetchone()
print(json.dumps({"version": version, "payload": json.loads(payload)}, separators=(",", ":")))
PYEOF
)"
FAILED_HTTP="$(curl -s -o "$DEMO_TMPDIR/d16-failed-body.json" -w '%{http_code}' \
  -X POST "$DEMO_BASE/task/$FAILED_TASK/action" \
  -H "content-type: application/json" \
  -d "{\"schema_version\":\"$ACT_SCHEMA\",\"action\":\"complete\"}")"
echo "  failed-completion HTTP status: $FAILED_HTTP"
python3 - "$FAILED_HTTP" "$DEMO_TMPDIR/d16-failed-body.json" "$DEMO_DB" "$EFFECT_UNIVERSE_ID" "$SNAPSHOT_BEFORE" <<'PYEOF'
import json, sqlite3, sys

http, body_path, db, uid, snapshot_json = sys.argv[1:6]
assert http == "400", f"failed completion: expected HTTP 400, got {http}"
body = json.loads(open(body_path, encoding="utf-8").read())
codes = [d.get("code") for d in body.get("diagnostics", [])]
assert "invalid_task_state" in codes, f"failed completion: expected invalid_task_state, got {body}"

snapshot = json.loads(snapshot_json)
version, payload = sqlite3.connect(db).execute(
    "SELECT version, payload_json FROM objects WHERE id = ?", (uid,)
).fetchone()
payload = json.loads(payload)
assert version == snapshot["version"], \
    f"failed completion: version changed {snapshot['version']} -> {version}"
assert payload == snapshot["payload"], "failed completion: UniverseState payload changed"
assert payload["facts"]["ticket.status"] == "done", \
    f"failed completion: status fact mutated to {payload['facts'].get('ticket.status')}"
print("  PASS failed transition: completion rejected (invalid_task_state); UniverseState unchanged (version and payload identical)")
PYEOF

echo ""
echo "PASS: bootstrap-to-act, gated projection, affect legitimization, Plan/Calendar/recalculation,"
echo "      C-1 scoring/selection, fixed-duration O13, stochastic D12 rollout,"
echo "      D13 risk/plan-quality report checks, D14 UniverseState semantics,"
echo "      D15 precondition-gated planning, D16 effect application on completion"
echo "      with intrinsic-affect mode rejection, and D17 bootstrap fact recording"
echo "      plus the self-sustaining loop from bootstrap facts (UBU-D0242/UBU-D0243)"
echo "      verified store-backed on throwaway store"
echo "  store=$DEMO_DB (ephemeral — removed on exit)"
