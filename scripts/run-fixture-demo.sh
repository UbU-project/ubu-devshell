#!/usr/bin/env bash
# Fixture smoke test: exercises the store-backed orchestrator path (O4).
# Creates a throwaway SQLite store under a temp directory; removes it on exit,
# including on failure. Requires no live GitHub and no network egress.
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

echo "=== Fixture Demo: store-backed (O4 decision: MemoryState removed) ==="
echo "orchestrator: $ORCHESTRATOR_DIR"
echo "manifest:     $MANIFEST"
echo "port:         $DEMO_PORT"
echo ""

# --- Temp dir and cleanup ---

DEMO_TMPDIR="$(mktemp -d)"
DEMO_DB="$DEMO_TMPDIR/ubu-demo.db"
DEMO_FIXTURE="$DEMO_TMPDIR/demo-candidates.json"
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

# --- Synthesize import fixture in orchestrator format ---
# Converts devshell fixtures/github/*.json into {"candidates":[...]} for the
# /github/import/fixture endpoint. This is an offline transform — no network.

echo ""
echo "Synthesizing import candidates from fixtures/github/*.json..."
python3 - "$GITHUB_FIXTURES_DIR" "$DEMO_FIXTURE" <<'PYEOF'
import json, sys, pathlib

github_dir = pathlib.Path(sys.argv[1])
out_path = sys.argv[2]

candidates = []
for fn in sorted(github_dir.glob("*.json")):
    data = json.loads(fn.read_text())
    for repo in data.get("repositories", []):
        count = repo.get("fake_issue_count", 1)
        for i in range(1, count + 1):
            candidates.append({
                "title": f"[{repo['name']}] fixture issue #{i}",
                "source": "github_fixture"
            })

if not candidates:
    print("error: no candidates synthesized from fixtures", file=sys.stderr)
    sys.exit(1)

pathlib.Path(out_path).write_text(json.dumps({"candidates": candidates}, indent=2))
print(f"  synthesized {len(candidates)} candidate(s) -> {out_path}")
PYEOF

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

# --- Drive store admission path ---

echo ""
echo "Step 1: bootstrap/start"
curl -sf -X POST "$DEMO_BASE/bootstrap/start" \
  -H "content-type: application/json" -d '{}' >/dev/null

echo ""
echo "Step 2: import fixtures -> store admission (offline: fixture path only)"
IMPORT_RESP="$(curl -sf -X POST "$DEMO_BASE/github/import/fixture" \
  -H "content-type: application/json" \
  --data-binary "{\"fixture_path\":\"$DEMO_FIXTURE\"}")"
echo "  response: $IMPORT_RESP"

ADMITTED="$(echo "$IMPORT_RESP" | python3 -c \
  "import json,sys; d=json.load(sys.stdin); print(d.get('admitted_to_store',0))")"
if [[ "$ADMITTED" -lt 1 ]]; then
  echo "error: no objects admitted to store (admitted_to_store=$ADMITTED)"
  exit 1
fi
echo "  admitted to store: $ADMITTED"

echo ""
echo "Step 3: planning/generate"
curl -sf -X POST "$DEMO_BASE/planning/generate" \
  -H "content-type: application/json" -d '{}' >/dev/null

echo ""
echo "Step 4: GET /next-action (read admitted object back through store)"
NEXT_RESP="$(curl -sf "$DEMO_BASE/next-action")"
echo "  response: $NEXT_RESP"

TASK_ID="$(echo "$NEXT_RESP" | python3 -c \
  "import json,sys; d=json.load(sys.stdin); print(d.get('task_id',''))")"
if [[ -z "$TASK_ID" ]]; then
  echo "error: next_action returned no task_id — admitted state not readable through store"
  exit 1
fi

echo ""
echo "PASS: admitted object readable back through store"
echo "  task_id=$TASK_ID"
echo "  admitted=$ADMITTED"
echo "  store=$DEMO_DB (ephemeral — removed on exit)"
