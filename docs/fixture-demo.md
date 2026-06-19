# Fixture Demo

The fixture demo is a public-safe dogfooding loop that uses fake data only.

Current entry point:

```sh
./scripts/run-fixture-demo.sh
```

## What the demo exercises

The demo exercises the **full bootstrap-to-act loop**, the gated projection loop,
**affect legitimization**, and **Plan generation, the Compact Calendar, and
override-safe recalculation** store-backed against a throwaway SQLite store. No
in-memory (MemoryState) path is exercised; all state flows through `ubu_store`.

| Step | Endpoint | Governing decision |
|------|----------|--------------------|
| 1. Token intake | `POST /desktop/session/github-token` | O5 |
| 2. Bootstrap/seed | `POST /bootstrap/seed` | O5, O6 |
| 3. next_action (ready) | `GET /next-action?schema_version=…` | O6 |
| 4. Action recording | `POST /task/{id}/action` | O6 |
| 5. next_action (bounded diagnostic) | `GET /next-action?schema_version=…` | O6, UBU-D0210 |
| 6. Projection preview + approval | `POST /projection/preview`, `POST /projection/approve` | O7, UBU-D0226, UBU-D0230 |
| 7. Projection reconciliation | `POST /projection/reconcile` | O7 |
| 8. Projection gate deny path | `POST /projection/preview`, `POST /projection/approve` | O7, UBU-D0230 |
| 9. Affect legitimization fixtures | `POST /planning/generate` | S10, P5, O10 |
| 10. Plan import | `POST /github/import/fixture` | S9, P3 |
| 11. Plan generation + Compact Calendar + stale-affect handling | `POST /planning/generate`, `GET /calendar/current` | S9, P3, P4, O9, S10, P5, O10 |
| 12. Recalculation (task_completed) | `POST /task/{id}/action`, `POST /planning/recalculate` | S9, P3, P4, O9, UBU-D0227 |
| 13. Override-safety | `POST /task/{id}/action` (override), `POST /planning/recalculate` | S9, P3, P4, O9 |

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
6. Projection preview returns a managed-label-only operation with an accepted
   policy summary; approval returns a `projection_result` with `status=applied`,
   exactly one mock worker write, and a `compartment_boundary_decided` Log entry.
7. Reconciliation against a mock observed-label set returns `missing` or `drifted`,
   surfaces a `projection_conflict`, persists the reconciliation, and performs no
   silent overwrite.
8. The deny path sets `no_external_export`; the approved preview returns a failed
   `projection_result`, records `projection_denied`, writes no mock
   `github-label-write`, and records a `compartment_boundary_decided` denial Log.
9. Affect legitimization fixture requests
   (`fixtures/demo/affect-legitimization-cases.json`) assert:
   `feasible-enforce` returns `result=passed`, `affect_feasible=true`, and no
   `violated_dimensions`; `infeasible-enforce` returns no admitted Plan and records
   `result=failed`, `affect_feasible=false`, `violated_dimensions=["energy"]`, and a
   negative `affect_margin`; `infeasible-warn-only` records the same violation and
   negative margin without failing Plan admission.
10. The fixture import (`fixtures/demo/planning-candidates.json`) admits at least three
   active Tasks (`admitted_to_store >= 3`) without any outbound HTTP.
11. After seeding a Compact Calendar window in the throwaway store, `/planning/generate`
    returns a canonical timed Plan (`schema_version=planning-kernel-contract/0.1`,
    `status=admitted`, contiguous step indexes, non-empty summaries, valid intervals)
    whose placements all fall **inside the Calendar window** and do not overlap;
    `/calendar/current` serves the same `plan_id` and the same timed steps. The same
    store-backed generation seeds a stale live affect observation past
    `freshness_seconds` and asserts the orchestrator switches to `warn_only`, uses
    bootstrap default affect values, marks `stale_affect_warning`, and does **not**
    expose the stale observation as current measured state. (The Phase A
    `NotYetImplemented` Legitimizer advisories are tolerated; they are not failures.)
12. Completing a Task and firing `/planning/recalculate` with `task_completed` returns a
    repair-mode Plan whose `supersedes_plan_id` is the prior Plan id; the prior Plan is
    persisted as `superseded`; and the completed Task keeps its exact prior placement —
    it is **not re-placed**.
13. Applying a `user_override` placement (authority_source `user_override`) and firing a
    second `/planning/recalculate` leaves the overridden Task's placement **unchanged and
    not clobbered**; the previously completed Task likewise stays frozen.

## Offline operation and import stub

The demo is fully offline. `bootstrap/seed` internally calls `import_live`, which is a
Phase 1 stub (`source=github_live_stub`) that creates Tasks locally without making any
outbound HTTP request to GitHub. The projection loop uses the orchestrator's mock
managed-label write table and reconciliation request payloads; it does not call live
GitHub. The fixture/dev token (`"fixture-dev-token-ubu-demo"`) satisfies the
token-availability check and is never sent to the network.

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
- `fixtures/demo/planning-candidates.json`
- `fixtures/demo/affect-legitimization-cases.json`

These fixtures are validated at startup (checked for existence and parseability). The
bootstrap/seed step uses `"UbU-project/ubu-design"` as the fixture repo; its single Task
is admitted via the `import_live` stub, not from the JSON fixture files. The Plan /
Calendar / recalculation steps admit their active Tasks from
`fixtures/demo/planning-candidates.json` via `/github/import/fixture` (offline; no
outbound HTTP). The affect legitimization cases are posted directly to the loopback
orchestrator API from `fixtures/demo/affect-legitimization-cases.json`; they do not use
GitHub import or any network path outside `127.0.0.1`.

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
| **O7** | Projection preview, approval, gated managed-label mock write, reconciliation, and gate-deny path |
| **S9/P3/P4/O9** | Canonical timed Plan (`/planning/generate`), the Compact Calendar (`/calendar/current`), and repair-mode recalculation (`/planning/recalculate`) that supersedes the prior Plan while preserving frozen placements |
| **S10/P5/O10** | Affect profile contract, Phase B affect legitimization, and orchestrator affect-profile/snapshot wiring for feasible, enforce-failure, warn-only, and stale-affect paths |
| **UBU-D0210** | `next_action` must return a bounded diagnostic when no ready Task is available — not an opaque empty result |
| **UBU-D0226** | `authority_source` records the authority path for projection state; source details remain in provenance |
| **UBU-D0227** | Persisted `Task.status` lifecycle (`active`/`completed`/`failed`/`moot`) governs which Tasks are frozen and not re-placed on recalculation |
| **UBU-D0230** | Policy-summary guardrails (`local_only`, `no_cloud_llm`, `no_external_export`) and `compartment_boundary_decided` Log vocabulary |
