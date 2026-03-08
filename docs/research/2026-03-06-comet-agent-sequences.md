# Comet Agent Lifecycle Sequences

Generated: 2026-03-06

This file records the highest-confidence lifecycle sequences visible in the extracted Comet browser-task sources. Each sequence is limited to behaviors supported by the captured client/runtime evidence.

## 1. Task Start

```mermaid
sequenceDiagram
    participant UI as Sidecar/UI
    participant BG as Background worker
    participant Tabs as Tabs manager
    participant Socket as ReconnectingAgentSocket
    participant Backend as Backend agent

    UI->>BG: Start browser task
    BG->>Tabs: init(sender tab / start_url / grouped tabs)
    BG->>BG: getTabContext()
    BG->>BG: capture current_tab_base64_image
    BG->>Socket: register task
    BG->>Socket: send start_agent
    Socket->>Backend: start_agent {task, tabs_context, supported_features, current_tab_base64_image}
    Backend-->>Socket: task stream / tool requests
```

Evidence:

- `background.js:18040-18105`
- `background.js:14992-15008`

Notes:

- `proven` The task start payload includes `tabs_context`, `current_tab_base64_image`, and `supported_features`.
- `proven` The runtime treats task startup as socket-managed task registration, not just a UI request.

## 2. Subagent Spawn

```mermaid
sequenceDiagram
    participant Parent as Parent task runtime
    participant BG as Background worker
    participant Tabs as Tabs manager
    participant Socket as Task socket
    participant Backend as Backend agent

    Backend->>BG: CreateSubagent(prompt, task_uuid, start_url, extra_headers)
    BG->>BG: Build subagent initialPayload
    BG->>Tabs: create hidden subagent tab/task context
    BG->>Socket: register subagent task
    BG->>Backend: start subagent with is_subagent=true
    Note over Tabs,BG: Hidden tabs are allowed for subagent runs
```

Evidence:

- `background.js:14519-14551`
- `background.js:14564`
- `background.js:14664`

Notes:

- `proven` Subagents are spawned from a first-class tool path.
- `proven` Subagent runs are marked with `is_subagent: true`.
- `proven` Hidden-tab lifecycle is part of the subagent runtime.

## 3. Progress Updates and Sidecar Coordination

```mermaid
sequenceDiagram
    participant Backend as Backend agent
    participant Socket as Task socket
    participant BG as Background worker
    participant Overlay as Content/overlay
    participant Sidecar as Sidecar UI

    Backend-->>Socket: progress / screenshot / thread events
    Socket-->>BG: parsed task message
    BG->>Overlay: START_OVERLAY / STOP_OVERLAY / status updates
    BG->>Sidecar: MOVE_THREAD_TO_SIDECAR or task status propagation
    BG->>Sidecar: BROWSER_TASK_PROGRESS_SCREENSHOT / completion events
```

Evidence:

- `background.js:13901, 13921, 13961, 13974`
- `background.js:19747-19871`
- `content.js` overlay message listeners

Notes:

- `proven` Progress screenshots and thread movement are part of the task message family.
- `proven` Overlay and sidecar are coordinated by the background worker, not directly by the backend.

## 4. Pause / Resume / Stop

```mermaid
sequenceDiagram
    participant User as User on page
    participant Overlay as Content overlay
    participant BG as Background worker
    participant Task as Task runtime

    User->>Overlay: Pause / Resume click
    Overlay->>BG: BROWSER_TASK_PAUSE_RESUME
    BG->>Task: toggle paused state
    BG-->>Overlay: updated is_paused state

    User->>Overlay: Stop
    Overlay->>BG: stop request
    BG->>Task: BROWSER_TASK_STOP
    BG-->>Overlay: STOP_OVERLAY
```

Evidence:

- `content.js`
- `background.js:14349-14357`
- `background.js:18261-18263`

Notes:

- `proven` Pause/resume is initiated from overlay UI and routed through background control messages.
- `proven` Stop is a dedicated browser-task control path.

## 5. Reconnect

```mermaid
sequenceDiagram
    participant Socket as ReconnectingAgentSocket
    participant Tasks as Pending tasks
    participant Backend as Backend agent

    Socket--xBackend: connection lost
    Socket->>Socket: detect pendingTasks.size > 0
    Socket->>Socket: exponential backoff reconnect
    Socket->>Tasks: fetch reconnect data per task
    Socket->>Backend: reconnect_agent {task_uuid, extra_headers, ...}
    Backend-->>Socket: resume task stream
```

Evidence:

- `background.js:15120-15138`
- `background.js:15185-15257`

Notes:

- `proven` Reconnect is task-aware.
- `proven` Reconnect is skipped if no pending tasks remain.

## 6. Cleanup

```mermaid
sequenceDiagram
    participant Task as Task runtime
    participant BG as Background worker
    participant Tabs as Tabs manager
    participant Socket as Task socket

    Task->>BG: task complete / aborted / stopped
    BG->>Socket: unregisterTask(taskId)
    BG->>BG: onTaskEnd metrics + task logger cleanup
    BG->>Tabs: detach task tabs
    Note over Tabs: hidden subagent tabs may be removed
    Socket->>Socket: close connection if no pending tasks
```

Evidence:

- `background.js:14658-14666`
- `background.js:15009-15024`
- `background.js:15307-15308`

Notes:

- `proven` Cleanup is task-scoped and socket-aware.
- `proven` Hidden subagent tabs are removed on destroy.

## Current Repo Contrast

The current repo does not follow the same lifecycle shape end-to-end.

- `proven` It has a single `AgentOrchestrator` run model with pause/resume/stop and reassessment.
- `proven` It has local CDP session recovery and strong overlay plumbing.
- `proven` It does not have:
  - task-scoped reconnectable sockets
  - subagent task spawn and hidden child tabs
  - move-thread-to-sidecar task handoff
  - a task manager separate from the provider transcript

Primary evidence:

- `sidecar/src/agent/orchestrator.ts`
- `src/cdp/session-registry.ts`
- `extension/panel.js`
- `extension/content/agent-overlay.js`
