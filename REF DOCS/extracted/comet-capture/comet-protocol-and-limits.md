# Comet protocol and limits (extracted from agents.crx)

Extracted from Comet.app’s bundled **agents.crx** (unpacked to `comet-capture/unpacked-agents/`). Extension: **comet-agent** v0.0.176.

---

## 1. Protocol shape

### Message types (browser task)

| Type | Source | Notes |
|------|--------|------|
| `BROWSER_TASK_PAUSE_RESUME` | content.js, background.js | Pause/Resume Comet Assistant; payload `sidecarTabId` |
| `BROWSER_TASK_STOP` | background.js | Stop browser task |
| `BROWSER_TASK_COMPLETE` | background.js | Task complete |
| `BROWSER_TASK_PROGRESS_SCREENSHOT` | background.js | Progress screenshot |

### Task start payload (WebSocket)

- `supported_features`: **["computer_batch", "computer_ref", "create_subagent"]**
- Confirms **batched low-level actions** (`computer_batch`) and ref-based targeting (`computer_ref`).

### Step / vital (RUM)

- **step_type**: `e.stepType` (field name in RUM vital events; no enum values in client).
- Also: `operation_key`, `failure_reason`.

---

## 2. ComputerBatch (actions batch)

- **Payload**: `t.actions ?? []` — array of actions; **no client-side cap** on length in this bundle.
- **Inter-action delay**: **100–200 ms** (random), constants `Nl = 100`, `OR = 200`.
- **Screenshot reuse**: if last action was a click and within **LR = 1000 ms**, reuse screenshot (`dontSaveToStorage`).
- **Screenshot timeouts**: **1000 ms** (fast post-click), **10000 ms** (full).
- **Page wait**: `maxWaitingTimeoutMs: 2500` for FCP.
- **Metrics**: `agent.client_loop.batch_action_duration`, `agent.client_loop.start_duration`.

**Action kinds**: LEFT_CLICK, RIGHT_CLICK, DOUBLE_CLICK, TRIPLE_CLICK, TYPE, KEY, SCROLL, SCREENSHOT, WAIT, LEFT_CLICK_DRAG, SCROLL_TO.

---

## 3. Timeouts and waits (from extension)

| Context | Value | Meaning |
|---------|--------|--------|
| Inter-action delay (batch) | **100–200 ms** | Random delay between batch actions |
| Screenshot (fast) | **1000 ms** | Post-click screenshot |
| Screenshot (full) | **10000 ms** | Full page screenshot |
| FCP / page wait | **2500 ms** | maxWaitingTimeoutMs |
| Scroll / action wait | **250 ms** | After scroll; also 350 ms in AX flow |
| Accessibility / load | **15000 ms** | Ah = 15e3 |
| Selection debounce (content) | **150 ms** | Le = 150 |
| Fetch (browser GET) | **10000 ms** | ch = 1e4 |
| Fetch (browser non-GET) | **15000 ms** | uh = 15e3 |

**250 ms** appears in multiple places (AX, scroll, waits); **no explicit “page load wait” constant** named 250 in agents extension, but 250 ms is a common debounce/wait.

---

## 4. What was not found (client-side)

- **Max steps per task** (e.g. 50) — not in this extension; may be server-enforced.
- **Max actions per batch** (e.g. 10) — batch is `t.actions` with no client clamp.
- **Failure tolerance** (e.g. 3).
- **Replan / check-in cadence** (e.g. 5, 10, 15).
- **`browser_tool.step_type`** or **`BROWSER_OPEN_TAB`** — only `stepType` in RUM vitals; no step_type enum in this bundle.

---

## 5. Mapping to “Comet equivalents” (speculative)

| Your setting | From extraction | Confidence |
|--------------|-----------------|------------|
| Max Steps per Task | Not in client; **50** from external spec only | Low (server may enforce) |
| Max Actions per Step | No cap in client; **10** from external spec | Low |
| Failure Tolerance | Not found | N/A |
| Replanning Frequency | Not found | N/A |
| Page Load Wait Time | **250 ms** and **2500 ms** (FCP) in use | Medium (250 ms as debounce) |
| Inter-action delay | **100–200 ms** (batch) | High |
| Screenshot timeout | **1000 / 10000 ms** | High |

**Conclusion**: Protocol shape (batch actions, refs, `step_type` field name) and timing (100–200 ms between actions, 250 ms in several places, 2500 ms FCP) are **supported by the extraction**. Numeric limits for **max steps**, **max actions per step**, **failure tolerance**, and **replan cadence** are **not** in the agents extension; they may live server-side or in another bundle.
