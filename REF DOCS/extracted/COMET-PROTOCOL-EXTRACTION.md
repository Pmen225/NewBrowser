# Comet protocol extraction — quick, highest-probability

Goal: get **exact or highest-probability** values for step budget, actions-per-step cap, failure tolerance, replan cadence, and protocol shape (`actions[]`, `step_type`, etc.) by inspecting Comet while it runs.

---

## Fast path (one run → answers)

### 1. Capture one Comet task (5–10 min)

1. **Open Chrome with Comet extension enabled.**
2. **DevTools** (F12 or Cmd+Option+I) → **Network** tab.
3. **Enable:** "Preserve log"; filter **WS** and/or **Fetch/XHR**.
4. **Start recording.** Trigger one Comet task (e.g. "Search for X"). Let it finish or pause.
5. **Stop recording.** Select WS connection(s) and relevant fetch requests.
6. **Export:** WS → Right-click → "Save all as HAR with content" (or copy Messages). Fetch → "Copy as cURL" or "Save as HAR".
7. **Save** into `REF DOCS/extracted/comet-capture/`: e.g. `comet-ws.har`, `comet-messages.txt`.

**Look for in messages:** `actions`, `steps`, `step_type`, `browser_tool`, `BROWSER_OPEN_TAB`, and numbers like `50`, `10`, `3`, `5`, `250`, `max_steps`, `timeout`.

---

## If limits not in traffic: extension source scan (~5 min)

1. **chrome://extensions** → Developer mode → note Comet extension ID.
2. Go to `chrome-extension://<ID>/` → open DevTools → **Sources**.
3. **Search** (Cmd+Shift+F) for: `step_type`, `browser_tool`, `BROWSER_OPEN`, `actions`, `50`, `10`, `3`, `5`, `250`, `maxSteps`, `max_steps`, `batchSize`, `failureTolerance`, `replan`, `timeout`, `debounce`.
4. Note file:line and context. Save to `REF DOCS/extracted/comet-capture/extension-constants.txt`.

---

## After capture

Put HARs and `extension-constants.txt` in `REF DOCS/extracted/comet-capture/`. Use them to build a comet-protocol-and-limits reference for REF DOCS.

**Order:** Do step 1 first (network). If limits are missing, do step 2 (extension search). Fastest path to exact or highest-probability answer.

---

## Completed extraction (from Comet.app agents.crx)

Comet.app’s **agents.crx** was unpacked and scanned. Results:

- **extension-constants.txt** — raw grep hits and locations.
- **comet-protocol-and-limits.md** — structured protocol and limits (ComputerBatch, BROWSER_TASK_*, timeouts 100–200 ms, 250 ms, 2500 ms, 1e3/1e4; no client-side max_steps or max_actions per batch).
- **unpacked-agents/** — full unpacked extension (background.js, content.js, overlay.js, etc.).

Step budget and actions-per-step cap were **not** found in the client; they may be server-side. For those, capture one Comet run (Network → WS/fetch) and inspect server payloads.
