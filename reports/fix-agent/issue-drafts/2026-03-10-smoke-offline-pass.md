# [QA] validation-failure: smoke passes while sidecar is visibly offline

- Task name: qa:smoke connectivity + screenshot attachment
- Run ID: qa-smoke-report-20260310T232302
- Expected outcome: smoke pass should imply usable connected runtime state.
- Observed outcome: smoke report indicates attachment success, but panel screenshot shows `Reconnecting to sidecar...` / `Sidecar offline`.
- Failure classification: ui_projection_mismatch
- Likely subsystem: validation layer
- New/Recurring/Regression: recurring risk (false-positive gate pattern)
- Smallest structural fix class required: extend smoke assertions to require connected lifecycle state before/after attachment.
- Screenshots: `output/playwright/qa-smoke/panel-final.png`
- Trace/artifacts: `output/playwright/qa-smoke/report.json`, `output/qa-artifacts/manifest.json`

## 2026-03-11 runtime-improvement update

- Implemented structural fix in `scripts/run-qa-smoke.sh`:
  - added sidecar `/health` readiness gating before smoke flow starts
  - added sidecar readiness gating before and after screenshot capture
  - added explicit panel offline/reconnect DOM signal rejection during success path
- Added reusable runtime contract helper: `scripts/lib/qa-smoke-runtime.cjs`
- Added regression tests:
  - `tests/scripts/qa-smoke-runtime.spec.ts`
  - `tests/scripts/qa-automation.spec.ts` guard-presence assertion
- Current unresolved item:
  - smoke runner still shows launcher/bootstrap hangs in this environment (`qa-smoke: loading playwright-core`) and needs separate deadlock workstream (`runtime-failure`, `timeout`).
