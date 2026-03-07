import type { Protocol } from "devtools-protocol";

import { CdpRegistryError } from "./types";
import type {
  FrameTreeSnapshot,
  ICdpTransport,
  ISessionRegistry,
  JavaScriptDialogRecord,
  SessionRoute,
  TabRecord
} from "./types";
import { FrameRegistry } from "./frame-registry";

type Clock = () => string;
const DOMAIN_ENABLE_SEQUENCE = ["Accessibility.enable", "DOM.enable", "Page.enable", "Network.enable"] as const;

export class SessionRegistry implements ISessionRegistry {
  private readonly tabsById = new Map<string, TabRecord>();
  private readonly tabIdByTargetId = new Map<string, string>();
  private readonly tabIdBySessionId = new Map<string, string>();
  private readonly attachPromisesByTargetId = new Map<string, Promise<TabRecord>>();
  private readonly dialogsByTabId = new Map<string, JavaScriptDialogRecord>();
  private readonly clock: Clock;
  private nextTabOrdinal = 0;

  constructor(
    private readonly transport: ICdpTransport,
    private readonly frameRegistry: FrameRegistry,
    clock: Clock = () => new Date().toISOString()
  ) {
    this.clock = clock;
  }

  async attachTab(targetId: string): Promise<TabRecord> {
    const existingTabId = this.tabIdByTargetId.get(targetId);
    if (existingTabId) {
      const existing = this.tabsById.get(existingTabId);
      if (existing && existing.status === "attached") {
        return existing;
      }
    }

    const pending = this.attachPromisesByTargetId.get(targetId);
    if (pending) {
      return pending;
    }

    const attachPromise = (async () => {
      try {
        const response = await this.transport.send<{ sessionId: string }>("Target.attachToTarget", {
          targetId,
          flatten: true
        });

        const mappedTabId = this.tabIdByTargetId.get(targetId);
        const mappedTab = mappedTabId ? this.tabsById.get(mappedTabId) : undefined;
        if (mappedTab && mappedTab.status === "attached") {
          this.tabIdBySessionId.set(response.sessionId, mappedTab.tabId);
          return mappedTab;
        }

        this.nextTabOrdinal += 1;
        const tab: TabRecord = {
          tabId: `tab-${this.nextTabOrdinal}`,
          targetId,
          sessionId: response.sessionId,
          status: "attached",
          attachedAt: this.clock()
        };

        this.tabsById.set(tab.tabId, tab);
        this.tabIdByTargetId.set(targetId, tab.tabId);
        this.tabIdBySessionId.set(tab.sessionId, tab.tabId);

        return tab;
      } catch (error) {
        throw new CdpRegistryError("ATTACH_TARGET_FAILED", "Unable to attach CDP target", true, {
          targetId,
          reason: error instanceof Error ? error.message : String(error)
        });
      } finally {
        this.attachPromisesByTargetId.delete(targetId);
      }
    })();

    this.attachPromisesByTargetId.set(targetId, attachPromise);
    return attachPromise;
  }

  async reattachTab(tabId: string): Promise<TabRecord> {
    const tab = this.requireTab(tabId);

    try {
      const response = await this.transport.send<{ sessionId: string }>("Target.attachToTarget", {
        targetId: tab.targetId,
        flatten: true
      });

      for (const [sessionId, mappedTabId] of this.tabIdBySessionId.entries()) {
        if (mappedTabId === tabId) {
          this.tabIdBySessionId.delete(sessionId);
        }
      }

      const nextTab: TabRecord = {
        ...tab,
        sessionId: response.sessionId,
        status: "attached",
        attachedAt: this.clock()
      };

      this.tabsById.set(tabId, nextTab);
      this.tabIdByTargetId.set(tab.targetId, tabId);
      this.tabIdBySessionId.set(response.sessionId, tabId);
      this.dialogsByTabId.delete(tabId);
      this.frameRegistry.removeTab(tabId);

      return nextTab;
    } catch (error) {
      throw new CdpRegistryError("ATTACH_TARGET_FAILED", "Unable to reattach CDP target", true, {
        tabId,
        targetId: tab.targetId,
        reason: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async enableDomains(tabId: string): Promise<void> {
    const tab = this.requireTab(tabId);
    await this.enableDomainsForSession(tab.sessionId, tabId);
  }

  async refreshFrameTree(tabId: string): Promise<FrameTreeSnapshot> {
    const tab = this.requireTab(tabId);

    let frameTree: Protocol.Page.FrameTree;
    try {
      const response = await this.transport.send<{ frameTree: Protocol.Page.FrameTree }>(
        "Page.getFrameTree",
        {},
        tab.sessionId
      );
      frameTree = response.frameTree;
    } catch (error) {
      throw new CdpRegistryError("GET_FRAME_TREE_FAILED", "Unable to load frame tree", true, {
        tabId,
        reason: error instanceof Error ? error.message : String(error)
      });
    }

    const snapshot = this.frameRegistry.applyFrameTree(tabId, frameTree, tab.sessionId);

    for (const frame of snapshot.frames) {
      if (frame.isMainFrame) {
        continue;
      }

      try {
        const owner = await this.transport.send<{ backendNodeId: number }>(
          "DOM.getFrameOwner",
          { frameId: frame.frameId },
          tab.sessionId
        );
        this.frameRegistry.bindFrameOwner(tabId, frame.frameId, owner.backendNodeId);
      } catch {
        // Non-fatal for top-level and transient frame-owner lookup issues.
      }
    }

    return this.frameRegistry.snapshot(tabId);
  }

  route(tabId: string, frameId?: string): SessionRoute {
    this.requireTab(tabId);
    return this.frameRegistry.route(tabId, frameId);
  }

  routeByFrameOrdinal(tabId: string, frameOrdinal: number): SessionRoute {
    this.requireTab(tabId);
    const frame = this.frameRegistry.findByOrdinal(tabId, frameOrdinal);
    if (!frame) {
      throw new CdpRegistryError("FRAME_NOT_FOUND", `Frame ordinal ${frameOrdinal} is not registered`, false, {
        tabId,
        frameOrdinal
      });
    }

    return this.frameRegistry.route(tabId, frame.frameId);
  }

  async detachTab(tabId: string): Promise<void> {
    const tab = this.requireTab(tabId);

    try {
      await this.transport.send("Target.detachFromTarget", { sessionId: tab.sessionId });
    } catch (error) {
      throw new CdpRegistryError("DETACH_TARGET_FAILED", "Failed to detach target session", true, {
        tabId,
        reason: error instanceof Error ? error.message : String(error)
      });
    }

    this.invalidateTab(tabId);
  }

  getTab(tabId: string): TabRecord | undefined {
    return this.tabsById.get(tabId);
  }

  listTabs(): TabRecord[] {
    return [...this.tabsById.values()].sort((left, right) => left.tabId.localeCompare(right.tabId));
  }

  getTabIdBySession(sessionId: string): string | undefined {
    return this.tabIdBySessionId.get(sessionId);
  }

  registerChildSession(tabId: string, sessionId: string): void {
    this.requireTab(tabId);
    this.tabIdBySessionId.set(sessionId, tabId);
  }

  async initializeChildSession(tabId: string, sessionId: string): Promise<void> {
    this.requireTab(tabId);
    this.tabIdBySessionId.set(sessionId, tabId);
    await this.enableDomainsForSession(sessionId, tabId);
  }

  unregisterSession(sessionId: string): void {
    this.tabIdBySessionId.delete(sessionId);
  }

  registerJavaScriptDialog(sessionId: string, dialog: Protocol.Page.JavascriptDialogOpeningEvent): void {
    const tabId = this.tabIdBySessionId.get(sessionId);
    if (!tabId) {
      return;
    }

    this.registerJavaScriptDialogForTab(tabId, dialog, sessionId);
  }

  registerJavaScriptDialogForTab(
    tabId: string,
    dialog: Protocol.Page.JavascriptDialogOpeningEvent,
    sessionId?: string
  ): void {
    this.requireTab(tabId);
    const tab = this.requireTab(tabId);
    this.dialogsByTabId.set(tabId, {
      tabId,
      sessionId: sessionId ?? tab.sessionId,
      type: dialog.type,
      message: dialog.message,
      defaultPrompt: dialog.defaultPrompt,
      hasBrowserHandler: dialog.hasBrowserHandler === true,
      openedAt: this.clock()
    });
  }

  clearJavaScriptDialog(sessionId: string): void {
    const tabId = this.tabIdBySessionId.get(sessionId);
    if (!tabId) {
      return;
    }

    this.clearJavaScriptDialogForTab(tabId);
  }

  clearJavaScriptDialogForTab(tabId: string): void {
    this.dialogsByTabId.delete(tabId);
  }

  getJavaScriptDialog(tabId: string): JavaScriptDialogRecord | undefined {
    return this.dialogsByTabId.get(tabId);
  }

  listJavaScriptDialogs(): JavaScriptDialogRecord[] {
    return [...this.dialogsByTabId.values()].sort((left, right) => left.tabId.localeCompare(right.tabId));
  }

  invalidateTab(tabId: string): void {
    const tab = this.tabsById.get(tabId);
    if (!tab) {
      return;
    }

    this.tabsById.delete(tabId);
    this.tabIdByTargetId.delete(tab.targetId);

    for (const [sessionId, mappedTabId] of this.tabIdBySessionId.entries()) {
      if (mappedTabId === tabId) {
        this.tabIdBySessionId.delete(sessionId);
      }
    }

    this.dialogsByTabId.delete(tabId);
    this.frameRegistry.removeTab(tabId);
  }

  private requireTab(tabId: string): TabRecord {
    const tab = this.tabsById.get(tabId);
    if (!tab) {
      throw new CdpRegistryError("TAB_NOT_FOUND", `Tab ${tabId} is not registered`, false, { tabId });
    }

    return tab;
  }

  private async enableDomainsForSession(sessionId: string, tabId: string): Promise<void> {
    for (const method of DOMAIN_ENABLE_SEQUENCE) {
      try {
        await this.transport.send(method, {}, sessionId);
      } catch (error) {
        throw new CdpRegistryError("DOMAIN_ENABLE_FAILED", "Domain enablement failed", true, {
          tabId,
          sessionId,
          method,
          reason: error instanceof Error ? error.message : String(error)
        });
      }
    }

    try {
      await this.transport.send(
        "Target.setAutoAttach",
        {
          autoAttach: true,
          waitForDebuggerOnStart: false,
          flatten: true
        },
        sessionId
      );
    } catch (error) {
      throw new CdpRegistryError("DOMAIN_ENABLE_FAILED", "Domain enablement failed", true, {
        tabId,
        sessionId,
        method: "Target.setAutoAttach",
        reason: error instanceof Error ? error.message : String(error)
      });
    }

    // Enable Page lifecycle events so Page.lifecycleEvent fires (needed for FCP wait).
    // Comet calls this to receive firstContentfulPaint events (maxWaitingTimeoutMs: 2500).
    try {
      await this.transport.send("Page.setLifecycleEventsEnabled", { enabled: true }, sessionId);
    } catch {
      // Non-fatal — FCP wait will fall back to Page.loadEventFired if not available
    }
  }
}
