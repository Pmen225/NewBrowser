# Test Plan

## Automated

- Unit:
  - `npm run test:unit`
  - `npx vitest run tests/extension/panel-shell.spec.ts tests/extension/panel-ui-ux.spec.ts`
- Integration:
  - `npm run test:integration`
  - `npx vitest run tests/e2e/assistant-shell-ui.e2e.spec.ts`
- Full regression:
  - `npm run test`

## Required UI Scenarios

- Extension panel renders the assistant-first shell instead of the old utility stack.
- Slash palette opens when the composer starts with `/`.
- Slash keyboard navigation works with `ArrowUp`, `ArrowDown`, `Enter`, and `Escape`.
- Saved prompts persist through `chrome.storage.local` and can be reused, pinned, and deleted.
- The advanced drawer defaults closed and still exposes legacy controls.
- The sources view shows explicit empty state text when no URLs are captured.
- The sidecar shell renders faux browser chrome, assistant rail, and diagnostics drawer.

## Manual Smoke

- Start the sidecar and load the extension.
- Validate keyboard-only tab flow across the header, view switcher, composer, saved prompts, and advanced drawer.
- Disconnect the sidecar and confirm the panel shows a visible disconnected/error state.
- Reconnect and confirm the status chip returns to connected.
- Save a prompt, reload the panel, and confirm the draft/prompt data persists.
- Trigger the sidecar shell page and confirm diagnostics can be toggled without breaking connect/ping.
