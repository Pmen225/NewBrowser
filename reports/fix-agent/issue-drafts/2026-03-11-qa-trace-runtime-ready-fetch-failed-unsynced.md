# UNSYNCED BACKUP - [runtime-failure] qa:trace sidecar runtime-readiness preflight fails (fetch failed)

GitHub sync status: `network_failure` with concurrent `auth_failure`.
This is a temporary local backup because GitHub sync failed with command evidence.

## Failure record
- Task name: `qa:trace`
- Run ID: `fix-agent-20260311T101518Z-clean`
- Expected outcome: live CDP panel check reaches runtime-ready sidecar, then emits `report.json`, `panel-final.png`, and `site-final.png` for this run.
- Observed outcome: exits `1` at readiness gate:
  - `Assistant sidecar did not become runtime-ready at http://127.0.0.1:3210/health within 15000ms (fetch failed).`
- Dominant failure classification: `transport_sync_failure`
- Likely subsystem: `runtime lifecycle`
- Recurrence/regression: recurring (newly observed variant vs prior `spawn EPERM` variant)
- Smallest structural fix class required: harden sidecar startup/reconnect path so `/health` reaches runtime-ready before trace entrypoint attaches.

## Evidence
- `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/05.meta`
- `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/05.stdout`
- `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/05.stderr`
- Latest historical artifacts only (not produced by this failing rerun):
  - `output/playwright/live-cdp-panel-check/report.json`
  - `output/playwright/live-cdp-panel-check/panel-final.png`
  - `output/playwright/live-cdp-panel-check/site-final.png`

## Runtime/UI/page coherence note
Runtime/UI/page agreement cannot be assessed for this run because the flow failed before browser/panel post-condition checks and before new screenshots were generated.

## GitHub sync failure evidence
- Failed command: `gh auth status`
  - exit code: `1`
  - stderr excerpt: `The token in default is invalid.`
- Failed command: `gh repo view`
  - exit code: `1`
  - stderr excerpt: `error connecting to api.github.com`
- Failed command: `gh issue list --state all --limit 200`
  - exit code: `1`
  - stderr excerpt: `error connecting to api.github.com`
- Retry command: `GH_DEBUG=api gh issue list --state all --limit 200`
  - exit code: `1`
  - stderr excerpt: `lookup api.github.com: no such host`
- Connectivity check: `curl -I https://api.github.com`
  - exit code: `6`
  - stderr excerpt: `Could not resolve host: api.github.com`
- Raw logs:
  - `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/github-sync/gh_auth_status.stderr.log`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/github-sync/gh_repo_view.stderr.log`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/github-sync/gh_issue_list.stderr.log`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/github-sync/gh_issue_list_debug.stderr.log`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/github-sync/curl_api_head.stderr.log`

## 2026-03-11 rerun evidence (`fix-agent-20260311T110200Z-live`)
- Task name: `qa:trace`
- Run ID: `fix-agent-20260311T110200Z-live`
- Expected outcome: live CDP panel trace reaches runtime-ready sidecar and emits this run's `report.json` + screenshots.
- Observed outcome: exits `1` at runtime readiness gate:
  - `Assistant sidecar did not become runtime-ready at http://127.0.0.1:3210/health within 15000ms (fetch failed).`
- Dominant failure classification: `transport_sync_failure`
- Likely subsystem: `runtime lifecycle`
- Recurrence/regression: recurring
- Smallest structural fix class required: stabilise sidecar startup/reconnect so `/health` reaches runtime-ready before trace flow starts.

### Evidence (this rerun)
- `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/05r.meta`
- `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/05r.stdout`
- `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/05r.stderr`
- Screenshot references: none produced in this run by `qa:trace`.
- Trace references: no new task-specific trace artefact created for this failed run.

### GitHub sync failure evidence (this rerun)
- `gh auth status` -> exit `1` (`The token in default is invalid.`)
- `gh repo view` -> exit `1` (`error connecting to api.github.com`)
- `gh issue list --state all --limit 200` -> exit `1` (`error connecting to api.github.com`)
- `GH_DEBUG=api gh issue list --state all --limit 200` -> exit `1` (`lookup api.github.com: no such host`)
- `curl -I https://api.github.com` -> exit `6` (`Could not resolve host: api.github.com`)
- Raw logs: `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/github-sync/`

## Current sync status
- This remains an UNSYNCED local backup.
- No GitHub issue create or update was proven for this rerun because the required GitHub command sequence failed with `auth_failure` plus `network_failure`.

## Sync backfill status - 2026-03-11T11:33:00Z
- Backfilled to GitHub successfully after connectivity recovered.
- This local draft is secondary only.

## 2026-03-11 runtime-improvement update (loopback preflight truth in qa:trace)
- Code changes:
  - `scripts/live-cdp-panel-check.mjs`
    - `ensureSidecarRuntimeReady(...)` now runs `assertLoopbackBindReady` when runtime health is unreachable on loopback hosts.
    - unreachable runtime + failed loopback preflight now throws explicit classified error:
      - `SIDECAR_RUNTIME_LOOPBACK_BLOCKED`
      - includes `loopback_bind_permission_failure` detail in message.
  - `tests/scripts/live-cdp-panel-check.spec.ts`
    - added regression test proving loopback classification is surfaced and managed-sidecar start is skipped when preflight is blocked.

- Verification:
  1. `npx vitest run tests/scripts/live-cdp-panel-check.spec.ts --reporter=verbose`
     - Result: **pass** (`9/9`)
  2. `npx vitest run tests/scripts/qa-automation.spec.ts --reporter=dot --no-file-parallelism`
     - Result: **pass** (`8/8`)
  3. `npm run qa:trace`
     - Result: **fail** before runtime readiness due `process_inspection_permission_failure` (`spawn EPERM`) while resolving CDP URL.
  4. `LIVE_CDP_WS_URL=ws://127.0.0.1:9555/devtools/browser/mock npm run qa:trace`
     - Result: **fail** with new classified loopback runtime truth:
       - `Assistant sidecar runtime is unreachable ... loopback_bind_permission_failure; code=EPERM`

- Status:
  - **partially fixed**
  - Reduced failure-class ambiguity for `qa:trace` when sidecar health is unreachable on loopback.
  - Not fixed: environment still blocks CDP process inspection (`spawn EPERM`) and loopback bind (`listen EPERM`), so headed trace completion remains blocked here.
