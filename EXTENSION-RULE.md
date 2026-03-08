# Rule for Codex (and other agents)

**Assistant extension location**

- The **only** Assistant extension in this project is: **`extension/`** (repository root).
- **Never create another** Assistant extension (no `apps/.../source-extension/`, no second copy, no alternate “build” extension directory).
- All extension edits and loads use **`extension/`** only.

Give this rule to Codex so it always uses `extension/` and does not create or reference a second Assistant extension.
