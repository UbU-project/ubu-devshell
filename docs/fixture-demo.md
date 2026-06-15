# Fixture Demo

The fixture demo is a public-safe dogfooding loop that uses fake data only.

Current entry point:

```sh
./scripts/run-fixture-demo.sh
```

## What the demo exercises

The demo exercises the **store-backed orchestrator path** introduced by O4
(`O4: Replace MemoryState with ubu_store admission and query boundary`).
All state flows through `ubu_store`; no in-memory (MemoryState) path is
exercised. This was the governing O4 decision: domain objects must cross
the store admission boundary on write and be read back through the store
on query — not retained in process memory.

The demo asserts:
1. At least one object is admitted to the store (`admitted_to_store >= 1`).
2. The admitted object is readable back through the store via `/next-action`
   (non-empty `task_id` in the response).

## Store isolation

The demo creates a throwaway SQLite store under a temp directory:

```
$TMPDIR/<random>/ubu-demo.db
```

`UBU_DB_PATH` is set to this path before starting the orchestrator.
Migrations run on open inside `UbuStore::connect()`. The store is removed
on exit, including on failure. No real or user store is ever touched.

## Offline operation

The demo is fully offline. It uses `/github/import/fixture` (not
`/github/import/live`), which reads a local file synthesized from
`fixtures/github/*.json`. No `GITHUB_TOKEN` is required or consulted.
The demo fails clearly if a required fixture or prerequisite (orchestrator
repo, `cargo`, `curl`, `python3`) is missing.

## Fixtures

- `fixtures/github/ubu-design-small.json`
- `fixtures/github/multi-repo-small.json`
- `fixtures/demo/phase1-demo-manifest.json`

These fixtures are intentionally small and fake. They are not canonical domain
examples and must not contain private data.

The demo synthesizes an orchestrator-format candidate list
(`{"candidates": [...]}`) from the `repositories[].fake_issue_count` fields in
`fixtures/github/*.json` and POSTs it to `/github/import/fixture` as an
absolute temp-file path.

## Prerequisites

- Local checkout of `ubu-orchestrator` (clone with `./scripts/clone-all.sh`)
- `cargo` (Rust toolchain)
- `curl`
- `python3`

## Governing decision

The state-path change (MemoryState removed, all reads and writes through
`ubu_store`) is governed by orchestrator ticket **O4**. The `UBU_DB_PATH`
config that makes the demo's throwaway store possible was introduced in O4
task 2 (`src/config.rs: add db_path() / UBU_DB_PATH`).
