# Runtime QA Report - 2026-03-11T08:57:11Z

- Automation ID: `fix-agent`
- Run ID: `fix-agent-20260311T085711Z`
- Window (UTC): `2026-03-11T08:57:11Z` -> `2026-03-11T09:00:50Z`
- Overall outcome: `degraded`

## Plan
- Rerun core smoke every pass.
- Rerun the same high-value funnel subset while the failure signature is still unstable.
- Sync recurring failures to existing GitHub issues instead of creating duplicates.

## Tests
- `npm run qa:smoke` -> failed
- `panel-stop-state` -> failed
- `panel-image-attachments` -> failed
- `comet-transcript-funnels` -> failed
- `npm run qa:trace` -> failed
- `npm run qa:artifacts` -> passed

## Implementation
- No product code changes.
- Updated GitHub issues with new recurring evidence:
  - [#38](https://github.com/Pmen225/NewBrowser/issues/38)
  - [#39](https://github.com/Pmen225/NewBrowser/issues/39)

## Verification
- `qa-smoke` and all three funnel specs failed with the same `PlaywrightBootstrapError`:
  - `classification=runtime_bootstrap_timeout`
  - `phase=load-playwright-core`
  - `code=ETIMEDOUT`
- `qa:trace` reached visible runtime state:
  - connected to CDP
  - resolved extension id
  - loaded target page
  - panel composer visible
  - then failed with `ECONNREFUSED 127.0.0.1:3210`
- `qa:artifacts` generated `output/qa-artifacts/manifest.json`

## PR note
- Summary: another rerun confirmed the same two failure groups and synced recurrence evidence to the existing GitHub issues.
- Risks: smoke/funnel coverage remains blocked by bootstrap deadlock, and trace remains blocked by sidecar transport refusal despite visible browser/panel readiness.
- Tradeoffs: kept the task loop focused on high-signal recurrence evidence instead of widening coverage while the current blockers still dominate.
- Rollback plan: revert only this report if needed; no runtime code changed.

