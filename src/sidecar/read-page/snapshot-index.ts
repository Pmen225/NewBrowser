import type {
  BBox,
  CdpCaptureSnapshotResult,
  CdpDocumentSnapshot,
  SnapshotIndex,
  SnapshotNodeData
} from "./types";

function readBoundsAt(
  bounds: Array<[number, number, number, number]> | number[],
  index: number
): [number, number, number, number] | undefined {
  const first = bounds[0];
  if (Array.isArray(first)) {
    const tupleBounds = bounds as Array<[number, number, number, number]>;
    return tupleBounds[index];
  }

  const flatBounds = bounds as number[];
  const start = index * 4;
  if (start + 3 >= flatBounds.length) {
    return undefined;
  }

  return [
    flatBounds[start],
    flatBounds[start + 1],
    flatBounds[start + 2],
    flatBounds[start + 3]
  ];
}

function readStylePair(
  styles: CdpDocumentSnapshot["layout"]["styles"],
  layoutIndex: number
): [number | undefined, number | undefined] {
  if (!styles) {
    return [undefined, undefined];
  }

  const entry = styles[layoutIndex];
  if (!entry) {
    return [undefined, undefined];
  }

  if (Array.isArray(entry)) {
    return [entry[0], entry[1]];
  }

  return [undefined, undefined];
}

function isVisibleByStyle(doc: CdpDocumentSnapshot, layoutIndex: number, strings: string[]): boolean {
  if (!doc.layout.styles) {
    return true;
  }

  const [displayRef, visibilityRef] = readStylePair(doc.layout.styles, layoutIndex);
  if (displayRef === undefined && visibilityRef === undefined) {
    return true;
  }

  const display = displayRef !== undefined ? strings[displayRef]?.toLowerCase() ?? "" : "";
  const visibility = visibilityRef !== undefined ? strings[visibilityRef]?.toLowerCase() ?? "" : "";

  if (display === "none") {
    return false;
  }

  return visibility !== "hidden" && visibility !== "collapse";
}

function mergeNode(existing: SnapshotNodeData | undefined, incoming: SnapshotNodeData): SnapshotNodeData {
  if (!existing) {
    return incoming;
  }

  return {
    backend_node_id: incoming.backend_node_id,
    bbox: existing.bbox ?? incoming.bbox,
    is_clickable: existing.is_clickable || incoming.is_clickable,
    is_visible: existing.is_visible || incoming.is_visible
  };
}

function buildSnapshotIndexForDocument(
  frameId: string,
  doc: CdpDocumentSnapshot,
  strings: string[],
  existing?: SnapshotIndex
): SnapshotIndex {
  const byBackendNodeId = new Map<number, SnapshotNodeData>();

  if (existing) {
    for (const [backendNodeId, snapshotNodeData] of existing.by_backend_node_id.entries()) {
      byBackendNodeId.set(backendNodeId, snapshotNodeData);
    }
  }

  const clickableNodeIndexes = new Set(doc.nodes.isClickable?.index ?? []);
  const hiddenNodeIndexes = new Set(doc.nodes.isHidden?.index ?? []);
  const scrollOffsetX = doc.scrollOffsetX ?? 0;
  const scrollOffsetY = doc.scrollOffsetY ?? 0;

  for (let layoutIndex = 0; layoutIndex < doc.layout.nodeIndex.length; layoutIndex += 1) {
    const nodeIndex = doc.layout.nodeIndex[layoutIndex];
    const backendNodeId = doc.nodes.backendNodeId[nodeIndex];
    if (backendNodeId === undefined) {
      continue;
    }

    const rawBounds = readBoundsAt(doc.layout.bounds, layoutIndex);
    const bbox: BBox | undefined = rawBounds
      ? {
          x: rawBounds[0] - scrollOffsetX,
          y: rawBounds[1] - scrollOffsetY,
          w: rawBounds[2],
          h: rawBounds[3]
        }
      : undefined;

    const hasDimensions = bbox ? bbox.w > 0 && bbox.h > 0 : false;
    const isVisible = hasDimensions && !hiddenNodeIndexes.has(nodeIndex) && isVisibleByStyle(doc, layoutIndex, strings);

    const entry: SnapshotNodeData = {
      backend_node_id: backendNodeId,
      bbox,
      is_clickable: clickableNodeIndexes.has(nodeIndex),
      is_visible: isVisible
    };

    byBackendNodeId.set(backendNodeId, mergeNode(byBackendNodeId.get(backendNodeId), entry));
  }

  for (const nodeIndex of clickableNodeIndexes) {
    const backendNodeId = doc.nodes.backendNodeId[nodeIndex];
    if (backendNodeId === undefined) {
      continue;
    }

    const existingNode = byBackendNodeId.get(backendNodeId);
      if (!existingNode) {
        byBackendNodeId.set(backendNodeId, {
          backend_node_id: backendNodeId,
          bbox: undefined,
          is_clickable: true,
          is_visible: true
        });
        continue;
      }

    byBackendNodeId.set(backendNodeId, {
      ...existingNode,
      is_clickable: true
    });
  }

  return {
    frame_id: frameId,
    by_backend_node_id: byBackendNodeId
  };
}

function resolveDocumentFrameId(
  doc: CdpDocumentSnapshot,
  strings: string[],
  fallbackFrameId: string
): string {
  if (typeof doc.frameId === "string" && doc.frameId.length > 0) {
    return doc.frameId;
  }

  if (typeof doc.frameId === "number" && Number.isInteger(doc.frameId) && doc.frameId >= 0) {
    const resolved = strings[doc.frameId];
    if (typeof resolved === "string" && resolved.length > 0) {
      return resolved;
    }
  }

  return fallbackFrameId;
}

export function buildSnapshotIndexes(
  snapshot: CdpCaptureSnapshotResult,
  fallbackFrameId: string
): Map<string, SnapshotIndex> {
  const byFrameId = new Map<string, SnapshotIndex>();

  for (const doc of snapshot.documents) {
    const frameId = resolveDocumentFrameId(doc, snapshot.strings, fallbackFrameId);
    const existing = byFrameId.get(frameId);
    const next = buildSnapshotIndexForDocument(frameId, doc, snapshot.strings, existing);
    byFrameId.set(frameId, next);
  }

  return byFrameId;
}

export function applySnapshotOffset(snapshotIndex: SnapshotIndex, offset: { x: number; y: number }): SnapshotIndex {
  const byBackendNodeId = new Map<number, SnapshotNodeData>();

  for (const [backendNodeId, node] of snapshotIndex.by_backend_node_id.entries()) {
    byBackendNodeId.set(backendNodeId, {
      ...node,
      bbox: node.bbox
        ? {
            ...node.bbox,
            x: node.bbox.x + offset.x,
            y: node.bbox.y + offset.y
          }
        : undefined
    });
  }

  return {
    frame_id: snapshotIndex.frame_id,
    by_backend_node_id: byBackendNodeId
  };
}
