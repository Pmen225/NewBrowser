# UNSYNCED BACKUP: panel-ui-ux shell contract timeout

- Status: UNSYNCED BACKUP (GitHub unavailable this run; not system of record)
- Task name: `tests/extension/panel-ui-ux.spec.ts`
- Run ID: `fix-agent-20260311T130526Z-live`
- Expected outcome: all shell contract tests pass.
- Observed outcome: one shell bootstrap test timed out at 15000ms; two tests passed.
- Dominant failure classification: `settling_failure`
- Likely subsystem: `test harness or coverage definition`
- New/recurring/regression: new in this run history set
- Best-guess smallest structural fix class: stabilise shell bootstrap test readiness condition (timeout and deterministic wait target)
- Screenshot references: none for this spec failure.
- Trace/artifact references:
  - `output/playwright/automation-fix-agent/fix-agent-20260311T130526Z-live/logs/panel_ui_ux_rotating.out.log`
  - `output/playwright/automation-fix-agent/fix-agent-20260311T130526Z-live/logs/panel_ui_ux_rotating.err.log`

## Sync failure evidence
- `gh auth status` exit `1` (token invalid)
- `gh repo view` exit `1` (error connecting to api.github.com)
- `gh issue list --state all --limit 200` exit `1`
- `GH_DEBUG=api gh repo view` exit `1` (`lookup api.github.com: no such host`)
- `GH_DEBUG=api gh issue list --state all --limit 200` exit `1` (`lookup api.github.com: no such host`)
- `curl -I https://api.github.com` exit `6` (`Could not resolve host: api.github.com`)

## Final truth gate evidence
- `gh auth status` exit `1`
- `gh repo view` exit `1`
- `gh issue list --state all --limit 1` exit `1`
- `curl -I https://api.github.com` exit `6`
