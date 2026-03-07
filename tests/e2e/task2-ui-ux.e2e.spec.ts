import { describe, expect, it } from "vitest";

import type { FrameTreeSnapshot } from "../../src/cdp/types";
import { FrameRegistry } from "../../src/cdp/frame-registry";
import { SessionRegistry } from "../../src/cdp/session-registry";
import { TargetEventRouter } from "../../src/cdp/target-event-router";
import { FakeTransport } from "../cdp/helpers/fake-transport";

function makeFrame(id: string, parentId?: string, url?: string) {
  return {
    id,
    parentId,
    url: url ?? `https://example.com/${id}`,
    name: id
  };
}

interface RegistryRow {
  frameId: string;
  url: string;
  sessionId: string;
  badge: "main" | "oopif";
}

function renderRegistryRows(snapshot: FrameTreeSnapshot): RegistryRow[] {
  return snapshot.frames.map((frame) => ({
    frameId: frame.frameId,
    url: frame.url,
    sessionId: frame.sessionId,
    badge: frame.isMainFrame ? "main" : frame.isOopif ? "oopif" : "main"
  }));
}

describe("Task2 UI/UX E2E validation", () => {
  it("renders session/frame transitions without stale rows", async () => {
    const transport = new FakeTransport();
    const frameRegistry = new FrameRegistry(() => "2026-02-27T00:00:00.000Z");
    const sessionRegistry = new SessionRegistry(transport, frameRegistry, () => "2026-02-27T00:00:00.000Z");
    const router = new TargetEventRouter(transport, sessionRegistry, frameRegistry);

    transport.queueResponse("Target.attachToTarget", { sessionId: "session-main" });
    transport.queueResponse("Page.getFrameTree", {
      frameTree: {
        frame: makeFrame("root"),
        childFrames: [{ frame: makeFrame("checkout-frame", "root") }]
      }
    });
    transport.queueResponse("DOM.getFrameOwner", { backendNodeId: 9001 });
    transport.queueResponse("Accessibility.enable", {});
    transport.queueResponse("DOM.enable", {});
    transport.queueResponse("Page.enable", {});
    transport.queueResponse("Network.enable", {});
    transport.queueResponse("Target.setAutoAttach", {});

    const tab = await sessionRegistry.attachTab("target-main");
    let snapshot = await sessionRegistry.refreshFrameTree(tab.tabId);

    let rows = renderRegistryRows(snapshot);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ frameId: "root", sessionId: "session-main", badge: "main" });
    expect(rows[1]).toMatchObject({ frameId: "checkout-frame", sessionId: "session-main" });

    router.start();

    await transport.emit("Target.attachedToTarget", {
      sessionId: "session-main",
      params: {
        sessionId: "session-checkout",
        waitingForDebugger: false,
        targetInfo: {
          targetId: "checkout-frame",
          type: "iframe",
          title: "",
          url: "https://pay.example/flow",
          attached: true,
          canAccessOpener: false,
          parentFrameId: "root"
        }
      }
    });

    await transport.emit("Page.frameNavigated", {
      sessionId: "session-checkout",
      params: {
        frame: makeFrame("checkout-frame", "root", "https://pay.example/step-2")
      }
    });

    snapshot = frameRegistry.snapshot(tab.tabId);
    rows = renderRegistryRows(snapshot);
    expect(rows.find((row) => row.frameId === "checkout-frame")).toMatchObject({
      sessionId: "session-checkout",
      url: "https://pay.example/step-2",
      badge: "oopif"
    });

    await transport.emit("Page.frameDetached", {
      sessionId: "session-checkout",
      params: {
        frameId: "checkout-frame",
        reason: "remove"
      }
    });

    snapshot = frameRegistry.snapshot(tab.tabId);
    rows = renderRegistryRows(snapshot);
    expect(rows).toHaveLength(1);
    expect(rows[0].frameId).toBe("root");
    expect(rows.some((row) => row.frameId === "checkout-frame")).toBe(false);
  });
});
