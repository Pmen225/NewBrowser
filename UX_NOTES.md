# UX Notes

## Visual Language

- Dark, glassy surfaces replace the previous beige utility UI.
- Shared color tokens intentionally align the extension panel and the sidecar shell.
- Accent gradients are used sparingly for primary actions and active states.
- Rounded containers and a floating composer create the Atlas-style feel without changing backend behavior.

## Information Architecture

- The default extension experience is now assistant-first.
- `Chat`, `Sources`, `Saved`, `Controls`, and `Settings` are explicit top-level views.
- The sidecar web UI acts as the browser-shell mock and local demo surface.

## Why Power Tools Are Hidden

- The previous UI made raw controls the primary experience and obscured the assistant workflow.
- Keeping low-level actions in the advanced drawer preserves capability without overwhelming the main flow.
- This keeps the surface approachable while still supporting operators who need direct control.
