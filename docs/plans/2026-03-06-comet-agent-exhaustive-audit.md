# Comet Agent System Exhaustive Audit

Generated: 2026-03-06

## Summary

This audit treats Comet as the reference system for browser-agent behavior and catalogs what is actually evidenced in `REF DOCS`, what is only inferred, and where the current repo materially differs.

The highest-confidence finding is that Comet is not just a single LLM loop with UI phases. Its captured browser-task stack includes:

- task-scoped execution with explicit lifecycle events
- reconnectable task sockets
- spawnable subagents via `create_subagent`
- hidden-tab execution for subagents and mission-control variants
- browser-task-specific sidecar and overlay control wiring

The current repo already mirrors some surface behavior well, especially batched browser actions, overlay control, pause/resume, dialog handling, and ref-based targeting. The main architectural gap is that our runtime is still a **single orchestrator/provider transcript**, while Comet’s captured system is a **task manager plus reconnectable task runtime with subagent support**.

## Method

Source roots audited:

- `REF DOCS/extracted/comet-capture/unpacked-agents/`
- `REF DOCS/extracted/comet-capture/unpacked-comet_web_resources/`
- `REF DOCS/SearchModeMenuItems-BKVUbB32.js`
- `sidecar/src/agent/`
- `src/cdp/`
- `extension/`
- `shared/src/transport.ts`

Claim labels:

- `proven`: directly supported by extracted code or current repo code
- `likely`: strongly suggested by extracted code, but not fully closed by client-side evidence
- `unknown`: cannot be proven from extracted sources without guessing

## 1. Runtime Topology

- `proven` Comet exposes browser-task capabilities to the backend using `supported_features: ["computer_batch", "computer_ref", "create_subagent"]`.
  Evidence: `REF DOCS/extracted/comet-capture/unpacked-agents/background.js:18065`
- `proven` Comet can start subagents from the browser-task runtime itself. The subagent launch path sets `source: "create_subagent_tool"` and `is_subagent: !0`.
  Evidence: `REF DOCS/extracted/comet-capture/unpacked-agents/background.js:14532-14539`
- `proven` Comet distinguishes at least three task flavors in the extension runtime:
  - primary task
  - subagent task
  - mission-control task
  Evidence: `is_subagent` and `is_mission_control` checks in `background.js:14564, 14800, 18076-18077, 19750-19751`
- `proven` Subagents are not just labels. They change runtime behavior:
  - hidden tabs
  - hidden cleanup
  - sender-tab closing exemptions
  Evidence: `background.js:14564, 14664, 14800`
- `likely` The extension runtime is the browser-side execution shell, not the full reasoning stack. The extracted client shows tool/task control and socket orchestration, but not an on-device planner model.
  Evidence: task start, socket, task manager, tool dispatch, and no explicit local planning model in the extracted browser-task client
- `unknown` The total number of cooperating backend agents per task. The captured sources prove spawnable subagents, but do not prove whether the backend runs exactly 2, 10, or more internal agent roles.

### Current repo comparison

- `proven` The current repo defines `PlannerAgent` and `ExecutorAgent` interfaces.
  Evidence: `sidecar/src/agent/types.ts:82-103`
- `proven` The current repo does not run independent planner and executor runtimes. `createOrchestrator()` logs planner/executor phases, but the actual run loop is one provider conversation with tool calls, retries, loop guards, and final-answer validation all in the same transcript.
  Evidence: `sidecar/src/agent/orchestrator.ts:1380-2145`
- `proven` The current repo has no `create_subagent` tool, no hidden child task runtime, and no task manager equivalent to Comet’s reconnectable pending-task socket layer.

## 2. Task and Control Plane

- `proven` Comet has explicit browser-task control/event messages:
  - `BROWSER_TASK_PAUSE_RESUME`
  - `BROWSER_TASK_STOP`
  - `BROWSER_TASK_COMPLETE`
  - `BROWSER_TASK_PROGRESS_SCREENSHOT`
  Evidence: `background.js:13901, 13961, 13974, 18261-18263`; `content.js` pause/resume message dispatch
- `proven` Comet keeps a task registry and task-scoped logger registry.
  Evidence: `pendingTasks` and `taskScopedLoggers` in `background.js:14927-15073`
- `proven` Comet monitors inactive tasks and reports watchdog thresholds such as 10s, 15s, 20s, and 1m.
  Evidence: `watchPendingTasks()` and threshold reporting in `background.js:14932-15073`
- `proven` Comet uses a reconnecting task socket with exponential backoff and per-task reconnect payloads.
  Evidence: `background.js:15079-15308`
- `proven` When reconnecting, Comet sends `reconnect_agent` per pending task, not just a generic socket reconnect.
  Evidence: `background.js:15120-15138`
- `proven` Socket reconnect is conditional on pending tasks. If no pending tasks remain, Comet does not reconnect and closes the socket.
  Evidence: `background.js:15185-15257`
- `proven` Task lifecycle is explicit:
  - register task
  - receive/send RPCs
  - pause/resume bookkeeping
  - unregister task
  - close connection if no tasks remain
  Evidence: `background.js:14992-15073, 15295-15308`
- `proven` Thread/task movement into sidecar is part of the task control plane through `MOVE_THREAD_TO_SIDECAR`.
  Evidence: `background.js:13921, 19747-19871`

### Current repo comparison

- `proven` The current repo has agent lifecycle states and pause/resume/stop on a single run object.
  Evidence: `shared/src/transport.ts:361-399`, `sidecar/src/agent/orchestrator.ts:219-248, 2210-2286`
- `proven` The current repo uses local HTTP/SSE plus CDP sessions, not a reconnectable task-scoped agent socket.
  Evidence: `sidecar/src/server.ts`
- `proven` The current repo supports resume reassessment after pause.
  Evidence: `resumeNeedsReassessment` in `sidecar/src/agent/orchestrator.ts:239-248, 2257-2259`
- `proven` The current repo does not have Comet’s task registry, task-scoped inactivity watchdogs, or per-task reconnect payloads.

## 3. Tool Surface and Contracts

- `proven` Comet’s browser-task protocol explicitly exposes:
  - `computer_batch`
  - `computer_ref`
  - `create_subagent`
  Evidence: `background.js:18065`
- `proven` The extracted Comet extension supports batched low-level browser actions and ref-based targeting.
  Evidence: `REF DOCS/extracted/comet-capture/comet-protocol-and-limits.md`
- `proven` The extension-side screenshot tool family includes:
  - full screenshot
  - visible-tab capture
  - partial screenshot crop
  Evidence: `content.js` messages `CAPTURE_FULL_SCREENSHOT`, `CAPTURE_VISIBLE_TAB`, `CAPTURE_PARTIAL_SCREENSHOT`
- `proven` Cursor-context capture exists as a first-class capability.
  Evidence: `content.js` `activateCursorContextTool`, `getCursorContext`
- `proven` User-selection capture exists, including Google Docs-specific handling.
  Evidence: `content.js` selection observers, Google Docs iframe/document-content extraction
- `proven` Document helper/parsing support exists in offscreen/background code for at least:
  - PDF parsing
  - Google Sheets parsing
  - Google Docs parsing
  Evidence: `REF DOCS/extracted/comet-capture/unpacked-agents/offscreen.js`
- `proven` JavaScript dialogs are part of the browser runtime surface; Comet auto-accepts dialogs in the tabs manager when they open.
  Evidence: `background.js:14569-14582`

### Current repo comparison

- `proven` The current repo supports:
  - `computer`
  - `navigate`
  - `form_input`
  - `find`
  - `read_page`
  - `get_page_text`
  - `search_web`
  - `tabs_create`
  - `todo_write`
  Evidence: `sidecar/src/agent/orchestrator.ts:64-73`
- `proven` The current repo already approximates Comet well on:
  - batched browser actions
  - ref-based targeting
  - WAIT alias behavior
  - JavaScript dialog records and handling
  Evidence: `shared/src/transport.ts`, `src/cdp/browser-actions.ts`, `src/cdp/session-registry.ts`, `src/cdp/target-event-router.ts`
- `proven` The current repo lacks a `create_subagent` tool surface and subagent lifecycle contract.

## 4. Browser Runtime and Tab Management

- `proven` Comet has a tabs manager that owns task tabs, tracks grouped tabs, and can bootstrap from sender tab, explicit tab id, or start URL.
  Evidence: `background.js:14564-14800`
- `proven` Subagent and mission-control tasks can run hidden.
  Evidence: `background.js:14564`
- `proven` Hidden subagent tabs are removed during cleanup.
  Evidence: `background.js:14664`
- `proven` Comet can auto-close the initial sender tab when appropriate, but explicitly avoids doing so for mission-control and subagent contexts.
  Evidence: `background.js:14800`
- `proven` Comet captures initial tab context and an initial screenshot when starting a task.
  Evidence: task start payload with `tabs_context` and `current_tab_base64_image` in `background.js:18040-18105`
- `proven` Dialog handling is attached at the browser runtime level via `Page.javascriptDialogOpening`, not delegated to the model by default.
  Evidence: `background.js:14569-14582`

### Current repo comparison

- `proven` The current repo has a strong local CDP session layer:
  - session registry
  - target event router
  - frame routing
  - dialog tracking
  Evidence: `src/cdp/session-registry.ts`, `src/cdp/target-event-router.ts`
- `proven` The current repo does not have hidden subagent tabs or a tabs manager centered on task-owned tab groups.
- `proven` The current repo does capture browser state, but it does so inside a single run/session model rather than per-task child runtimes.

## 5. Sidecar, Thread, and UI Wiring

- `proven` Comet’s content overlay exposes pause/resume directly from the page surface via `BROWSER_TASK_PAUSE_RESUME`.
  Evidence: `content.js`
- `proven` Comet overlay state includes a stop control and status updates.
  Evidence: `overlay.js`, `background.js` task control messages
- `proven` Comet can move an active task/thread into the sidecar with `MOVE_THREAD_TO_SIDECAR`.
  Evidence: `background.js:19747-19871`
- `proven` Browser-agent mode is gated separately from general search modes.
  Evidence: `REF DOCS/SearchModeMenuItems-BKVUbB32.js`
- `proven` Browser-agent mode has org-level disable support via `comet_agentic_actions_allowed`.
  Evidence: `SearchModeMenuItems-BKVUbB32.js`
- `proven` Browser-agent mode has its own default-model selection path (`BROWSER_AGENT_OPUS` / `BROWSER_AGENT_SONNET`) and separate enablement logic.
  Evidence: `SearchModeMenuItems-BKVUbB32.js`
- `proven` Comet supports an explicit “allow once” permission/confirmation flow for browser agent actions.
  Evidence: `handleAllowBrowserAgentOnce-uNBxdLoG.js`
- `proven` Sidecar web resources know about pending tasks and navigation metadata.
  Evidence: `index-Hlj0pSqX.js` `const{pendingTasks:t,navigationMeta:r}=ft()`

### Current repo comparison

- `proven` The current repo has a strong overlay/control path:
  - on-page overlay
  - panel-driven overlay status
  - pause/resume from overlay
  - stop controls
  Evidence: `extension/panel.js`, `extension/content/agent-overlay.js`, `extension/background.js`
- `proven` The current repo does not yet have Comet’s task-aware sidecar/task-thread movement model or browser-agent permission gating equivalent.
- `proven` The current repo overlay is relatively mature, but it is layered on top of a simpler agent runtime than Comet’s.

## 6. Current Repo Gap Audit

### Agent topology

- `proven` Current repo: one orchestrator-run transcript with planner/executor phase markers.
- `proven` Comet: task runtime with explicit subagent spawn support and task flavors.
- Recommendation: copy the task/subagent topology before spending more time on single-loop heuristics.

### Planning model

- `proven` Current repo planner is mostly heuristic prompt parsing.
  Evidence: `createPlannerAgent()` in `sidecar/src/agent/orchestrator.ts:856-1151`
- `likely` Comet planning is server-backed and may involve richer task decomposition than the extension bundle reveals.
- Recommendation: adapt, not copy literally, because the backend planner is not fully exposed in the extracted client.

### Executor model

- `proven` Current repo executor behavior is strong at tool dispatch and validation rules, but still bound to the same provider transcript that does planning and final answering.
- `proven` Comet separates task management, browser runtime, and socket/task orchestration from the UI shell.
- Recommendation: adapt toward a task-runtime split.

### Task manager and reconnect model

- `proven` This is the biggest missing subsystem in the current repo.
- Recommendation: copy exactly at the architectural level:
  - task registry
  - task-scoped reconnect
  - task-scoped logging
  - pending task bookkeeping

### Tool catalog

- `proven` Current repo is already close on browser actions and ref-based targeting.
- `proven` Current repo is missing subagent creation and some surrounding task-control surface.
- Recommendation: copy the missing tool/control families; keep current browser-action implementation where it already matches.

### Pause/resume and reassessment

- `proven` Current repo already has a useful reassessment mechanism on resume.
- `proven` Comet exposes pause/resume cleanly from the overlay side.
- Recommendation: adapt; this is not the main gap.

### Overlay and sidecar UI

- `proven` Current repo is already intentionally Comet-like here.
- `proven` The missing piece is task awareness behind the UI, not the visible pause/stop affordances.
- Recommendation: do not over-invest in UI parity until task/subagent runtime parity improves.

## 7. Copy Decision Summary

### Copy exactly

- task registry with per-task lifecycle
- reconnectable task socket behavior
- `reconnect_agent` per task
- `create_subagent` contract
- hidden-tab lifecycle for subagents
- task/thread move-to-sidecar control path
- browser-agent permission gating and mode-specific enablement

### Adapt

- planner/executor role split
- overlay controls
- pause/resume reassessment
- dialog handling policy
- current-tab bootstrap and page-state summarization

### Do not copy

- unrelated generic delegate noise from extracted app identifiers
- product-specific billing/upsell scaffolding not required for browser competence
- platform baggage not tied to browser-agent competence

### Needs more evidence

- exact backend agent count per task
- exact backend planner hierarchy
- whether browser-agent mode always uses a fixed two-agent structure or a dynamic subagent graph

## Bottom Line

- `proven` Comet has **more than a single-agent UI phase split**.
- `proven` The minimal visible architecture is **main task runtime + spawnable subagents + task/socket manager + sidecar/overlay control plane**.
- `proven` The current repo’s largest gap is **not** missing click or read-page primitives. It is the lack of a **task-aware subagent runtime** behind the UI.
- `unknown` The full backend agent graph size.
- Recommended next step after this audit: implement the **task/subagent manager and handoff contract** first, then rerun the browser crash course before further one-loop heuristics work.
