# Runtime QA Report - 2026-03-11T11:02:00Z

- Run ID: `fix-agent-20260311T110200Z-live`
- Scope: core smoke + rotating high-value flows (stop-state lifecycle controls, image attachment form flow, transcript runtime flow, trace path, artefact manifest)
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
- Expected: headed smoke launches extension panel, captures screenshot attachment, validates runtime-ready pre/post action.
- Observed: bootstrap guard failed before browser launch:
  - `PlaywrightBootstrapError`
  - `classification=runtime_bootstrap_timeout`
  - `phase=load-playwright-core`
  - `code=ETIMEDOUT`
- Dominant failure class: `completion_deadlock`
- Likely subsystem: `capability primitive/tool layer`
- Evidence:
  - `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/01.meta`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/01.stdout`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/01.stderr`
- Screenshot/trace references: none for this task in this run (failure before capture).

### 2) panel-stop-state - FAILED
- Expected: stop/pause/resume/interrupted/admin controls execute with verified panel state transitions.
- Observed: fixture bind preflight failed before runtime UI actions:
  - `classification=loopback_bind_permission_failure`
  - `code=EPERM`
  - `detail=listen EPERM: operation not permitted 127.0.0.1`
- Dominant failure class: `actionability_failure`
- Likely subsystem: `test harness or coverage definition`
- Evidence:
  - `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/02.meta`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/02.stdout`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/02.stderr`

### 3) panel-image-attachments - FAILED
- Expected: image attachment form flow sends screenshot input and follow-up payload includes prior chat turns.
- Observed: fixture bind preflight failed before runtime UI actions with `loopback_bind_permission_failure` (`EPERM`).
- Dominant failure class: `actionability_failure`
- Likely subsystem: `test harness or coverage definition`
- Evidence:
  - `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/03.meta`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/03.stdout`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/03.stderr`

### 4) comet-transcript-funnels - FAILED (runtime subtest)
- Expected: transcript funnel runtime executes through real panel path.
- Observed: doc-contract subtest passed, runtime subtest failed before UI flow due loopback bind preflight `EPERM`.
- Dominant failure class: `actionability_failure`
- Likely subsystem: `test harness or coverage definition`
- Evidence:
  - `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/04.meta`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/04.stdout`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/04.stderr`

### 5) qa:trace - FAILED
- Expected: sidecar runtime-ready, then live panel trace emits report and screenshots.
- Observed: readiness gate failed and command exited `1`:
  - `Assistant sidecar did not become runtime-ready at http://127.0.0.1:3210/health within 15000ms (fetch failed).`
- Dominant failure class: `transport_sync_failure`
- Likely subsystem: `runtime lifecycle`
- Evidence:
  - `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/05r.meta`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/05r.stdout`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/05r.stderr`
- Screenshot/trace references: none generated for this failed run.

### 6) qa:artifacts - PASSED
- Expected: manifest generation succeeds and lists current output/trace roots.
- Observed: exits `0`, manifest generated.
- Evidence:
  - `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/06r.meta`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/06r.stdout`
  - `output/qa-artifacts/manifest.json`

## Runtime/UI/page-state coherence
- `qa:smoke`, funnels, and `qa:trace` aborted before stable UI post-conditions; runtime/page/UI agreement is therefore **not assessable** for those tasks in this run.
- Headed runtime commands were invoked (non-headless paths), but visible checkpoints were not reached due preflight/runtime failures.

## Dominant failure classes this run
- `actionability_failure` (3 tasks)
- `completion_deadlock` (1 task)
- `transport_sync_failure` (1 task)

## GitHub sync verification (required sequence)
Commands executed and captured under:
`output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/github-sync/`

1. `gh auth status` -> exit `1`
- stderr: token invalid for active account (`auth_failure`).

2. `gh repo view` -> exit `1`
- stderr: `error connecting to api.github.com`.

3. `gh issue list --state all --limit 200` -> exit `1`
- stderr: `error connecting to api.github.com`.

4. Debug retries (`GH_DEBUG=api ...`) -> exit `1`
- stderr includes: `lookup api.github.com: no such host`.

5. Connectivity probe `curl -I https://api.github.com` -> exit `6`
- stderr: `Could not resolve host: api.github.com`.

Sync classification for this run:
- `auth_failure`
- `network_failure`

GitHub sync status: **degraded** (proven unavailable in this environment at run time).

## GitHub issue sync result
- No GitHub issue create/update command succeeded this run.
- Existing unsynced backup drafts were updated with this run’s evidence:
  - `reports/fix-agent/issue-drafts/2026-03-11-qa-smoke-bootstrap-timeout-unsynced.md`
  - `reports/fix-agent/issue-drafts/2026-03-11-funnels-listen-eperm-unsynced.md`
  - `reports/fix-agent/issue-drafts/2026-03-11-qa-trace-runtime-ready-fetch-failed-unsynced.md`

## Historical-fix verification
- Previously recurring failures were rerun (`qa:smoke`, funnel runtime flows, `qa:trace`) and remain broken in this environment.
- Classification: recurring failures, not newly introduced regressions in this run.

## Completion truth
- Real failures were found.
- GitHub sync was attempted and proven unavailable with command evidence.
- Temporary local drafts were used only as unsynced backups under proven sync failure.
