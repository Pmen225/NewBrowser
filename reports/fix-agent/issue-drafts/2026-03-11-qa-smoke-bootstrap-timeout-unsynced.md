# UNSYNCED BACKUP - [runtime-failure] qa-smoke bootstrap timeout before headed runtime

GitHub sync status: `network_failure` (with concurrent `auth_failure`)  
Primary system-of-record sync failed during this run; this draft is temporary backup only.

## Failure record
- Task name: `qa-smoke`
- Run ID: `fix-agent-20260311T030620Z-tmo`
- Expected outcome: smoke flow completes screenshot attach with deterministic pass/fail and exits.
- Observed outcome: exits code 1 before browser launch with bootstrap failure:
  - `phase=load-playwright-core`
  - `code=ETIMEDOUT`
  - `signal=SIGTERM`
  - `message=spawnSync .../node ETIMEDOUT`
- Dominant failure classification: `completion_deadlock`
- Likely subsystem: `capability primitive/tool layer`
- Recurrence: recurring
- Smallest structural fix class required: instrument Playwright-core bootstrap child process with startup telemetry and timeout attribution per bootstrap phase.

## Evidence
- Task metadata: `output/playwright/automation-fix-agent/fix-agent-20260311T030620Z-tmo/qa_smoke.json`
- Stdout: `output/playwright/automation-fix-agent/fix-agent-20260311T030620Z-tmo/logs/qa_smoke.out.log`
- Stderr: `output/playwright/automation-fix-agent/fix-agent-20260311T030620Z-tmo/logs/qa_smoke.err.log`
- Artifact manifest: `output/qa-artifacts/manifest.json`
- Screenshot references: none (failure before capture step)
- Trace references: none attributable to this task in run window

## Runtime/UI/page coherence note
Runtime and visible page state cannot be compared for this task because execution terminates before panel/page rendering checkpoints.

## GitHub sync failure evidence (exact commands)
1. Failed command: `gh repo view`
- exit code: `1`
- stderr excerpt: `error connecting to api.github.com`

2. Retry command: `GH_DEBUG=api gh repo view`
- exit code: `1`
- stderr excerpt: `lookup api.github.com: no such host`

3. Connectivity check: `curl -I https://api.github.com`
- exit code: `6`
- stderr excerpt: `Could not resolve host: api.github.com`

4. Auth state: `gh auth status`
- exit code: `1`
- stderr excerpt: `The token in default is invalid.`

5. Raw command logs:
- `output/playwright/automation-fix-agent/fix-agent-20260311T030620Z-tmo/github-sync/gh_repo_view.stderr.log`
- `output/playwright/automation-fix-agent/fix-agent-20260311T030620Z-tmo/github-sync/gh_repo_view_debug.stderr.log`
- `output/playwright/automation-fix-agent/fix-agent-20260311T030620Z-tmo/github-sync/curl_api.stderr.log`

## 2026-03-11 rerun evidence (`fix-agent-20260311T070232Z`)
- Task name: `qa-smoke`
- Run ID: `fix-agent-20260311T070232Z-qa_smoke`
- Expected outcome: headed smoke flow completes screenshot attachment and validates runtime readiness before and after action.
- Observed outcome: exits code 1 before browser launch with bootstrap failure `phase=load-playwright-core`, `code=ETIMEDOUT`, `signal=SIGTERM`.
- Dominant failure classification: `completion_deadlock`
- Likely subsystem: `capability primitive/tool layer`
- Recurrence/regression: recurring

### Evidence (this rerun)
- `output/playwright/automation-fix-agent/fix-agent-20260311T070232Z/qa_smoke.json`
- `output/playwright/automation-fix-agent/fix-agent-20260311T070232Z/logs/qa_smoke.out.log`
- `output/playwright/automation-fix-agent/fix-agent-20260311T070232Z/logs/qa_smoke.err.log`
- `output/playwright/automation-fix-agent/fix-agent-20260311T070232Z/qa-artifacts-manifest.json`
- Screenshot references: none produced in this rerun (failure before capture step); latest historical smoke screenshot remains `output/playwright/qa-smoke/panel-final.png` dated 2026-03-10.
- Trace references: none attributable to this task in this rerun.

### GitHub sync command evidence (this rerun)
- `gh auth status` -> exit `1` (`The token in default is invalid.`)
- `gh repo view` -> exit `1` (`error connecting to api.github.com`)
- `gh issue list --state all --limit 100 --search "qa-smoke OR panel-stop-state OR panel-image-attachments OR comet-transcript-funnels OR qa:trace"` -> exit `1` (`error connecting to api.github.com`)
- `GH_DEBUG=api ...` retries -> `lookup api.github.com: no such host`
- `curl -I https://api.github.com` -> exit `6` (`Could not resolve host: api.github.com`)
- Logs: `output/playwright/automation-fix-agent/fix-agent-20260311T070232Z/github-sync/`

## 2026-03-11 bootstrap-classification contract update (unsynced)
- Scope: hardened shared bootstrap failure contract in `scripts/lib/playwright-bootstrap-check.cjs` and wired propagation into browser-course readiness flows.
- Structural change: bootstrap guard now emits typed `PlaywrightBootstrapError` with explicit fields (`classification`, `phase`, `code`, `signal`, `detail`) instead of message-only heuristics.
- Expected reliability gain: smoke and benchmark runners can classify bootstrap failures deterministically (`runtime_bootstrap_timeout`, `runtime_bootstrap_dependency_missing`, fallback `runtime_bootstrap_failure`) without regex drift.

### Rerun evidence
- `npx vitest run tests/scripts/playwright-bootstrap-check.spec.ts tests/scripts/browser-course-bootstrap.spec.ts tests/playwright/helpers/runtime-guards.spec.ts tests/scripts/qa-automation.spec.ts --reporter=verbose`
  - outcome: 22/22 passing.
- `npm run qa:smoke`
  - outcome: fail-fast with explicit bootstrap class:
    - `PlaywrightBootstrapError`
    - `classification=runtime_bootstrap_timeout`
    - `phase=load-playwright-core`
    - `code=ETIMEDOUT`

### Honest status
- `partially fixed`
- Fixed: bootstrap failure truth contract and propagation semantics.
- Remaining: underlying environment/bootstrap timeout itself still present.

### GitHub sync state for this update
- `gh auth status` => invalid token (`auth_failure`)
- `gh repo view` => cannot connect to api.github.com (`network_failure`)
- `GH_DEBUG=api gh issue list --state open --search "runtime reliability" --limit 20` => `lookup api.github.com: no such host` (`network_failure`)
- `curl -I https://api.github.com` => `Could not resolve host` (`network_failure`)

## 2026-03-11 rerun evidence (`fix-agent-20260311T090210Z`)
- Task name: `qa-smoke`
- Run ID: `fix-agent-20260311T090210Z-qa_smoke`
- Expected outcome: headed smoke run reaches screenshot attachment and validates post-action state.
- Observed outcome: exits `1` before browser launch with:
  - `PlaywrightBootstrapError`
  - `classification=runtime_bootstrap_timeout`
  - `phase=load-playwright-core`
  - `code=ETIMEDOUT`
- Dominant failure classification: `completion_deadlock`
- Likely subsystem: `capability primitive/tool layer`
- Recurrence/regression: recurring
- Smallest structural fix class: stabilize bootstrap probe/runtime environment so Playwright core load can complete.

### Evidence (this rerun)
- `output/playwright/automation-fix-agent/fix-agent-20260311T090210Z/qa_smoke.stdout.log`
- `output/playwright/automation-fix-agent/fix-agent-20260311T090210Z/qa_smoke.stderr.log`
- `output/playwright/automation-fix-agent/fix-agent-20260311T090210Z/qa_smoke.exitcode`
- `output/playwright/automation-fix-agent/fix-agent-20260311T090210Z/qa_artifacts.stdout.log`
- Screenshot references: none produced in this rerun.
- Trace references: none attributable to this task in this rerun.

### GitHub sync failure evidence (this rerun)
- Failed command: `gh repo view`
  - exit code: `1`
  - stderr: `error connecting to api.github.com`
- Retry command: `GH_DEBUG=api gh repo view`
  - exit code: `1`
  - stderr: `lookup api.github.com: no such host`
- Connectivity check: `curl -I https://api.github.com`
  - exit code: `6`
  - stderr: `Could not resolve host: api.github.com`
- Auth check: `gh auth status`
  - exit code: `1`
  - stderr: `The token in default is invalid.`
- Raw command logs:
  - `output/playwright/automation-fix-agent/fix-agent-20260311T090210Z/github-sync/gh_repo_view.stdout.log`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T090210Z/github-sync/gh_repo_view.stderr.log`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T090210Z/github-sync/gh_repo_view.exitcode`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T090210Z/github-sync/gh_repo_view_debug.stdout.log`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T090210Z/github-sync/gh_repo_view_debug.stderr.log`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T090210Z/github-sync/gh_repo_view_debug.exitcode`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T090210Z/github-sync/curl_github_api_head.stdout.log`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T090210Z/github-sync/curl_github_api_head.stderr.log`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T090210Z/github-sync/curl_github_api_head.exitcode`

## 2026-03-11 rerun evidence (`fix-agent-20260311T101518Z-clean`)
- Task name: `qa:smoke`
- Run ID: `fix-agent-20260311T101518Z-clean`
- Expected outcome: headed smoke flow opens page + panel, captures screenshot attachment, and validates sidecar readiness pre/post action.
- Observed outcome: exits `1` before browser launch with:
  - `PlaywrightBootstrapError`
  - `classification=runtime_bootstrap_timeout`
  - `phase=load-playwright-core`
  - `code=ETIMEDOUT`
- Dominant failure classification: `completion_deadlock`
- Likely subsystem: `capability primitive/tool layer`
- Recurrence/regression: recurring
- Smallest structural fix class: stabilise the Playwright bootstrap probe/runtime environment so `playwright-core` load does not timeout.

### Evidence (this rerun)
- `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/01.meta`
- `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/01.stdout`
- `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/01.stderr`
- Screenshot references: none generated in this rerun (failure before capture path).
- Trace references: none attributable to this task in this rerun.

### GitHub sync failure evidence (this rerun)
- `gh auth status` -> exit `1` (`The token in default is invalid.`)
- `gh repo view` -> exit `1` (`error connecting to api.github.com`)
- `gh issue list --state all --limit 200` -> exit `1` (`error connecting to api.github.com`)
- `GH_DEBUG=api gh repo view` -> exit `1` (`lookup api.github.com: no such host`)
- `curl -I https://api.github.com` -> exit `6` (`Could not resolve host: api.github.com`)
- Logs: `output/playwright/automation-fix-agent/fix-agent-20260311T101518Z-clean/github-sync/`

## 2026-03-11 rerun evidence (`fix-agent-20260311T110200Z-live`)
- Task name: `qa:smoke`
- Run ID: `fix-agent-20260311T110200Z-live`
- Expected outcome: headed smoke flow launches browser + panel, captures screenshot attachment, and validates runtime-ready state pre/post action.
- Observed outcome: exits `1` before browser launch at bootstrap gate:
  - `PlaywrightBootstrapError`
  - `classification=runtime_bootstrap_timeout`
  - `phase=load-playwright-core`
  - `code=ETIMEDOUT`
  - `message=spawnSync .../node ETIMEDOUT`
- Dominant failure classification: `completion_deadlock`
- Likely subsystem: `capability primitive/tool layer`
- Recurrence/regression: recurring
- Smallest structural fix class required: stabilise runtime bootstrap execution path for `playwright-core` probe.

### Evidence (this rerun)
- `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/01.meta`
- `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/01.stdout`
- `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/01.stderr`
- Screenshot references: none produced for this task in this run (failed before capture).
- Trace references: none attributable to this task in this run.

### GitHub sync failure evidence (this rerun)
- `gh auth status` -> exit `1` (`The token in default is invalid.`)
- `gh repo view` -> exit `1` (`error connecting to api.github.com`)
- `gh issue list --state all --limit 200` -> exit `1` (`error connecting to api.github.com`)
- `GH_DEBUG=api gh repo view` -> exit `1` (`lookup api.github.com: no such host`)
- `curl -I https://api.github.com` -> exit `6` (`Could not resolve host: api.github.com`)
- Raw logs:
  - `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/github-sync/gh_auth_status.stderr.log`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/github-sync/gh_repo_view.stderr.log`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/github-sync/gh_issue_list.stderr.log`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/github-sync/gh_repo_view_debug.stderr.log`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T110200Z-live/github-sync/curl_api.stderr.log`

## Current sync status
- This remains an UNSYNCED local backup.
- No GitHub issue create or update was proven for this rerun because the required GitHub command sequence failed with `auth_failure` plus `network_failure`.

## 2026-03-11 runtime-cache hardening update (this run)
### What changed
- File updated: `scripts/lib/playwright-bootstrap-check.cjs`
  - Added authoritative bootstrap failure cache (`output/playwright/.runtime/playwright-bootstrap-cache.json`) with short TTL.
  - Reuses fresh cached failure for fail-fast classification instead of rerunning deadlocked bootstrap probes across commands.
  - Persists latest probe verdict (failure or success) to keep runtime truth explicit.
  - Added env controls:
    - `PLAYWRIGHT_BOOTSTRAP_CACHE_PATH`
    - `PLAYWRIGHT_BOOTSTRAP_CACHE_TTL_MS`
    - `PLAYWRIGHT_BOOTSTRAP_CACHE_DISABLE=1`
- Test updates: `tests/scripts/playwright-bootstrap-check.spec.ts`
  - Added coverage for cache hit fail-fast, expired-cache recovery rerun, and success-path cache refresh.
- Contract docs updated: `docs/testing/browser-agent-automation.md`
  - Added cache behaviour and override controls under smoke bootstrap mapping.

### Evidence
1. Targeted regression tests:
   - Command: `npx vitest run tests/scripts/playwright-bootstrap-check.spec.ts --reporter=verbose`
   - Outcome: `10 passed, 0 failed`
2. Related contract tests:
   - Command: `npx vitest run tests/scripts/browser-course-bootstrap.spec.ts tests/scripts/qa-automation.spec.ts --reporter=verbose`
   - Outcome: `15 passed, 0 failed`
3. Runtime fail-fast proof:
   - Command: two sequential `assertPlaywrightBootstrapReady(...)` calls with shared `PLAYWRIGHT_BOOTSTRAP_CACHE_PATH` and `timeoutMs=2000`
   - Outcome:
     - first attempt: `runtime_bootstrap_timeout`, `cached=no`, `first_ms=1065`
     - second attempt: same classification, `cached=yes`, `second_ms=31`

### Honest status
- `partially fixed`
- Reduced failure class impact: repeated bootstrap deadlock attempts now fail fast with authoritative cached classification.
- Remaining blocker: underlying `load-playwright-core` environment timeout still exists and still classifies as `runtime_bootstrap_timeout`.

## Sync backfill status - 2026-03-11T11:33:00Z
- Backfilled to GitHub successfully after connectivity recovered.
- This local draft is secondary only.

## Sync status update (2026-03-11T11:33:08Z)
This local draft has now been synced to GitHub and is secondary backup only.
- Runtime bootstrap timeout evidence synced to: https://github.com/Pmen225/NewBrowser/issues/38#issuecomment-4038592213
- Loopback bind EPERM evidence synced to: https://github.com/Pmen225/NewBrowser/issues/44#issuecomment-4038592363
- qa:trace process-inspection EPERM synced via new issue: https://github.com/Pmen225/NewBrowser/issues/45



## Recurrence update - 2026-03-11T12:08:39Z
- Task name: qa-smoke
- Run ID: fix-agent-20260311T120221Z-live
- Expected outcome: headed smoke flow reaches panel screenshot attachment and confirms online runtime state.
- Observed outcome: bootstrap probe failed before headed launch with classification=runtime_bootstrap_timeout, phase=load-playwright-core, code=ETIMEDOUT.
- Dominant failure class: completion_deadlock
- Likely subsystem: runtime lifecycle
- Screenshot references: none produced in this run (pre-bootstrap abort).
- Trace/artefact references:
  - output/playwright/automation-fix-agent/fix-agent-20260311T120221Z-live/qa_smoke.log
  - output/playwright/automation-fix-agent/fix-agent-20260311T120221Z-live/step-status.tsv
- Recurrence type: recurring
- Smallest structural fix class: stabilise bootstrap dependency probe/runtime initialisation path so headed flow can start deterministically.

## Recurrence update - 2026-03-11T13:02:33Z
- Task name: `qa:smoke`
- Run ID: `fix-agent-20260311T130233Z-live`
- Expected outcome: headed smoke flow opens target + panel, performs screenshot attachment, and validates runtime readiness pre/post action.
- Observed outcome: pre-launch bootstrap abort:
  - `PlaywrightBootstrapError`
  - `classification=runtime_bootstrap_timeout`
  - `phase=load-playwright-core`
  - `code=ETIMEDOUT`
  - `message=spawnSync .../node ETIMEDOUT`
- Dominant failure classification: `completion_deadlock`
- Likely subsystem: `runtime lifecycle`
- Recurrence/regression: recurring
- Smallest structural fix class required: stabilise Playwright bootstrap probe startup/timeout path so headed runtime can launch.

### Evidence (this rerun)
- `output/playwright/automation-fix-agent/fix-agent-20260311T130233Z-live/command-logs/qa_smoke.out.log`
- `output/playwright/automation-fix-agent/fix-agent-20260311T130233Z-live/command-logs/qa_smoke.err.log`
- `output/playwright/automation-fix-agent/fix-agent-20260311T130233Z-live/command-logs/qa_smoke.exitcode`
- Screenshot references: none produced in this run (failure before capture).
- Trace references: none attributable to this task in this run.

### GitHub sync failure evidence (this rerun)
- Failed command: `gh repo view`
  - exit code: `1`
  - stderr excerpt: `error connecting to api.github.com`
- Retry command: `GH_DEBUG=api gh repo view`
  - exit code: `1`
  - stderr excerpt: `lookup api.github.com: no such host`
- Final truth-gate command: `gh issue list --state all --limit 1`
  - exit code: `1`
  - stderr excerpt: `error connecting to api.github.com`
- Connectivity check: `curl -I https://api.github.com`
  - exit code: `6`
  - stderr excerpt: `Could not resolve host: api.github.com`
- Raw logs:
  - `output/playwright/automation-fix-agent/fix-agent-20260311T130233Z-live/github-sync/gh_repo_view.stderr.log`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T130233Z-live/github-sync/gh_repo_view_debug.stderr.log`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T130233Z-live/github-sync/final_gh_issue_list_limit1.stderr.log`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T130233Z-live/github-sync/final_gh_issue_list_limit1_debug.stderr.log`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T130233Z-live/github-sync/final_curl_api_head.stderr.log`

## Run `fix-agent-20260311T130526Z-live` (2026-03-11T13:05:26Z to 2026-03-11T13:09:59Z)
- Recurrence: recurring
- Expected outcome: see task-specific section in run report `reports/fix-agent/2026-03-11-runtime-qa-report-130526Z.md`.
- Observed outcome: recurring failure reproduced.
- Evidence bundle: `output/playwright/automation-fix-agent/fix-agent-20260311T130526Z-live`
- GitHub sync status: UNSYNCED BACKUP (proven `auth_failure` + `network_failure`).
- Failed command evidence:
  - `gh auth status` exit `1`
  - `gh repo view` exit `1`
  - `gh issue list --state all --limit 200` exit `1`
  - `GH_DEBUG=api gh repo view` exit `1` (lookup api.github.com: no such host)
  - `GH_DEBUG=api gh issue list --state all --limit 200` exit `1` (lookup api.github.com: no such host)
  - `curl -I https://api.github.com` exit `6` (Could not resolve host)
- Final truth gate evidence:
  - `gh auth status` exit `1`
  - `gh repo view` exit `1`
  - `gh issue list --state all --limit 1` exit `1`
  - `curl -I https://api.github.com` exit `6`

## 2026-03-11 runtime improvement update (`fix-agent-20260311T1410Z`)
### What changed
- File updated: `scripts/lib/playwright-bootstrap-check.cjs`
  - Added timeout-only phase retries in `runPlaywrightBootstrapProbe(...)` (`PLAYWRIGHT_BOOTSTRAP_PHASE_RETRIES`, default `1`) so transient child-process stalls do not immediately fail smoke/funnel/bootstrap-gated flows.
  - Added explicit non-negative parsing for retry configuration.
  - Hardened probe cache semantics for injected probe runners:
    - custom `probeRunner` calls now bypass shared on-disk cache unless cache usage is explicitly configured.
    - this removes stale cache cross-talk during deterministic test probes while preserving production cache behaviour.
- File updated: `tests/scripts/playwright-bootstrap-check.spec.ts`
  - Added regression coverage for timeout retry success.
  - Added regression coverage that non-timeout failures are not retried.

### Evidence
1. `npx vitest run tests/scripts/playwright-bootstrap-check.spec.ts --reporter=verbose`
- Result: pass (`13 passed`).
2. `npx vitest run tests/scripts/browser-course-bootstrap.spec.ts tests/playwright/helpers/runtime-guards.spec.ts tests/scripts/qa-automation.spec.ts --reporter=verbose`
- Result: pass (`18 passed`).
3. `npm run qa:smoke`
- Result: fail before headed flow due bootstrap timeout with cached failure detail:
  - `classification=runtime_bootstrap_timeout`
  - `phase=resolve-playwright`
  - `code=ETIMEDOUT`
4. `PLAYWRIGHT_BOOTSTRAP_CACHE_DISABLE=1 npm run qa:smoke`
- Result: fail before headed flow with fresh timeout (same classification/phase/code), confirming remaining environment/runtime blocker rather than stale-cache-only failure.

### Honest status
- `partially fixed`
- Improved: bootstrap gate now tolerates single transient timeout stalls and no longer allows injected-test cache contamination.
- Remaining blocker: this environment still times out spawning bootstrap probe Node processes (`ETIMEDOUT`), so full headed smoke execution remains blocked.

### GitHub sync command evidence (this run)
- `gh auth status` -> exit `1` (`The token in default is invalid.`)
- `gh repo view` -> exit `1` (`error connecting to api.github.com`)
- `gh issue list --state open --limit 50 --search "qa-smoke bootstrap timeout"` -> exit `1` (`error connecting to api.github.com`)
- `GH_DEBUG=api gh issue list ...` -> exit `1` (`lookup api.github.com: no such host`)
- `curl -I https://api.github.com` -> exit `6` (`Could not resolve host: api.github.com`)
- Classified sync state: `network_failure` with concurrent `auth_failure`.

## Recurrence update 2026-03-11T14:10:40Z
- Run ID:   - fix-agent-20260311T140147Z-live
- Task:   - \
> new-browser-sidecar@0.1.0 qa:smoke
> bash scripts/run-qa-smoke.sh

qa-smoke: starting
qa-smoke: loading playwright-core
- Expected outcome: smoke should launch headed browser/panel flow and verify post-action outcomes.
- Observed outcome: preflight abort at playwright bootstrap (, , ).
- Dominant failure class:   - \
- Likely subsystem:   - runtime lifecycle
- Evidence:
  - \
  - \
  - screenshot path expected but not produced in this run because failure occurred before panel UI readiness.
- GitHub sync status for this run:   - UNSYNCED BACKUP only; see command evidence in \.
