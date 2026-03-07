import {
  isBrowserRpcAction,
  normalizeBrowserRpcAction,
  parseBrowserRpcParams,
  type BrowserActionParams,
  type BrowserRpcAction,
  type LegacyBrowserRpcAction,
  type ComputerBatchParams,
  type ComputerBatchResult,
  type FormInputParams,
  type FormInputResult,
  type NavigateParams,
  type NavigateResult,
  type TabOperationParams,
  type TabOperationResult
} from "../../../shared/src/transport";

export type {
  BrowserActionParams,
  BrowserRpcAction,
  LegacyBrowserRpcAction,
  ComputerBatchParams,
  ComputerBatchResult,
  FormInputParams,
  FormInputResult,
  NavigateParams,
  NavigateResult,
  TabOperationParams,
  TabOperationResult
};

export interface ParsedRefId {
  frame_ordinal: number;
  backend_node_id: number;
}

const REF_PATTERN = /^f(\d+):(\d+)$/;

export function parseRefId(refId: string): ParsedRefId | null {
  const match = REF_PATTERN.exec(refId.trim());
  if (!match) {
    return null;
  }

  const frameOrdinal = Number(match[1]);
  const backendNodeId = Number(match[2]);

  if (!Number.isInteger(frameOrdinal) || !Number.isInteger(backendNodeId)) {
    return null;
  }

  if (frameOrdinal < 0 || backendNodeId <= 0) {
    return null;
  }

  return {
    frame_ordinal: frameOrdinal,
    backend_node_id: backendNodeId
  };
}

export function isTask4Action(action: string): action is BrowserRpcAction {
  return isBrowserRpcAction(action);
}

export function normalizeTask4Action(action: string): LegacyBrowserRpcAction | null {
  return normalizeBrowserRpcAction(action);
}

export function parseTask4Params(action: "ComputerBatch", params: Record<string, unknown>): ComputerBatchParams | null;
export function parseTask4Params(action: "Navigate", params: Record<string, unknown>): NavigateParams | null;
export function parseTask4Params(action: "FormInput", params: Record<string, unknown>): FormInputParams | null;
export function parseTask4Params(action: "TabOperation", params: Record<string, unknown>): TabOperationParams | null;
export function parseTask4Params(action: BrowserRpcAction, params: Record<string, unknown>): BrowserActionParams | null;
export function parseTask4Params(action: BrowserRpcAction, params: Record<string, unknown>): BrowserActionParams | null {
  return parseBrowserRpcParams(action, params);
}
