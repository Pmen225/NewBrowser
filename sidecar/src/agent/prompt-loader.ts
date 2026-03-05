import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { PromptDeclaredTool, PromptSpecs } from "./types";
import { compilePromptPolicy } from "../policy/prompt-policy-compiler";

export interface PromptLoaderOptions {
  rootDir?: string;
  systemPromptPath?: string;
  toolsPath?: string;
}

const DEFAULT_SYSTEM_PROMPT_PATH = "REF DOCS/System Prompt.txt";
const DEFAULT_TOOLS_PATH = "REF DOCS/tools.json";
const TOOL_NAME_PATTERN = /^###\s+([a-z_]+)\s*$/gim;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonDeclaredTools(toolsSpec: string): PromptDeclaredTool[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(toolsSpec);
  } catch {
    return [];
  }

  const candidates =
    Array.isArray(parsed)
      ? parsed
      : isRecord(parsed) && Array.isArray(parsed.tools)
        ? parsed.tools
        : isRecord(parsed) && Array.isArray(parsed.functions)
          ? parsed.functions
          : [];

  const tools: PromptDeclaredTool[] = [];
  const seen = new Set<string>();

  for (const rawEntry of candidates) {
    if (!isRecord(rawEntry)) {
      continue;
    }

    const functionEntry = rawEntry.type === "function" && isRecord(rawEntry.function) ? rawEntry.function : rawEntry;
    const name = typeof functionEntry.name === "string" ? functionEntry.name.trim().toLowerCase() : "";
    if (!name || seen.has(name)) {
      continue;
    }

    const parameters = isRecord(functionEntry.parameters)
      ? (functionEntry.parameters as Record<string, unknown>)
      : isRecord(functionEntry.input_schema)
        ? (functionEntry.input_schema as Record<string, unknown>)
        : undefined;

    seen.add(name);
    tools.push({
      name,
      ...(parameters ? { parameters: JSON.parse(JSON.stringify(parameters)) as PromptDeclaredTool["parameters"] } : {})
    });
  }

  return tools;
}

function parseHeadingDeclaredTools(toolsSpec: string): PromptDeclaredTool[] {
  const tools: PromptDeclaredTool[] = [];
  const seen = new Set<string>();

  TOOL_NAME_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null = TOOL_NAME_PATTERN.exec(toolsSpec);
  while (match) {
    const toolName = match[1]?.trim().toLowerCase();
    if (toolName && !seen.has(toolName)) {
      seen.add(toolName);
      tools.push({ name: toolName });
    }
    match = TOOL_NAME_PATTERN.exec(toolsSpec);
  }

  return tools;
}

function extractDeclaredTools(toolsSpec: string): PromptDeclaredTool[] {
  const jsonTools = parseJsonDeclaredTools(toolsSpec);
  if (jsonTools.length > 0) {
    return jsonTools;
  }
  return parseHeadingDeclaredTools(toolsSpec);
}

export async function loadPromptSpecs(options: PromptLoaderOptions = {}): Promise<PromptSpecs> {
  const rootDir = options.rootDir ?? process.cwd();
  const systemPromptPath = resolve(rootDir, options.systemPromptPath ?? DEFAULT_SYSTEM_PROMPT_PATH);
  const toolsPath = resolve(rootDir, options.toolsPath ?? DEFAULT_TOOLS_PATH);

  const [systemPrompt, toolsSpec] = await Promise.all([readFile(systemPromptPath, "utf8"), readFile(toolsPath, "utf8")]);

  const declaredTools = extractDeclaredTools(toolsSpec);
  const toolNames = declaredTools.map((tool) => tool.name);

  return {
    systemPrompt,
    toolsSpec,
    toolNames,
    declaredTools,
    policy: compilePromptPolicy(systemPrompt, toolNames)
  };
}
