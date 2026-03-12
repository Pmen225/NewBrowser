# UNSYNCED BACKUP - [validation-failure] qa artifact manifest reports contradictory root truth

GitHub sync status: `network_failure` (with concurrent `auth_failure`)

## Failure record

- Surface: `npm run qa:artifacts` contract (`scripts/collect-qa-artifacts.mjs`)
- Expected outcome:
  - if `output/` does not exist at scan time, root entry should remain `exists=false` and `fileCount=0`
  - manifest output path should still be traceable in top-level `files`
- Actual (before fix):
  - empty-root scenario produced `output.exists=false` and `output.fileCount=1`
  - this mixed two conflicting truths in one record
- Failure classification: `validation-failure`
- Likely subsystem: artifact evidence/contract layer
- New/Recurring/Regression: recurring test failure in `tests/scripts/qa-automation.spec.ts`

## Structural fix implemented

- File changed: `scripts/collect-qa-artifacts.mjs`
- Root-level counts are now computed from scanned existing roots only.
- Generated manifest path is always included in top-level `files` list, even when roots were absent.
- This preserves evidence traceability without corrupting root existence semantics.

## Evidence

1. Regression suite:
   - Command: `npm run test -- tests/scripts/qa-automation.spec.ts --reporter=verbose`
   - Outcome: `8 passed, 0 failed`
2. Empty-root deterministic proof:
   - Command: `node scripts/collect-qa-artifacts.mjs --root <tmp> --output <tmp>/output/qa-artifacts/manifest.json`
   - Observed:
     - `output.exists=false`
     - `output.fileCount=0`
     - `files=["output/qa-artifacts/manifest.json"]`
3. Populated workspace sanity:
   - Command: `npm run qa:artifacts`
   - Outcome: manifest generated successfully; top-level files include manifest path.

## Status

- fixed

## GitHub sync failure evidence (exact commands)

1. `gh auth status`
   - exit: `1`
   - key stderr: `The token in default is invalid.`
   - classification: `auth_failure`
2. `gh repo view`
   - exit: `1`
   - key stderr: `error connecting to api.github.com`
3. `gh issue list --state open --limit 30`
   - exit: `1`
   - key stderr: `error connecting to api.github.com`
4. Retry with debug:
   - `GH_DEBUG=api gh issue list --state open --limit 30`
   - key stderr: `lookup api.github.com: no such host`
5. Connectivity check:
   - `curl -I https://api.github.com`
   - exit: `6`
   - key stderr: `Could not resolve host: api.github.com`
   - classification: `network_failure`
