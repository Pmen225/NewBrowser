# [runtime-failure] qa-smoke deadlock before bootstrap completion

- Task: `qa-smoke`
- Run ID: `fix-agent-20260311010321-qa-smoke`
- Expected outcome: smoke completes screenshot attach flow and exits with report.
- Observed outcome: process timed out (`SIGTERM`, `spawnSync npm ETIMEDOUT`) before completion.
- Failure classification: `completion_deadlock`
- Likely subsystem: `capability primitive/tool layer`
- Status: recurring
- Smallest structural fix class: add deterministic startup timeout/diagnostic checkpoints around Playwright-core bootstrap and context launch.

## Evidence
- Run artifact: `output/playwright/automation-fix-agent/qa-smoke.json`
- Summary record: `output/playwright/automation-fix-agent/summary.json`
- Artifact manifest: `output/qa-artifacts/manifest.json`

## Screenshots / traces
- Fresh screenshot from this run: none (deadlock before capture).
- Fresh trace from this run: none observed under `.sidecar-traces` in run window.

## Notes
Deadlock occurs before smoke reaches actionable UI checkpoints, blocking validation of runtime/UI coherence in this cycle.
