# UNSYNCED BACKUP - [runtime-failure] local browser-course benchmark crashed before writing summary on startup bind failure

GitHub sync status: `network_failure` (with concurrent `auth_failure`)  
Primary system-of-record sync failed during this run; this draft is temporary backup only.

## Failure class and scope
- Surface: `benchmark:browser:local` (`scripts/live-local-browser-course.mjs`)
- Canonical tasks affected: all `local-course-*` benchmark scenarios
- Prior behavior: local benchmark aborted process on startup bind failure (`listen EPERM`) and produced only stderr, not per-scenario failure records.
- Reliability impact: runtime truth and scorecard triage lost structured evidence; failure collapsed into command crash.

## Structural change implemented
- Added shared extraction of structured runtime failure modes in `scripts/lib/browser-course-bootstrap.cjs`:
  - `extractFailureModeFromText(...)`
  - `classifyBenchmarkRuntimeFailure(error)`
- Wired both benchmark scripts to consume shared classification primitive:
  - `scripts/live-local-browser-course.mjs`
  - `scripts/live-gemini-browser-course.mjs`
- Hardened `live-local-browser-course` startup path:
  - if local fixture server startup fails, continue to generate full aggregate + scenario result artifacts
  - classify each scenario as `hard_fail` with concrete `failureMode` (for this environment: `loopback_bind_permission_failure`)
  - include aggregate startup truth fields:
    - `startupReady`
    - `startupFailure`

## Evidence
### Tests
1. `./node_modules/.bin/vitest run tests/scripts/browser-course-bootstrap.spec.ts --reporter=verbose --pool=forks`
   - Result: pass (7/7)
2. `./node_modules/.bin/vitest run tests/bench/browser-model-benchmark.spec.ts --reporter=verbose --pool=forks`
   - Result: pass (2/2)

### Runtime command rerun
3. `node scripts/live-local-browser-course.mjs`
   - Result: exits successfully with structured aggregate output (no crash)
   - Aggregate now includes:
     - `startupReady: false`
     - `startupFailure: local browser course server failed to bind ... classification=loopback_bind_permission_failure; code=EPERM`
   - All scenario results now present with:
     - `status: hard_fail`
     - `failureMode: loopback_bind_permission_failure`

## Honest status
- Status: **partially fixed**
- Fixed: startup bind failure no longer destroys benchmark evidence; failure mode is now explicit and preserved across scenarios.
- Not fixed: host sandbox still denies loopback bind (`EPERM`), so local benchmark cannot execute interactive flows in this environment.

## GitHub sync failure evidence (required command path)
1. `gh auth status`
- exit code: `1`
- stderr excerpt: `The token in default is invalid.`

2. `gh repo view`
- exit code: `1`
- stderr excerpt: `error connecting to api.github.com`

3. `gh issue list --state open --search "runtime reliability" --limit 50`
- exit code: `1`
- stderr excerpt: `error connecting to api.github.com`

4. `GH_DEBUG=api gh issue list --state open --search "runtime reliability" --limit 50`
- exit code: `1`
- stderr excerpt: `lookup api.github.com: no such host`

5. `curl -I https://api.github.com`
- exit code: `6`
- stderr excerpt: `Could not resolve host: api.github.com`

Classified sync state for this run:
- primary: `network_failure`
- secondary: `auth_failure`
