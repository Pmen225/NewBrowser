import type { JsonObject } from "../../../shared/src/transport";
import type { AgentToolSchemaEntry, PromptDeclaredTool } from "./types";

const TOOL_SCHEMAS: AgentToolSchemaEntry[] = [
  {
    name: "read_page",
    description: "Read the current page structure and interactive elements.",
    parameters: {
      type: "object",
      properties: {
        depth: { type: "number" },
        filter: { type: "string" },
        ref_id: { type: "string" }
      }
    },
    tabScope: "active_tab"
  },
  {
    name: "find",
    description: "Find matching interactive elements on the current page.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number" }
      },
      required: ["query"]
    },
    tabScope: "active_tab"
  },
  {
    name: "get_page_text",
    description: "Extract text content from the current page.",
    parameters: {
      type: "object",
      properties: {
        max_chars: { type: "number" }
      }
    },
    tabScope: "active_tab"
  },
  {
    name: "search_web",
    description: "Search the web for external information.",
    parameters: {
      type: "object",
      properties: {
        queries: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["queries"]
    },
    tabScope: "system"
  },
  {
    name: "navigate",
    description: "Navigate the current tab to a URL or move through history.",
    parameters: {
      type: "object",
      properties: {
        mode: { type: "string" },
        url: { type: "string" },
        timeout_ms: { type: "number" }
      },
      required: ["mode"]
    },
    tabScope: "active_tab"
  },
  {
    name: "tabs_create",
    description: "Manage browser tabs: create, activate, close, list, group, or ungroup.",
    parameters: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          enum: ["create", "activate", "close", "list", "group", "ungroup"],
          description: "The tab operation to perform."
        },
        url: { type: "string", description: "URL for create operation." },
        target_tab_id: { type: "string", description: "Target tab ID for activate/close/ungroup." },
        tab_ids: {
          type: "array",
          items: { type: "string" },
          description: "Tab IDs to group together (for group operation)."
        },
        group_name: { type: "string", description: "Label for the tab group." },
        group_color: { type: "string", description: "Colour for the tab group (grey/blue/red/yellow/green/pink/purple/cyan)." }
      },
      required: ["operation"]
    },
    tabScope: "active_tab"
  },
  {
    name: "computer",
    description: "Perform low-level browser interactions such as click, type, scroll, screenshot, wait, drag, or handling a JavaScript dialog. For alert/confirm/prompt dialogs, use a dialog step such as {\"kind\":\"dialog\",\"accept\":true} or {\"kind\":\"dialog\",\"accept\":false,\"prompt_text\":\"example\"}.",
    parameters: {
      type: "object",
      properties: {
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              kind: {
                type: "string",
                enum: ["click", "type", "key", "scroll", "drag", "screenshot", "wait", "dialog"]
              },
              ref: { type: "string" },
              x: { type: "number" },
              y: { type: "number" },
              button: { type: "string" },
              click_count: { type: "number" },
              text: { type: "string" },
              key: { type: "string" },
              delta_x: { type: "number" },
              delta_y: { type: "number" },
              from_ref: { type: "string" },
              to_ref: { type: "string" },
              from_x: { type: "number" },
              from_y: { type: "number" },
              to_x: { type: "number" },
              to_y: { type: "number" },
              duration_ms: { type: "number" },
              accept: { type: "boolean" },
              prompt_text: { type: "string" }
            }
          }
        }
      },
      required: ["steps"]
    },
    tabScope: "active_tab"
  },
  {
    name: "form_input",
    description: "Fill one or more form fields by ref_id. Use kind 'file' with an absolute local file path for file inputs.",
    parameters: {
      type: "object",
      properties: {
        fields: {
          type: "array",
          items: {
            type: "object",
            properties: {
              ref: { type: "string" },
              kind: { type: "string", enum: ["text", "select", "checkbox", "file"] },
              value: {
                oneOf: [{ type: "string" }, { type: "boolean" }]
              }
            },
            required: ["ref", "kind", "value"]
          }
        }
      },
      required: ["fields"]
    },
    tabScope: "active_tab"
  },
  {
    name: "draft_email",
    description: "Create a structured email draft artifact for the side panel to render and insert into the current page.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        subject: { type: "string" },
        body_markdown: { type: "string" }
      },
      required: ["subject", "body_markdown"]
    },
    tabScope: "system"
  },
  {
    name: "extensions_manage",
    description: "List, enable, disable, or uninstall browser extensions. Never disable or uninstall the Assistant extension.",
    parameters: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          enum: ["list", "enable", "disable", "uninstall"]
        },
        extension_id: { type: "string" },
        query: { type: "string" }
      },
      required: ["operation"]
    },
    tabScope: "system"
  },
  {
    name: "todo_write",
    description: "Write task progress notes for the current run.",
    parameters: {
      type: "object",
      properties: {
        todos: {
          type: "array",
          items: { type: "object" }
        }
      },
      required: ["todos"]
    },
    tabScope: "active_tab"
  }
];

export const SYSTEM_REQUIRED_TOOL_NAMES = [
  "read_page",
  "find",
  "get_page_text",
  "search_web",
  "navigate",
  "tabs_create",
  "computer",
  "form_input",
  "draft_email",
  "extensions_manage",
  "todo_write"
] as const;

export interface ToolSchemaAuditResult {
  available: string[];
  missing: string[];
}

function cloneParameters(parameters: JsonObject): JsonObject {
  return JSON.parse(JSON.stringify(parameters)) as JsonObject;
}

export function listToolSchemaNames(): string[] {
  return TOOL_SCHEMAS.map((entry) => entry.name);
}

export function validateRequiredToolSchemas(requiredToolNames: readonly string[]): ToolSchemaAuditResult {
  const availableSet = new Set(listToolSchemaNames());
  const missing = requiredToolNames.filter((toolName) => !availableSet.has(toolName));
  const available = requiredToolNames.filter((toolName) => availableSet.has(toolName));

  return { available, missing };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function asStringSet(value: unknown): Set<string> {
  return new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.toLowerCase()) : []);
}

export function findToolCatalogMismatches(declaredTools: PromptDeclaredTool[], catalog: AgentToolSchemaEntry[]): string[] {
  const catalogByName = new Map(catalog.map((entry) => [entry.name.toLowerCase(), entry]));
  const mismatches: string[] = [];

  for (const declared of declaredTools) {
    const implemented = catalogByName.get(declared.name.toLowerCase());
    if (!implemented) {
      mismatches.push(`missing:${declared.name}`);
      continue;
    }

    if (!declared.parameters) {
      continue;
    }

    const declaredParameters = asRecord(declared.parameters);
    const implementedParameters = asRecord(implemented.parameters);
    const declaredProps = asRecord(declaredParameters?.properties);
    const implementedProps = asRecord(implementedParameters?.properties);

    if (!declaredProps || !implementedProps) {
      continue;
    }

    for (const propertyName of Object.keys(declaredProps)) {
      if (!(propertyName in implementedProps)) {
        mismatches.push(`param:${declared.name}.${propertyName}`);
      }
    }

    const declaredRequired = asStringSet(declaredParameters?.required);
    const implementedRequired = asStringSet(implementedParameters?.required);
    for (const requiredName of declaredRequired) {
      if (!implementedRequired.has(requiredName)) {
        mismatches.push(`required:${declared.name}.${requiredName}`);
      }
    }
  }

  return mismatches;
}

export function buildToolSchemaCatalog(toolNames: string[]): AgentToolSchemaEntry[] {
  const allowed = new Set(toolNames.map((toolName) => toolName.toLowerCase()));
  const selected = TOOL_SCHEMAS.filter((entry) => allowed.size === 0 || allowed.has(entry.name));

  return selected.map((entry) => ({
    ...entry,
    parameters: cloneParameters(entry.parameters)
  }));
}
