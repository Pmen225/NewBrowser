import { applyFrameOffsets, buildFrameMap } from "./frame-map";
import { filterInteractables } from "./interactable-filter";
import { applySnapshotOffset, buildSnapshotIndexes } from "./snapshot-index";
import type {
  CdpClient,
  InteractableNode,
  ReadPageError,
  ReadPageLogger,
  ReadPageRequest,
  ReadPageResponse,
  SnapshotIndex
} from "./types";
import { renderInteractablesYaml } from "./yaml-render";

interface FocusTarget {
  ref_prefix: string;
  backend_node_id: number;
}

interface ClickableLabelResult {
  name?: string;
  role?: string;
}

function makeErrorResponse(requestId: string, error: ReadPageError): ReadPageResponse {
  return {
    request_id: requestId,
    ok: false,
    error
  };
}

function normalizeErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string") {
    return (error as { message: string }).message;
  }

  return "Unexpected ReadPage failure";
}

function isStaleFrameError(error: unknown): boolean {
  const message = normalizeErrorMessage(error).toLowerCase();
  return message.includes("no frame with given id") || message.includes("frame not found") || message.includes("target closed");
}

function collectRefCollisions(nodes: Array<{ ref_id: string }>): string[] {
  const counts = new Map<string, number>();

  for (const node of nodes) {
    counts.set(node.ref_id, (counts.get(node.ref_id) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([refId]) => refId)
    .sort((left, right) => left.localeCompare(right));
}

async function captureSnapshots(cdp: CdpClient, frameIds: string[]): Promise<Map<string, SnapshotIndex>> {
  const byFrame = new Map<string, SnapshotIndex>();

  for (const frameId of frameIds) {
    const capture = await cdp.DOMSnapshot.captureSnapshot({
      // Comet uses ["cursor"] — we keep display+visibility for filter logic + add cursor
      // cursor style identifies clickable elements (pointer = interactive, default = non-interactive)
      computedStyles: ["display", "visibility", "cursor"],
      includeDOMRects: true,
      frameId
    });

    const indexes = buildSnapshotIndexes(capture, frameId);
    for (const [indexedFrameId, index] of indexes.entries()) {
      byFrame.set(indexedFrameId, index);
    }
  }

  return byFrame;
}

function resolveDepth(request: ReadPageRequest): number {
  const depth = request.params.depth;
  if (typeof depth !== "number" || !Number.isFinite(depth)) {
    return 15;
  }

  return Math.max(1, Math.floor(depth));
}

function parseFocusTarget(refId: string | undefined): FocusTarget | undefined {
  if (typeof refId !== "string") {
    return undefined;
  }

  const trimmed = refId.trim();
  const match = /^f(\d+):(\d+)$/.exec(trimmed);
  if (!match) {
    return undefined;
  }

  return {
    ref_prefix: `f${match[1]}`,
    backend_node_id: Number(match[2])
  };
}

function parseClickableLabelResult(value: unknown): ClickableLabelResult | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as { name?: unknown; role?: unknown };
  const name = typeof record.name === "string" && record.name.trim().length > 0 ? record.name.trim() : undefined;
  const role = typeof record.role === "string" && record.role.trim().length > 0 ? record.role.trim().toLowerCase() : undefined;
  if (!name && !role) {
    return undefined;
  }

  return { name, role };
}

async function enrichDomClickableLabels(cdp: CdpClient, tree: InteractableNode[]): Promise<void> {
  const clickableNodes = tree.filter((node) => node.source === "dom_clickable" && (!node.name || node.role === "generic"));
  await Promise.all(
    clickableNodes.map(async (node) => {
      const backendNodeId = Number(node.ref_id.split(":")[1]);
      if (!Number.isFinite(backendNodeId)) {
        return;
      }

      try {
        const resolved = await cdp.DOM.resolveNode({ backendNodeId });
        const objectId = resolved.object?.objectId;
        if (typeof objectId !== "string" || objectId.length === 0) {
          return;
        }

        const inspected = await cdp.Runtime.callFunctionOn({
          objectId,
          functionDeclaration:
            "function() { const el = this; if (!(el instanceof Element)) return {}; const normalize = (value) => typeof value === 'string' ? value.replace(/\\s+/g, ' ').trim() : ''; const candidates = [el.getAttribute('aria-label'), el.getAttribute('title'), 'value' in el ? el.value : '', el instanceof HTMLInputElement ? el.placeholder : '', 'alt' in el ? el.alt : '', el.innerText, el.textContent]; const name = candidates.map(normalize).find((value) => value.length > 0) || ''; let role = ''; if (el instanceof HTMLButtonElement || (el instanceof HTMLInputElement && ['button', 'submit', 'reset'].includes(String(el.type || '').toLowerCase()))) role = 'button'; else if (el instanceof HTMLAnchorElement && !!el.href) role = 'link'; return { name, role }; }",
          returnByValue: true,
          awaitPromise: true
        });
        const label = parseClickableLabelResult(inspected.result?.value);
        if (!label) {
          return;
        }

        if (label.name) {
          node.name = label.name;
        }
        if (label.role && node.role === "generic") {
          node.role = label.role;
        }
      } catch {
        return;
      }
    })
  );
}

export async function readPage(
  cdp: CdpClient,
  request: ReadPageRequest,
  logger?: ReadPageLogger
): Promise<ReadPageResponse> {
  try {
    const filterMode = request.params.filter ?? "interactive";
    const axDepth = resolveDepth(request);
    const focusTarget = parseFocusTarget(request.params.ref_id);
    const baseFrameMap = await buildFrameMap(cdp);
    const frameIds = baseFrameMap.frames.map((frame) => frame.frame_id);

    const snapshotsByFrame = await captureSnapshots(cdp, frameIds);
    const frameMap = applyFrameOffsets(baseFrameMap, snapshotsByFrame);

    const offsetSnapshots = new Map<string, SnapshotIndex>();
    for (const frame of frameMap.frames) {
      const snapshot = snapshotsByFrame.get(frame.frame_id);
      if (!snapshot) {
        continue;
      }

      offsetSnapshots.set(frame.frame_id, applySnapshotOffset(snapshot, frame.offset));
    }

    const tree: InteractableNode[] = [];

    for (const frame of frameMap.frames) {
      const snapshotIndex = offsetSnapshots.get(frame.frame_id);
      if (!snapshotIndex) {
        continue;
      }

      let axTree;
      try {
        axTree = await cdp.Accessibility.getFullAXTree({
          depth: axDepth,
          frameId: frame.frame_id
        });
      } catch (error) {
        if (isStaleFrameError(error)) {
          return makeErrorResponse(request.request_id, {
            code: "READPAGE_FRAME_STALE",
            message: "Frame became invalid during ReadPage. Retry with a fresh capture.",
            retryable: true
          });
        }

        throw error;
      }

      const filtered = filterInteractables({
        frame_id: frame.frame_id,
        frame_ordinal: frame.frame_ordinal,
        ref_prefix: frame.ref_prefix,
        ax_nodes: axTree.nodes,
        snapshot_index: snapshotIndex,
        filter_mode: filterMode,
        focus_backend_node_id:
          focusTarget && focusTarget.ref_prefix === frame.ref_prefix ? focusTarget.backend_node_id : undefined
      });

      tree.push(...filtered.nodes);
    }

    tree.sort((left, right) => {
      if (left.bbox.y !== right.bbox.y) {
        return left.bbox.y - right.bbox.y;
      }
      if (left.bbox.x !== right.bbox.x) {
        return left.bbox.x - right.bbox.x;
      }
      return left.ref_id.localeCompare(right.ref_id);
    });

    await enrichDomClickableLabels(cdp, tree);

    const collisions = collectRefCollisions(tree);
    if (collisions.length > 0) {
      return makeErrorResponse(request.request_id, {
        code: "READPAGE_REF_COLLISION",
        message: `Duplicate ref_id values detected: ${collisions.join(", ")}`,
        retryable: false
      });
    }

    const yaml = renderInteractablesYaml(tree);

    logger?.debug("read_page.success", {
      tab_id: request.tab_id,
      frame_count: frameMap.frames.length,
      interactable_count: tree.length
    });

    return {
      request_id: request.request_id,
      ok: true,
      result: {
        yaml,
        tree,
        meta: {
          frame_count: frameMap.frames.length,
          interactable_count: tree.length,
          generated_at: new Date().toISOString()
        }
      }
    };
  } catch (error) {
    return makeErrorResponse(request.request_id, {
      code: "READPAGE_FAILED",
      message: normalizeErrorMessage(error),
      retryable: true
    });
  }
}
