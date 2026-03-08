import { describe, expect, it } from "vitest";
import { buildToolSchemaCatalog, validateRequiredToolSchemas, SYSTEM_REQUIRED_TOOL_NAMES } from "../../sidecar/src/agent/tool-schema";

describe("tool schema audit", () => {
  it("includes every required tool", () => {
    const audit = validateRequiredToolSchemas(SYSTEM_REQUIRED_TOOL_NAMES);
    expect(audit.missing).toEqual([]);
    expect(audit.available.sort()).toEqual([...SYSTEM_REQUIRED_TOOL_NAMES].sort());
  });

  it("reports missing tool names", () => {
    const audit = validateRequiredToolSchemas(["read_page", "nonexistent_tool"]);
    expect(audit.missing).toEqual(["nonexistent_tool"]);
    expect(audit.available).toContain("read_page");
  });

  it("includes the local workspace tool schemas", () => {
    const audit = validateRequiredToolSchemas(["workspace_list", "workspace_read", "workspace_write"]);
    expect(audit.missing).toEqual([]);
    expect(audit.available).toEqual(["workspace_list", "workspace_read", "workspace_write"]);
  });

  it("returns cloned parameter objects", () => {
    const [schema] = buildToolSchemaCatalog(["read_page"]);
    const originalProperties = schema.parameters.properties as Record<string, unknown>;
    schema.parameters.properties = { changed: { type: "string" } };
    const [fresh] = buildToolSchemaCatalog(["read_page"]);
    const freshProperties = fresh.parameters.properties as Record<string, unknown>;
    expect(freshProperties.depth).toEqual(originalProperties.depth);
    expect(freshProperties).not.toEqual(schema.parameters.properties);
  });
});
