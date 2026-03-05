import type { JsonObject } from "../../../shared/src/transport";
import type { AgentToolSchemaEntry } from "./types";

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
    description: "Perform low-level browser interactions such as click, type, scroll, or screenshot.",
    parameters: {
      type: "object",
      properties: {
        steps: {
          type: "array",
          items: { type: "object" }
        }
      },
      required: ["steps"]
    },
    tabScope: "active_tab"
  },
  {
    name: "form_input",
    description: "Fill one or more form fields by ref_id.",
    parameters: {
      type: "object",
      properties: {
        fields: {
          type: "array",
          items: { type: "object" }
        }
      },
      required: ["fields"]
    },
    tabScope: "active_tab"
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

function cloneParameters(parameters: JsonObject): JsonObject {
  return JSON.parse(JSON.stringify(parameters)) as JsonObject;
}

export function buildToolSchemaCatalog(toolNames: string[]): AgentToolSchemaEntry[] {
  const allowed = new Set(toolNames.map((toolName) => toolName.toLowerCase()));
  const selected = TOOL_SCHEMAS.filter((entry) => allowed.size === 0 || allowed.has(entry.name));

  return selected.map((entry) => ({
    ...entry,
    parameters: cloneParameters(entry.parameters)
  }));
}
