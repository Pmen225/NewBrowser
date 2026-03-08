import type {
  CdpAXNode,
  FilterInteractablesInput,
  FilterInteractablesResult,
  InteractableAction,
  InteractableNode,
  InteractableState
} from "./types";

const INTERACTIVE_ROLES = new Set([
  "button",
  "link",
  "textbox",
  "searchbox",
  "combobox",
  "checkbox",
  "radio",
  "menuitem",
  "option",
  "switch",
  "tab",
  "spinbutton",
  "slider",
  "treeitem"
]);

function hasBooleanProperty(
  properties: Array<{ name: string; value?: { value?: unknown } }> | undefined,
  propertyName: string
): boolean {
  if (!properties) {
    return false;
  }

  return properties.some((property) => {
    if (property.name !== propertyName) {
      return false;
    }
    return property.value?.value === true;
  });
}

function getPropertyValue(
  properties: Array<{ name: string; value?: { value?: unknown } }> | undefined,
  propertyName: string
): unknown {
  if (!properties) {
    return undefined;
  }

  const property = properties.find((entry) => entry.name === propertyName);
  return property?.value?.value;
}

function normalizeBooleanState(value: unknown): boolean | undefined {
  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  return undefined;
}

function normalizeStringState(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return `${value}`;
  }

  return undefined;
}

function collectOptionNames(axNode: CdpAXNode, byNodeId: Map<string, CdpAXNode>): string[] {
  const childIds = Array.isArray(axNode.childIds) ? axNode.childIds : [];
  if (childIds.length === 0) {
    return [];
  }

  const optionNames: string[] = [];
  const queue = [...childIds];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId || visited.has(nodeId)) {
      continue;
    }
    visited.add(nodeId);

    const child = byNodeId.get(nodeId);
    if (!child || child.ignored) {
      continue;
    }

    const role = normalizeRole(child.role?.value);
    if (role === "option") {
      const optionName = normalizeStringState(child.name?.value ?? child.value?.value);
      if (optionName) {
        optionNames.push(optionName);
      }
    }

    if (Array.isArray(child.childIds) && child.childIds.length > 0) {
      queue.push(...child.childIds);
    }
  }

  return optionNames;
}

function extractState(axNode: CdpAXNode, byNodeId: Map<string, CdpAXNode>): InteractableState | undefined {
  const state: InteractableState = {};
  const checked = normalizeBooleanState(getPropertyValue(axNode.properties, "checked"));
  const disabled = normalizeBooleanState(getPropertyValue(axNode.properties, "disabled"));
  const expanded = normalizeBooleanState(getPropertyValue(axNode.properties, "expanded"));
  const selected = normalizeBooleanState(getPropertyValue(axNode.properties, "selected"));
  const value = normalizeStringState(axNode.value?.value ?? getPropertyValue(axNode.properties, "valuetext") ?? getPropertyValue(axNode.properties, "value"));
  const role = normalizeRole(axNode.role?.value);
  const options = role === "combobox" ? collectOptionNames(axNode, byNodeId) : [];

  if (checked !== undefined) {
    state.checked = checked;
  }
  if (disabled !== undefined) {
    state.disabled = disabled;
  }
  if (expanded !== undefined) {
    state.expanded = expanded;
  }
  if (selected !== undefined) {
    state.selected = selected;
  }
  if (value !== undefined) {
    state.value = value;
  }
  if (options.length > 0) {
    state.options = options;
  }

  return Object.keys(state).length > 0 ? state : undefined;
}

function normalizeRole(role: string | undefined): string {
  if (!role) {
    return "generic";
  }
  return role.toLowerCase();
}

function deriveActions(role: string): InteractableAction[] {
  if (role === "textbox" || role === "searchbox" || role === "combobox" || role === "spinbutton") {
    return ["click", "type", "key"];
  }

  if (
    role === "button" ||
    role === "link" ||
    role === "checkbox" ||
    role === "radio" ||
    role === "switch" ||
    role === "option" ||
    role === "menuitem" ||
    role === "tab"
  ) {
    return ["click", "key"];
  }

  return ["click"];
}

function buildNode(input: {
  refId: string;
  frameId: string;
  role: string;
  name?: string;
  state?: InteractableState;
  bbox: { x: number; y: number; w: number; h: number };
  actions: InteractableAction[];
  source: "ax" | "dom_clickable";
}): InteractableNode {
  return {
    ref_id: input.refId,
    frame_id: input.frameId,
    role: input.role,
    name: input.name,
    state: input.state,
    bbox: input.bbox,
    click: {
      x: input.bbox.x + input.bbox.w / 2,
      y: input.bbox.y + input.bbox.h / 2
    },
    actions: input.actions,
    source: input.source
  };
}

export function filterInteractables(input: FilterInteractablesInput): FilterInteractablesResult {
  const nodes: InteractableNode[] = [];
  const backendNodeIdsFromAx = new Set<number>();
  const missingBboxBackendNodeIds = new Set<number>();
  const focusedBackendNodeIds = buildFocusedBackendNodeIds(input.ax_nodes, input.focus_backend_node_id);
  const byNodeId = new Map<string, CdpAXNode>();

  for (const axNode of input.ax_nodes) {
    byNodeId.set(axNode.nodeId, axNode);
  }

  for (const axNode of input.ax_nodes) {
    if (axNode.ignored) {
      continue;
    }

    const backendNodeId = axNode.backendDOMNodeId;
    if (backendNodeId === undefined) {
      continue;
    }

    const role = normalizeRole(axNode.role?.value);
    const isInteractiveByRole = INTERACTIVE_ROLES.has(role);
    const isInteractiveByProperty =
      hasBooleanProperty(axNode.properties, "focusable") || hasBooleanProperty(axNode.properties, "editable");
    const isInteractive = isInteractiveByRole || isInteractiveByProperty;

    if (focusedBackendNodeIds && !focusedBackendNodeIds.has(backendNodeId)) {
      continue;
    }

    if (input.filter_mode === "interactive" && !isInteractive) {
      continue;
    }

    const snapshotNode = input.snapshot_index.by_backend_node_id.get(backendNodeId);
    if (!snapshotNode || !snapshotNode.is_visible) {
      continue;
    }

    if (!snapshotNode.bbox) {
      missingBboxBackendNodeIds.add(backendNodeId);
      continue;
    }

    backendNodeIdsFromAx.add(backendNodeId);

    const normalizedName = axNode.name?.value?.trim();

    nodes.push(
      buildNode({
        refId: `${input.ref_prefix}:${backendNodeId}`,
        frameId: input.frame_id,
        role,
        name: normalizedName ? normalizedName : undefined,
        state: extractState(axNode, byNodeId),
        bbox: snapshotNode.bbox,
        actions: isInteractive ? deriveActions(role) : [],
        source: "ax"
      })
    );
  }

  for (const [backendNodeId, snapshotNode] of input.snapshot_index.by_backend_node_id.entries()) {
    if (
      !snapshotNode.is_clickable ||
      !snapshotNode.is_visible ||
      backendNodeIdsFromAx.has(backendNodeId) ||
      (focusedBackendNodeIds !== null && !focusedBackendNodeIds.has(backendNodeId))
    ) {
      continue;
    }

    if (!snapshotNode.bbox) {
      missingBboxBackendNodeIds.add(backendNodeId);
      continue;
    }

    nodes.push(
      buildNode({
        refId: `${input.ref_prefix}:${backendNodeId}`,
        frameId: input.frame_id,
        role: "generic",
        bbox: snapshotNode.bbox,
        actions: ["click"],
        source: "dom_clickable"
      })
    );
  }

  nodes.sort((left, right) => {
    if (left.bbox.y !== right.bbox.y) {
      return left.bbox.y - right.bbox.y;
    }
    if (left.bbox.x !== right.bbox.x) {
      return left.bbox.x - right.bbox.x;
    }
    return left.ref_id.localeCompare(right.ref_id);
  });

  return {
    nodes,
    diagnostics: {
      missing_bbox_backend_node_ids: [...missingBboxBackendNodeIds].sort((a, b) => a - b)
    }
  };
}

function buildFocusedBackendNodeIds(axNodes: CdpAXNode[], focusBackendNodeId: number | undefined): Set<number> | null {
  if (focusBackendNodeId === undefined) {
    return null;
  }

  const rootNode = axNodes.find((node) => node.backendDOMNodeId === focusBackendNodeId);
  if (!rootNode) {
    return new Set<number>([focusBackendNodeId]);
  }

  const childIds = rootNode.childIds ?? [];
  if (childIds.length === 0) {
    return new Set<number>([focusBackendNodeId]);
  }

  const byNodeId = new Map<string, CdpAXNode>();
  for (const axNode of axNodes) {
    byNodeId.set(axNode.nodeId, axNode);
  }

  const allowed = new Set<number>();
  const stack = [...childIds];
  while (stack.length > 0) {
    const nextNodeId = stack.pop();
    if (!nextNodeId) {
      continue;
    }

    const nextNode = byNodeId.get(nextNodeId);
    if (!nextNode) {
      continue;
    }

    if (typeof nextNode.backendDOMNodeId === "number") {
      allowed.add(nextNode.backendDOMNodeId);
    }

    for (const childId of nextNode.childIds ?? []) {
      stack.push(childId);
    }
  }

  return allowed;
}
