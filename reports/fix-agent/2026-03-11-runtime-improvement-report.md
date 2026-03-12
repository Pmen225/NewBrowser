# Runtime Improvement Report
Date: 2026-03-11
Automation ID: agent-2-runtime-improvement-fix-agent

## Stage 1 - Understand and define
Objective: eliminate the smoke false-positive class where attachment UI success can pass while the sidecar runtime is offline or not attached.

Public interfaces and data shapes:
- Smoke command: `npm run qa:smoke`
- Sidecar health contract: `GET /health` with `ok`, `mode`, `extension_loaded`, `tabs[]`
- New reusable readiness helper:
  - `assessSidecarHealthPayload(payload, options)` -> `{ ready: boolean, reason: string }`
  - `waitForSidecarRuntimeReadiness(options)` -> resolves health payload or throws timeout reason
- Smoke report output: `output/playwright/qa-smoke/report.json`

Edge cases and failure modes addressed:
- sidecar unavailable (fetch/network error)
- sidecar reachable but `mode=ping_only`
- sidecar reachable but extension not loaded
- sidecar reachable but no attached tabs
- panel UI showing reconnect/offline status while attachment chip appears

Minimal module list:
- `scripts/lib/qa-smoke-runtime.cjs`
- `scripts/run-qa-smoke.sh`
- `tests/scripts/qa-smoke-runtime.spec.ts`
- `tests/scripts/qa-automation.spec.ts`
- `docs/testing/browser-agent-automation.md`

## Stage 2 - Test design
Happy path tests:
- health payload with `ok=true`, `mode=cdp`, `extension_loaded=true`, and non-empty `tabs` returns ready.
- readiness waiter recovers from transient fetch failure and succeeds when health becomes ready.

Failure path tests:
- reject `mode=ping_only`
- reject empty `tabs`
- reject `extension_loaded=false`
- timeout when health never reaches runtime-ready state

Recovery path tests:
- temporary offline fetch failure followed by healthy payload is accepted within timeout.

Counterpart controls:
- Enable/Disable class of readiness checks covered via `requireTabs`/`requireModeCdp`/`requireExtensionLoaded` options.
- smoke script uses `requireTabs=false` preflight and strict full checks for runtime phases.

## Stage 3 - Implement
Changes:
- Added `scripts/lib/qa-smoke-runtime.cjs` for authoritative sidecar readiness assessment and polling.
- Updated `scripts/run-qa-smoke.sh` to:
  - require sidecar preflight readiness before browser flow starts
  - require attached-tab readiness before screenshot action
  - require attached-tab readiness after screenshot action
  - fail if panel DOM indicates reconnect/offline state during smoke success path
  - include `healthUrl` in smoke report
- Added regression tests in `tests/scripts/qa-smoke-runtime.spec.ts`.
- Added smoke guard wiring assertion in `tests/scripts/qa-automation.spec.ts`.
- Updated `docs/testing/browser-agent-automation.md` to document runtime-readiness gate.
- Updated issue draft `reports/fix-agent/issue-drafts/2026-03-10-smoke-offline-pass.md`.

## Stage 4 - Functional verification
Commands and outcomes:
1. `./node_modules/.bin/vitest run tests/scripts/qa-smoke-runtime.spec.ts --reporter=verbose`
- Expected: red first, then all green after implementation.
- Did it do that: yes.
- Evidence:
  - initial run failed because module did not exist
  - final run passed: `6 passed (6)`

2. `./node_modules/.bin/vitest run tests/scripts/qa-automation.spec.ts --reporter=dot --no-file-parallelism`
- Expected: no regressions in QA automation contract tests.
- Did it do that: no.
- Why not: pre-existing empty-manifest assertion mismatch (`output` root `fileCount` expected `0` but observed `1`). Not introduced by this change.

3. `node -e "...waitForSidecarRuntimeReadiness({ timeoutMs: 1000 })..."`
- Expected: fail fast when sidecar is unavailable.
- Did it do that: yes.
- Evidence: `Assistant sidecar did not become runtime-ready ... within 1000ms (fetch failed).`

## Stage 5 - Real-world visible verification
Action:
- Ran `npm run qa:smoke` (headed flow).

Observed:
- Command reached `qa-smoke: loading playwright-core` then hung in this environment before completing the flow.

Gate answers:
- Expected outcome: smoke reaches flow and enforces new readiness gate.
- Did it do that: no (run did not progress to readiness log/output in this environment).
- If no, why not: existing launcher/bootstrap deadlock remains and is separate from the fixed validation contract.
- Anything else suspicious: yes, bootstrap hang persists and remains a `runtime-failure`/`timeout` class issue.

## Stage 6 - Product quality review
What improved:
- Smoke success can no longer be justified by attachment chip alone in code path; sidecar runtime readiness and panel offline-state coherence are now explicit legal completion conditions.
- Readiness semantics are reusable and test-covered instead of ad hoc checks.

What still looks off:
- Smoke bootstrap hang remains unresolved and blocks end-to-end headed proof in this environment.

## Stage 7 - Final completion
Plan:
1. Enforce runtime-readiness contract in smoke.
2. Add explicit regression tests for readiness and recovery.
3. Validate with unit-level and command-level evidence.
4. Update issue/report docs with honest partial-completion status.

Tests:
- ✅ `tests/scripts/qa-smoke-runtime.spec.ts` (6/6 passing)
- ⚠️ `tests/scripts/qa-automation.spec.ts` (1 failing pre-existing assertion mismatch)
- ⚠️ `npm run qa:smoke` still hangs during bootstrap in this environment

Implementation:
- Runtime-readiness helper + smoke gate wiring + regression coverage + docs/issue updates completed.

PR note:
- Summary: Added authoritative sidecar runtime-readiness gating to smoke so attachment-only UI can’t produce false pass while runtime is offline.
- Risks: Smoke now hard-fails when local sidecar health is unavailable; environments without sidecar startup must run via proper launcher first.
- Tradeoffs: Chose strict readiness contract over permissive UI-only smoke to reduce false confidence; this may surface more failures initially.
- Rollback plan: revert `scripts/run-qa-smoke.sh` and remove `scripts/lib/qa-smoke-runtime.cjs` plus related tests/docs if smoke gate tightening blocks urgent pipelines.

---

## 2026-03-11 Follow-up: bootstrap deadlock liveness hardening

Objective: convert recurring Playwright bootstrap deadlock from multi-minute timeout behavior into deterministic fail-fast runtime truth across smoke and regression entrypoints.

Implemented:
- added `scripts/lib/playwright-bootstrap-check.cjs` reusable bootstrap probe
- smoke now runs `assertPlaywrightBootstrapReady()` before loading headed runtime
- funnel regressions now run the same probe in `tests/playwright/helpers/funnels-bootstrap-global-setup.ts` wired by `vitest.funnels.config.ts`
- added regression coverage in `tests/scripts/playwright-bootstrap-check.spec.ts` and wiring checks in `tests/scripts/qa-automation.spec.ts`

Verification evidence:
- `npm run qa:smoke` now exits in ~15s with explicit error:
  - `Playwright bootstrap probe failed in 15000ms... code=ETIMEDOUT; signal=SIGTERM`
- `npm run qa:regression` now exits in ~15s with unhandled error pointing at bootstrap guard setup
- targeted script tests:
  - `vitest run tests/scripts/playwright-bootstrap-check.spec.ts tests/scripts/qa-automation.spec.ts --pool=threads --poolOptions.threads.singleThread=true`
  - result: new bootstrap tests pass; one pre-existing failure remains in empty-manifest expectation (`output` fileCount expected 0 observed 1)

Residual gap:
- underlying Playwright/module bootstrap hang remains; this run hardens detection and evidence so deadlocks no longer masquerade as long silent stalls.

---

## 2026-03-11 Follow-up: phase-attributed bootstrap truth

Objective: reduce ambiguity in recurring bootstrap runtime-failure evidence by reporting the exact failing bootstrap boundary instead of a generic timeout.

Implemented:
- updated `scripts/lib/playwright-bootstrap-check.cjs` to run phased probes:
  - `resolve-playwright`
  - `load-playwright-core`
  - `load-playwright` (with chromium API validation)
- bootstrap failures now include a mandatory `phase=...` field in formatted detail
- extended regression coverage in `tests/scripts/playwright-bootstrap-check.spec.ts` for phase propagation

Verification evidence:
- `vitest run tests/scripts/playwright-bootstrap-check.spec.ts --pool=threads --poolOptions.threads.singleThread=true`
  - result: 5/5 passing
- direct probe:
  - `node -e "...runPlaywrightBootstrapProbe({ timeoutMs:15000, phaseTimeoutMs:6000 })..."`
  - result: `ok=false`, `phase='load-playwright-core'`, `code=ETIMEDOUT`
- smoke:
  - `npm run qa:smoke`
  - result: deterministic failure with `phase=load-playwright-core`
- regression:
  - `npm run qa:regression`
  - result: deterministic global setup failure with `phase=load-playwright-core`

Residual gap:
- `load-playwright-core` deadlock remains unresolved in this environment, but ownership is now narrowed to a single bootstrap phase shared across smoke and funnel entrypoints.

---

## 2026-03-11 Follow-up: benchmark bootstrap contract hardening

Objective: extend the existing Playwright bootstrap deadlock guard from smoke/regression into canonical browser-course benchmark entrypoints so failures are classified deterministically instead of surfacing as opaque runner hangs.

Implemented:
- added shared bootstrap helper: `scripts/lib/browser-course-bootstrap.cjs`
  - `resolvePlaywrightBootstrapReadiness(...) -> { ready, detail }`
  - `detectPlaywrightBootstrapFailure(error) -> detail | ""`
- wired helper into:
  - `scripts/live-local-browser-course.mjs`
  - `scripts/live-gemini-browser-course.mjs`
- benchmark scripts now:
  - gate scenario execution on bootstrap readiness once per run
  - classify bootstrap failures explicitly as `runtime_bootstrap_failure`
  - persist bootstrap truth in aggregate output (`bootstrapReady`, `bootstrapFailure`)
- added regression coverage:
  - `tests/scripts/browser-course-bootstrap.spec.ts`

Verification evidence:
- RED test first:
  - `vitest run tests/scripts/browser-course-bootstrap.spec.ts --reporter=verbose`
  - initial failure: missing module `scripts/lib/browser-course-bootstrap.cjs`
- GREEN:
  - `vitest run tests/scripts/browser-course-bootstrap.spec.ts --reporter=verbose`
  - result: 4/4 passing
- non-regression checks:
  - `vitest run tests/bench/browser-model-benchmark.spec.ts --reporter=verbose` -> 2/2 passing
  - `vitest run tests/scripts/playwright-bootstrap-check.spec.ts --reporter=verbose` -> 5/5 passing
- runtime command evidence:
  - `node scripts/live-gemini-browser-course.mjs`
  - result: aggregate now includes `bootstrapReady` and `bootstrapFailure` fields in output JSON

GitHub sync status for this run:
- `gh auth status` -> failed (invalid token)
- `gh repo view` / `gh issue list ...` -> failed (API unreachable)
- retry with `GH_DEBUG=api gh issue list ...` -> `lookup api.github.com: no such host`
- `curl -I https://api.github.com` -> `curl: (6) Could not resolve host`
- classified as: `network_failure` (DNS resolution), with concurrent `auth_failure` due invalid local token

Residual gap:
- sandbox constraints here also produce `spawn EPERM` and local listen restrictions (`listen EPERM`), so full headed browser-course flow remains blocked in this environment; however bootstrap/runtime truth is now explicit and reusable across smoke, regression, and browser-course benchmark entrypoints.

---

## 2026-03-11 Follow-up: loopback bind classification hardening in funnel fixtures

Objective: remove raw fixture-server bind failures in panel funnel specs so loopback permission and port errors are always surfaced through a deterministic classification contract.

Implemented:
- replaced raw `server.listen(0, "127.0.0.1")` calls with `listenWithLoopbackGuard(...)` in:
  - `tests/playwright/funnels/panel-image-attachments.spec.ts`
  - `tests/playwright/funnels/panel-stop-state.spec.ts`
  - `tests/playwright/funnels/comet-transcript-funnels.spec.ts`
- each bind site now carries an explicit label (fixture server vs sidecar stub) for higher-signal failure evidence.
- strengthened guard wiring regression in `tests/scripts/qa-automation.spec.ts`:
  - asserts funnel global setup includes `assertLoopbackBindReady`
  - asserts canonical funnel specs include `listenWithLoopbackGuard`
  - asserts those specs no longer contain raw `listen(0, "127.0.0.1"` binds.

Verification evidence:
- `npx vitest run tests/scripts/qa-automation.spec.ts tests/scripts/loopback-bind.spec.ts --reporter=verbose`
  - result: 12/12 passing.
- `npm run qa:regression`
  - result: deterministic preflight failure with explicit classification:
    - `loopback bind preflight failed to bind on 127.0.0.1:0`
    - `classification=loopback_bind_permission_failure`
    - `code=EPERM`
- `npm run qa:smoke`
  - result: unchanged deterministic bootstrap failure:
    - `Playwright bootstrap probe failed ... phase=load-playwright-core; code=ETIMEDOUT`

Status:
- fixed for targeted failure class: raw/unclassified funnel bind failures are now structurally eliminated in canonical funnel specs.
- partially fixed overall regression execution: this sandbox still blocks loopback binds (`EPERM`), so full funnel UI completion remains blocked by environment capability.

## 2026-03-11 Follow-up: launch primitive bootstrap gating for direct funnel runs

Objective: remove a remaining deadlock path where direct `vitest` funnel invocations can bypass `vitest.funnels.config.ts` global setup and hang before any classified runtime verdict.

Implemented:
- hardened shared launch primitive in `tests/playwright/helpers/runtime-guards.ts`:
  - removed top-level `playwright` runtime import (lazy resolution only at launch time)
  - added `resolvePlaywrightChromiumLauncher(...)` that enforces bootstrap probe before `chromium.launchPersistentContext`

---

## 2026-03-11 Follow-up: trace runtime recovery and multi-port CDP truth

Objective: reduce recurring `qa:trace` runtime-failure/actionability noise by (1) preferring direct CDP probes across common ports before process inspection and (2) adding a managed sidecar recovery path when sidecar runtime is unreachable but a CDP websocket is known.

Implemented:
- Hardened `scripts/lib/live-cdp-config.js`:
  - `resolveLiveCdpWsUrl(...)` now probes a canonical port set (`9555`, `9444`, `9333`, `9222`) before process inspection.
  - This removes avoidable dependence on process inspection in environments where one CDP port is already reachable.
- Hardened `scripts/live-cdp-panel-check.mjs`:
  - Added `ensureSidecarRuntimeReady(...)` with recovery semantics:
    - strict fail when runtime endpoint is reachable but not ready
    - managed sidecar spawn + readiness wait when endpoint is unreachable and `cdpWsUrl` is available
  - Added managed-process cleanup on run completion to avoid sidecar orphaning.
- Added regression coverage:
  - `tests/scripts/live-cdp-config.spec.ts` now verifies ordered multi-port probing before discovery fallback.
  - `tests/scripts/live-cdp-panel-check.spec.ts` now verifies unreachable-sidecar recovery and reachable-not-ready no-recovery behaviour.

Verification evidence:
- `vitest run tests/scripts/live-cdp-config.spec.ts --reporter=verbose` -> pass (8/8)
- `vitest run tests/scripts/live-cdp-panel-check.spec.ts --reporter=verbose` -> pass (8/8)
- `vitest run tests/scripts/qa-smoke-runtime.spec.ts --reporter=verbose` -> pass (8/8)
- `vitest run tests/scripts/qa-automation.spec.ts --reporter=dot --no-file-parallelism` -> pass (8/8)
- `npm run qa:trace` (headed/runtime path) -> still fails in this sandbox with:
  - `classification=process_inspection_permission_failure`
  - `code=EPERM`
  - no reachable CDP endpoint on probed ports in this environment

Status:
- **partially fixed**
- Fixed: when a CDP endpoint exists on non-primary common ports, `qa:trace` can now resolve it without process inspection; sidecar-unreachable paths now have an explicit managed recovery route.
- Not fixed: this sandbox currently exposes no reachable CDP endpoint and denies process inspection (`EPERM`), so full live trace flow remains blocked by environment capabilities.
  - made invalid `playwright` module shape an explicit deterministic error
- added targeted regression tests:
  - `tests/playwright/helpers/runtime-guards.spec.ts`
  - covers bootstrap-failure path, valid launcher path, invalid module-shape path

Verification evidence:
- `vitest run tests/playwright/helpers/runtime-guards.spec.ts --reporter=verbose`
  - result: 3/3 passing
- `vitest run tests/scripts/playwright-bootstrap-check.spec.ts tests/scripts/loopback-bind.spec.ts --reporter=verbose`
  - result: 9/9 passing
- `npx vitest run tests/playwright/funnels/panel-stop-state.spec.ts --reporter=verbose --testTimeout=20000 --hookTimeout=20000`
  - result: fails immediately with `listen EPERM` (5 failing tests in ~181ms), no deadlock

Status:
- fixed for targeted failure class: bootstrap/deadlock path caused by direct funnel invocations bypassing global setup
- partially fixed overall runtime reliability: environment-level loopback bind permission failures (`EPERM`) still block headed funnel completion in this sandbox

---

## 2026-03-11 Follow-up: QA artifact manifest truth consistency

Objective: remove a reliability-contract contradiction where `qa:artifacts` could emit `output.exists=false` while still counting one output file, creating ambiguous evidence truth for automation consumers.

Root cause:
- `scripts/collect-qa-artifacts.mjs` always injected the generated manifest path into the `output` root file list, even when `output/` did not exist at scan time.
- this caused `fileCount=1` for `output` while `exists=false` in empty-root scenarios.

Implemented:
- updated `scripts/collect-qa-artifacts.mjs` so:
  - root-level file counts only include files from roots that actually existed during scan
  - manifest output path is always included in top-level `files` list (for traceability), independent of root existence
- no registry/schema changes required; this is a contract-correctness fix.

Verification evidence:
- `npm run test -- tests/scripts/qa-automation.spec.ts --reporter=verbose`
  - result: 8/8 passing (including `writes a valid empty manifest when no artifact roots exist`)
- isolated empty-root execution:
  - `node scripts/collect-qa-artifacts.mjs --root <tmp> --output <tmp>/output/qa-artifacts/manifest.json`
  - observed summary:
    - `output.exists=false`
    - `output.fileCount=0`
    - `files=["output/qa-artifacts/manifest.json"]`
- workspace artifact run:
  - `npm run qa:artifacts`
  - observed manifest remains valid with `filesHasManifest=true` and non-empty roots in populated workspace.

Status:
- fixed for targeted failure class (`validation-failure` in evidence contract semantics).

GitHub sync status for this run:
- `gh auth status` -> failed (invalid token)
- `gh repo view` / `gh issue list --state open --limit 30` -> failed (`error connecting to api.github.com`)
- retry with `GH_DEBUG=api gh issue list --state open --limit 30` -> `lookup api.github.com: no such host`
- `curl -I https://api.github.com` -> `curl: (6) Could not resolve host`
- classified as: `network_failure` (primary), `auth_failure` (secondary)

Residual gap:
- GitHub issue sync for this update is blocked by DNS/network failure in current environment; UNSYNCED backup issue draft added under `reports/fix-agent/issue-drafts/`.

---

## 2026-03-11 Follow-up: bootstrap classification contract hardening

Objective: replace brittle bootstrap failure string matching with a shared, explicit classification contract so smoke and benchmark flows report authoritative runtime bootstrap truth.

Implemented:
- `scripts/lib/playwright-bootstrap-check.cjs`
  - added `classifyPlaywrightBootstrapFailure(...)` and `parseBootstrapFailureDetail(...)`
  - `assertPlaywrightBootstrapReady(...)` now throws a typed `PlaywrightBootstrapError` with structured fields:
    - `classification`
    - `phase`
    - `code`
    - `signal`
    - `detail`
- `scripts/lib/browser-course-bootstrap.cjs`
  - removed regex-only failure detection dependency
  - readiness now returns deterministic `failureMode` derived from bootstrap classification
- `scripts/live-local-browser-course.mjs`
  - when bootstrap is not ready, emits `failureMode: bootstrapReadiness.failureMode`
- `scripts/live-gemini-browser-course.mjs`
  - when bootstrap is not ready, emits `failureMode: bootstrapReadiness.failureMode`
- `tests/playwright/helpers/runtime-guards.ts`
  - bootstrap gate errors now include classification/code/phase in deterministic message

Regression coverage added/updated:
- `tests/scripts/playwright-bootstrap-check.spec.ts`
  - classification of dependency-missing failures
  - parsing detail into structured classification/phase/code/signal
  - timeout assertion now checks explicit classified failure detail
- `tests/scripts/browser-course-bootstrap.spec.ts`
  - readiness failure path now asserts `failureMode` propagation
- `tests/playwright/helpers/runtime-guards.spec.ts`
  - bootstrap failure test now asserts classified guard output

Verification evidence:
1. `npx vitest run tests/scripts/playwright-bootstrap-check.spec.ts tests/scripts/browser-course-bootstrap.spec.ts tests/playwright/helpers/runtime-guards.spec.ts tests/scripts/qa-automation.spec.ts --reporter=verbose`
   - result: 4 files passed, 22 tests passed.
2. `npm run qa:smoke`
   - result: deterministic fail-fast bootstrap verdict with explicit classification:
     - `PlaywrightBootstrapError`
     - `classification=runtime_bootstrap_timeout`
     - `phase=load-playwright-core`
     - `code=ETIMEDOUT`
3. `npm run qa:trace`
   - result: deterministic classified CDP discovery verdict remains intact:
     - `classification=process_inspection_permission_failure`
     - `code=EPERM`

Status:
- fixed for targeted failure class: bootstrap verdicts are now contract-based and reusable across smoke + browser-course entrypoints.
- partially fixed overall runtime completion: this environment still blocks full headed flows (`runtime_bootstrap_timeout`, loopback `EPERM`, process-inspection `EPERM`).

GitHub sync status for this run:
- `gh auth status` -> failed (invalid token)
- `gh repo view` / `gh issue list --state open --search "runtime reliability" --limit 20` -> failed (`error connecting to api.github.com`)
- retry with `GH_DEBUG=api gh issue list --state open --search "runtime reliability" --limit 20` -> `lookup api.github.com: no such host`
- `curl -I https://api.github.com` -> `curl: (6) Could not resolve host`
- classified as: `network_failure` (primary) with concurrent `auth_failure`

Residual gap:
- GitHub issue sync remains blocked by DNS/auth failure in this environment; local unsynced draft was updated as temporary backup.

## 2026-03-11 Follow-up: local benchmark startup truth and classified failure preservation

### Stage 1 - Understand and define
Objective: prevent `benchmark:browser:local` from crashing on startup bind failures so all canonical local-course tasks still emit structured, classified failure evidence.

Public interfaces and data shapes:
- `scripts/lib/browser-course-bootstrap.cjs`
  - `extractFailureModeFromText(text) -> string`
  - `classifyBenchmarkRuntimeFailure(error) -> { failureMode, detail } | null`
- `scripts/live-local-browser-course.mjs` aggregate fields:
  - `startupReady: boolean`
  - `startupFailure: string`
- Per-scenario benchmark result fields preserved:
  - `status`, `failureMode`, `hardFailure`, `detail`

Edge cases and failure modes addressed:
- startup local fixture bind denied (`EPERM`) previously aborted process before summary write
- runtime errors with embedded `classification=...` previously collapsed into `runner_error`

Minimal module list:
- `scripts/lib/browser-course-bootstrap.cjs`
- `scripts/live-local-browser-course.mjs`
- `scripts/live-gemini-browser-course.mjs`
- `tests/scripts/browser-course-bootstrap.spec.ts`

### Stage 2 - Test design
Happy path tests:
- bootstrap readiness still reports ready path unchanged.

Failure path tests:
- classify bootstrap errors to typed mode (`runtime_bootstrap_timeout`).
- preserve explicit runtime classifications (`process_inspection_permission_failure`).
- parse `classification=...` and `failureMode=...` tokens from text.

Recovery/continuation path tests:
- when startup fails, local benchmark should still produce aggregate + per-scenario classified hard-fail records.

Counterpart controls:
- startupReady/startupFailure contract verifies entry/exit state of benchmark startup stage.

### Stage 3 - Implement
Changes:
- Added structured runtime classification helpers to `scripts/lib/browser-course-bootstrap.cjs`.
- Updated both browser-course benchmark scripts to use shared runtime classification (`classifyBenchmarkRuntimeFailure`) instead of collapsing unknown runtime errors into `runner_error`.
- Hardened `scripts/live-local-browser-course.mjs` startup:
  - catches local server startup failure
  - still builds scenarios and writes `summary.json` + per-scenario `benchmark-result.json`
  - emits `startupReady=false` and `startupFailure` with classified detail

### Stage 4 - Functional verification
Commands and outcomes:
1. `./node_modules/.bin/vitest run tests/scripts/browser-course-bootstrap.spec.ts --reporter=verbose --pool=forks`
- Expected: classification helper tests pass.
- Did it do that: yes.
- Evidence: `7 passed (7)`.

2. `./node_modules/.bin/vitest run tests/bench/browser-model-benchmark.spec.ts --reporter=verbose --pool=forks`
- Expected: benchmark runner contract remains green.
- Did it do that: yes.
- Evidence: `2 passed (2)`.

3. `node scripts/live-local-browser-course.mjs`
- Expected: no startup crash; aggregate and scenario files written with classified failure mode.
- Did it do that: yes.
- Evidence from command output:
  - `startupReady: false`
  - `startupFailure: ... classification=loopback_bind_permission_failure; code=EPERM`
  - scenario results include `failureMode: loopback_bind_permission_failure` for all `local-course-*` scenarios.

### Stage 5 - Real-world visible verification
Action:
- Ran real benchmark entrypoint command: `node scripts/live-local-browser-course.mjs`.

Gate answers:
- Expected outcome: command should produce machine-readable aggregate even when startup bind fails.
- Did it do that: yes.
- If no, why not: n/a.
- Anything else suspicious/broken: yes; host sandbox still blocks loopback binds (`EPERM`), so interactive local-course execution remains environment-blocked.

### Stage 6 - Product quality review
What improved:
- Local benchmark now preserves authoritative failure truth across all scenarios instead of terminating before evidence exists.
- Failure taxonomy is now shared across both local/public benchmark scripts, reducing generic `runner_error` overuse.

What remains off:
- Environment-level bind restrictions still prevent headed local-course task execution.

### Stage 7 - Final completion
Plan:
1. Add shared runtime failure-class extraction primitive.
2. Wire benchmark scripts to preserve structured runtime classifications.
3. Harden local benchmark startup to produce evidence instead of crashing.
4. Verify via focused tests and real command output.

Tests:
- ✅ `tests/scripts/browser-course-bootstrap.spec.ts` (7/7)
- ✅ `tests/bench/browser-model-benchmark.spec.ts` (2/2)
- ✅ `node scripts/live-local-browser-course.mjs` now emits full aggregate with classified startup failure evidence.

Implementation:
- Shared classification helper + benchmark wiring + startup evidence preservation for local benchmark path.

PR note:
- Summary: local benchmark no longer loses evidence on startup bind failures; classified failure modes are preserved across scenarios and benchmark scripts.
- Risks: startup-failure aggregates now return structured hard-fail rows where command previously crashed; downstream consumers must treat `startupReady=false` as environment-blocked state.
- Tradeoffs: chose truthful degraded output over process abort to improve triage continuity and regression tracking.
- Rollback plan: revert `scripts/lib/browser-course-bootstrap.cjs`, `scripts/live-local-browser-course.mjs`, and benchmark script imports to restore prior crash-on-startup behavior.
