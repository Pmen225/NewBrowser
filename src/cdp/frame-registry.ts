import type { Protocol } from "devtools-protocol";

import { CdpRegistryError } from "./types";
import type { FrameRecord, FrameTreeSnapshot, IFrameRegistry, SessionRoute } from "./types";

type Clock = () => string;

interface FlatFrame {
  frame: Protocol.Page.Frame;
  frameOrdinal: number;
  parentFrameId?: string;
}

function sortByFramePosition(a: FrameRecord, b: FrameRecord): number {
  if (a.isMainFrame && !b.isMainFrame) {
    return -1;
  }

  if (!a.isMainFrame && b.isMainFrame) {
    return 1;
  }

  if (a.frameOrdinal !== b.frameOrdinal) {
    return a.frameOrdinal - b.frameOrdinal;
  }

  return a.frameId.localeCompare(b.frameId);
}

export class FrameRegistry implements IFrameRegistry {
  private readonly byTab = new Map<string, Map<string, FrameRecord>>();
  private readonly mainFrameByTab = new Map<string, string>();
  private readonly clock: Clock;

  constructor(clock: Clock = () => new Date().toISOString()) {
    this.clock = clock;
  }

  applyFrameTree(tabId: string, frameTree: Protocol.Page.FrameTree, sessionId: string): FrameTreeSnapshot {
    const flattened = this.flattenFrameTree(frameTree);
    const previous = this.byTab.get(tabId) ?? new Map<string, FrameRecord>();
    const next = new Map<string, FrameRecord>();
    const now = this.clock();

    for (const entry of flattened) {
      const existing = previous.get(entry.frame.id);
      const isMainFrame = !entry.parentFrameId;
      const nextSession = isMainFrame ? sessionId : (existing?.sessionId ?? sessionId);
      const nextRecord: FrameRecord = {
        tabId,
        frameId: entry.frame.id,
        frameOrdinal: entry.frameOrdinal,
        parentFrameId: entry.parentFrameId,
        sessionId: nextSession,
        url: entry.frame.url,
        name: entry.frame.name ?? "",
        ownerBackendNodeId: existing?.ownerBackendNodeId,
        isMainFrame,
        isOopif: isMainFrame ? false : existing?.isOopif ?? nextSession !== sessionId,
        updatedAt: now
      };

      next.set(entry.frame.id, nextRecord);
    }

    this.byTab.set(tabId, next);
    this.mainFrameByTab.set(tabId, frameTree.frame.id);

    return this.snapshot(tabId);
  }

  upsertFrameFromNavigation(tabId: string, frame: Protocol.Page.Frame, sessionId?: string): void {
    const frames = this.byTab.get(tabId) ?? new Map<string, FrameRecord>();
    const now = this.clock();
    const existing = frames.get(frame.id);
    const isMainFrame = !frame.parentId;
    const maxKnownOrdinal = frames.size === 0
      ? 0
      : Math.max(...[...frames.values()].map((entry) => entry.frameOrdinal));
    const nextOrdinal = existing?.frameOrdinal ?? (isMainFrame ? 0 : maxKnownOrdinal + 1);

    const mainFrameId = this.mainFrameByTab.get(tabId);
    const mainSession = mainFrameId ? frames.get(mainFrameId)?.sessionId : undefined;
    const resolvedSession = sessionId ?? existing?.sessionId ?? mainSession;

    if (!resolvedSession) {
      throw new CdpRegistryError("FRAME_SESSION_MISSING", "Cannot resolve session for frame navigation", true, {
        tabId,
        frameId: frame.id
      });
    }

    const record: FrameRecord = {
      tabId,
      frameId: frame.id,
      frameOrdinal: nextOrdinal,
      parentFrameId: frame.parentId,
      sessionId: resolvedSession,
      url: frame.url,
      name: frame.name ?? existing?.name ?? "",
      ownerBackendNodeId: existing?.ownerBackendNodeId,
      isMainFrame,
      isOopif: isMainFrame ? false : existing?.isOopif ?? resolvedSession !== (mainSession ?? resolvedSession),
      updatedAt: now
    };

    frames.set(frame.id, record);
    this.byTab.set(tabId, frames);

    if (isMainFrame) {
      this.mainFrameByTab.set(tabId, frame.id);
    }
  }

  removeFrame(tabId: string, frameId: string): void {
    const frames = this.byTab.get(tabId);
    if (!frames) {
      return;
    }

    const pending = [frameId];
    while (pending.length > 0) {
      const nextFrameId = pending.pop();
      if (!nextFrameId) {
        continue;
      }

      for (const frame of frames.values()) {
        if (frame.parentFrameId === nextFrameId) {
          pending.push(frame.frameId);
        }
      }

      frames.delete(nextFrameId);
    }

    if (this.mainFrameByTab.get(tabId) === frameId) {
      this.mainFrameByTab.delete(tabId);
    }
  }

  bindFrameOwner(tabId: string, frameId: string, ownerBackendNodeId: number): void {
    const frame = this.getFrame(tabId, frameId);
    frame.ownerBackendNodeId = ownerBackendNodeId;
    frame.updatedAt = this.clock();
  }

  bindFrameSession(tabId: string, frameId: string, sessionId: string, isOopif = true): void {
    const frame = this.getFrame(tabId, frameId);
    frame.sessionId = sessionId;
    frame.isOopif = isOopif;
    frame.updatedAt = this.clock();
  }

  listByTab(tabId: string): FrameRecord[] {
    const frames = this.byTab.get(tabId);
    if (!frames) {
      return [];
    }

    return [...frames.values()].sort(sortByFramePosition);
  }

  findByOrdinal(tabId: string, frameOrdinal: number): FrameRecord | undefined {
    const frames = this.byTab.get(tabId);
    if (!frames) {
      return undefined;
    }

    for (const frame of frames.values()) {
      if (frame.frameOrdinal === frameOrdinal) {
        return frame;
      }
    }

    return undefined;
  }

  route(tabId: string, frameId?: string): SessionRoute {
    const frames = this.byTab.get(tabId);
    if (!frames || frames.size === 0) {
      throw new CdpRegistryError("TAB_NOT_FOUND", `No frames registered for tab ${tabId}`, false, { tabId });
    }

    const resolvedFrameId = frameId ?? this.mainFrameByTab.get(tabId) ?? this.listByTab(tabId)[0]?.frameId;
    if (!resolvedFrameId) {
      throw new CdpRegistryError("FRAME_NOT_FOUND", `No frame route available for tab ${tabId}`, false, { tabId });
    }

    const frame = frames.get(resolvedFrameId);
    if (!frame) {
      throw new CdpRegistryError("FRAME_NOT_FOUND", `Frame ${resolvedFrameId} is not registered`, false, {
        tabId,
        frameId: resolvedFrameId
      });
    }

    if (!frame.sessionId) {
      throw new CdpRegistryError("FRAME_SESSION_MISSING", `Frame ${resolvedFrameId} has no session`, true, {
        tabId,
        frameId: resolvedFrameId
      });
    }

    return {
      sessionId: frame.sessionId,
      frameId: frame.frameId
    };
  }

  snapshot(tabId: string): FrameTreeSnapshot {
    const frames = this.listByTab(tabId);
    if (frames.length === 0) {
      throw new CdpRegistryError("TAB_NOT_FOUND", `No frames registered for tab ${tabId}`, false, { tabId });
    }

    const mainFrame = frames.find((frame) => frame.isMainFrame) ?? frames[0];
    return {
      tabId,
      mainFrameId: mainFrame.frameId,
      frameCount: frames.length,
      frames,
      refreshedAt: this.clock()
    };
  }

  findTabIdByFrameId(frameId: string): string | undefined {
    for (const [tabId, frames] of this.byTab.entries()) {
      if (frames.has(frameId)) {
        return tabId;
      }
    }

    return undefined;
  }

  removeTab(tabId: string): void {
    this.byTab.delete(tabId);
    this.mainFrameByTab.delete(tabId);
  }

  removeFramesBySession(tabId: string, sessionId: string): void {
    const frames = this.listByTab(tabId)
      .filter((frame) => frame.sessionId === sessionId && !frame.isMainFrame)
      .map((frame) => frame.frameId);

    for (const frameId of frames) {
      this.removeFrame(tabId, frameId);
    }
  }

  private flattenFrameTree(root: Protocol.Page.FrameTree): FlatFrame[] {
    const output: FlatFrame[] = [];
    let ordinal = 0;

    const visit = (node: Protocol.Page.FrameTree, parentFrameId?: string): void => {
      output.push({ frame: node.frame, frameOrdinal: ordinal, parentFrameId });
      ordinal += 1;
      for (const child of node.childFrames ?? []) {
        visit(child, node.frame.id);
      }
    };

    visit(root, undefined);
    return output;
  }

  private getFrame(tabId: string, frameId: string): FrameRecord {
    const frames = this.byTab.get(tabId);
    if (!frames) {
      throw new CdpRegistryError("TAB_NOT_FOUND", `No frame registry for tab ${tabId}`, false, { tabId });
    }

    const frame = frames.get(frameId);
    if (!frame) {
      throw new CdpRegistryError("FRAME_NOT_FOUND", `Frame ${frameId} is not registered`, false, { tabId, frameId });
    }

    return frame;
  }
}
