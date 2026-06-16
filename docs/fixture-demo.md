# Fixture Demo

The fixture demo is a public-safe dogfooding loop that uses fake data only.

Current entry point:

```sh
./scripts/run-fixture-demo.sh
```

## What the demo exercises

The demo exercises the **full bootstrap-to-act loop** store-backed against a throwaway
SQLite store. No in-memory (MemoryState) path is exercised; all state flows through
`ubu_store`.

| Step | Endpoint | Governing decision |
|------|----------|--------------------|
| 1. Token intake | `POST /desktop/session/github-token` | O5 |
| 2. Bootstrap/seed | `POST /bootstrap/seed` | O5, O6 |
| 3. next_action (ready) | `GET /next-action?schema_version=…` | O6 |
| 4. Action recording | `POST /task/{id}/action` | O6 |
| 5. next_action (bounded diagnostic) | `GET /next-action?schema_version=…` | O6, UBU-D0210 |

### Assertions

1. Token intake returns `accepted=true` and `token_available=true`.
2. Bootstrap/seed admits at least one Objective, at least one Preference, and at least
   one Task (`imported_tasks.admitted_to_store >= 1`).
3. First `next_action` returns a recommendation with `readiness=ready` and a non-empty
   `explanation.message` (selection rule: `readiness_ordered_skeleton`).
4. Action recording returns `task_status=completed`, `transition_applied=true`, and a
   non-empty `log_id` — confirming the Task transitioned and an append-only Log event
   was admitted.
5. Second `next_action` (post-complete) returns `recommendation=null` and a non-empty
   `diagnostics` array whose first entry has a known bounded code (UBU-D0210): one of
   `no_admitted_tasks`, `no_active_tasks`,
   `all_candidates_blocked_on_unmet_dependencies`,
   `all_candidates_blocked_on_preconditions`, or `no_ready_task`.

## Offline operation and import stub

The demo is fully offline. `bootstrap/seed` internally calls `import_live`, which is a
Phase 1 stub (`source=github_live_stub`) that creates Tasks locally without making any
outbound HTTP request to GitHub. The fixture/dev token
(`"fixture-dev-token-ubu-demo"`) satisfies the token-availability check and is never
sent to the network.

The demo fails clearly if a required fixture or prerequisite (orchestrator repo,
`cargo`, `curl`, `python3`) is missing. It does not fall back to network access.

## Store isolation

The demo creates a throwaway SQLite store under a temp directory:

```
$TMPDIR/<random>/ubu-demo.db
```

`UBU_DB_PATH` is set to this path before starting the orchestrator. Migrations run on
open inside `UbuStore::connect()`. The store is removed on exit, including on failure.
No real or user store is ever touched.

## Fixtures

- `fixtures/github/ubu-design-small.json`
- `fixtures/github/multi-repo-small.json`
- `fixtures/demo/phase1-demo-manifest.json`

These fixtures are validated at startup (checked for existence and parseability). The
bootstrap/seed step uses `"UbU-project/ubu-design"` as the fixture repo; Tasks are
admitted via the `import_live` stub, not from the JSON fixture files.

## Prerequisites

- Local checkout of `ubu-orchestrator` (clone with `./scripts/clone-all.sh`)
- `cargo` (Rust toolchain)
- `curl`
- `python3`

## Governing decisions

| Decision | Scope |
|----------|-------|
| **O4** | MemoryState removed; all reads and writes through `ubu_store`; `UBU_DB_PATH` throwaway store |
| **O5** | Desktop token intake (`/desktop/session/github-token`); `bootstrap/seed` endpoint |
| **O6** | Readiness `next_action` with explanation; action recording (`/task/{id}/action`); bounded diagnostic |
| **UBU-D0210** | `next_action` must return a bounded diagnostic when no ready Task is available — not an opaque empty result |
