# Tool Access Checks

Run these checks directly instead of relying on static notes.

## 1) Sidecar tool schema audit

```bash
npm run audit:tools
```

Expected: `"ok": true` and empty `missing` array.

## 2) Unit tests for audit rules

```bash
npm run test:tool-audit
```

Expected: all tests pass.

## 3) Infra/MCP runtime checks (agent execution)

Run in an agent session and verify each tool invocation succeeds end-to-end:

- `exec_command`
- `write_stdin`
- `update_plan`
- `list_mcp_resources`
- `list_mcp_resource_templates`
- `read_mcp_resource` (valid resource when available; otherwise verify error path)
- `mcp__browser_tools__run_playwright_script`
- `mcp__browser_tools__open_image_artifact`
- `view_image`
- `mcp__make_pr__make_pr`
