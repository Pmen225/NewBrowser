# Runtime QA / Failure Intelligence Report

- Run ID: `fix-agent-20260311T120221Z-live`
- Timestamp (UTC): `2026-03-11T12:08:15Z`
- Evidence root: `output/playwright/automation-fix-agent/fix-agent-20260311T120221Z-live`
- Outcome: **degraded** (5 failed, 1 passed)

## Tasks executed
1. `npm run qa:smoke`
2. `npx vitest run tests/playwright/funnels/panel-stop-state.spec.ts --reporter=basic`
3. `npx vitest run tests/playwright/funnels/panel-image-attachments.spec.ts --reporter=basic`
4. `npx vitest run tests/playwright/funnels/comet-transcript-funnels.spec.ts --reporter=basic`
5. `npm run qa:trace`
6. `npm run qa:artifacts`

## Evidence-backed outcomes
- `qa:smoke`: **failed**
  - Expected: headed smoke flow launches, panel captures screenshot attachment, sidecar remains online.
  - Observed: `PlaywrightBootstrapError` with `classification=runtime_bootstrap_timeout`, `phase=load-playwright-core`, `code=ETIMEDOUT`.
  - Failure class: `completion_deadlock`
  - Likely subsystem: `runtime lifecycle`
  - Screenshots/traces: none generated in this run (failure pre-bootstrap).

- `panel-stop-state`: **failed** (5/5 tests)
  - Expected: stop/pause/resume/navigation/admin flows execute and assert panel states.
  - Observed: each test aborted at loopback bind preflight with `classification=loopback_bind_permission_failure`, `code=EPERM`, `detail=listen EPERM`.
  - Failure class: `actionability_failure`
  - Likely subsystem: `capability primitive/tool layer`
  - Screenshots/traces: none generated in this run (server bind failed before UI flow).

- `panel-image-attachments`: **failed** (2/2 tests)
  - Expected: screenshot attachments are sent in `AgentRun` payload and preserved across follow-up turns.
  - Observed: fixture server bind failed with `classification=loopback_bind_permission_failure`, `code=EPERM`.
  - Failure class: `actionability_failure`
  - Likely subsystem: `capability primitive/tool layer`
  - Screenshots/traces: none generated in this run.

- `comet-transcript-funnels`: **failed runtime subtest** (1 failed, 1 passed)
  - Expected: runtime transcript funnel executes through real extension panel UI.
  - Observed: runtime subtest aborted at fixture bind with `classification=loopback_bind_permission_failure`, `code=EPERM`.
  - Failure class: `actionability_failure`
  - Likely subsystem: `capability primitive/tool layer`
  - Screenshots/traces: none generated in this run.

- `qa:trace`: **failed**
  - Expected: live CDP panel check resolves websocket URL and completes visible panel flow.
  - Observed: CDP resolution failed at process inspection with `classification=process_inspection_permission_failure`, `code=EPERM`, `message=Unable to inspect running Chromium processes via ps. spawn EPERM`.
  - Failure class: `transport_sync_failure`
  - Likely subsystem: `transport/sync`
  - Screenshots/traces: none generated in this run (abort during CDP discovery preflight).

- `qa:artifacts`: **passed**
  - Expected: artefact manifest generated.
  - Observed: `output/qa-artifacts/manifest.json` written.

## Runtime/UI truth alignment
- `qa:smoke`, funnels, and `qa:trace` failed before actionable UI checkpoints; no trustworthy post-action UI/DOM verification was possible in this run.
- No valid runtime/UI disagreement could be observed because flows aborted pre-interaction.

## Dominant failure classes this run
- `actionability_failure`
- `completion_deadlock`
- `transport_sync_failure`

## GitHub sync status
- Primary sync status: **degraded**
- Classification: `auth_failure` + `network_failure`
- Reason: all required GitHub commands failed in this run and DNS resolution to `api.github.com` failed.
- Action taken: updated UNSYNCED local backups as temporary secondary records.

## Key evidence files
- `output/playwright/automation-fix-agent/fix-agent-20260311T120221Z-live/qa_smoke.log`
- `output/playwright/automation-fix-agent/fix-agent-20260311T120221Z-live/panel_stop_state.log`
- `output/playwright/automation-fix-agent/fix-agent-20260311T120221Z-live/panel_image_attachments.log`
- `output/playwright/automation-fix-agent/fix-agent-20260311T120221Z-live/comet_transcript_funnels.log`
- `output/playwright/automation-fix-agent/fix-agent-20260311T120221Z-live/qa_trace.log`
- `output/playwright/automation-fix-agent/fix-agent-20260311T120221Z-live/qa_artifacts.log`
- `output/playwright/automation-fix-agent/fix-agent-20260311T120221Z-live/step-status.tsv`
- `output/playwright/automation-fix-agent/fix-agent-20260311T120221Z-live/github-sync/*.stdout.log`
- `output/playwright/automation-fix-agent/fix-agent-20260311T120221Z-live/github-sync/*.stderr.log`
- `output/playwright/automation-fix-agent/fix-agent-20260311T120221Z-live/github-sync/*.exitcode`
