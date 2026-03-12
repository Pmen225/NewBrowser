# [QA] runtime-failure: recurring completion deadlock across smoke + rotating funnels (2026-03-11)

- Task names:
  - `qa:smoke`
  - `panel-stop-state` funnel
  - `panel-image-attachments` funnel
  - `comet-transcript-funnels`
- Run IDs:
  - `fix-agent-20260311000304-qa-smoke`
  - `fix-agent-20260311000709-panel-stop-state`
  - `fix-agent-20260311001350-panel-image-attachments`
  - `fix-agent-20260311002034-comet-transcript-funnels`
- Expected outcome: each suite exits with explicit assertion verdict.
- Observed outcome: all 4 commands terminated by timeout guard (`SIGTERM` / `ETIMEDOUT`) without assertion verdict.
- Failure classification: `completion_deadlock`
- Likely subsystem:
  - smoke: `capability primitive/tool layer`
  - funnels: `runtime lifecycle`
- New/Recurring/Regression: recurring (prior run had same deadlock pattern; now reproduced with additional `comet-transcript-funnels` coverage).
- Smallest structural fix class required:
  - split bootstrap deadlock and suite deadlock into separate liveness probes
  - emit first-step checkpoint logs before UI actions
  - fail fast when no first test case starts within bounded time
- Screenshots:
  - none generated for these tasks in this run (deadlock before screenshot hooks)
- Trace/artifact references:
  - `output/playwright/automation-fix-agent/qa-smoke.json`
  - `output/playwright/automation-fix-agent/panel-stop-state.json`
  - `output/playwright/automation-fix-agent/panel-image-attachments.json`
  - `output/playwright/automation-fix-agent/comet-transcript-funnels.json`
  - `output/playwright/automation-fix-agent/summary.json`
  - `output/qa-artifacts/manifest.json`

## 2026-03-11 runtime-improvement update (bootstrap liveness guard)

- Structural change:
  - added `scripts/lib/playwright-bootstrap-check.cjs` fail-fast probe with bounded timeout and diagnostic detail
  - wired probe into `scripts/run-qa-smoke.sh` before headed smoke flow begins
  - wired probe into funnel startup via `vitest.funnels.config.ts` global setup
- New evidence:
  - `npm run qa:smoke` now fails in ~15s with explicit bootstrap failure instead of hanging until external timeout
  - `npm run qa:regression` now exits in ~15s with explicit unhandled bootstrap error rather than 300-360s deadlock
- What remains unresolved:
  - root cause inside Playwright/module bootstrap is still unresolved; this change converts opaque deadlock into deterministic, actionable runtime-failure evidence.

## 2026-03-11 runtime-improvement update (phase-attributed bootstrap guard)

- Structural change:
  - bootstrap probe now executes explicit phases and tags failures with `phase=resolve-playwright|load-playwright-core|load-playwright`
  - shared guard module remains `scripts/lib/playwright-bootstrap-check.cjs` and all existing smoke/funnel entrypoints inherit the same phase detail
- New evidence:
  - direct probe result now reports `phase: 'load-playwright-core'` for this environment
  - `npm run qa:smoke` fails with `phase=load-playwright-core` in the bootstrap error detail
  - `npm run qa:regression` global setup fails with the same phase, confirming cross-entrypoint consistency
- Reliability impact:
  - removes ambiguous bootstrap-timeout class and replaces it with an actionable failing boundary for issue ownership and remediation
- What remains unresolved:
  - Playwright core module load deadlock itself still needs root-cause fix; this update improves runtime truth and validation evidence only.

## 2026-03-11 runtime-improvement update (benchmark entrypoint bootstrap contract)

- Structural change:
  - added `scripts/lib/browser-course-bootstrap.cjs` and wired it into:
    - `scripts/live-local-browser-course.mjs`
    - `scripts/live-gemini-browser-course.mjs`
  - both benchmark entrypoints now publish bootstrap truth (`bootstrapReady`, `bootstrapFailure`) and classify this deadlock class as `runtime_bootstrap_failure`
- New evidence:
  - `vitest run tests/scripts/browser-course-bootstrap.spec.ts --reporter=verbose` -> 4/4 passing
  - `vitest run tests/bench/browser-model-benchmark.spec.ts --reporter=verbose` -> 2/2 passing
  - `node scripts/live-gemini-browser-course.mjs` output now includes bootstrap fields in aggregate JSON
- Reliability impact:
  - extends deterministic deadlock attribution from smoke/funnels to local/public browser-course benchmark runs
  - prevents opaque bootstrap faults from being lumped into generic `runner_error` when bootstrap failure signatures are present
- Remaining unresolved:
  - root cause of Playwright/module deadlock is still unresolved; this update improves lifecycle truth and failure classification coverage across more canonical entrypoints.

## 2026-03-11 runtime-improvement update (loopback bind preflight for funnels)

- Structural change:
  - added shared guard `scripts/lib/loopback-bind.js` with explicit bind-failure classification (`loopback_bind_permission_failure`, `loopback_bind_port_in_use`, etc.)
  - wired funnel startup to run loopback preflight before bootstrap in `tests/playwright/helpers/funnels-bootstrap-global-setup.ts`
  - wired `scripts/lib/local-browser-course.js` startup through the same guarded listen primitive
- New evidence:
  - `vitest run tests/scripts/loopback-bind.spec.ts --reporter=basic` -> 4/4 passing
  - `npm run test:funnels` now fails in ~26ms with `classification=loopback_bind_permission_failure` when bind is blocked, replacing prior delayed timeout-style startup failures
- Reliability impact:
  - converts environment-level `listen EPERM` into deterministic first-hop runtime truth across canonical regression entrypoint and local browser-course startup path
  - preserves bootstrap timeout budget for environments where bind is available but Playwright bootstrap remains the blocker
- Remaining unresolved:
  - this does not remove host sandbox restrictions; it hardens detection and classification so runtime ownership is explicit.

## 2026-03-11 runtime-improvement update (shared launch primitive guard)

- Structural change:
  - hardened `tests/playwright/helpers/runtime-guards.ts` so Playwright is resolved lazily and always bootstrap-gated at `launchManagedPersistentContext` call time
  - added `resolvePlaywrightChromiumLauncher(...)` for deterministic:
    - bootstrap-failure rejection before launch attempts
    - invalid Playwright module-shape rejection
- New evidence:
  - `vitest run tests/playwright/helpers/runtime-guards.spec.ts --reporter=verbose` -> 3/3 passing
  - `vitest run tests/scripts/playwright-bootstrap-check.spec.ts tests/scripts/loopback-bind.spec.ts --reporter=verbose` -> 9/9 passing
  - `npx vitest run tests/playwright/funnels/panel-stop-state.spec.ts --reporter=verbose --testTimeout=20000 --hookTimeout=20000` -> exits in ~181ms with explicit `listen EPERM` (no deadlock)
- Reliability impact:
  - removes deadlock-style ambiguity for direct funnel test invocations that bypass funnel config global setup
  - funnels now fail fast with actionable environment classification instead of consuming full timeout budget
- Remaining unresolved:
  - loopback bind permission restriction (`EPERM`) still blocks full headed funnel execution in this sandbox; this remains an environment/actionability blocker, not a deadlock.

## GitHub sync evidence (required diagnostics)

- `gh auth status`:
  - invalid token for account `Pmen225`
- `gh repo view` / `gh issue list ...`:
  - `error connecting to api.github.com`
- Retry with `GH_DEBUG=api`:
  - request fails with `lookup api.github.com: no such host`
- `curl -I https://api.github.com`:
  - `curl: (6) Could not resolve host: api.github.com`
- Classified failure for this run:
  - `network_failure` (primary)
  - `auth_failure` (secondary local token state)

Sync outcome: degraded run, issue updates preserved locally in `reports/fix-agent/issue-drafts/` pending GitHub connectivity.
