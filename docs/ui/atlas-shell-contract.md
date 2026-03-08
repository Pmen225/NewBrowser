# Atlas Browser-OS Shell Contract

## Purpose
The Atlas shell contract keeps the Engine Room, the active agent lane, and the sidecar browser shell aligned as one integrated workspace without changing their runtime behavior contracts.

## Product model
- Atlas is a browser shell with an integrated agent.
- The browser frame and the agent lane expose the same runtime state.
- The settings surface is the Engine Room, where users configure browser identity, agent intelligence, and data boundaries.
- The sidecar is an active agent lane, not a passive plugin sidebar.

## Tokens
- Background: `--atlas-bg`
- Strong surface: `--atlas-surface-strong`
- Accent: `--atlas-accent`
- Danger: `--atlas-danger`
- Text: `--atlas-text`

## Shared primitives
- `.atlas-shell`: top-level shell wrapper
- `.shell-frame`: engine-room layout frame
- `.shell-panel`: elevated surface container
- `.shell-status-line`: human-readable shell state copy
- `.status-pill`: compact status indicator for connection and safety states
- `.engine-card`: stateful card used in the Engine Room
- `.action-mode-chip`: explicit action-mode control in the active agent lane
- `.danger-block`: isolated high-gravity block for destructive AI and data actions

## Interaction rules
- Keep routine actions visually quiet.
- Isolate destructive actions in dedicated danger groups.
- Expose connection, run, vault, and intervention state explicitly.
- Reflect runtime state in both the browser shell and the agent lane.
- Treat browsing actions as collaboration modes, not generic chat prompts.
- Preserve visible focus and reduced-motion compatibility.

## Stability
All storage keys, RPC method names, vault flows, and command semantics remain unchanged by this redesign.
