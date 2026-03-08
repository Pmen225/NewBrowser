# Task 23/24 BYOK + Ungoogled Runbook

## Default startup policy
- Browser policy defaults to `ungoogled_only`.
- Sidecar requires an extension path and exits if it cannot launch a compliant browser.

## Environment knobs
- `NEW_BROWSER_BROWSER_POLICY`: `ungoogled_only` | `prefer_ungoogled` | `any_chromium`
- `NEW_BROWSER_BROWSER_BINARY`: optional absolute path override for the browser executable
- `NEW_BROWSER_EXTENSION_PATH`: absolute path to extension folder
- Backward compatibility: `COMET_BROWSER_POLICY` and `COMET_EXTENSION_PATH` are still accepted.
- Backward compatibility: `COMET_BROWSER_BINARY` is also accepted.
- `CHROME_CDP_PORT`: remote debugging port (default `9222`)
- `CHROME_USER_DATA_DIR`: optional browser profile path

## Start locally
1. From project root, run `npm run start`.
2. On this macOS setup, `npm run start` auto-pins `NEW_BROWSER_BROWSER_BINARY` to `~/.local/share/new-browser/ungoogled-chromium.app/Contents/MacOS/Chromium` when that executable exists and no explicit override is already set.
3. Open sidecar health endpoint at `http://127.0.0.1:3210/health`.
4. Confirm:
- `mode: "cdp"`
- `browser_policy: "ungoogled_only"`
- `extension_loaded: true`

## Extension panel BYOK flow
1. Open side panel and select provider (`OpenAI`, `Anthropic`, `Google`, or `DeepSeek`).
2. Enter API key + passphrase, then click `Save Key`.
3. Click `Unlock` to decrypt key into in-memory session state.
4. Click `Test Provider` to validate credentials.
5. Click `Refresh Models` to load provider model list.

## Security notes
- API keys are encrypted in extension storage using PBKDF2 + AES-GCM.
- Keys are never persisted by the sidecar.
- Trace logs redact sensitive fields (`api_key`, `authorization`, `x-api-key`, token/secret suffixes).
