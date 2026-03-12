# Runtime QA Report - 2026-03-11T10:15:18Z

- Run ID: `fix-agent-20260311T101518Z-clean`
- Scope: core smoke + rotating high-value flows (stop-state lifecycle, image attachments, transcript funnels, trace path, artefact manifest)
- Outcome: **degraded** (5 failed, 1 passed)

## Tasks run
1. `npm run qa:smoke`
2. `npx vitest run tests/playwright/funnels/panel-stop-state.spec.ts`
3. `npx vitest run tests/playwright/funnels/panel-image-attachments.spec.ts`
4. `npx vitest run tests/playwright/funnels/comet-transcript-funnels.spec.ts`
5. `npm run qa:trace`
6. `npm run qa:artifacts`

## Results with evidence

### 1) qa:smoke - FAILED
- Expected: headed smoke flow loads panel, captures screenshot attachment, validates runtime readiness before and after action.
- Observed: pre-runtime bootstrap failure (`PlaywrightBootstrapError`), exits `1` before browser launch.
- Classification: `completion_deadlock`
- Likely subsystem: `capability primitive/tool layer`
- Evidence:
  - `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/01.meta`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/01.stdout`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/01.stderr`
- Screenshot/trace produced this run: none (failed before capture).

### 2) panel-stop-state - FAILED
- Expected: stop/pause/resume/interrupted/admin controls execute with verified panel state transitions.
- Observed: test fixture sidecar bind failed immediately (`listen EPERM`).
- Classification: `actionability_failure`
- Likely subsystem: `test harness or coverage definition`
- Evidence:
  - `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/02.meta`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/02.stdout`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/02.stderr`
- UI/runtime/page agreement: not assessable in this run (flow aborted before visible assertions).

### 3) panel-image-attachments - FAILED
- Expected: screenshot attachment sent to AgentRun payload and follow-up run includes prior turns.
- Observed: fixture bind failed immediately (`listen EPERM`).
- Classification: `actionability_failure`
- Likely subsystem: `test harness or coverage definition`
- Evidence:
  - `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/03.meta`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/03.stdout`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/03.stderr`

### 4) comet-transcript-funnels - FAILED (runtime subtest)
- Expected: runtime transcript funnel executes through real panel; documentation contract test remains valid.
- Observed: doc-contract subtest passed, runtime subtest failed on fixture bind (`listen EPERM`).
- Classification: `actionability_failure`
- Likely subsystem: `test harness or coverage definition`
- Evidence:
  - `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/04.meta`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/04.stdout`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/04.stderr`

### 5) qa:trace - FAILED
- Expected: sidecar runtime-ready + live panel trace flow emits run report and screenshots.
- Observed: runtime readiness preflight failed (`/health` fetch failed), exits `1` before runtime UI checks.
- Classification: `transport_sync_failure`
- Likely subsystem: `runtime lifecycle`
- Evidence:
  - `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/05.meta`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/05.stdout`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/05.stderr`
- New screenshots this run: none; latest historical `live-cdp-panel-check` artifacts are not from this run.

### 6) qa:artifacts - PASSED
- Expected: generate `output/qa-artifacts/manifest.json` listing available output/trace roots.
- Observed: success, exit `0`, manifest generated.
- Classification: success
- Evidence:
  - `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/06.meta`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/06.stdout`
  - `output/qa-artifacts/manifest.json`

## Dominant failure classes this run
- `actionability_failure` (3 tasks)
- `completion_deadlock` (1 task)
- `transport_sync_failure` (1 task)

## GitHub sync verification (required sequence)
All GitHub operations failed in this run.

1. `gh auth status` -> exit `1`
- stderr: token invalid for active account.

2. `gh repo view` -> exit `1`
- stderr: `error connecting to api.github.com`

3. `gh issue list --state all --limit 200` -> exit `1`
- stderr: `error connecting to api.github.com`

4. debug retry (`GH_DEBUG=api`) for failed commands -> exit `1`
- stderr: `lookup api.github.com: no such host`

5. connectivity check `curl -I https://api.github.com` -> exit `6`
- stderr: `Could not resolve host: api.github.com`

Sync classification:
- `auth_failure`
- `network_failure`

GitHub sync status for this run: **degraded** (proven unavailable)

## Unsynced backup drafts updated/created
- `reports/fix-agent/issue-drafts/2026-03-11-qa-smoke-bootstrap-timeout-unsynced.md` (updated)
- `reports/fix-agent/issue-drafts/2026-03-11-funnels-listen-eperm-unsynced.md` (updated)
- `reports/fix-agent/issue-drafts/2026-03-11-qa-trace-runtime-ready-fetch-failed-unsynced.md` (created)

## Notes on historical-fix verification
- Historical fix verification through GitHub issue state could not be advanced in this run because GitHub API access failed with DNS + auth evidence.
