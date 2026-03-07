import type { Protocol } from "devtools-protocol";

export type JsonObject = Record<string, unknown>;

export interface ICdpTransport {
  send<T>(method: string, params?: object, sessionId?: string): Promise<T>;
  on(event: string, handler: (payload: unknown) => void): void;
  off(event: string, handler: (payload: unknown) => void): void;
}

export type TabStatus = "attached" | "detached";

export interface TabRecord {
  tabId: string;
  targetId: string;
  sessionId: string;
  status: TabStatus;
  attachedAt: string;
}

export interface FrameRecord {
  tabId: string;
  frameId: string;
  frameOrdinal: number;
  parentFrameId?: string;
  sessionId: string;
  url: string;
  name: string;
  ownerBackendNodeId?: number;
  isMainFrame: boolean;
  isOopif: boolean;
  updatedAt: string;
}

export interface FrameTreeSnapshot {
  tabId: string;
  mainFrameId: string;
  frameCount: number;
  frames: FrameRecord[];
  refreshedAt: string;
}

export interface SessionRoute {
  sessionId: string;
  frameId?: string;
}

export interface JavaScriptDialogRecord {
  tabId: string;
  sessionId: string;
  type: Protocol.Page.JavascriptDialogOpeningEvent["type"];
  message: string;
  defaultPrompt?: string;
  hasBrowserHandler: boolean;
  openedAt: string;
}

export type RegistryErrorCode =
  | "ATTACH_TARGET_FAILED"
  | "TAB_NOT_FOUND"
  | "DOMAIN_ENABLE_FAILED"
  | "GET_FRAME_TREE_FAILED"
  | "FRAME_NOT_FOUND"
  | "FRAME_SESSION_MISSING"
  | "DETACH_TARGET_FAILED"
  | "TRANSPORT_ERROR";

export class CdpRegistryError extends Error {
  readonly code: RegistryErrorCode;
  readonly retryable: boolean;
  readonly context?: JsonObject;

  constructor(code: RegistryErrorCode, message: string, retryable: boolean, context?: JsonObject) {
    super(`[${code}] ${message}`);
    this.name = "CdpRegistryError";
    this.code = code;
    this.retryable = retryable;
    this.context = context;
  }
}

export interface IFrameRegistry {
  applyFrameTree(tabId: string, frameTree: Protocol.Page.FrameTree, sessionId: string): FrameTreeSnapshot;
  upsertFrameFromNavigation(tabId: string, frame: Protocol.Page.Frame, sessionId?: string): void;
  removeFrame(tabId: string, frameId: string): void;
  bindFrameOwner(tabId: string, frameId: string, ownerBackendNodeId: number): void;
  findByOrdinal(tabId: string, frameOrdinal: number): FrameRecord | undefined;
  listByTab(tabId: string): FrameRecord[];
}

export interface ISessionRegistry {
  attachTab(targetId: string): Promise<TabRecord>;
  reattachTab(tabId: string): Promise<TabRecord>;
  enableDomains(tabId: string): Promise<void>;
  refreshFrameTree(tabId: string): Promise<FrameTreeSnapshot>;
  route(tabId: string, frameId?: string): SessionRoute;
  routeByFrameOrdinal(tabId: string, frameOrdinal: number): SessionRoute;
  detachTab(tabId: string): Promise<void>;
  getTab(tabId: string): TabRecord | undefined;
  listTabs(): TabRecord[];
}

export interface EventEnvelope<T> {
  sessionId?: string;
  params: T;
}
