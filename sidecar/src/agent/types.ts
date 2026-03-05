import type {
  AgentGetStateParams,
  AgentRunParams,
  AgentStateResult,
  AgentStepTrace,
  AgentStopParams,
  JsonObject,
  SourceAttribution,
  TodoItem
} from "../../../shared/src/transport";
import type { PromptPolicy } from "../policy/types";
export type { PromptPolicy } from "../policy/types";

export interface PromptDeclaredTool {
  name: string;
  parameters?: JsonObject;
}

export interface PromptSpecs {
  systemPrompt: string;
  toolsSpec: string;
  toolNames: string[];
  declaredTools: PromptDeclaredTool[];
  policy: PromptPolicy;
}

export interface AgentMemoryRecord {
  runId: string;
  createdAt: string;
  updatedAt: string;
  data: JsonObject;
}

export interface AgentMemoryStore {
  read(runId: string): AgentMemoryRecord | undefined;
  upsert(runId: string, patch: JsonObject): AgentMemoryRecord;
  remove(runId: string): void;
  prune(): void;
}

export interface PlannerOutput {
  todos: TodoItem[];
  steps: PlannedToolStep[];
  summary: string;
}

export interface AgentToolSchemaEntry {
  name: string;
  description: string;
  parameters: JsonObject;
  tabScope: "active_tab" | "system";
}

export interface AgentToolExecutionRecord {
  toolCallId: string;
  action: string;
  params: JsonObject;
  tabId: string;
  attempts: number;
}

export interface PlannedToolBinding {
  source: "latest_find_match";
  matchIndex: number;
  mode: "click" | "form_input";
}

export interface PlannedToolStep {
  id: string;
  action: string;
  description: string;
  tabScope: "active_tab" | "system";
  params: JsonObject;
  binding?: PlannedToolBinding;
}

export interface PlannerAgent {
  plan(params: AgentRunParams, specs: PromptSpecs): PlannerOutput;
}

export interface ExecutorAgent {
  execute(params: {
    runId: string;
    tabId: string;
    todos: TodoItem[];
    steps: PlannedToolStep[];
    maxSteps: number;
    userPrompt: string;
    hasImageInput: boolean;
    signal: AbortSignal;
    onStep: (event: ExecutorStepEvent) => void;
  }): Promise<{ finalAnswer: string; executedSteps: number }>;
}

export interface ExecutorStepEvent {
  status: "started" | "completed" | "failed";
  step: PlannedToolStep;
  index: number;
  inputHash: string;
  payload: JsonObject;
  result?: JsonObject;
  source?: SourceAttribution;
  errorCode?: string;
  errorMessage?: string;
}

export interface AgentRunState {
  runId: string;
  status: "running" | "completed" | "failed" | "stopped";
  startedAt: string;
  updatedAt: string;
  params: AgentRunParams;
  steps: AgentStepTrace[];
  finalAnswer?: string;
  userLanguage: string;
  hasImageInput: boolean;
  sources: SourceAttribution[];
  abortController: AbortController;
  errorMessage?: string;
}

export interface AgentOrchestrator {
  run(params: AgentRunParams): Promise<{ run_id: string; status: "started" }>;
  stop(params: AgentStopParams): Promise<{ run_id: string; status: "stopped" }>;
  getState(params: AgentGetStateParams): Promise<AgentStateResult>;
}
