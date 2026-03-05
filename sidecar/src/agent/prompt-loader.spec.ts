import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadPromptSpecs } from "./prompt-loader";

describe("loadPromptSpecs", () => {
  it("appends tool spec into the system prompt when tool names are missing", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "prompt-loader-"));
    const systemPromptPath = "System Prompt.txt";
    const toolsPath = "tools.json";

    await Promise.all([
      writeFile(join(rootDir, systemPromptPath), "You are an assistant."),
      writeFile(join(rootDir, toolsPath), "### read_page\nRead page")
    ]);

    const specs = await loadPromptSpecs({ rootDir, systemPromptPath, toolsPath });

    expect(specs.systemPrompt).toContain("## Available tools");
    expect(specs.systemPrompt).toContain("### read_page");
    expect(specs.toolNames).toEqual(["read_page"]);
  });

  it("keeps the original system prompt when all tool names are already present", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "prompt-loader-"));
    const systemPromptPath = "System Prompt.txt";
    const toolsPath = "tools.json";
    const systemPrompt = "Use read_page before acting.";

    await Promise.all([
      writeFile(join(rootDir, systemPromptPath), systemPrompt),
      writeFile(join(rootDir, toolsPath), "### read_page\nRead page")
    ]);

    const specs = await loadPromptSpecs({ rootDir, systemPromptPath, toolsPath });

    expect(specs.systemPrompt).toBe(systemPrompt);
  });
});
