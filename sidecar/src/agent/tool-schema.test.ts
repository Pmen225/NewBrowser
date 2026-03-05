import { describe, expect, it } from "vitest";

import { buildToolSchemaCatalog, findToolCatalogMismatches } from "./tool-schema";

describe("findToolCatalogMismatches", () => {
  it("reports missing declared tools", () => {
    const catalog = buildToolSchemaCatalog([]);
    const mismatches = findToolCatalogMismatches([{ name: "navigate" }, { name: "comet_magic" }], catalog);

    expect(mismatches).toContain("missing:comet_magic");
    expect(mismatches).not.toContain("missing:navigate");
  });

  it("reports parameter and required field mismatches", () => {
    const catalog = buildToolSchemaCatalog(["navigate"]);
    const mismatches = findToolCatalogMismatches(
      [
        {
          name: "navigate",
          parameters: {
            type: "object",
            properties: {
              mode: { type: "string" },
              unexpected: { type: "string" }
            },
            required: ["mode", "unexpected"]
          }
        }
      ],
      catalog
    );

    expect(mismatches).toContain("param:navigate.unexpected");
    expect(mismatches).toContain("required:navigate.unexpected");
  });
});
