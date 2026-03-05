import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { PromptSpecs } from "./types";
import { compilePromptPolicy } from "../policy/prompt-policy-compiler";

export interface PromptLoaderOptions {
  rootDir?: string;
  systemPromptPath?: string;
  toolsPath?: string;
}

const DEFAULT_SYSTEM_PROMPT_PATH = "REF DOCS/System Prompt.txt";
const DEFAULT_TOOLS_PATH = "REF DOCS/tools.json";

const TOOL_NAME_PATTERN = /^###\s+([a-z_]+)\s*$/gim;

function extractToolNames(toolsSpec: string): string[] {
  const names = new Set<string>();
  TOOL_NAME_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null = TOOL_NAME_PATTERN.exec(toolsSpec);
  while (match) {
    const value = match[1]?.trim().toLowerCase();
    if (value) {
      names.add(value);
    }
    match = TOOL_NAME_PATTERN.exec(toolsSpec);
  }
  return [...names];
}

export async function loadPromptSpecs(options: PromptLoaderOptions = {}): Promise<PromptSpecs> {
  const rootDir = options.rootDir ?? process.cwd();
  const systemPromptPath = resolve(rootDir, options.systemPromptPath ?? DEFAULT_SYSTEM_PROMPT_PATH);
  const toolsPath = resolve(rootDir, options.toolsPath ?? DEFAULT_TOOLS_PATH);

  const [systemPrompt, toolsSpec] = await Promise.all([
    readFile(systemPromptPath, "utf8"),
    readFile(toolsPath, "utf8")
  ]);

  const toolNames = extractToolNames(toolsSpec);
  const normalizedSystemPrompt = systemPrompt.toLowerCase();
  const missingTools = toolNames.filter((toolName) => !normalizedSystemPrompt.includes(toolName));
  const systemPromptWithTools =
    missingTools.length === 0
      ? systemPrompt
      : `${systemPrompt.trimEnd()}\n\n## Available tools\n${toolsSpec.trim()}\n`;

  return {
    systemPrompt: systemPromptWithTools,
    toolsSpec,
    toolNames,
    policy: compilePromptPolicy(systemPromptWithTools, toolNames)
  };
}
