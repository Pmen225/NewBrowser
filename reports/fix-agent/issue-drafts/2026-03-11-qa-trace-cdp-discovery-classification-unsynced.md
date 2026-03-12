# UNSYNCED BACKUP - [runtime-failure] qa-trace CDP discovery now probes common ports before inspection and supports managed sidecar recovery

## What changed
- Hardened `scripts/lib/live-cdp-config.js` so `resolveLiveCdpWsUrl(...)` probes known ports (`9555`, `9444`, `9333`, `9222`) before process inspection.
- Kept deterministic CDP discovery classification output (`classification`, `code`) for process-inspection failures.
- Hardened `scripts/live-cdp-panel-check.mjs` with `ensureSidecarRuntimeReady(...)` recovery:
  - strict fail when health endpoint is reachable but runtime-not-ready
  - spawn managed sidecar and wait for runtime readiness when health endpoint is unreachable and `cdpWsUrl` is known
  - managed sidecar cleanup after run
- Added regression tests:
  - `tests/scripts/live-cdp-config.spec.ts` verifies multi-port direct probe ordering before discovery fallback
  - `tests/scripts/live-cdp-panel-check.spec.ts` verifies managed sidecar recovery path and reachable-no-recovery guard

## Evidence
### Commands rerun
1. `./node_modules/.bin/vitest run tests/scripts/live-cdp-config.spec.ts --reporter=verbose`
   - Result: pass (8/8)
2. `./node_modules/.bin/vitest run tests/scripts/live-cdp-panel-check.spec.ts --reporter=verbose`
   - Result: pass (8/8)
3. `./node_modules/.bin/vitest run tests/scripts/qa-smoke-runtime.spec.ts --reporter=verbose`
   - Result: pass (8/8)
4. `./node_modules/.bin/vitest run tests/scripts/qa-automation.spec.ts --reporter=dot --no-file-parallelism`
   - Result: pass (8/8)
5. `npm run qa:trace`
   - Result: fail-fast with classified runtime truth:
     - `classification=process_inspection_permission_failure`
     - `code=EPERM`

## Current status
- Status: **partially fixed**
- Fixed: `qa:trace` no longer relies only on the primary CDP port before process inspection and can recover sidecar runtime unreachability when a CDP websocket is already known.
- Not fixed: this sandbox still has no reachable CDP endpoint and blocks process inspection permission (`EPERM`), so `qa:trace` cannot complete live panel flow here.

## What remains
- Resolve sandbox/system constraints so at least one CDP endpoint is reachable on known probe ports or provide an explicit `LIVE_CDP_WS_URL`.
- Once GitHub is reachable, sync this update to the active runtime reliability issue tracking `qa:trace` actionability/runtime-failure.
