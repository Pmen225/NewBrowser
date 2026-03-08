# Ours vs Comet (agent & infra)

Comparison to Comet's agents extension. **Last updated: March 2026 — reflects full implementation.**

---

## 1. Protocol / batch shape

| Aspect | Comet | Ours | Status |
|--------|-------|------|--------|
| Batched low-level actions | `computer_batch`, `t.actions[]` | `ComputerBatch` / `computer`, `params.steps[]` | ✅ Match |
| Ref-based targeting | `computer_ref` in supported_features | `ref` in computer steps, form_input, find | ✅ Match |
| `step_type` in events | `step_type: e.stepType` in RUM vitals | ✅ `step_type` in `tool_start`/`tool_done` SSE | ✅ Implemented |
| `operation_key`, `failure_reason` | In RUM vitals | ✅ In tool events | ✅ Implemented |
| Task control message names | BROWSER_TASK_PAUSE_RESUME, STOP, etc. | SSE `status`/`result` (different names) | ⚠️ Different names, same function |

---

## 2. Timing / waits

| Setting | Comet | Ours | Status |
|---------|-------|------|--------|
| Inter-action delay | 100–200 ms random (`Nl=100, OR=200`) | ✅ 100–200 ms random | ✅ Match |
| FCP wait | `waitForFCP` max 2500ms | ✅ `Page.lifecycleEvent firstContentfulPaint` max 2500ms + fallback `Page.loadEventFired` | ✅ Implemented |
| Scroll wait | `yt(250)` = 250ms after scroll | ✅ 250ms after scroll | ✅ Match |
| Default page_load_wait_ms | 250ms common | ✅ 250ms | ✅ Match |
| Screenshot timeout | 1000ms fast, 10000ms full | 10s navigation timeout | ⚠️ No fast/full split |

---

## 3. Limits / defaults

| Setting | Comet | Ours | Status |
|---------|-------|------|--------|
| Max steps | 50 (speculative) | ✅ 50 | ✅ Match |
| Max actions/step | No client cap | ✅ 10 default | ✅ Conservative |
| Failure tolerance | 3 | ✅ 3 | ✅ Match |
| Replanning frequency | 0 | ✅ 0 | ✅ Match |
| Screenshot reuse | LR=1000ms (last click < 1s) | ✅ LR=1000ms | ✅ Match |

---

## 4. Action aliases

| Comet action | Our handling | Status |
|-------------|-------------|--------|
| LEFT_CLICK / click | ✅ Mapped (case-insensitive) | ✅ |
| TYPE / KEY | ✅ Mapped | ✅ |
| SCROLL / SCROLL_TO | ✅ Mapped | ✅ |
| SCREENSHOT | ✅ Mapped | ✅ |
| WAIT (with duration ms) | ✅ Real wait implemented | ✅ |
| LEFT_CLICK_DRAG | ✅ Click at start coord | ✅ approx |
| mouse_move / hover | ✅ No-op screenshot | ✅ |
| RIGHT_CLICK / DOUBLE_CLICK / TRIPLE_CLICK | ✅ Mapped | ✅ |

---

## 5. Hard boundaries

| Boundary | Comet | Ours | Status |
|----------|-------|------|--------|
| isInternalPage (chrome-extension://) | Block RPC on extension pages | ✅ `attachInitialTab` creates blank web tab | ✅ Implemented |
| isUrlBlocked (file://, .pdf, .png, etc.) | Block navigation to binary files | ✅ `checkUrlBlocked()` in `executeNavigate` | ✅ Implemented |
| Admin domain blocklist | `chrome.storage.managed BlockedDomains` | ❌ Not implemented | Low priority |

---

## 6. Browser / extension setup

| Item | Comet | Ours | Status |
|------|-------|------|--------|
| Content script run_at | `document_start`, ISOLATED | ✅ `document_start` | ✅ Match |
| Anti-detection | ungoogled-chromium + `--disable-blink-features=AutomationControlled` | ✅ Same | ✅ Match |
| Stealth JS + consent dismiss | `Page.addScriptToEvaluateOnNewDocument` | ✅ Same | ✅ Match |
| Persistent profile | User's real browser | ✅ `~/.local/share/new-browser/chrome-profile` | ✅ Match |
| `Page.setLifecycleEventsEnabled` | ✅ For FCP | ✅ In `enableDomainsForSession` | ✅ Implemented |
| DOMSnapshot `computedStyles` | `["cursor"]` | `["display","visibility","cursor"]` | ✅ Superset |
| `declarativeNetRequest` blocking | ✅ Block images/media | ❌ Not implemented | Optional |

---

## 7. Remaining gaps (low priority)

| Item | Notes |
|------|-------|
| `BROWSER_TASK_*` event names | We use SSE `status`/`result` — functionally equivalent |
| `supported_features` handshake | Not needed in our RPC protocol |
| `declarativeNetRequest` resource blocking | Optional speed/anti-detection improvement |
| Admin domain blocklist | Not needed for current use case |
