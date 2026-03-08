import { describe, expect, it } from "vitest";

describe("tool-schema module", () => {
  it("loads and exposes both audit and mismatch helpers", async () => {
    const toolSchema = await import("./tool-schema");

    expect(toolSchema.listToolSchemaNames()).toContain("navigate");
    expect(toolSchema.validateRequiredToolSchemas(["navigate", "missing"]).missing).toEqual(["missing"]);
    expect(toolSchema.findToolCatalogMismatches([{ name: "navigate" }, { name: "missing_tool" }], toolSchema.buildToolSchemaCatalog(["navigate"]))).toContain(
      "missing:missing_tool"
    );
  });
});
