import type { Protocol } from "devtools-protocol";

import { CdpRegistryError } from "./types";
import type { EventEnvelope, ICdpTransport } from "./types";
import { FrameRegistry } from "./frame-registry";
import { SessionRegistry } from "./session-registry";

interface ObjectWithParams {
  params: unknown;
  sessionId?: unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeComparableUrl(raw: string): string {
  try {
    return new URL(raw).toString();
  } catch {
    return raw.trim();
  }
}

function parseEnvelope<T>(payload: unknown): EventEnvelope<T> | undefined {
  if (!isObject(payload)) {
    return undefined;
  }

  if ("params" in payload) {
    const objectPayload = payload as unknown as ObjectWithParams;
    const sessionId = typeof objectPayload.sessionId === "string" ? objectPayload.sessionId : undefined;
    return {
      sessionId,
      params: objectPayload.params as T
    };
  }

  return {
    params: payload as T,
    sessionId: undefined
  };
}

export class TargetEventRouter {
  private started = false;

  private readonly onTargetCreated = async (payload: unknown): Promise<void> => {
    const envelope = parseEnvelope<Protocol.Target.TargetCreatedEvent>(payload);
    if (!envelope || envelope.params.targetInfo.type !== "page") {
      return;
    }

    try {
      const tab = await this.sessionRegistry.attachTab(envelope.params.targetInfo.targetId);
      await this.sessionRegistry.enableDomains(tab.tabId);
      await this.sessionRegistry.refreshFrameTree(tab.tabId);
    } catch {
      const tab = this.sessionRegistry.listTabs().find((entry) => entry.targetId === envelope.params.targetInfo.targetId);
      if (tab) {
        this.sessionRegistry.invalidateTab(tab.tabId);
      }
    }
  };

  private readonly onTargetDestroyed = (payload: unknown): void => {
    const envelope = parseEnvelope<Protocol.Target.TargetDestroyedEvent>(payload);
    if (!envelope) {
      return;
    }

    const tab = this.sessionRegistry.listTabs().find((entry) => entry.targetId === envelope.params.targetId);
    if (!tab) {
      return;
    }

    this.sessionRegistry.invalidateTab(tab.tabId);
  };

  private readonly onFrameNavigated = (payload: unknown): void => {
    const envelope = parseEnvelope<Protocol.Page.FrameNavigatedEvent>(payload);
    if (!envelope) {
      return;
    }

    const tabId = this.resolveTabId(envelope.sessionId, envelope.params.frame.id);
    if (!tabId) {
      return;
    }

    this.frameRegistry.upsertFrameFromNavigation(tabId, envelope.params.frame, envelope.sessionId);
  };

  private readonly onFrameDetached = (payload: unknown): void => {
    const envelope = parseEnvelope<Protocol.Page.FrameDetachedEvent>(payload);
    if (!envelope) {
      return;
    }

    const tabId = this.resolveTabId(envelope.sessionId, envelope.params.frameId);
    if (!tabId) {
      return;
    }

    this.frameRegistry.removeFrame(tabId, envelope.params.frameId);
  };

  private readonly onAttachedToTarget = async (payload: unknown): Promise<void> => {
    const envelope = parseEnvelope<Protocol.Target.AttachedToTargetEvent>(payload);
    if (!envelope) {
      return;
    }

    const parentSessionId = envelope.sessionId;
    const tabId = parentSessionId ? this.sessionRegistry.getTabIdBySession(parentSessionId) : undefined;
    if (!tabId) {
      return;
    }

    try {
      await this.sessionRegistry.initializeChildSession(tabId, envelope.params.sessionId);
    } catch {
      this.sessionRegistry.unregisterSession(envelope.params.sessionId);
      return;
    }

    if (envelope.params.targetInfo.type !== "iframe") {
      return;
    }

    const iframeFrameId = this.resolveIFrameTargetFrameId(tabId, envelope.params.targetInfo);
    if (!iframeFrameId) {
      return;
    }

    try {
      this.frameRegistry.bindFrameSession(tabId, iframeFrameId, envelope.params.sessionId, true);
    } catch (error) {
      if (error instanceof CdpRegistryError && error.code === "FRAME_NOT_FOUND") {
        return;
      }

      throw error;
    }
  };

  private readonly onDetachedFromTarget = (payload: unknown): void => {
    const envelope = parseEnvelope<Protocol.Target.DetachedFromTargetEvent>(payload);
    if (!envelope) {
      return;
    }

    const tabId = this.sessionRegistry.getTabIdBySession(envelope.params.sessionId);
    if (!tabId) {
      return;
    }

    const tab = this.sessionRegistry.getTab(tabId);
    if (tab?.sessionId === envelope.params.sessionId) {
      this.sessionRegistry.invalidateTab(tabId);
      return;
    }

    this.frameRegistry.removeFramesBySession(tabId, envelope.params.sessionId);
    this.sessionRegistry.unregisterSession(envelope.params.sessionId);
  };

  private readonly onInspectorDetached = (payload: unknown): void => {
    const envelope = parseEnvelope<{ reason: string }>(payload);
    if (!envelope?.sessionId) {
      return;
    }

    const tabId = this.sessionRegistry.getTabIdBySession(envelope.sessionId);
    if (!tabId) {
      return;
    }

    const tab = this.sessionRegistry.getTab(tabId);
    if (!tab) {
      this.sessionRegistry.unregisterSession(envelope.sessionId);
      return;
    }

    if (tab.sessionId === envelope.sessionId) {
      this.sessionRegistry.invalidateTab(tabId);
      return;
    }

    this.sessionRegistry.unregisterSession(envelope.sessionId);
  };

  private readonly onJavaScriptDialogOpening = (payload: unknown): void => {
    const envelope = parseEnvelope<Protocol.Page.JavascriptDialogOpeningEvent>(payload);
    if (!envelope) {
      return;
    }

    const tabId = this.resolveDialogTabId(envelope.sessionId, envelope.params.url);
    if (!tabId) {
      return;
    }

    if (envelope.sessionId) {
      this.sessionRegistry.registerJavaScriptDialog(envelope.sessionId, envelope.params);
      return;
    }

    this.sessionRegistry.registerJavaScriptDialogForTab(tabId, envelope.params);
  };

  private readonly onJavaScriptDialogClosed = (payload: unknown): void => {
    const envelope = parseEnvelope<Protocol.Page.JavascriptDialogClosedEvent>(payload);
    if (!envelope) {
      return;
    }

    if (envelope.sessionId) {
      this.sessionRegistry.clearJavaScriptDialog(envelope.sessionId);
      return;
    }

    const openDialogs = this.sessionRegistry.listJavaScriptDialogs();
    if (openDialogs.length === 1) {
      this.sessionRegistry.clearJavaScriptDialogForTab(openDialogs[0].tabId);
    }
  };

  constructor(
    private readonly transport: ICdpTransport,
    private readonly sessionRegistry: SessionRegistry,
    private readonly frameRegistry: FrameRegistry
  ) {}

  start(): void {
    if (this.started) {
      return;
    }

    this.transport.on("Target.targetCreated", this.onTargetCreated);
    this.transport.on("Target.targetDestroyed", this.onTargetDestroyed);
    this.transport.on("Page.frameNavigated", this.onFrameNavigated);
    this.transport.on("Page.frameDetached", this.onFrameDetached);
    this.transport.on("Target.attachedToTarget", this.onAttachedToTarget);
    this.transport.on("Target.detachedFromTarget", this.onDetachedFromTarget);
    this.transport.on("Inspector.detached", this.onInspectorDetached);
    this.transport.on("Page.javascriptDialogOpening", this.onJavaScriptDialogOpening);
    this.transport.on("Page.javascriptDialogClosed", this.onJavaScriptDialogClosed);
    void this.transport.send("Target.setDiscoverTargets", { discover: true }).catch(() => undefined);

    this.started = true;
  }

  stop(): void {
    if (!this.started) {
      return;
    }

    this.transport.off("Target.targetCreated", this.onTargetCreated);
    this.transport.off("Target.targetDestroyed", this.onTargetDestroyed);
    this.transport.off("Page.frameNavigated", this.onFrameNavigated);
    this.transport.off("Page.frameDetached", this.onFrameDetached);
    this.transport.off("Target.attachedToTarget", this.onAttachedToTarget);
    this.transport.off("Target.detachedFromTarget", this.onDetachedFromTarget);
    this.transport.off("Inspector.detached", this.onInspectorDetached);
    this.transport.off("Page.javascriptDialogOpening", this.onJavaScriptDialogOpening);
    this.transport.off("Page.javascriptDialogClosed", this.onJavaScriptDialogClosed);

    this.started = false;
  }

  private resolveTabId(sessionId: string | undefined, frameId: string): string | undefined {
    if (sessionId) {
      const bySession = this.sessionRegistry.getTabIdBySession(sessionId);
      if (bySession) {
        return bySession;
      }
    }

    return this.frameRegistry.findTabIdByFrameId(frameId);
  }

  private resolveIFrameTargetFrameId(tabId: string, targetInfo: Protocol.Target.TargetInfo): string | undefined {
    const frames = this.frameRegistry.listByTab(tabId);

    const byTargetId = frames.find((frame) => frame.frameId === targetInfo.targetId);
    if (byTargetId) {
      return byTargetId.frameId;
    }

    if (targetInfo.parentFrameId) {
      const candidates = frames.filter((frame) => frame.parentFrameId === targetInfo.parentFrameId);
      if (candidates.length === 1) {
        return candidates[0]?.frameId;
      }

      const byUrl = candidates.find((frame) => frame.url === targetInfo.url);
      if (byUrl) {
        return byUrl.frameId;
      }
    }

    return targetInfo.openerFrameId;
  }

  private resolveDialogTabId(sessionId: string | undefined, url: string): string | undefined {
    if (sessionId) {
      const bySession = this.sessionRegistry.getTabIdBySession(sessionId);
      if (bySession) {
        return bySession;
      }
    }

    const normalizedUrl = normalizeComparableUrl(url);
    const matches = this.sessionRegistry.listTabs().filter((tab) => {
      const mainFrame = this.frameRegistry.listByTab(tab.tabId).find((frame) => frame.isMainFrame);
      if (!mainFrame?.url) {
        return false;
      }

      return normalizeComparableUrl(mainFrame.url) === normalizedUrl;
    });

    if (matches.length === 1) {
      return matches[0].tabId;
    }

    return undefined;
  }
}
