# Codegen Task: UI API Client

## Governing Decisions

Vocabulary changes in this area are governed by:
UBU-D0226, UBU-D0227, UBU-D0228, UBU-D0229, UBU-D0230.
Cite the relevant decision ID in any PR that touches API surface vocabulary.

## Source

Pinned local source: `ubu-orchestrator/openapi/openapi.generated.json`

## Output

Target: `ubu-ui/src/api/generated`

## Notes

- No network fetch.
- Re-run through `ubu-devshell/scripts/generate-ui-api-client.sh`.
- Verify the generated client in the UI repository.
