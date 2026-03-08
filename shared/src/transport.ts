export type JsonObject = Record<string, unknown>;

export type SseEventType = "log" | "status" | "result" | "error";

export interface SseData {
  type: SseEventType;
  request_id?: string;
  ts: string;
  payload: JsonObject;
}

export interface SseEnvelope {
  id: string;
  event: string;
  data: SseData;
  retry?: number;
}

export type LegacyBrowserRpcAction = "ComputerBatch" | "Navigate" | "FormInput" | "TabOperation" | "ExtensionsManage";
export type CanonicalBrowserRpcAction = "computer" | "navigate" | "form_input" | "tabs_create" | "extensions_manage";
export type BrowserRpcAction = LegacyBrowserRpcAction | CanonicalBrowserRpcAction;
export type LegacyToolRpcAction = "ReadPage" | "Find" | "GetPageText" | "SearchWeb" | "TodoWrite";
export type CanonicalToolRpcAction =
  | "read_page"
  | "find"
  | "get_page_text"
  | "search_web"
  | "todo_write";
export type ToolRpcAction = LegacyToolRpcAction | CanonicalToolRpcAction;
export type AgentRpcAction = "AgentRun" | "AgentPause" | "AgentResume" | "AgentSteer" | "AgentStop" | "AgentGetState";
export type LlmProvider = "openai" | "anthropic" | "google" | "deepseek";
export type ProviderStateRpcAction =
  | "ProviderDefaultsGet"
  | "ProviderDefaultsPut"
  | "ProviderCatalogGet"
  | "ProviderCatalogSync";
export type SystemRpcAction =
  | "SetActiveTab"
  | "GetRuntimeState"
  | "ProviderValidate"
  | "ProviderListModels"
  | "ProviderTranscribeAudio"
  | "ProviderBenchmarkBrowserControl"
  | ProviderStateRpcAction
  | AgentRpcAction;
export type RpcAction = "ping" | BrowserRpcAction | ToolRpcAction | SystemRpcAction;

export type MouseButton = "left" | "middle" | "right";

export interface ComputerClickStep {
  kind: "click";
  ref?: string;
  x?: number;
  y?: number;
  button?: MouseButton;
  click_count?: number;
}

export interface ComputerTypeStep {
  kind: "type";
  ref?: string;
  text: string;
}

export interface ComputerKeyStep {
  kind: "key";
  key: string;
}

export interface ComputerScrollStep {
  kind: "scroll";
  ref?: string;
  x?: number;
  y?: number;
  delta_x?: number;
  delta_y?: number;
}

export interface ComputerDragStep {
  kind: "drag";
  from_ref?: string;
  to_ref?: string;
  from_x?: number;
  from_y?: number;
  to_x?: number;
  to_y?: number;
}

export interface ComputerScreenshotStep {
  kind: "screenshot";
}

// Comet WAIT action — pause for duration_ms then take a screenshot
export interface ComputerWaitStep {
  kind: "wait";
  duration_ms: number;
}

export interface ComputerDialogStep {
  kind: "dialog";
  accept: boolean;
  prompt_text?: string;
}

export type ComputerStep =
  | ComputerClickStep
  | ComputerTypeStep
  | ComputerKeyStep
  | ComputerScrollStep
  | ComputerDragStep
  | ComputerScreenshotStep
  | ComputerWaitStep
  | ComputerDialogStep;

export interface ComputerBatchParams {
  steps: ComputerStep[];
}

export interface ComputerBatchStepResult {
  index: number;
  ok: boolean;
  error_code?: string;
}

export interface ComputerBatchResult {
  steps: ComputerBatchStepResult[];
  completed_steps: number;
  screenshot_b64?: string;
  javascript_dialog?: {
    type: string;
    message: string;
    default_prompt?: string;
  };
}

export interface NavigateParams {
  mode: "to" | "back" | "forward";
  url?: string;
  timeout_ms?: number;
  allow_sensitive_browser_pages?: boolean;
}

export interface NavigateResult {
  url: string;
  frame_id?: string;
  loader_id?: string;
}

export interface FormInputField {
  ref: string;
  value: string | boolean;
  kind: "text" | "select" | "checkbox" | "file";
}

export interface FormInputParams {
  fields: FormInputField[];
}

export interface FormInputAppliedField {
  ref: string;
  kind: FormInputField["kind"];
  requested_value: string | boolean;
  confirmed_value?: string | boolean;
}

export interface FormInputResult {
  updated: number;
  applied?: FormInputAppliedField[];
}

export interface TabOperationParams {
  operation: "create" | "activate" | "close" | "list" | "group" | "ungroup";
  target_tab_id?: string;
  url?: string;
  tab_ids?: string[];
  group_name?: string;
  group_color?: string;
}

export interface TabOperationListItem {
  tab_id: string;
  target_id: string;
  status: string;
  title?: string;
  url?: string;
}

export interface TabOperationStatusResult {
  tab_id: string;
  status: "ok";
  group_name?: string;
  grouped_tabs?: string[];
}

export interface TabOperationListResult {
  tabs: TabOperationListItem[];
}

export interface TabOperationGroupResult {
  tab_id: string;
  status: "ok";
  group_name: string;
  grouped_tabs: string[];
}

export type TabOperationResult = TabOperationStatusResult | TabOperationListResult | TabOperationGroupResult;

export interface ExtensionOperationParams {
  operation: "list" | "enable" | "disable" | "uninstall";
  extension_id?: string;
  query?: string;
}

export interface ExtensionManagementItem {
  extension_id: string;
  name: string;
  enabled: boolean;
  install_type?: string;
  description?: string;
}

export interface ExtensionOperationResult {
  status: "ok";
  operation: ExtensionOperationParams["operation"];
  extension_id?: string;
  extensions?: ExtensionManagementItem[];
}

export interface SetActiveTabParams {
  chrome_tab_id: number;
  target_id?: string;
  url?: string;
  title?: string;
}

export interface SetActiveTabResult {
  tab_id: string;
  status: "ok" | "not_found";
}

export interface GetRuntimeStateParams {}

export interface RuntimeStateTab {
  tab_id: string;
  target_id: string;
}

export interface GetRuntimeStateResult {
  mode: "cdp" | "ping_only";
  default_tab_id?: string;
  active_tab_id?: string;
  tabs: RuntimeStateTab[];
  browser_policy: "ungoogled_only" | "prefer_ungoogled" | "any_chromium";
  extension_loaded: boolean;
}

export interface ProviderValidateParams {
  provider: LlmProvider;
  api_key: string;
  base_url?: string;
  model?: string;
  timeout_ms?: number;
}

export interface ProviderValidateResult {
  provider: LlmProvider;
  ok: boolean;
  error_code?: string;
  error_message?: string;
}

export interface ProviderListModelsParams {
  provider: LlmProvider;
  api_key: string;
  base_url?: string;
}

export interface ProviderListModelsResult {
  provider: LlmProvider;
  models: string[];
  default_model?: string;
}

export interface ProviderTranscribeAudioParams {
  provider: LlmProvider;
  model_id: string;
  api_key: string;
  base_url?: string;
  audio_b64: string;
  mime_type: string;
  language?: string;
}

export interface ProviderTranscribeAudioResult {
  provider: LlmProvider;
  model_id: string;
  text: string;
}

export interface ProviderBenchmarkBrowserControlParams {
  provider: LlmProvider;
  model_id: string;
}

export interface ProviderBenchmarkBrowserControlSummary {
  model_id: string;
  cost_tier: "lowest" | "low" | "medium" | "high";
  pass_count: number;
  total_count: number;
  hard_failure_count: number;
  median_elapsed_ms: number;
  failure_modes: string[];
}

export interface ProviderBenchmarkBrowserControlResult {
  provider: LlmProvider;
  model_id: string;
  benchmark_kind: string;
  generated_at: string;
  search_excluded: boolean;
  policy_status: "approved" | "experimental" | "blocked";
  output_dir: string;
  summary_path: string;
  summary: ProviderBenchmarkBrowserControlSummary;
}

export interface FindParams {
  query: string;
  tab_id?: string;
  limit?: number;
}

export interface FindMatch {
  ref: string;
  text?: string;
  role?: string;
  score: number;
  coordinates?: {
    x: number;
    y: number;
  };
}

export interface FindResult {
  matches: FindMatch[];
}

export interface GetPageTextParams {
  tab_id?: string;
  max_chars?: number;
}

export interface GetPageTextResult {
  text: string;
  truncated: boolean;
}

export interface SearchWebParams {
  queries: string[];
}

export interface SearchWebResultItem {
  id: string;
  title: string;
  url: string;
  snippet: string;
}

export interface SearchWebResult {
  results: SearchWebResultItem[];
}

export interface TodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed";
  active_form?: string;
}

export interface TodoWriteParams {
  todos: TodoItem[];
}

export interface TodoWriteResult {
  updated: number;
  todos: TodoItem[];
}

export type SourceOrigin = "user" | "web" | "image" | "system" | "screenshot";

export interface SourceAttribution {
  id: string;
  origin: SourceOrigin;
  action?: string;
  label?: string;
  title?: string;
  url?: string;
}

export interface EmailDraftArtifact {
  kind: "email";
  subject: string;
  body_markdown: string;
  body_text: string;
  body_html?: string;
}

export type DraftArtifact = EmailDraftArtifact;

export interface AgentRunParams {
  prompt: string;
  tab_id?: string;
  provider: LlmProvider;
  model?: string;
  max_steps?: number;
  max_actions_per_step?: number;
  failure_tolerance?: number;
  enable_vision?: boolean;
  display_highlights?: boolean;
  replanning_frequency?: number;
  page_load_wait_ms?: number;
  replay_history?: boolean;
  history_messages?: AgentHistoryMessage[];
  memory_items?: AgentMemoryItem[];
  has_image_input?: boolean;
  images?: string[];
  api_key?: string;
  base_url?: string;
  thinking_level?: string;
  enable_function_calling?: boolean;
  allow_browser_search?: boolean;
  enable_code_execution?: boolean;
  allow_browser_admin_pages?: boolean;
  allow_extension_management?: boolean;
}

export interface AgentHistoryMessage {
  role: "user" | "assistant";
  text: string;
}

export interface AgentMemoryItem {
  id: string;
  source: "manual" | "bookmark" | "history" | "settings";
  text: string;
  title?: string;
}

export interface AgentRunResult {
  run_id: string;
  status: "started";
}

export type AgentTaskRole = "primary" | "subagent";
export type AgentTaskVisibility = "panel" | "hidden";

export interface AgentTaskError {
  code: string;
  message: string;
}

export interface AgentPauseParams {
  run_id: string;
}

export interface AgentPauseResult {
  run_id: string;
  status: "pausing" | "paused";
}

export interface AgentResumeParams {
  run_id: string;
}

export interface AgentResumeResult {
  run_id: string;
  status: "running";
}

export interface AgentSteerParams {
  run_id: string;
  prompt: string;
}

export interface AgentSteerResult {
  run_id: string;
  status: "queued";
  queued_count: number;
}

export interface AgentStopParams {
  run_id: string;
}

export interface AgentStopResult {
  run_id: string;
  status: "stopped";
}

export interface AgentGetStateParams {
  run_id: string;
}

export interface AgentStepTrace {
  ts: string;
  phase: "planner" | "executor";
  action: string;
  status: "started" | "completed" | "failed" | "stopped";
  details?: JsonObject;
}

export type AgentLifecycleStatus = "running" | "pausing" | "paused" | "completed" | "failed" | "stopped";

export interface AgentTaskState {
  task_id: string;
  run_id: string;
  parent_task_id?: string;
  role: AgentTaskRole;
  visibility: AgentTaskVisibility;
  status: AgentLifecycleStatus;
  children: string[];
  active_child_task_id?: string;
  child_summary?: string;
  child_error?: AgentTaskError;
  last_validated_observation?: string;
}

export interface CreateSubagentParams {
  prompt: string;
  goal_summary?: string;
  start_url?: string;
  parent_task_id: string;
}

export interface CreateSubagentResult {
  task_id: string;
  status: "started" | "rejected";
  visibility: "hidden";
  summary?: string;
  error?: AgentTaskError;
}

export interface AgentStateResult {
  run_id: string;
  status: AgentLifecycleStatus;
  steps: AgentStepTrace[];
  final_answer?: string;
  draft_artifact?: DraftArtifact;
  error_message?: string;
  user_language?: string;
  has_image_input?: boolean;
  sources?: SourceAttribution[];
  task?: AgentTaskState;
}

export type BrowserActionParams = ComputerBatchParams | NavigateParams | FormInputParams | TabOperationParams | ExtensionOperationParams;

export interface RpcRequest {
  request_id: string;
  action: string;
  tab_id: string;
  params: JsonObject;
}

export interface RpcErrorDetails extends JsonObject {}

export interface RpcErrorBody {
  code: string;
  message: string;
  details?: RpcErrorDetails;
}

export interface RpcSuccessResponse {
  request_id: string;
  ok: true;
  result: JsonObject;
}

export interface RpcErrorResponse {
  request_id: string;
  ok: false;
  error: RpcErrorBody;
  retryable: boolean;
}

export type RpcResponse = RpcSuccessResponse | RpcErrorResponse;

export function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

function isLlmProvider(value: unknown): value is LlmProvider {
  return value === "openai" || value === "anthropic" || value === "google" || value === "deepseek";
}

function isMouseButton(value: unknown): value is MouseButton {
  return value === "left" || value === "middle" || value === "right";
}

function parseComputerStep(value: unknown): ComputerStep | null {
  if (!isRecord(value)) {
    return null;
  }

  if (!isString(value.kind)) {
    return parseComputerStepAlias(value);
  }

  if (value.kind === "click") {
    const ref = isNonEmptyString(value.ref) ? value.ref : undefined;
    const x = isFiniteNumber(value.x) ? value.x : undefined;
    const y = isFiniteNumber(value.y) ? value.y : undefined;
    const button = isMouseButton(value.button) ? value.button : undefined;
    const clickCount = isFiniteNumber(value.click_count) ? value.click_count : undefined;

    const hasRef = value.ref === undefined || ref !== undefined;
    const hasPoint =
      (value.x === undefined && value.y === undefined) ||
      (x !== undefined && y !== undefined);

    if (!hasRef || !hasPoint || (!value.ref && value.x === undefined)) {
      return null;
    }

    if (value.button !== undefined && button === undefined) {
      return null;
    }

    if (value.click_count !== undefined && (clickCount === undefined || clickCount <= 0)) {
      return null;
    }

    return {
      kind: "click",
      ref,
      x,
      y,
      button,
      click_count: clickCount
    };
  }

  if (value.kind === "type") {
    const ref = isNonEmptyString(value.ref) ? value.ref : undefined;
    if (value.ref !== undefined && ref === undefined) {
      return null;
    }

    if (!isString(value.text)) {
      return null;
    }

    return {
      kind: "type",
      ref,
      text: value.text
    };
  }

  if (value.kind === "key") {
    if (!isNonEmptyString(value.key)) {
      return null;
    }

    return {
      kind: "key",
      key: value.key
    };
  }

  if (value.kind === "scroll") {
    if (value.ref !== undefined && !isNonEmptyString(value.ref)) {
      return null;
    }

    const x = isFiniteNumber(value.x) ? value.x : undefined;
    const y = isFiniteNumber(value.y) ? value.y : undefined;
    if (value.delta_x !== undefined && !isFiniteNumber(value.delta_x)) {
      return null;
    }

    if (value.delta_y !== undefined && !isFiniteNumber(value.delta_y)) {
      return null;
    }

    const hasPoint =
      (value.x === undefined && value.y === undefined) ||
      (x !== undefined && y !== undefined);
    if (!hasPoint) {
      return null;
    }

    return {
      kind: "scroll",
      ref: value.ref,
      x,
      y,
      delta_x: value.delta_x,
      delta_y: value.delta_y
    };
  }

  if (value.kind === "screenshot") {
    return {
      kind: "screenshot"
    };
  }

  if (value.kind === "dialog") {
    const accept = isBoolean(value.accept) ? value.accept : true;
    if (value.prompt_text !== undefined && !isString(value.prompt_text)) {
      return null;
    }

    return {
      kind: "dialog",
      accept,
      prompt_text: value.prompt_text
    };
  }

  if (value.kind === "drag") {
    const fromRef = isNonEmptyString(value.from_ref) ? value.from_ref : undefined;
    const toRef = isNonEmptyString(value.to_ref) ? value.to_ref : undefined;
    const fromX = isFiniteNumber(value.from_x) ? value.from_x : undefined;
    const fromY = isFiniteNumber(value.from_y) ? value.from_y : undefined;
    const toX = isFiniteNumber(value.to_x) ? value.to_x : undefined;
    const toY = isFiniteNumber(value.to_y) ? value.to_y : undefined;

    const hasFromRef = value.from_ref === undefined || fromRef !== undefined;
    const hasToRef = value.to_ref === undefined || toRef !== undefined;
    const hasFromPoint =
      (value.from_x === undefined && value.from_y === undefined) ||
      (fromX !== undefined && fromY !== undefined);
    const hasToPoint =
      (value.to_x === undefined && value.to_y === undefined) ||
      (toX !== undefined && toY !== undefined);

    if (!hasFromRef || !hasToRef || !hasFromPoint || !hasToPoint) {
      return null;
    }

    if (!value.from_ref && value.from_x === undefined) {
      return null;
    }

    if (!value.to_ref && value.to_x === undefined) {
      return null;
    }

    return {
      kind: "drag",
      from_ref: fromRef,
      to_ref: toRef,
      from_x: fromX,
      from_y: fromY,
      to_x: toX,
      to_y: toY
    };
  }

  return null;
}

function parseComputerStepAlias(value: JsonObject): ComputerStep | null {
  const normalized: JsonObject = { ...value };

  if (normalized.ref === undefined && isNonEmptyString(normalized.ref_id)) {
    normalized.ref = normalized.ref_id;
  }

  const parsed = parseCanonicalComputerAliasParams(normalized);
  if (!parsed || parsed.steps.length !== 1) {
    return null;
  }

  return parsed.steps[0] ?? null;
}

function parseComputerBatchParams(value: unknown): ComputerBatchParams | null {
  if (!isRecord(value) || !Array.isArray(value.steps) || value.steps.length === 0) {
    return null;
  }

  const steps: ComputerStep[] = [];
  for (const rawStep of value.steps) {
    const step = parseComputerStep(rawStep);
    if (!step) {
      return null;
    }
    steps.push(step);
  }

  return { steps };
}

function parseCoordinate(value: unknown): { x: number; y: number } | null {
  if (!Array.isArray(value) || value.length !== 2) {
    return null;
  }

  const [x, y] = value;
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) {
    return null;
  }

  return { x, y };
}

function parseCanonicalComputerAliasParams(value: unknown): ComputerBatchParams | null {
  if (!isRecord(value) || !isNonEmptyString(value.action)) {
    return null;
  }

  const action = value.action.trim().toLowerCase();
  if (action === "screenshot") {
    return {
      steps: [{ kind: "screenshot" }]
    };
  }

  if (action === "accept_dialog" || action === "confirm_dialog" || action === "dialog_accept") {
    const promptText =
      isString(value.prompt_text) ? value.prompt_text
        : isString(value.text) ? value.text
          : isString(value.value) ? value.value
            : undefined;

    return {
      steps: [{ kind: "dialog", accept: true, prompt_text: promptText }]
    };
  }

  if (action === "dismiss_dialog" || action === "cancel_dialog" || action === "dialog_dismiss") {
    return {
      steps: [{ kind: "dialog", accept: false }]
    };
  }

  if (action === "dialog" || action === "handle_dialog") {
    const accept = isBoolean(value.accept) ? value.accept : true;
    const promptText =
      isString(value.prompt_text) ? value.prompt_text
        : isString(value.text) ? value.text
          : isString(value.value) ? value.value
            : undefined;

    return {
      steps: [{ kind: "dialog", accept, prompt_text: promptText }]
    };
  }

  if (action === "prompt" || action === "submit_prompt" || action === "dialog_prompt") {
    const promptText =
      isString(value.prompt_text) ? value.prompt_text
        : isString(value.text) ? value.text
          : isString(value.value) ? value.value
            : undefined;

    return {
      steps: [{ kind: "dialog", accept: true, prompt_text: promptText }]
    };
  }

  if (action === "accept" || action === "confirm") {
    const promptText =
      isString(value.prompt_text) ? value.prompt_text
        : isString(value.text) ? value.text
          : isString(value.value) ? value.value
            : undefined;

    return {
      steps: [{ kind: "dialog", accept: true, prompt_text: promptText }]
    };
  }

  if (action === "dismiss" || action === "cancel") {
    return {
      steps: [{ kind: "dialog", accept: false }]
    };
  }

  if (
    action === "left_click" ||
    action === "click" ||          // alias: LLMs sometimes emit "click" instead of "left_click"
    action === "right_click" ||
    action === "double_click" ||
    action === "triple_click"
  ) {
    const ref = isNonEmptyString(value.ref) ? value.ref : undefined;
    if (value.ref !== undefined && ref === undefined) {
      return null;
    }

    const coordinate = value.coordinate === undefined ? null : parseCoordinate(value.coordinate);
    if (value.coordinate !== undefined && coordinate === null) {
      return null;
    }

    if (!ref && !coordinate) {
      return null;
    }

    const clickCount =
      action === "double_click"
        ? 2
        : action === "triple_click"
          ? 3
          : 1;
    const button = action === "right_click" ? "right" : "left";

    return {
      steps: [
        {
          kind: "click",
          ref,
          x: coordinate?.x,
          y: coordinate?.y,
          button,
          click_count: clickCount
        }
      ]
    };
  }

  if (action === "type") {
    if (!isString(value.text)) {
      return null;
    }

    const ref = isNonEmptyString(value.ref) ? value.ref : undefined;
    if (value.ref !== undefined && ref === undefined) {
      return null;
    }

    return {
      steps: [
        {
          kind: "type",
          ref,
          text: value.text
        }
      ]
    };
  }

  if (action === "key") {
    if (!isNonEmptyString(value.text)) {
      return null;
    }

    return {
      steps: [
        {
          kind: "key",
          key: value.text
        }
      ]
    };
  }

  // mouse_move: no-op — convert to screenshot so the LLM gets visual feedback
  if (action === "mouse_move" || action === "move_mouse" || action === "hover") {
    return { steps: [{ kind: "screenshot" }] };
  }

  // middle_click: treat as left_click (best approximation)
  if (action === "middle_click") {
    const coordinate = value.coordinate === undefined ? null : parseCoordinate(value.coordinate);
    if (coordinate) {
      return { steps: [{ kind: "click", x: coordinate.x, y: coordinate.y, button: "left", click_count: 1 }] };
    }
    return null;
  }

  // Comet WAIT action — pause for specified duration then screenshot
  if (action === "wait" || action === "sleep" || action === "pause") {
    const rawDuration = value.duration ?? value.duration_ms ?? value.ms ?? value.milliseconds;
    const durationMs = typeof rawDuration === "number" && rawDuration > 0
      ? Math.min(Math.floor(rawDuration), 10_000)  // cap at 10s
      : 1000;                                        // default 1s if not specified
    return { steps: [{ kind: "wait", duration_ms: durationMs }] };
  }

  // key_press / press_key: alias for "key"
  if (action === "key_press" || action === "press_key" || action === "keyboard") {
    const text = isNonEmptyString(value.text) ? value.text : isNonEmptyString(value.key) ? value.key : null;
    if (!text) return null;
    return { steps: [{ kind: "key", key: text }] };
  }

  // left_click_drag: treat as a click at the start coordinate (drag unsupported; avoid crash)
  if (action === "left_click_drag" || action === "click_drag" || action === "drag_and_drop") {
    const coordinate = value.coordinate === undefined
      ? (value.startCoordinate === undefined ? null : parseCoordinate(value.startCoordinate))
      : parseCoordinate(value.coordinate);
    if (coordinate) {
      return { steps: [{ kind: "click", x: coordinate.x, y: coordinate.y, button: "left", click_count: 1 }] };
    }
    return { steps: [{ kind: "screenshot" }] };
  }

  // scroll_to: alias for scroll — treat as scroll-down at coordinate
  if (action === "scroll_to") {
    const coordinate = value.coordinate === undefined ? null : parseCoordinate(value.coordinate);
    return { steps: [{ kind: "scroll", x: coordinate?.x, y: coordinate?.y, delta_x: 0, delta_y: 360 }] };
  }

  // cursor_position / get_cursor_position: no-op screenshot
  if (action === "cursor_position" || action === "get_cursor_position") {
    return { steps: [{ kind: "screenshot" }] };
  }

  if (action === "scroll") {
    if (!isRecord(value.scroll_parameters) || !isNonEmptyString(value.scroll_parameters.scroll_direction)) {
      return null;
    }

    const coordinate = value.coordinate === undefined ? null : parseCoordinate(value.coordinate);
    if (value.coordinate !== undefined && coordinate === null) {
      return null;
    }

    const amount =
      value.scroll_parameters.scroll_amount === undefined
        ? 1
        : isFiniteNumber(value.scroll_parameters.scroll_amount)
          ? value.scroll_parameters.scroll_amount
          : null;
    if (amount === null || amount <= 0) {
      return null;
    }

    const distance = Math.max(1, Math.floor(amount)) * 120;
    const direction = value.scroll_parameters.scroll_direction.trim().toLowerCase();
    let deltaX = 0;
    let deltaY = 0;

    if (direction === "down") {
      deltaY = distance;
    } else if (direction === "up") {
      deltaY = -distance;
    } else if (direction === "right") {
      deltaX = distance;
    } else if (direction === "left") {
      deltaX = -distance;
    } else {
      return null;
    }

    return {
      steps: [
        {
          kind: "scroll",
          x: coordinate?.x,
          y: coordinate?.y,
          delta_x: deltaX,
          delta_y: deltaY
        }
      ]
    };
  }

  return null;
}

function parseNavigateParams(value: unknown): NavigateParams | null {
  if (!isRecord(value)) {
    return null;
  }

  let mode: NavigateParams["mode"] | undefined;
  let url = value.url;
  const rawMode = typeof value.mode === "string" ? value.mode.trim().toLowerCase() : undefined;

  if (rawMode === "to" || rawMode === "back" || rawMode === "forward") {
    mode = rawMode;
  } else if (
    rawMode === "url" ||
    rawMode === "open" ||
    rawMode === "primary" ||
    rawMode === "active_tab" ||
    rawMode === "new_tab" ||
    rawMode === "current_tab" ||
    rawMode === "goto" ||
    rawMode === "direct" ||
    rawMode === "gpt_history"
  ) {
    mode = "to";
  } else if (value.mode !== undefined) {
    return null;
  }

  if (mode === undefined) {
    if (!isNonEmptyString(value.url)) {
      return null;
    }

    if (value.url === "back" || value.url === "forward") {
      mode = value.url;
      url = undefined;
    } else {
      mode = "to";
    }
  }

  if (mode === "to" && !isNonEmptyString(url)) {
    return null;
  }

  if (url !== undefined && !isNonEmptyString(url)) {
    return null;
  }

  if (value.timeout_ms !== undefined && (!isFiniteNumber(value.timeout_ms) || value.timeout_ms <= 0)) {
    return null;
  }

  if (value.allow_sensitive_browser_pages !== undefined && !isBoolean(value.allow_sensitive_browser_pages)) {
    return null;
  }

  return {
    mode,
    url,
    timeout_ms: value.timeout_ms,
    allow_sensitive_browser_pages: value.allow_sensitive_browser_pages
  };
}

function parseFormInputParams(value: unknown): FormInputParams | null {
  if (!isRecord(value) || !Array.isArray(value.fields) || value.fields.length === 0) {
    return null;
  }

  const fields: FormInputField[] = [];
  for (const rawField of value.fields) {
    if (!isRecord(rawField)) {
      return null;
    }
    const ref = isNonEmptyString(rawField.ref) ? rawField.ref : isNonEmptyString(rawField.ref_id) ? rawField.ref_id : null;
    if (!ref) {
      return null;
    }

    const inferredKind =
      rawField.kind === "text" || rawField.kind === "select" || rawField.kind === "checkbox" || rawField.kind === "file"
        ? rawField.kind
        : isBoolean(rawField.value)
          ? "checkbox"
          : isString(rawField.value)
            ? "text"
            : null;
    if (!inferredKind) {
      return null;
    }

    if (inferredKind === "checkbox") {
      if (!isBoolean(rawField.value)) {
        return null;
      }
    } else if (!isString(rawField.value)) {
      return null;
    }

    fields.push({
      ref,
      kind: inferredKind,
      value: rawField.value
    });
  }

  return { fields };
}

function parseCanonicalFormInputAliasParams(value: unknown): FormInputParams | null {
  if (!isRecord(value) || !isNonEmptyString(value.ref) || !("value" in value)) {
    return null;
  }

  if (isBoolean(value.value)) {
    return {
      fields: [
        {
          ref: value.ref,
          kind: "checkbox",
          value: value.value
        }
      ]
    };
  }

  if (!isString(value.value)) {
    return null;
  }

  return {
    fields: [
      {
        ref: value.ref,
        kind: "text",
        value: value.value
      }
    ]
  };
}

function parseTabOperationParams(value: unknown): TabOperationParams | null {
  if (!isRecord(value)) {
    return null;
  }

  const VALID_OPS = ["create", "activate", "close", "list", "group", "ungroup"] as const;
  if (!VALID_OPS.includes(value.operation as (typeof VALID_OPS)[number])) {
    return null;
  }

  if (value.target_tab_id !== undefined && !isNonEmptyString(value.target_tab_id)) {
    return null;
  }

  if (value.url !== undefined && !isNonEmptyString(value.url)) {
    return null;
  }

  // tab_ids: accept string[] or number[] (LLMs sometimes send ints)
  let tab_ids: string[] | undefined;
  if (value.tab_ids !== undefined) {
    if (!Array.isArray(value.tab_ids)) return null;
    tab_ids = (value.tab_ids as unknown[]).map((id) => String(id));
  }

  return {
    operation: value.operation as TabOperationParams["operation"],
    target_tab_id: isNonEmptyString(value.target_tab_id) ? value.target_tab_id : undefined,
    url: isNonEmptyString(value.url) ? value.url : undefined,
    tab_ids,
    group_name: isNonEmptyString(value.group_name) ? value.group_name : undefined,
    group_color: isNonEmptyString(value.group_color) ? value.group_color : undefined,
  };
}

function parseExtensionOperationParams(value: unknown): ExtensionOperationParams | null {
  if (!isRecord(value)) {
    return null;
  }

  const extensionIdValue = value.extension_id ?? value.extensionId;

  const VALID_OPS = ["list", "enable", "disable", "uninstall"] as const;
  if (!VALID_OPS.includes(value.operation as (typeof VALID_OPS)[number])) {
    return null;
  }

  if (extensionIdValue !== undefined && !isNonEmptyString(extensionIdValue)) {
    return null;
  }

  if (value.query !== undefined && !isNonEmptyString(value.query)) {
    return null;
  }

  if (value.operation !== "list" && !isNonEmptyString(extensionIdValue)) {
    return null;
  }

  return {
    operation: value.operation as ExtensionOperationParams["operation"],
    extension_id: isNonEmptyString(extensionIdValue) ? extensionIdValue.trim() : undefined,
    query: isNonEmptyString(value.query) ? value.query.trim() : undefined
  };
}

export function parseSetActiveTabParams(value: unknown): SetActiveTabParams | null {
  if (!isRecord(value)) {
    return null;
  }

  if (!isFiniteNumber(value.chrome_tab_id)) {
    return null;
  }

  if (value.target_id !== undefined && !isNonEmptyString(value.target_id)) {
    return null;
  }

  if (value.url !== undefined && !isNonEmptyString(value.url)) {
    return null;
  }

  if (value.title !== undefined && !isNonEmptyString(value.title)) {
    return null;
  }

  return {
    chrome_tab_id: value.chrome_tab_id,
    target_id: value.target_id,
    url: value.url,
    title: value.title
  };
}

export function parseGetRuntimeStateParams(value: unknown): GetRuntimeStateParams | null {
  if (!isRecord(value)) {
    return null;
  }

  return Object.keys(value).length === 0 ? {} : null;
}

export function parseProviderValidateParams(value: unknown): ProviderValidateParams | null {
  if (!isRecord(value)) {
    return null;
  }

  if (!isLlmProvider(value.provider)) {
    return null;
  }

  if (!isNonEmptyString(value.api_key)) {
    return null;
  }

  if (value.base_url !== undefined && !isNonEmptyString(value.base_url)) {
    return null;
  }

  if (value.model !== undefined && !isNonEmptyString(value.model)) {
    return null;
  }

  if (value.timeout_ms !== undefined && (!isFiniteNumber(value.timeout_ms) || value.timeout_ms <= 0)) {
    return null;
  }

  return {
    provider: value.provider,
    api_key: value.api_key,
    base_url: value.base_url,
    model: value.model,
    timeout_ms: value.timeout_ms
  };
}

export function parseProviderListModelsParams(value: unknown): ProviderListModelsParams | null {
  if (!isRecord(value)) {
    return null;
  }

  if (!isLlmProvider(value.provider)) {
    return null;
  }

  if (!isNonEmptyString(value.api_key)) {
    return null;
  }

  if (value.base_url !== undefined && !isNonEmptyString(value.base_url)) {
    return null;
  }

  return {
    provider: value.provider,
    api_key: value.api_key,
    base_url: value.base_url
  };
}

export function parseProviderTranscribeAudioParams(value: unknown): ProviderTranscribeAudioParams | null {
  if (
    !isRecord(value) ||
    !isLlmProvider(value.provider) ||
    !isNonEmptyString(value.model_id) ||
    !isNonEmptyString(value.api_key) ||
    !isNonEmptyString(value.audio_b64) ||
    !isNonEmptyString(value.mime_type)
  ) {
    return null;
  }

  if (value.base_url !== undefined && !isNonEmptyString(value.base_url)) {
    return null;
  }

  if (value.language !== undefined && !isNonEmptyString(value.language)) {
    return null;
  }

  return {
    provider: value.provider,
    model_id: value.model_id.trim(),
    api_key: value.api_key.trim(),
    base_url: typeof value.base_url === "string" ? value.base_url.trim() : undefined,
    audio_b64: value.audio_b64.trim(),
    mime_type: value.mime_type.trim(),
    language: typeof value.language === "string" ? value.language.trim() : undefined
  };
}

export function parseProviderBenchmarkBrowserControlParams(value: unknown): ProviderBenchmarkBrowserControlParams | null {
  if (!isRecord(value)) {
    return null;
  }

  if (!isLlmProvider(value.provider)) {
    return null;
  }

  if (!isNonEmptyString(value.model_id)) {
    return null;
  }

  return {
    provider: value.provider,
    model_id: value.model_id
  };
}

export function parseFindParams(value: unknown): FindParams | null {
  if (!isRecord(value) || !isNonEmptyString(value.query)) {
    return null;
  }

  if (value.tab_id !== undefined && !isNonEmptyString(value.tab_id)) {
    return null;
  }

  if (value.limit !== undefined && (!isFiniteNumber(value.limit) || value.limit <= 0 || value.limit > 100)) {
    return null;
  }

  return {
    query: value.query,
    tab_id: value.tab_id,
    limit: value.limit
  };
}

export function parseGetPageTextParams(value: unknown): GetPageTextParams | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.tab_id !== undefined && !isNonEmptyString(value.tab_id)) {
    return null;
  }

  if (value.max_chars !== undefined && (!isFiniteNumber(value.max_chars) || value.max_chars <= 0)) {
    return null;
  }

  return {
    tab_id: value.tab_id,
    max_chars: value.max_chars
  };
}

export function parseSearchWebParams(value: unknown): SearchWebParams | null {
  if (!isRecord(value) || !Array.isArray(value.queries) || value.queries.length === 0 || value.queries.length > 3) {
    return null;
  }

  const queries: string[] = [];
  for (const query of value.queries) {
    if (!isNonEmptyString(query)) {
      return null;
    }
    queries.push(query.trim());
  }

  return {
    queries
  };
}

export function parseTodoWriteParams(value: unknown): TodoWriteParams | null {
  if (!isRecord(value) || !Array.isArray(value.todos)) {
    return null;
  }

  const todos: TodoItem[] = [];
  for (const todo of value.todos) {
    if (!isRecord(todo)) {
      return null;
    }

    const content = isNonEmptyString(todo.content)
      ? todo.content.trim()
      : isNonEmptyString(todo.task)
        ? todo.task.trim()
        : null;
    if (!content) {
      return null;
    }

    let status: TodoItem["status"] | undefined;
    if (todo.status === "pending" || todo.status === "in_progress" || todo.status === "completed") {
      status = todo.status;
    } else if (isBoolean(todo.completed)) {
      status = todo.completed ? "completed" : "pending";
    } else if (isBoolean(todo.done)) {
      status = todo.done ? "completed" : "pending";
    } else {
      status = "pending";
    }

    const activeFormRaw = todo.active_form ?? todo.activeForm;
    if (activeFormRaw !== undefined && !isNonEmptyString(activeFormRaw)) {
      return null;
    }

    todos.push({
      content,
      status,
      active_form: typeof activeFormRaw === "string" ? activeFormRaw.trim() : undefined
    });
  }

  return { todos };
}

export function parseAgentRunParams(value: unknown): AgentRunParams | null {
  if (!isRecord(value) || !isNonEmptyString(value.prompt) || !isLlmProvider(value.provider)) {
    return null;
  }

  if (value.tab_id !== undefined && !isNonEmptyString(value.tab_id)) {
    return null;
  }

  if (value.model !== undefined && !isNonEmptyString(value.model)) {
    return null;
  }

  if (value.max_steps !== undefined && (!isFiniteNumber(value.max_steps) || value.max_steps <= 0 || value.max_steps > 250)) {
    return null;
  }

  if (value.max_actions_per_step !== undefined && (!isFiniteNumber(value.max_actions_per_step) || value.max_actions_per_step <= 0 || value.max_actions_per_step > 250)) {
    return null;
  }

  if (value.failure_tolerance !== undefined && (!isFiniteNumber(value.failure_tolerance) || value.failure_tolerance < 0 || value.failure_tolerance > 50)) {
    return null;
  }

  if (value.enable_vision !== undefined && !isBoolean(value.enable_vision)) {
    return null;
  }

  if (value.display_highlights !== undefined && !isBoolean(value.display_highlights)) {
    return null;
  }

  if (value.replanning_frequency !== undefined && (!isFiniteNumber(value.replanning_frequency) || value.replanning_frequency < 0 || value.replanning_frequency > 250)) {
    return null;
  }

  if (value.page_load_wait_ms !== undefined && (!isFiniteNumber(value.page_load_wait_ms) || value.page_load_wait_ms < 0 || value.page_load_wait_ms > 30000)) {
    return null;
  }

  if (value.replay_history !== undefined && !isBoolean(value.replay_history)) {
    return null;
  }

  let historyMessages: AgentHistoryMessage[] | undefined;
  if (value.history_messages !== undefined) {
    if (!Array.isArray(value.history_messages) || value.history_messages.length > 200) {
      return null;
    }
    historyMessages = [];
    for (const entry of value.history_messages) {
      if (!isRecord(entry) || !isNonEmptyString(entry.text) || (entry.role !== "user" && entry.role !== "assistant")) {
        return null;
      }
      historyMessages.push({
        role: entry.role,
        text: entry.text.trim()
      });
    }
  }

  let memoryItems: AgentMemoryItem[] | undefined;
  if (value.memory_items !== undefined) {
    if (!Array.isArray(value.memory_items) || value.memory_items.length > 64) {
      return null;
    }
    memoryItems = [];
    for (const entry of value.memory_items) {
      if (
        !isRecord(entry) ||
        !isNonEmptyString(entry.id) ||
        !isNonEmptyString(entry.text) ||
        (entry.source !== "manual" && entry.source !== "bookmark" && entry.source !== "history" && entry.source !== "settings")
      ) {
        return null;
      }
      if (entry.title !== undefined && !isNonEmptyString(entry.title)) {
        return null;
      }
      memoryItems.push({
        id: entry.id.trim(),
        source: entry.source,
        text: entry.text.trim(),
        title: typeof entry.title === "string" ? entry.title.trim() : undefined
      });
    }
  }

  if (value.has_image_input !== undefined && !isBoolean(value.has_image_input)) {
    return null;
  }

  if (value.images !== undefined) {
    if (!Array.isArray(value.images)) {
      return null;
    }
    for (const img of value.images) {
      if (typeof img !== "string" || img.trim().length === 0) {
        return null;
      }
    }
  }

  if (value.api_key !== undefined && !isNonEmptyString(value.api_key)) {
    return null;
  }

  if (value.base_url !== undefined && !isNonEmptyString(value.base_url)) {
    return null;
  }

  const VALID_THINKING_LEVELS = ["minimal", "low", "medium", "high"] as const;
  if (value.thinking_level !== undefined &&
      (typeof value.thinking_level !== "string" || !VALID_THINKING_LEVELS.includes(value.thinking_level as (typeof VALID_THINKING_LEVELS)[number]))) {
    return null;
  }

  if (value.enable_function_calling !== undefined && !isBoolean(value.enable_function_calling)) {
    return null;
  }

  if (value.allow_browser_search !== undefined && !isBoolean(value.allow_browser_search)) {
    return null;
  }

  if (value.enable_code_execution !== undefined && !isBoolean(value.enable_code_execution)) {
    return null;
  }

  if (value.allow_browser_admin_pages !== undefined && !isBoolean(value.allow_browser_admin_pages)) {
    return null;
  }

  if (value.allow_extension_management !== undefined && !isBoolean(value.allow_extension_management)) {
    return null;
  }

  return {
    prompt: value.prompt.trim(),
    tab_id: value.tab_id,
    provider: value.provider,
    model: value.model,
    max_steps: value.max_steps,
    max_actions_per_step: value.max_actions_per_step,
    failure_tolerance: value.failure_tolerance,
    enable_vision: value.enable_vision,
    display_highlights: value.display_highlights,
    replanning_frequency: value.replanning_frequency,
    page_load_wait_ms: value.page_load_wait_ms,
    replay_history: value.replay_history,
    history_messages: historyMessages,
    memory_items: memoryItems,
    has_image_input: value.has_image_input,
    images: Array.isArray(value.images) ? (value.images as string[]) : undefined,
    api_key: typeof value.api_key === "string" ? value.api_key.trim() : undefined,
    base_url: typeof value.base_url === "string" ? value.base_url.trim() : undefined,
    thinking_level: typeof value.thinking_level === "string" ? value.thinking_level : undefined,
    enable_function_calling: value.enable_function_calling,
    allow_browser_search: value.allow_browser_search,
    enable_code_execution: value.enable_code_execution,
    allow_browser_admin_pages: value.allow_browser_admin_pages,
    allow_extension_management: value.allow_extension_management
  };
}

export function parseAgentStopParams(value: unknown): AgentStopParams | null {
  if (!isRecord(value) || !isNonEmptyString(value.run_id)) {
    return null;
  }

  return {
    run_id: value.run_id
  };
}

export function parseAgentPauseParams(value: unknown): AgentPauseParams | null {
  if (!isRecord(value) || !isNonEmptyString(value.run_id)) {
    return null;
  }

  return {
    run_id: value.run_id
  };
}

export function parseAgentResumeParams(value: unknown): AgentResumeParams | null {
  if (!isRecord(value) || !isNonEmptyString(value.run_id)) {
    return null;
  }

  return {
    run_id: value.run_id
  };
}

export function parseAgentSteerParams(value: unknown): AgentSteerParams | null {
  if (!isRecord(value) || !isNonEmptyString(value.run_id) || !isNonEmptyString(value.prompt)) {
    return null;
  }

  return {
    run_id: value.run_id,
    prompt: value.prompt.trim()
  };
}

export function parseAgentGetStateParams(value: unknown): AgentGetStateParams | null {
  if (!isRecord(value) || !isNonEmptyString(value.run_id)) {
    return null;
  }

  return {
    run_id: value.run_id
  };
}

function parseTabsCreateAliasParams(value: unknown): TabOperationParams | null {
  if (!isRecord(value)) {
    return null;
  }

  const explicit = parseTabOperationParams(value);
  if (explicit) {
    return explicit;
  }

  if (value.url !== undefined && !isNonEmptyString(value.url)) {
    return null;
  }

  return {
    operation: "create",
    url: value.url
  };
}

export function normalizeBrowserRpcAction(action: string): LegacyBrowserRpcAction | null {
  if (action === "ComputerBatch" || action === "computer") {
    return "ComputerBatch";
  }

  if (action === "Navigate" || action === "navigate") {
    return "Navigate";
  }

  if (action === "FormInput" || action === "form_input") {
    return "FormInput";
  }

  if (action === "TabOperation" || action === "tabs_create") {
    return "TabOperation";
  }

  if (action === "ExtensionsManage" || action === "extensions_manage") {
    return "ExtensionsManage";
  }

  return null;
}

export function normalizeToolRpcAction(action: string): CanonicalToolRpcAction | null {
  if (action === "ReadPage" || action === "read_page") {
    return "read_page";
  }

  if (action === "Find" || action === "find") {
    return "find";
  }

  if (action === "GetPageText" || action === "get_page_text") {
    return "get_page_text";
  }

  if (action === "SearchWeb" || action === "search_web") {
    return "search_web";
  }

  if (action === "TodoWrite" || action === "todo_write") {
    return "todo_write";
  }

  return null;
}

export function isBrowserRpcAction(action: string): action is BrowserRpcAction {
  return normalizeBrowserRpcAction(action) !== null;
}

export function parseBrowserRpcParams(action: "ComputerBatch" | "computer", params: JsonObject): ComputerBatchParams | null;
export function parseBrowserRpcParams(action: "Navigate" | "navigate", params: JsonObject): NavigateParams | null;
export function parseBrowserRpcParams(action: "FormInput" | "form_input", params: JsonObject): FormInputParams | null;
export function parseBrowserRpcParams(action: "TabOperation" | "tabs_create", params: JsonObject): TabOperationParams | null;
export function parseBrowserRpcParams(action: "ExtensionsManage" | "extensions_manage", params: JsonObject): ExtensionOperationParams | null;
export function parseBrowserRpcParams(action: BrowserRpcAction, params: JsonObject): BrowserActionParams | null;
export function parseBrowserRpcParams(action: BrowserRpcAction, params: JsonObject): BrowserActionParams | null {
  if (action === "computer") {
    return parseComputerBatchParams(params) ?? parseCanonicalComputerAliasParams(params);
  }

  if (action === "form_input") {
    return parseFormInputParams(params) ?? parseCanonicalFormInputAliasParams(params);
  }

  if (action === "tabs_create") {
    return parseTabsCreateAliasParams(params);
  }

  const normalized = normalizeBrowserRpcAction(action);
  if (normalized === "ComputerBatch") {
    return parseComputerBatchParams(params);
  }

  if (normalized === "Navigate") {
    return parseNavigateParams(params);
  }

  if (normalized === "FormInput") {
    return parseFormInputParams(params);
  }

  if (normalized === "ExtensionsManage") {
    return parseExtensionOperationParams(params);
  }

  if (normalized === null) {
    return null;
  }

  return parseTabOperationParams(params);
}

export function parseRpcRequest(value: unknown): RpcRequest | null {
  if (!isRecord(value)) {
    return null;
  }

  if (!isNonEmptyString(value.request_id)) {
    return null;
  }

  if (!isNonEmptyString(value.action)) {
    return null;
  }

  // tab_id is optional — if absent or not a string, default to empty string.
  // The sidecar's system dispatcher ignores it for agent actions; browser actions
  // that require a specific tab should supply a valid sidecar tab ID.
  const tab_id = isNonEmptyString(value.tab_id) ? value.tab_id : "";

  if (!isRecord(value.params)) {
    return null;
  }

  return {
    request_id: value.request_id,
    action: value.action,
    tab_id,
    params: value.params
  };
}

export function parseRpcResponse(value: unknown): RpcResponse | null {
  if (!isRecord(value) || !isNonEmptyString(value.request_id) || typeof value.ok !== "boolean") {
    return null;
  }

  if (value.ok === true) {
    if (!isRecord(value.result)) {
      return null;
    }
    return {
      request_id: value.request_id,
      ok: true,
      result: value.result
    };
  }

  if (!isRecord(value.error) || !isString(value.error.code) || !isString(value.error.message)) {
    return null;
  }

  const details = isRecord(value.error.details) ? value.error.details : undefined;

  return {
    request_id: value.request_id,
    ok: false,
    error: {
      code: value.error.code,
      message: value.error.message,
      details
    },
    retryable: value.retryable === true
  };
}

export function parseSseData(value: unknown): SseData | null {
  if (!isRecord(value)) {
    return null;
  }

  const type = value.type;
  if (type !== "log" && type !== "status" && type !== "result" && type !== "error") {
    return null;
  }

  if (!isString(value.ts)) {
    return null;
  }

  if (value.request_id !== undefined && !isString(value.request_id)) {
    return null;
  }

  if (!isRecord(value.payload)) {
    return null;
  }

  return {
    type,
    request_id: value.request_id,
    ts: value.ts,
    payload: value.payload
  };
}

export function parseSseDataFromJson(raw: string): SseData | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parseSseData(parsed);
  } catch {
    return null;
  }
}

export function serializeSseEnvelope(envelope: SseEnvelope): string {
  const lines: string[] = [`id: ${envelope.id}`, `event: ${envelope.event}`];

  if (envelope.retry !== undefined) {
    lines.push(`retry: ${envelope.retry}`);
  }

  const json = JSON.stringify(envelope.data);
  for (const line of json.split("\n")) {
    lines.push(`data: ${line}`);
  }

  return `${lines.join("\n")}\n\n`;
}

export function createRpcSuccess(requestId: string, result: JsonObject): RpcSuccessResponse {
  return {
    request_id: requestId,
    ok: true,
    result
  };
}

export function createRpcError(
  requestId: string,
  code: string,
  message: string,
  retryable: boolean,
  details?: RpcErrorDetails
): RpcErrorResponse {
  return {
    request_id: requestId,
    ok: false,
    error: {
      code,
      message,
      details
    },
    retryable
  };
}
