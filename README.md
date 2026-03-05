# New Browser Sidecar

UI-first local sidecar and Chrome extension surfaces for the New Browser assistant workflow.

## Surfaces

- `extension/panel.*`: the real side panel assistant UI.
- `sidecar/src/http/ui.ts`: the Atlas-style browser-shell mock used by the local sidecar web page.

## Run

- Start the sidecar:
  - `npm start`
- Load the extension from the `extension/` directory in a Chromium-based browser.

## Test

- Lint/typecheck:
  - `npm run lint`
  - `npm run typecheck`
- Unit/integration/e2e:
  - `npm run test:unit`
  - `npm run test:integration`
  - `npm run test:e2e`
- Full suite:
  - `npm run test`

## Notes

- The sidecar shell is a visual mock for browser-level UX. It does not replace native browser chrome.
- The extension panel keeps legacy low-level actions, but they now live in the advanced tools drawer.
