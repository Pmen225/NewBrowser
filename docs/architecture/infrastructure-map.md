# Infrastructure Map

## Audience

- Codex 5.3

## Fast Path

- Use `npm run dev` to run the full local stack.
- Use `npm run test:all` for the full verification sweep.

## Canonical Commands

- `npm run dev`
- `npm run test:all`
- `npm start`

## Process Order

- `npm run dev`: wait for `extension/manifest.json`, then start `npm start`.
- `npm start`: launch or attach to Chromium with the unpacked extension.
- `npm start`: start `npx --yes tsx sidecar/src/server.ts`.

## Source Of Truth

- `extension/`: **the only Assistant extension.** Edit here. Do not create another extension copy elsewhere.
- `REF DOCS/`: authored agent prompt and tool reference loaded by the sidecar prompt loader.
- `sidecar/src/`: sidecar source.
- `shared/src/`: shared runtime source.
- `web/src/`: browser-facing client helper source.
- `tests/`: verification source.
- `docs/`: documentation source.

## Generated Outputs

- `.sidecar-build/`: derived sidecar build artifacts.
- `.sidecar-traces/`: derived runtime traces.
- `output/`: derived test and automation artifacts.

## Hard Constraints

- Do not add a second Assistant extension (e.g. do not create `apps/.../source-extension/` or any other copy). The single extension lives in `extension/`.
- Do not skip the `extension/manifest.json` readiness check when reasoning about `npm run dev`.
- Do not assume `REF DOCS/` is enforced automatically; runtime alignment is implemented in `shared/src/transport.ts`, `sidecar/src/agent/orchestrator.ts`, and `sidecar/src/policy/response-validator.ts`.

## Failure Modes

- Missing extension: `extension/manifest.json` is absent before browser startup.
- Agent contract drift: `REF DOCS/` changes without matching updates in the transport parser, orchestrator, validator, or tests.

## Cross References

- Runbook: `docs/runbooks/local-development.md`
- Front-end rules: `docs/ui/frontend/design-rules.md`
- Shell vocabulary: `docs/ui/atlas-shell-contract.md`
