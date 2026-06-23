# Codegen

This repository coordinates local, public-safe code generation workflows across
Phase 1 repositories.

The harness only generates or copies derived artifacts from pinned local
sources. It does not fetch schemas, OpenAPI files, or generated clients from
the network.

Primary commands:

```sh
./scripts/generate-ui-api-client.sh          # copy pinned OpenAPI file into ubu-ui
./scripts/generate-ui-api-client.sh --from-server  # fetch from running orchestrator
./scripts/generate-ui-schema-types.sh        # copy pinned TS types into ubu-ui
./scripts/generate-codegen-issues.sh         # write issue drafts under artifacts/
./scripts/generate-public-artifacts.sh       # write public-safe artifact package
```

## Prerequisites

Both generation scripts require local checkouts of their source repos:

| Script | Needs |
|---|---|
| `generate-ui-api-client.sh` | `ubu-orchestrator` with `openapi/openapi.generated.json` present, and `ubu-ui` |
| `generate-ui-schema-types.sh` | `ubu-schemas` with TypeScript output generated, and `ubu-ui` |

Clone all repos first if needed:

```sh
./scripts/clone-all.sh
```

Scripts fail clearly when prerequisites are missing. No private credentials
are required.

See [docs/codegen-workflow.md](docs/codegen-workflow.md) for full details
including environment variable overrides.

## Governing Decisions

Generated issue text must cite governing decision IDs when touching
vocabulary. The current governing decisions for Phase 1 vocabulary are:

- **UBU-D0226** through **UBU-D0230**

Any PR that adds, renames, or removes fields in the generated API client or
schema types must reference the relevant decision ID from this range in the
PR description and in the generated issue draft.

The fixture smoke test (`scripts/run-fixture-demo.sh`) exercises the full
**bootstrap-to-act loop**, the gated projection loop, and **Plan generation,
the Compact Calendar, and override-safe recalculation** store-backed against a
throwaway SQLite store. It also runs an offline `UniverseState` facts-container
smoke over local `ubu-core`/`ubu-store` crates:

1. Token intake — `/desktop/session/github-token` (O5)
2. Bootstrap/seed — `/bootstrap/seed` admits Objectives, Preferences, and Tasks (O5/O6)
3. `next_action` — asserts a ready Task with a non-empty readiness explanation (O6)
4. Action recording — `/task/{id}/action` with `complete`; asserts `task_status=completed`
   and an append-only Log event admitted (O6)
5. `next_action` again — asserts the bounded empty/blocked diagnostic (UBU-D0210, O6)
6. Projection preview and approval — `/projection/preview` then `/projection/approve`;
   asserts an applied `projection_result`, a mock managed-label write, and a
   `compartment_boundary_decided` Log entry (O7, UBU-D0226, UBU-D0230)
7. Projection reconciliation — `/projection/reconcile`; asserts `missing` or `drifted`
   plus a surfaced conflict and no silent overwrite (O7)
8. Projection deny path — approved preview with `no_external_export`; asserts no mock
   `github-label-write`, rejected legitimization, and a denial Log entry (O7, UBU-D0230)
9. Plan import — `/github/import/fixture` admits multiple active Tasks from an offline
   fixture (`fixtures/demo/planning-candidates.json`) (S9/P3)
10. Canonical timed Plan + Compact Calendar — seeds a Compact Calendar window in the
    throwaway store, then `/planning/generate` produces a canonical timed Plan and
    asserts every placement is inside the Calendar window and non-overlapping;
    `/calendar/current` serves the same timed steps (S9/P3/P4/O9)
11. Recalculation — completes a Task, then `/planning/recalculate` with
    `task_completed`; asserts a repair-mode Plan that supersedes the prior Plan
    (`supersedes_plan_id` set, prior persisted as `superseded`) and that the completed
    Task is **not re-placed** (UBU-D0227 lifecycle freeze; S9/P3/P4/O9)
12. Override-safety — applies a `user_override` placement via `/task/{id}/action`, fires
    a second recalculation, and asserts the override placement **survives unchanged and
    is not clobbered** (S9/P3/P4/O9)
13. C-1 scoring and selection — fixed-seed offline fixtures assert two-to-sixteen scored
    candidates with `score_summary` and `candidate_role`, descending `total_score`
    ranking, different utility-heavy and schedule-diversity-heavy winners, rank-1
    Compact Calendar selection, and `reject_obvious` pruning before scoring
    (C-1/P7/P8/O12)
14. D12 stochastic rollout — `shifted_lognormal_p95` request fixtures assert full
    Wilson probability intervals, p10 robustness, fixed-seed reproducibility, a
    rollout-grounded re-rank with all sixteen candidates retained, correlated-versus-
    independent probability change, and the zero-rollout `not_estimated` C-1 proxy
    (`UBU-D0239`, P10, O14)
15. D13 derived reports — designed offline fixtures assert deadline, affect-margin,
    destructive-pressure, and recommendation-path skeleton findings; bounded
    human-complete plan-quality signals; model-cause-only failure patterns; and the
    blocking-risk Calendar staleness/recalculation path (`UBU-D0240`, O15, S14)
16. D14 UniverseState semantics — designed offline fixtures admit and read back a
    four-collection `UniverseState`, apply all seven mutation operations, reject an
    invalid mutation list without partial application, and evaluate preconditions
    over `equals`, `member_of`, and `absent` (`UBU-D0241`)

Governing decisions:
- **O4**: MemoryState removed; `UBU_DB_PATH` throwaway store
- **O5**: desktop token intake and `bootstrap/seed` endpoint
- **O6**: readiness `next_action` with explanation; action recording; bounded diagnostics
- **UBU-D0210**: selection rule that `next_action` must always return a bounded diagnostic
  (not an opaque empty result) when no ready Task is available
- **O7**: projection preview, approval, gated managed-label mock write, reconciliation,
  and gate-deny path
- **S9/P3/P4/O9**: canonical timed Plan (`/planning/generate`), the Compact Calendar
  (`/calendar/current`), and repair-mode recalculation (`/planning/recalculate`) that
  supersedes the prior Plan while preserving frozen placements
- **C-1/P7/P8/O12**: bounded candidate generation, Stage 3 scoring,
  semi-legitimization pruning, ranked candidates, and composite rank-1 selection
- **D12/UBU-D0239/P10/O14**: stochastic durations and correlation groups traverse
  `/planning/generate`; the demo verifies API-reachable rollout behavior. Degraded and
  strict factorization branches remain kernel-unit coverage only: the §7 loading cap
  (`0.95`) and residual diagonal (`>= 0.0975`) make valid API matrices positive-definite
  by construction. No raw-matrix or force-degrade request field is part of the contract.
- **UBU-D0226**: `authority_source` is the authority-path enum used by projection state
- **UBU-D0227**: persisted `Task.status` lifecycle (`active`/`completed`/`failed`/`moot`)
  governs which Tasks are frozen and not re-placed on recalculation
- **UBU-D0230**: policy-summary guardrails and `compartment_boundary_decided` Log
  vocabulary
- **UBU-D0240**: derived risk and human-complete plan-quality reports, including
  blocking-risk recalculation and Calendar staleness
- **UBU-D0241**: `UniverseState` four-collection facts container, mutation
  applicator, and precondition evaluator

## Standing Boundary Diagnostics

`scripts/check-all.sh` and `scripts/test-all.sh` run the cap-74 hard-boundary
diagnostics on every contributor run:

- the `ubu_core` export-gate property checks for deny-by-default behavior,
  worker-authority gating, and redaction-identity export-boundary behavior;
- the `ubu_orchestrator` bypass-resistance and worker-authority checks for the
  projection export path;
- a static guard that fails if `apply_mock_managed_label_write` gains an
  ungated call site outside the core export-permit path;
- `scripts/run-fixture-demo.sh`, including the projection gate deny path.

These checks are governed by **UBU-D0226** for authority paths
(`authority_source`, including `automation_worker`) and **UBU-D0230** for the
Compartment policy guardrails (`local_only`, `no_cloud_llm`,
`no_external_export`) and `compartment_boundary_decided` vocabulary.

See `docs/fixture-demo.md` for the full demo description.
