export type InteractableAction = "click" | "type" | "scroll" | "key";

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface InteractableNode {
  ref_id: string;
  frame_id: string;
  role: string;
  name?: string;
  state?: InteractableState;
  bbox: BBox;
  click: Point;
  actions: InteractableAction[];
  source: "ax" | "dom_clickable";
}

export interface InteractableState {
  checked?: boolean;
  disabled?: boolean;
  expanded?: boolean;
  selected?: boolean;
  value?: string;
  options?: string[];
}

export type ReadPageFilter = "interactive" | "all";

export interface ReadPageParams {
  depth?: number;
  filter?: ReadPageFilter;
  ref_id?: string;
}

export interface ReadPageRequest {
  request_id: string;
  action: "ReadPage";
  tab_id: string;
  params: ReadPageParams;
}

export interface ReadPageResult {
  yaml: string;
  tree: InteractableNode[];
  meta: {
    frame_count: number;
    interactable_count: number;
    generated_at: string;
  };
}

export interface ReadPageError {
  code: string;
  message: string;
  retryable: boolean;
}

export type ReadPageResponse =
  | {
      request_id: string;
      ok: true;
      result: ReadPageResult;
    }
  | {
      request_id: string;
      ok: false;
      error: ReadPageError;
    };

export interface CdpFrame {
  id: string;
  parentId?: string;
}

export interface CdpFrameTree {
  frame: CdpFrame;
  childFrames?: CdpFrameTree[];
}

export interface CdpRareBooleanData {
  index: number[];
}

export interface CdpDocumentSnapshot {
  frameId?: string | number;
  nodes: {
    backendNodeId: number[];
    isClickable?: CdpRareBooleanData;
    isHidden?: CdpRareBooleanData;
  };
  layout: {
    nodeIndex: number[];
    bounds: Array<[number, number, number, number]> | number[];
    styles?: Array<[number, number]> | number[][];
  };
  scrollOffsetX?: number;
  scrollOffsetY?: number;
}

export interface CdpCaptureSnapshotResult {
  documents: CdpDocumentSnapshot[];
  strings: string[];
}

export interface CdpAXNode {
  nodeId: string;
  frameId?: string;
  ignored?: boolean;
  backendDOMNodeId?: number;
  role?: {
    value: string;
  };
  name?: {
    value: string;
  };
  value?: {
    value?: unknown;
  };
  properties?: Array<{
    name: string;
    value?: {
      value?: unknown;
    };
  }>;
  childIds?: string[];
}

export interface CdpGetFullAXTreeResponse {
  nodes: CdpAXNode[];
}

export interface CdpClient {
  Page: {
    getFrameTree: () => Promise<{ frameTree: CdpFrameTree }>;
  };
  DOMSnapshot: {
    captureSnapshot: (params: {
      computedStyles: string[];
      includeDOMRects: boolean;
      frameId?: string;
    }) => Promise<CdpCaptureSnapshotResult>;
  };
  Accessibility: {
    getFullAXTree: (params: {
      depth: number;
      frameId: string;
    }) => Promise<CdpGetFullAXTreeResponse>;
  };
  DOM: {
    getFrameOwner: (params: { frameId: string }) => Promise<{ backendNodeId: number }>;
    resolveNode: (params: { backendNodeId: number }) => Promise<{ object?: { objectId?: string } }>;
  };
  Runtime: {
    callFunctionOn: (params: {
      objectId: string;
      functionDeclaration: string;
      returnByValue: boolean;
      awaitPromise: boolean;
    }) => Promise<{ result?: { value?: unknown } }>;
  };
}

export interface FrameInfo {
  frame_id: string;
  parent_frame_id?: string;
  frame_ordinal: number;
  ref_prefix: string;
  owner_backend_node_id?: number;
  offset: Point;
}

export interface FrameMap {
  root_frame_id: string;
  frames: FrameInfo[];
  by_frame_id: Map<string, FrameInfo>;
}

export interface SnapshotNodeData {
  backend_node_id: number;
  bbox?: BBox;
  is_clickable: boolean;
  is_visible: boolean;
}

export interface SnapshotIndex {
  frame_id: string;
  by_backend_node_id: Map<number, SnapshotNodeData>;
}

export interface FilterInteractablesInput {
  frame_id: string;
  frame_ordinal: number;
  ref_prefix: string;
  ax_nodes: CdpAXNode[];
  snapshot_index: SnapshotIndex;
  filter_mode: ReadPageFilter;
  focus_backend_node_id?: number;
}

export interface FilterInteractablesResult {
  nodes: InteractableNode[];
  diagnostics: {
    missing_bbox_backend_node_ids: number[];
  };
}

export interface ReadPageLogger {
  debug: (event: string, payload: Record<string, unknown>) => void;
}
