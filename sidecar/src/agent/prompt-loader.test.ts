import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadPromptSpecs } from "./prompt-loader";

const dirsToDelete: string[] = [];

afterEach(async () => {
  await Promise.all(dirsToDelete.splice(0).map(async (dir) => rm(dir, { recursive: true, force: true })));
});

async function createPromptFiles(systemPrompt: string, toolsSpec: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "prompt-loader-"));
  dirsToDelete.push(dir);
  await writeFile(join(dir, "System Prompt.txt"), systemPrompt, "utf8");
  await writeFile(join(dir, "tools.json"), toolsSpec, "utf8");
  return dir;
}

describe("loadPromptSpecs", () => {
  it("extracts declared tools and schemas from JSON function definitions", async () => {
    const rootDir = await createPromptFiles(
      "System prompt",
      JSON.stringify({
        tools: [
          { type: "function", function: { name: "Navigate", parameters: { type: "object", properties: { mode: { type: "string" } }, required: ["mode"] } } },
          { type: "function", function: { name: "read_page", input_schema: { type: "object", properties: { depth: { type: "number" } } } } },
          { metadata: { name: "not_a_tool" } }
        ]
      })
    );

    const specs = await loadPromptSpecs({ rootDir, systemPromptPath: "System Prompt.txt", toolsPath: "tools.json" });

    expect(specs.toolNames).toEqual(["navigate", "read_page"]);
    expect(specs.declaredTools).toHaveLength(2);
    expect(specs.declaredTools[0]?.parameters).toEqual({
      type: "object",
      properties: { mode: { type: "string" } },
      required: ["mode"]
    });
  });

  it("falls back to heading parsing when tool spec is not JSON", async () => {
    const rootDir = await createPromptFiles("System prompt", ["### navigate", "details", "### search_web", "### read_page"].join("\n"));

    const specs = await loadPromptSpecs({ rootDir, systemPromptPath: "System Prompt.txt", toolsPath: "tools.json" });

    expect(specs.toolNames).toEqual(["navigate", "search_web", "read_page"]);
    expect(specs.declaredTools).toEqual([{ name: "navigate" }, { name: "search_web" }, { name: "read_page" }]);
  });
});
