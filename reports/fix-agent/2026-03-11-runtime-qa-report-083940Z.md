# Runtime QA Report - 2026-03-11T08:39:40Z

- Automation ID: `fix-agent`
- Run ID: `fix-agent-20260311T083940Z`
- Window (UTC): `2026-03-11T08:39:40Z` -> `2026-03-11T08:46:49Z`
- Overall outcome: `degraded`

## Stage 1. Understand and define
- Objective: rerun core smoke plus high-value browser-agent regressions, classify failures with hard evidence, and sync real failures to GitHub Issues.
- Public interfaces and data shapes:
  - Commands: `npm run qa:smoke`, three funnel specs, `npm run qa:trace`, `npm run qa:artifacts`, `gh` issue operations.
  - Evidence: `*.stdout.log`, `*.stderr.log`, `*.exitcode`, run metadata at `output/playwright/automation-fix-agent/fix-agent-20260311T083940Z`.
- Edge cases/failure modes considered:
  - Playwright bootstrap deadlock (`load-playwright-core`).
  - Runtime transport mismatch (browser/CDP reachable while sidecar transport unavailable).
  - Missing visible proof when failures happen pre-launch.
- Minimal module list:
  - `scripts/run-qa-smoke.sh`
  - `tests/playwright/funnels/panel-stop-state.spec.ts`
  - `tests/playwright/funnels/panel-image-attachments.spec.ts`
  - `tests/playwright/funnels/comet-transcript-funnels.spec.ts`
  - `scripts/live-cdp-panel-check.mjs`
  - `scripts/start-sidecar.mjs`

## Stage 2. Test design
- Happy path:
  - smoke should launch headed browser and verify screenshot attachment outcome.
  - funnels should run panel lifecycle, attachments, transcript flows.
  - trace should produce panel/site artifacts.
- Failure path:
  - classify deadlocks/timeouts before flow execution.
  - classify transport failures where runtime lifecycle diverges.
- Recovery path:
  - after trace failure, launch browser-only and rerun trace to test recovery viability.
- Counterpart controls included by selected flows:
  - `Stop`, `Pause`, `Resume` (`panel-stop-state` target suite).
  - `Open/Close` attachment picker and submit path (`panel-image-attachments`).

## Stage 3. Implement (execution)
Commands executed:
1. `npm run qa:smoke`
2. `npx vitest run tests/playwright/funnels/panel-stop-state.spec.ts --config vitest.funnels.config.ts`
3. `npx vitest run tests/playwright/funnels/panel-image-attachments.spec.ts --config vitest.funnels.config.ts`
4. `npx vitest run tests/playwright/funnels/comet-transcript-funnels.spec.ts --config vitest.funnels.config.ts`
5. `npm run qa:trace`
6. `npm run qa:artifacts`
7. Recovery test: `npm run launch:browser:only` then `npm run qa:trace`

## Stage 4. Functional verification
- `qa-smoke`: **fail** (`exit 1`)
  - Expected: smoke run completes with verified post-condition.
  - Observed: `PlaywrightBootstrapError`, `classification=runtime_bootstrap_timeout`, `phase=load-playwright-core`.
- `panel-stop-state`: **fail** (`exit 1`)
  - Expected: stop/pause/resume assertions run.
  - Observed: same `runtime_bootstrap_timeout` during global setup.
- `panel-image-attachments`: **fail** (`exit 1`)
  - Expected: screenshot attachment payload assertions run.
  - Observed: same `runtime_bootstrap_timeout` during global setup.
- `comet-transcript-funnels`: **fail** (`exit 1`)
  - Expected: transcript funnel assertions run.
  - Observed: same `runtime_bootstrap_timeout` during global setup.
- `qa-trace`: **fail** (`exit 1`)
  - Expected: trace evidence generation.
  - Observed: `Unable to resolve live CDP websocket URL ...`.
- `qa-artifacts`: **pass** (`exit 0`)
  - Output: manifest generated.
- Recovery (`launch:browser:only` + `qa:trace`): **fail** (`exit 1`)
  - Expected: trace should recover once CDP browser is available.
  - Observed: connected to CDP and panel, then failed with `connect ECONNREFUSED 127.0.0.1:3210`.

## Stage 5. Real-world visible verification
- Visible browser execution attempted via headed smoke and trace recovery path.
- Outcome:
  - smoke/funnels failed pre-execution at bootstrap phase.
  - recovery trace reached visible browser/panel states (`Loaded target page`, `Panel composer is visible`) but failed transport sync to sidecar.
- Gate result: fail (no completed visible end-to-end success in this run).

## Stage 6. Product quality review
- Reliability risk is now concentrated in two runtime gates:
  1. Playwright bootstrap probe deadlock blocks all smoke/funnel validation.
  2. Trace path can reach CDP browser but fail sidecar transport (`127.0.0.1:3210`), causing runtime/UI state disagreement.

## Stage 7. Final completion package
### Plan
- Re-run core smoke and rotating high-value regressions.
- Capture per-command evidence with run ID.
- Verify GitHub operations and sync real failures.

### Tests
- Run count: 6 primary + 1 recovery.
- Pass: `qa-artifacts` only.
- Fail: smoke, three funnel suites, trace, trace-recovery.

### Implementation
- QA evidence only; no product code changes.
- New authoritative GitHub issues created:
  - [#38](https://github.com/Pmen225/NewBrowser/issues/38) `Runtime bootstrap timeout blocks smoke + funnel QA flows`
  - [#39](https://github.com/Pmen225/NewBrowser/issues/39) `qa:trace transport sync failure after CDP attach`

### PR note
- Summary: rerun confirms recurring bootstrap deadlock and isolates trace transport-sync failure with a recovery attempt.
- Risks: core browser-agent QA coverage remains blocked until bootstrap and sidecar transport paths are stabilized.
- Tradeoffs: prioritized reproducible evidence and immediate GitHub sync over local speculative fixes.
- Rollback plan: close/relabel issues #38/#39 if later evidence disproves failure classification; no code rollback needed.

## Failure classification summary
- `completion_deadlock`:
  - task: `qa-smoke`
  - tasks: `panel-stop-state`, `panel-image-attachments`, `comet-transcript-funnels`
  - subsystem: `capability primitive/tool layer`
- `transport_sync_failure`:
  - task: `qa-trace` + recovery rerun
  - subsystem: `transport/sync`

## GitHub sync verification (required sequence)
1. `gh auth status` -> exit `0`
2. `gh repo view` -> exit `0`
3. `gh issue list ...` -> exit `0` (no existing matching open issue)
4. `gh issue create` -> exit `0` for #38 and #39
5. `curl -I https://api.github.com` -> exit `0` (`HTTP/2 200`)

GitHub sync classification: `sync_success`

## End-of-run summary
- Tasks run: smoke + 3 funnels + trace + artifacts (+ trace recovery)
- Tasks passed with evidence: `qa-artifacts`
- Tasks failed: smoke, three funnels, trace, trace recovery
- Dominant failure classes: `completion_deadlock`, `transport_sync_failure`
- GitHub issues created: #38, #39
- GitHub sync degraded?: no
- Unsynced failures remaining: none
