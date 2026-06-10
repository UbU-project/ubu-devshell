# Contract

`ubu-devshell` is a harness and workflow repository.

It may contain:

- Public repository references
- Local development scripts
- Fake demo fixtures
- Generated local override helpers
- Documentation for local development and public artifact creation

It must not contain:

- Canonical schema definitions
- Planner or domain logic
- Production deployment tooling
- Private fixtures or credentials
- Source-of-truth API contracts

Contract changes belong in the relevant Phase 1 repository. This repository can
track tasks and local workflow glue for those changes, but it is not the
contract owner.
