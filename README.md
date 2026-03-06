# New Browser Sidecar

Source for the local sidecar server and the single Assistant browser extension used by this project. This repo is a development tree, not a packaged desktop browser app.

If you want the project to be fully functional, you need all three pieces working together:

1. a Chromium-based browser with CDP enabled
2. the `extension/` side panel loaded into that browser
3. the sidecar server running on `127.0.0.1:3210`

## What this repo contains

- `sidecar/`: Node/TypeScript sidecar server, agent loop, provider integrations, CDP bridge
- `extension/`: the only Assistant extension you should run or edit
- `scripts/start-sidecar.mjs`: recommended launcher for the full stack
- `scripts/launch-browser-only.mjs`: launches the browser + extension only, without the sidecar
- `tests/`: unit, integration, extension, and funnel coverage

## Requirements

- Node.js 18 or newer
- npm
- A Chromium-based browser

For the smoothest setup, use ungoogled Chromium.

The launcher script auto-detects a browser binary only in these macOS locations:

- `/Applications/ungoogled-chromium.app/Contents/MacOS/Chromium`
- `~/.local/share/new-browser/ungoogled-chromium.app/Contents/MacOS/Chromium`

If your browser binary lives anywhere else, set `NEW_BROWSER_BROWSER_BINARY` explicitly. That is required on Linux/Windows and on any custom macOS install.

## Quickstart

```bash
git clone https://github.com/Pmen225/NewBrowser.git
cd NewBrowser
npm install
```

If your browser is not in one of the auto-detected paths, set the binary first:

```bash
export NEW_BROWSER_BROWSER_BINARY="/absolute/path/to/Chromium"
```

Start the full stack:

```bash
npm start
```

What `npm start` does:

1. Checks whether a CDP browser is already available.
2. If not, launches Chromium with the repo’s `extension/` loaded.
3. Starts the sidecar server on `http://127.0.0.1:3210`.
4. Exposes:
   - health: `http://127.0.0.1:3210/health`
   - SSE: `http://127.0.0.1:3210/events`
   - RPC: `ws://127.0.0.1:3210/rpc`

Verify the sidecar is alive:

```bash
curl http://127.0.0.1:3210/health
```

For full browser control, the health response should show `mode: "cdp"`.

## First-run setup

After `npm start` opens the browser:

1. Pin the `Assistant` extension if it is not already visible.
2. Click the extension action. The side panel opens because the extension is configured to open the panel on action click.
3. Open the panel settings with the gear icon.
4. In **Provider**, save a provider key.
5. Optionally click **Sync** in **Models** so the catalog is populated from the provider.
6. Return to the panel and send a prompt.

Without a provider configured in the extension, the panel can load but `AgentRun` will fail with a provider API key error.

## Browser-control model approval

Google browser-control models can now be promoted through the extension UI instead of hardcoding policy by hand.

Settings flow:

1. Open the extension settings.
2. Add or sync a Google model.
3. Click `Benchmark` or `Re-run benchmark` on that model.
4. Let the live browser-control course finish.
5. The model is recorded locally as `approved`, `experimental`, or `blocked`.

What the benchmark does:

- runs the real side panel against `https://the-internet.herokuapp.com`
- scores only browser-control tasks, not search quality
- verifies the DOM end state for:
  - checkboxes
  - dropdown
  - dynamic controls
  - JavaScript prompt
  - inputs
  - file upload

Policy behavior:

- browser-control auto selection prefers `approved` benchmark results first
- `experimental` models stay selectable, but are not trusted defaults
- `blocked` models are excluded from browser-control auto selection

Current safe default for browser-control remains:

- `models/gemini-2.5-flash`

## Benchmark tab behavior

Benchmark runs open dedicated site/panel tabs with an internal benchmark marker.

During the run:

- the benchmark tabs are grouped together
- stale benchmark tabs from interrupted runs are swept on the next benchmark start

After the run:

- the benchmark tabs are closed automatically
- the browser stays open so you can keep using the panel

## Supported providers

The runtime currently supports:

- `openai`
- `anthropic`
- `google`
- `deepseek`

The options UI may contain placeholder text for other providers, but the working runtime in this repo is the list above.

For normal panel usage, provider keys are read from the extension’s local storage. In practice that means:

- saving a key in the extension settings is the supported path
- environment variables can prime server-side provider state, but they do not replace extension provider setup for normal panel chats

## Recommended setup path

Use this unless you have a specific reason not to:

```bash
npm install
npm start
```

Why this path is preferred:

- it loads the correct `extension/`
- it keeps the sidecar on the port the extension expects
- it launches a compatible CDP session if one is not already running
- it uses a persistent browser profile at `~/.local/share/new-browser/chrome-profile`

Browser launcher logs are written under that profile directory:

- `launcher.stdout.log`
- `launcher.stderr.log`

## Advanced: attach to an existing browser

This is supported, but it has an important caveat: if you attach to an already-running CDP browser, `npm start` does not inject the extension into that browser for you. You must load the unpacked extension yourself.

### Option A: explicit WebSocket URL

```bash
export CHROME_CDP_WS_URL="ws://127.0.0.1:9222/devtools/browser/..."
npm start
```

### Option B: host/port discovery

```bash
export CHROME_CDP_HOST="127.0.0.1"
export CHROME_CDP_PORT="9222"
npm start
```

### If you use attach mode

You also need to:

1. start Chromium with remote debugging enabled
2. load `extension/` as an unpacked extension
3. keep the sidecar on `127.0.0.1:3210`, unless you also patch the extension sources

## Useful environment variables

### Browser and extension

| Variable | Purpose |
|---|---|
| `NEW_BROWSER_BROWSER_BINARY` | Absolute path to the Chromium binary to launch |
| `NEW_BROWSER_EXTENSION_PATH` | Override the extension path; default is repo `extension/` |
| `CHROME_USER_DATA_DIR` | Override the persistent browser profile directory |
| `CHROME_CDP_WS_URL` | Attach to an existing browser via a full CDP websocket URL |
| `CHROME_CDP_HOST` | CDP host for discovery mode |
| `CHROME_CDP_PORT` | CDP port for discovery mode |
| `CHROME_CDP_HTTP_URL` | Override the `json/version` endpoint used for discovery |

### Sidecar

| Variable | Purpose |
|---|---|
| `SIDECAR_TRACE_DIR` | Trace/output directory; default is `.sidecar-traces` |
| `SIDECAR_PROVIDER_STATE_PATH` | Persisted provider metadata cache path |
| `AGENT_MAX_STEPS` | Default maximum steps for the agent loop |

### Provider state priming

These can pre-seed sidecar provider metadata:

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_BASE_URL`
- `GEMINI_API_KEY` or `GOOGLE_API_KEY`
- `GEMINI_BASE_URL` or `GOOGLE_BASE_URL`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`

For full panel usage, still configure a provider in the extension settings.

## Ports and paths that matter

The extension is wired to the local sidecar on port `3210`. If you change the sidecar port, the stock extension in this repo will not connect unless you also update the extension source.

Default runtime values:

- sidecar host: `127.0.0.1`
- sidecar port: `3210`
- RPC path: `/rpc`
- events path: `/events`
- browser profile: `~/.local/share/new-browser/chrome-profile`

## Running only the browser + extension

For extension inspection only:

```bash
npm run launch:browser
```

This launches Chromium with the extension loaded and then exits. It does not start the sidecar, so the assistant will not be fully functional.

## Testing and checks

Type and static checks:

```bash
npm run typecheck
npm run lint
```

Core tests:

```bash
npm test
```

Targeted suites:

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:funnels
```

Playwright-based suites require Chromium to be installed for Playwright as well:

```bash
npx playwright install chromium
```

## Project layout

| Path | Purpose |
|---|---|
| `extension/` | The single source of truth for the Assistant extension |
| `sidecar/src/` | HTTP server, SSE, RPC, CDP transport, agent orchestration |
| `shared/src/` | Shared transport and protocol types |
| `src/` | Root-level browser/CDP helpers used by the sidecar |
| `scripts/` | Launchers and repo utilities |
| `tests/` | Automated test suites |
| `REF DOCS/` | Reference snapshots and extracted docs; not the live extension |

## Extension note

There are multiple `manifest.json` files in the repo because `REF DOCS/` contains extracted reference material. The only Assistant extension you should run is:

- `extension/`

Do not create another Assistant extension elsewhere in the repo.

## Troubleshooting

### `Sidecar offline` in the panel

- Make sure `npm start` is still running.
- Check `curl http://127.0.0.1:3210/health`.
- Do not move the sidecar off port `3210` unless you also patch the extension.

### Browser opens, but page control does not work

- Check `/health` and confirm `mode` is `cdp`, not `ping_only`.
- If you attached to an existing browser, make sure that browser was started with remote debugging.

### Panel opens, but sending a prompt fails immediately

- Configure a provider in the extension settings.
- Supported providers here are `openai`, `anthropic`, `google`, and `deepseek`.

### `npm start` attaches to the wrong browser

- The launcher checks for an existing CDP endpoint first.
- Close any browser already exposing remote debugging on the configured CDP port, or set `CHROME_CDP_WS_URL` / `CHROME_CDP_PORT` explicitly.

### Browser binary not found

- Set `NEW_BROWSER_BROWSER_BINARY` to the absolute path of your Chromium binary.

### I want the side panel but not the launcher-managed browser

- Start your own Chromium with remote debugging.
- Load `extension/` unpacked.
- Then run `npm start` with the appropriate `CHROME_CDP_*` variables.

## Notes

- This repo is not a packaged browser build.
- The browser surface takeover UI is implemented by the extension and sidecar working together; starting only one of them is not enough.
- `npm run dev` currently just boots the same runtime path after basic file presence checks.
