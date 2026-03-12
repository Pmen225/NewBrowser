# UNSYNCED BACKUP - [runtime-failure] qa-smoke bootstrap timeout before headed flow

- Task name: `qa-smoke`
- Run ID: `fix-agent-20260311T060303Z-qa-smoke`
- Expected outcome: headed smoke launches browser, attaches screenshot, verifies post-conditions.
- Observed outcome: fails at bootstrap guard before browser launch with `phase=load-playwright-core` timeout.
- Dominant failure classification: `completion_deadlock`
- Likely subsystem: `capability primitive/tool layer`
- Recurrence: recurring
- Smallest structural fix class guess: stabilize/replace Playwright bootstrap probe path in local runtime environment.

Evidence:
- Task metadata: `output/playwright/automation-fix-agent/fix-agent-20260311T060303Z/qa_smoke.json`
- Stdout: `output/playwright/automation-fix-agent/fix-agent-20260311T060303Z/logs/qa_smoke.out.log`
- Stderr: `output/playwright/automation-fix-agent/fix-agent-20260311T060303Z/logs/qa_smoke.err.log`
- Screenshot references: none produced in this run (blocked pre-launch)
- Trace references: none task-attributable in this run window

GitHub sync status for this draft: `network_failure` + `auth_failure` (UNSYNCED BACKUP only)
- Failed command: `gh issue list --state all --limit 100 --search 'qa-smoke OR panel-stop-state OR panel-image-attachments OR comet-transcript-funnels'`
- Exit code: `1`
- Stderr excerpt: `error connecting to api.github.com`
- Debug retry stderr excerpt: `lookup api.github.com: no such host`
- Command logs:
  - `output/playwright/automation-fix-agent/fix-agent-20260311T060303Z/github-sync/gh_issue_list.stderr.log`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T060303Z/github-sync/gh_issue_list_debug.stderr.log`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T060303Z/github-sync/curl_api.stderr.log`

## 2026-03-11 rerun evidence (`fix-agent-20260311T080240Z`)
- Task name: `qa-smoke`
- Run ID: `fix-agent-20260311T080240Z-qa-smoke`
- Expected outcome: headed smoke launches browser, captures screenshot attachment, verifies post-conditions.
- Observed outcome: preflight deadlock before browser launch:
  - `Playwright bootstrap probe failed in 15000ms`
  - `phase=load-playwright-core`
  - `code=ETIMEDOUT`
- Dominant failure classification: `completion_deadlock`
- Likely subsystem: `capability primitive/tool layer`
- Recurrence/regression: recurring
- Smallest structural fix class: replace or harden bootstrap probe path for this runtime.

### Evidence (this rerun)
- `output/playwright/automation-fix-agent/fix-agent-20260311T080240Z/qa-smoke.stdout.log`
- `output/playwright/automation-fix-agent/fix-agent-20260311T080240Z/qa-smoke.stderr.log`
- `output/playwright/automation-fix-agent/fix-agent-20260311T080240Z/qa-smoke.exitcode`
- Screenshot references: no new screenshot produced in this rerun (pre-launch failure).
- Trace references: no new task-attributable trace produced in this rerun.

### GitHub sync command evidence (this rerun)
- `gh auth status` -> exit `1` (`The token in default is invalid.`)
- `gh repo view` -> exit `1` (`error connecting to api.github.com`)
- `gh issue list --state all --limit 100 --search 'qa-smoke OR panel-stop-state OR panel-image-attachments OR comet-transcript-funnels OR qa-trace'` -> exit `1` (`error connecting to api.github.com`)
- `GH_DEBUG=api` retry for failed commands -> `lookup api.github.com: no such host`
- `curl -I https://api.github.com` -> exit `6` (`Could not resolve host: api.github.com`)
- Logs: `output/playwright/automation-fix-agent/fix-agent-20260311T080240Z/github-sync/`

## 2026-03-11 runtime-improvement update (`agent-2-runtime-improvement-fix-agent`)
- Change class: bootstrap recovery semantics hardening in the shared primitive.
- Files changed:
  - `scripts/lib/playwright-bootstrap-check.cjs`
  - `tests/scripts/playwright-bootstrap-check.spec.ts`
- What changed:
  - bootstrap cache entries now include a runtime fingerprint (`cwd`, `nodePath`, `nodeVersion`)
  - cached failures are reused only when fingerprint matches the current runtime
  - mismatched/runtime-moved cache entries are ignored so probes re-run and cache is refreshed
- Why this is high leverage:
  - the primitive gates `qa:smoke`, funnel bootstrap helpers, and browser benchmark entrypoints
  - avoids stale-cache false negatives after environment/dependency/runtime changes
- Verification evidence:
  - `npm run test -- tests/scripts/playwright-bootstrap-check.spec.ts --reporter=verbose` (11/11 passing)
  - `npm run test -- tests/scripts/browser-course-bootstrap.spec.ts --reporter=verbose` (7/7 passing)
  - `npm run test -- tests/playwright/helpers/runtime-guards.spec.ts --reporter=verbose` (3/3 passing)
  - `npm run qa:smoke` rerun still fails with `PlaywrightBootstrapError` (`classification=runtime_bootstrap_timeout`, `phase=load-playwright-core`, `code=ETIMEDOUT`)
  - direct probe validation script confirmed stale mismatched cached failure is ignored and cache rewritten with current fingerprint:
    - output: `{"ok":true,"phase":"complete","calls":3,"cacheOk":true,...}`
- Honest status for the tracked failure class:
  - `completion_deadlock` from real `load-playwright-core` timeout in this sandbox is **not fixed** by this change
  - stale bootstrap cache poisoning / false fast-fail after runtime changes is **fixed**
