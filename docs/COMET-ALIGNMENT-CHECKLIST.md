# Comet alignment checklist

**Status: COMPLETE as of March 2026.** All items implemented. See `ours-vs-comet.md` for full comparison.

---

## Summary table — all done

| # | What | Type | Status |
|---|------|------|--------|
| 1 | Default `page_load_wait_ms` = 250ms | Config | ✅ Done — `orchestrator.ts` |
| 2 | Default `max_actions_per_step` = 10 | Config | ✅ Done — `orchestrator.ts` |
| 3 | Default max steps = 50 | Config | ✅ Done — `server.ts` |
| 4 | Default failure_tolerance = 3, replanning = 0 | Config | ✅ Done — `orchestrator.ts` |
| 5 | 100–200 ms random delay between batch actions | Code | ✅ Done — `browser-actions.ts` |
| 6 | Reuse screenshot if last action click & < 1 s (LR=1000ms) | Code | ✅ Done — `browser-actions.ts` |
| 7 | 250ms scroll wait (`yt(250)`) | Code | ✅ Done — `browser-actions.ts` |
| 8 | FCP wait: `Page.lifecycleEvent firstContentfulPaint` max 2500ms | Code | ✅ Done — `wait-primitives.ts` |
| 9 | `Page.setLifecycleEventsEnabled` in domain setup | Code | ✅ Done — `session-registry.ts` |
| 10 | `isInternalPage` — skip chrome-extension:// tabs at startup | Code | ✅ Done — `server.ts` `attachInitialTab` |
| 11 | `isUrlBlocked` — block file://, .pdf, .png, .mp4, etc. | Code | ✅ Done — `browser-actions.ts` `checkUrlBlocked` |
| 12 | WAIT action with real duration (Comet: `duration` field) | Code | ✅ Done — `transport.ts` + `browser-actions.ts` |
| 13 | All Comet action aliases (LEFT_CLICK, TYPE, WAIT, LEFT_CLICK_DRAG, SCROLL_TO, mouse_move, etc.) | Code | ✅ Done — `transport.ts` `parseCanonicalComputerAliasParams` |
| 14 | `step_type`, `operation_key`, `failure_reason` in tool events | Code | ✅ Done — `orchestrator.ts` tool events |
| 15 | Content script `document_start` (not `document_idle`) | Config | ✅ Done — `manifest.json` |
| 16 | `--disable-blink-features=AutomationControlled` | Config | ✅ Done — `start-sidecar.mjs` |
| 17 | Stealth JS + cookie consent auto-dismiss | Code | ✅ Done — `browser-actions.ts` `STEALTH_SCRIPT` |
| 18 | Persistent profile at `~/.local/share/new-browser/chrome-profile` | Config | ✅ Done — `start-sidecar.mjs` |
| 19 | DOMSnapshot `computedStyles` includes `cursor` | Code | ✅ Done — `read-page.ts` |
| 20 | Options page defaults: 50/10/3/0/250 | UI | ✅ Done — `options.html` |
| 21 | System prompt: language detection, citations, todo_write, exhaustive enumeration | Prompt | ✅ Done — `REF DOCS/System Prompt.txt` |
| 22 | SSE exponential backoff (1s→2s→4s→8s→30s) | Code | ✅ Done — `panel.js` |

---

## Remaining optional items (low priority)

| Item | Notes |
|------|-------|
| `declarativeNetRequest` resource blocking | Block images/media during agent for speed. Optional. |
| `BROWSER_TASK_*` event names | SSE `status`/`result` is functionally equivalent. |
| `supported_features` handshake | Not needed in our RPC protocol. |
| Admin domain blocklist | `chrome.storage.managed BlockedDomains`. Not needed for current use case. |

---

*Source: REF DOCS/extracted/comet-capture (agents.crx), Zenity Labs "Perplexity Comet: A Reversing Story" (Feb 2026), ours-vs-comet.md*
