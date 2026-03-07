# Local Development Runbook

## Audience

- Codex 5.3

## Fast Path

- `npm run dev`
- `npm run test:all`

## Required Preconditions

- Node.js and `npm` are installed.
- Dependencies are installed with `npm install`.
- A Chromium binary is available or `NEW_BROWSER_BROWSER_BINARY` is set.
- `NEW_BROWSER_EXTENSION_PATH`, `CHROME_CDP_WS_URL`, and `CHROME_CDP_PORT` are optional overrides only.

## Canonical Commands

- `npm run dev`
- `npm run test:all`
- `npm start`
- `npm run test`
- `npx vitest run tests/transport.parsers.spec.ts tests/agent/orchestrator.spec.ts tests/policy/response-validator.spec.ts`

## Command Effects

- `npm run dev`: wait for `extension/manifest.json`, then start the sidecar launcher.
- `npm run test:all`: run the full root Vitest suite.
- `npm start`: run the sidecar launcher (loads extension from `extension/`).
- `npm run test`: run the root Vitest suite.
- `npx vitest run tests/transport.parsers.spec.ts ...`: run the focused backend agent contract checks.

## Hard Constraints

- Run root commands from the repository root.
- The only Assistant extension is `extension/`. Do not create another copy elsewhere.
- Do not assume a browser can be auto-discovered.

## Failure Modes

- Missing browser binary: the launcher cannot find an executable Chromium binary.
- Extension not loading: `extension/` is missing or rejected by the browser profile.

## Recovery Steps

- Missing browser binary: set `NEW_BROWSER_BROWSER_BINARY=/absolute/path/to/Chromium` and rerun `npm run dev`.
- Extension not loading: ensure `extension/manifest.json` and required files exist, then rerun `npm start`.
- Existing CDP session is required: set `CHROME_CDP_WS_URL=<ws-url>` and run `npm start`.
