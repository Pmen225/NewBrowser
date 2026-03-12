# Runtime QA / Failure Intelligence Report
Date: 2026-03-10
Automation ID: fix-agent

## Stage 1 - Understand and define
Objective: verify whether the browser-agent runtime can complete core smoke and high-value runtime flows with evidence-backed outcomes and coherent UI/runtime state.

Public interfaces and data shapes:
- Smoke command: `npm run qa:smoke` (currently resolves to `bash scripts/run-qa-smoke.sh`)
- Funnel tests: `npx vitest run tests/playwright/funnels/panel-stop-state.spec.ts --reporter=verbose`, `npx vitest run tests/playwright/funnels/panel-image-attachments.spec.ts --reporter=verbose`
- Run records: `output/playwright/automation-fix-agent/*.json`
- Smoke output: `output/playwright/qa-smoke/report.json`, `output/playwright/qa-smoke/panel-final.png`
- Artifact manifest: `output/qa-artifacts/manifest.json`

Edge cases and failure modes considered:
- Browser launch deadlock/timeouts before test assertions execute
- Runtime/UI divergence where smoke criteria pass while UI state is degraded
- Missing trace/run-id emission from timed-out runs
- Network-unavailable issue tracker sync

Minimal module list:
- `scripts/run-qa-smoke.sh`
- `tests/playwright/funnels/panel-stop-state.spec.ts`
- `tests/playwright/funnels/panel-image-attachments.spec.ts`
- `scripts/collect-qa-artifacts.mjs`
- `output/playwright/automation-fix-agent/*.json`

## Stage 2 - Test design
Happy path checks:
- Smoke should launch extension, capture screenshot attachment, and write `report.json` + `panel-final.png`.
- Funnel suites should complete and report pass/fail assertions.

Failure path checks:
- Timeout-guard every command and classify deadlocks separately from assertion failures.
- Capture stdout/stderr even when runs terminate.

Recovery path checks:
- Include `panel-stop-state` funnel because it exercises cancelled/interrupted/pause-resume control paths.

Counterpart controls:
- `panel-stop-state` explicitly covers stop/pause/resume/interrupt lifecycle.

## Stage 3 - Implement
Executed timeout-controlled run harness and persisted evidence:
- `output/playwright/automation-fix-agent/qa-smoke.json`
- `output/playwright/automation-fix-agent/panel-stop-state.json`
- `output/playwright/automation-fix-agent/panel-image-attachments.json`
- `output/playwright/automation-fix-agent/summary.json`

Collected artifact inventory:
- `npm run qa:artifacts` -> `output/qa-artifacts/manifest.json` (generated at 2026-03-10T23:53:01.711Z)

## Stage 4 - Functional verification

### Task 1: core smoke (this run)
Run ID: `fix-agent-20260310-smoke-timeout`
- Expected: smoke reaches panel interaction and exits with pass/fail assertion result.
- Observed: timed out after 180s; process killed (`SIGTERM`, `spawnSync npm ETIMEDOUT`) before completion.
- Evidence: `output/playwright/automation-fix-agent/qa-smoke.json`
- Classification: `completion_deadlock`
- Likely subsystem: `capability primitive/tool layer`
- Smallest fix class: deterministic launch watchdog + early crash telemetry around Playwright bootstrap.

### Task 2: stop-state funnel
Run ID: `fix-agent-20260310-panel-stop-timeout`
- Expected: complete lifecycle-state tests (cancel, pause/resume, interrupted run rendering).
- Observed: timed out after 300s with no assertion output (`SIGTERM`, `spawnSync npx ETIMEDOUT`).
- Evidence: `output/playwright/automation-fix-agent/panel-stop-state.json`
- Classification: `completion_deadlock`
- Likely subsystem: `runtime lifecycle`
- Smallest fix class: test-run liveness probes + fail-fast checkpoint logs before first scenario step.

### Task 3: image-attachments funnel
Run ID: `fix-agent-20260310-panel-image-attachments-timeout`
- Expected: run attachment flow and verify image payload / chat-history behavior.
- Observed: Vitest runner starts but suite never finishes within 300s (`SIGTERM`, `spawnSync npx ETIMEDOUT`).
- Evidence: `output/playwright/automation-fix-agent/panel-image-attachments.json`
- Classification: `completion_deadlock`
- Likely subsystem: `runtime lifecycle`
- Smallest fix class: suite-level deadline instrumentation + isolated teardown guard for persistent contexts.

## Stage 5 - Real-world visible verification
Visible artifact inspected:
- `output/playwright/qa-smoke/panel-final.png` (mtime 2026-03-10T23:23:02)

Expected outcome:
- smoke success should represent a usable runtime state for agent interaction.

Observed:
- screenshot shows `Reconnecting to sidecar...` and `Sidecar offline. Start local dev, then reconnect.` while also showing `screenshot.png` attachment chip and success toast.

Gate answers:
- Expected outcome: smoke pass should indicate runtime usable state.
- Did it do that: no.
- If no, why not: smoke criteria currently validate attachment creation but not runtime connectivity/readiness.
- Anything else off: yes. Pass signal can be emitted while the primary runtime is visibly offline (state coherence risk).

Failure classification for this evidence:
- Run ID: `qa-smoke-report-20260310T232302`
- Classification: `ui_projection_mismatch`
- Likely subsystem: `validation layer`
- Smallest fix class: add mandatory connected-state assertion before/after attachment step in smoke.

## Stage 6 - Product quality review
Important quality risks found:
1. Completion deadlocks across all newly executed flows prevented reliable verdicts.
2. Existing smoke pass artifact demonstrates runtime/UI incoherence (offline sidecar but pass outcome).
3. Current smoke gate can produce false confidence and hide runtime unavailability regressions.

## Stage 7 - Final completion
Plan:
1. Run smoke every cycle with timeout guard and raw command capture.
2. Rotate high-value lifecycle/attachment funnel suites.
3. Classify by dominant failure class + subsystem.
4. Publish issue-ready evidence package.

Tests run:
- `npm run qa:smoke` (timeout in this run)
- `npx vitest run tests/playwright/funnels/panel-stop-state.spec.ts --reporter=verbose` (timeout)
- `npx vitest run tests/playwright/funnels/panel-image-attachments.spec.ts --reporter=verbose` (timeout)
- `npm run qa:artifacts` (pass)

Implementation:
- Added evidence artifacts under `output/playwright/automation-fix-agent/`
- Added this intelligence report and issue drafts under `reports/fix-agent/`

PR note:
- Summary: added concrete timeout/run evidence and identified a smoke false-positive condition (offline runtime still passes).
- Risks: issue tracker update is blocked by network; deadlocks may be environment-specific without additional host telemetry.
- Tradeoffs: favored deterministic timeout evidence over indefinite hangs to maximize signal quality.
- Rollback plan: remove `reports/fix-agent/*` and `output/playwright/automation-fix-agent/*` files if this run package is not needed.

## Issue tracker sync status
- `gh issue list --state open --limit 50` failed: `error connecting to api.github.com`.
- Issue drafts prepared locally for manual sync when network is available.
