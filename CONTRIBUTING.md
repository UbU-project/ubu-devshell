# Contributing

This repository is public and intentionally small. Contributions should keep it
focused on local Phase 1 development workflows.

## Guidelines

- Keep scripts shell-first and easy to audit.
- Do not add private data, secrets, or credential assumptions.
- Do not add domain semantics, canonical schemas, or planner logic.
- Prefer pinned local sources for generated artifacts.
- Keep generated Cargo patch files out of Git.

## Checks

Run:

```sh
bash -n scripts/*.sh
./scripts/check-all.sh
./scripts/test-all.sh
```

If `shellcheck` is available, run it too:

```sh
shellcheck scripts/*.sh
```
