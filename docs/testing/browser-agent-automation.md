# Browser-Agent Automation Entrypoints

This repository now exposes one stable command per recurring browser-agent QA automation step.

## Canonical Commands

| Purpose | Command | Backing entrypoint | Outputs |
|---|---|---|---|
| Smoke verification | `npm run qa:smoke` | `scripts/run-qa-smoke.sh`, derived from `tests/playwright/screenshot-qa.spec.ts` | `output/playwright/qa-smoke/report.json` and `output/playwright/qa-smoke/panel-final.png` |
| Regression verification | `npm run qa:regression` | `npm run test:funnels` | Funnel screenshots and Playwright failures from `tests/playwright/funnels/*.spec.ts` |
| Trace generation | `npm run qa:trace` | `scripts/live-cdp-panel-check.mjs` | `report.json`, `panel-final.png`, `site-final.png`, plus `.sidecar-traces/<run-id>/trace.jsonl` when sidecar tracing is enabled |
| Artifact collection | `npm run qa:artifacts` | `scripts/collect-qa-artifacts.mjs` | `output/qa-artifacts/manifest.json` |

## Current Entrypoint Mapping

- Current smoke test entrypoint in the repo: `tests/playwright/screenshot-qa.spec.ts`.
  - The standardized automation command is `scripts/run-qa-smoke.sh` so smoke reruns do not depend on Vitest worker behavior.
  - The scenario is still the existing screenshot QA flow: open a real page, open the extension panel, capture a screenshot, and verify the attachment chip appears.
  - The smoke command now runs a phased Playwright bootstrap probe before loading any headed runtime path and fails fast with phase diagnostics (`resolve-playwright`, `load-playwright-core`, `load-playwright`) when Playwright import deadlocks.
  - Bootstrap probe failures are now cached at `output/playwright/.runtime/playwright-bootstrap-cache.json` for a short TTL so repeated commands fail fast with the same authoritative classification instead of repeatedly consuming timeout budget.
    - Override path with `PLAYWRIGHT_BOOTSTRAP_CACHE_PATH`.
    - Override TTL with `PLAYWRIGHT_BOOTSTRAP_CACHE_TTL_MS`.
    - Disable caching with `PLAYWRIGHT_BOOTSTRAP_CACHE_DISABLE=1`.
  - The smoke gate now includes runtime-readiness validation using sidecar `/health`:
    - preflight requires sidecar readiness (`ok`, `mode=cdp`, `extension_loaded=true`)
    - runtime phase requires at least one attached tab before and after screenshot capture
    - panel DOM must not show reconnect/offline signals when reporting success
- Current regression contract: `test:funnels` remains the broader browser-agent regression surface.
  - Regression startup now uses `tests/playwright/helpers/funnels-bootstrap-global-setup.ts` to run a loopback-bind preflight first (fast `listen` capability check with explicit classification) and then the phased Playwright bootstrap probe.
  - When local bind is restricted, regression now fails immediately with `classification=loopback_bind_permission_failure` instead of consuming bootstrap timeout budget before surfacing environment constraints.
- Current trace runner: `live-cdp-panel-check` remains the live CDP entrypoint and is now reachable through `qa:trace`.

## Artifact Contract

`npm run qa:artifacts` writes a single manifest at `output/qa-artifacts/manifest.json` with:

- `generatedAt`
- `root`
- `outputFile`
- `roots[]`
  - `key`
  - `path`
  - `exists`
  - `fileCount`
- `files[]`

The manifest inventories both repo-local QA outputs:

- `output/`
- `.sidecar-traces/`

## Failure Labels

Recurring QA should classify failures with exactly one of these labels:

- `runtime-failure`
- `perception-failure`
- `validation-failure`
- `transport-sync-failure`
- `recovery-failure`
- `premature-completion`

## Issue Templates

Use the matching template under `.github/ISSUE_TEMPLATE/` for the chosen label:

- `runtime-failure.md`
- `perception-failure.md`
- `validation-failure.md`
- `transport-sync-failure.md`
- `recovery-failure.md`
- `premature-completion.md`

Each template requires:

- expected result
- actual result
- reproduction command
- artifact and trace paths
- smoke rerun verification using `npm run qa:smoke`

## Fix Automation Contract

When a QA issue is being fixed, the verification gate is always:

1. Apply the fix.
2. Rerun `npm run qa:smoke`.
3. Run `npm run qa:artifacts` if the smoke suite fails or if evidence needs to be attached.
4. Close the issue only when the smoke rerun passes.

## Notes

- `npm run qa:regression` is the scheduled broader suite.
- `npm run qa:smoke` is the required post-fix rerun.
- `npm run qa:trace` is the live diagnostic path when the automation needs panel and site screenshots plus `report.json`.
