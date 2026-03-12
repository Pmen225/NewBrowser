# [runtime-failure] comet transcript funnels deadlock before completion

- Task: `comet-transcript-funnels`
- Run ID: `fix-agent-20260311010321-comet-transcript-funnels`
- Expected outcome: async/tab-context funnels complete with deterministic assertions.
- Observed outcome: process timed out (`SIGTERM`, `spawnSync npx ETIMEDOUT`) before any terminal suite result.
- Failure classification: `completion_deadlock`
- Likely subsystem: `runtime lifecycle`
- Status: recurring
- Smallest structural fix class: add per-funnel state heartbeat + fail-fast watchdog for stuck async/tool status transitions.

## Evidence
- Run artifact: `output/playwright/automation-fix-agent/comet-transcript-funnels.json`
- Summary record: `output/playwright/automation-fix-agent/summary.json`
- Artifact manifest: `output/qa-artifacts/manifest.json`

## Screenshots / traces
- Fresh screenshot from this run: none.
- Fresh trace from this run: none observed in run window.

## Runtime/UI divergence note
Because the suite never reached DOM-assertion checkpoints, runtime state cannot be reconciled against visible page state in this run.
