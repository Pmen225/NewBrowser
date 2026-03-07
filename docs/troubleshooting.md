# Troubleshooting

## Audience

- Codex 5.3

## Fast Path

- `npm run dev`
- `npm run test:all`

## Canonical Recovery Commands

- `npm run dev`
- `npm run test:all`
- `npm start`

## Failures

### Sidecar Disconnected

Symptoms

- The panel shows a disconnected or unavailable status.

Checks

- Confirm `npm run dev` or `npm start` is running.
- Confirm the sidecar did not exit after browser startup.

Recovery

- Start the stack with `npm run dev`.
- Use `Reconnect` in the panel or `Connect WS` in the sidecar shell.
- Reload the extension side panel if the status does not recover.

### Extension Not Loaded

Symptoms

- The browser opens without a working side panel.
- The panel reports `missing`.

Checks

- Confirm `extension/manifest.json` exists.
- Confirm the unpacked extension is loaded from `extension/`.
- Confirm the browser profile allows the `sidePanel` permission.

Recovery

- Ensure `extension/manifest.json` and required files exist.
- Run `npm run dev` or `npm start`.
- Reload the extension and reopen the side panel.

### No Sources Available

Symptoms

- The UI shows no source cards.

Checks

- Confirm the current runtime activity includes URLs the UI can derive.

Recovery

- Do not treat this as a build failure.
- Continue only if sources are not required for the current task.

### Storage Failures

Symptoms

- Prompt saves or local UI state updates fail repeatedly.

Checks

- Confirm the extension still has access to `chrome.storage.local`.

Recovery

- Remove and reload the extension.
- Rerun `npm run dev` if the sidecar session also needs to be restored.

### Provider Vault Locked

Symptoms

- Provider calls fail because the vault is locked.

Checks

- Confirm the passphrase matches the one used when the key was saved.

Recovery

- Re-enter the vault passphrase in the Settings view.
- Use `Unlock`.

### Interactive Agent Blocked

Symptoms

- An agent run fails with `REQUEST_BLOCKED`.
- The run stops after a `find` step and does not complete the intended click or form action.

Checks

- Confirm the prompt refers to a real visible interactive target on the active page.
- Confirm `find` can resolve at least one match for the requested button, field, or control.
- Confirm the matched element exposes a usable `ref` or click coordinates.

Recovery

- Make the prompt more specific about the target element.
- Refresh or navigate the page again if the DOM changed since the run started.
- Re-run the focused agent contract tests if the failure started after a backend change.

## Hard Constraints

- Do not assume the extension output is fresh.
- Do not assume the sidecar is running just because the browser is open.
- Ensure `extension/` is present and complete before blaming missing extension assets.
- Do not treat `REQUEST_BLOCKED` as a transport outage; it is an intentional agent safety stop when interaction targets cannot be resolved.
