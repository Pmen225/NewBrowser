import { describe, expect, it } from "vitest";
import type { Protocol } from "devtools-protocol";

import { CdpRegistryError } from "../../src/cdp/types";
import { FrameRegistry } from "../../src/cdp/frame-registry";

function makeFrame(id: string, parentId?: string, url?: string) {
  return {
    id,
    parentId,
    url: url ?? `https://example.com/${id}`,
    name: id
  } as unknown as Protocol.Page.Frame;
}

describe("FrameRegistry", () => {
  it("builds deterministic frame order from frame tree", () => {
    const registry = new FrameRegistry(() => "2026-02-27T00:00:00.000Z");

    const snapshot = registry.applyFrameTree(
      "tab-1",
      {
        frame: makeFrame("root"),
        childFrames: [
          {
            frame: makeFrame("child-a", "root"),
            childFrames: [{ frame: makeFrame("child-a-1", "child-a") }]
          },
          { frame: makeFrame("child-b", "root") }
        ]
      },
      "session-main"
    );

    expect(snapshot.mainFrameId).toBe("root");
    expect(snapshot.frames.map((frame) => frame.frameId)).toEqual(["root", "child-a", "child-a-1", "child-b"]);
    expect(snapshot.frames.map((frame) => frame.frameOrdinal)).toEqual([0, 1, 2, 3]);
    expect(snapshot.frameCount).toBe(4);
    expect(registry.route("tab-1")).toEqual({ sessionId: "session-main", frameId: "root" });
  });

  it("routes OOPIF frames to child sessions", () => {
    const registry = new FrameRegistry(() => "2026-02-27T00:00:00.000Z");

    registry.applyFrameTree(
      "tab-1",
      {
        frame: makeFrame("root"),
        childFrames: [{ frame: makeFrame("child", "root") }]
      },
      "session-main"
    );

    registry.bindFrameSession("tab-1", "child", "session-child", true);

    expect(registry.route("tab-1", "child")).toEqual({ sessionId: "session-child", frameId: "child" });
    expect(registry.listByTab("tab-1").find((frame) => frame.frameId === "child")?.isOopif).toBe(true);
  });

  it("updates frame metadata on navigation", () => {
    const registry = new FrameRegistry(() => "2026-02-27T00:00:00.000Z");

    registry.applyFrameTree(
      "tab-1",
      {
        frame: makeFrame("root")
      },
      "session-main"
    );

    registry.upsertFrameFromNavigation("tab-1", makeFrame("root", undefined, "https://example.com/new"), "session-main");

    expect(registry.listByTab("tab-1")[0]).toMatchObject({
      frameId: "root",
      url: "https://example.com/new"
    });
  });

  it("removes detached subtree and rejects stale frame routing", () => {
    const registry = new FrameRegistry(() => "2026-02-27T00:00:00.000Z");

    registry.applyFrameTree(
      "tab-1",
      {
        frame: makeFrame("root"),
        childFrames: [
          {
            frame: makeFrame("child", "root"),
            childFrames: [{ frame: makeFrame("grand", "child") }]
          }
        ]
      },
      "session-main"
    );

    registry.removeFrame("tab-1", "child");

    expect(registry.listByTab("tab-1").map((frame) => frame.frameId)).toEqual(["root"]);
    expect(() => registry.route("tab-1", "grand")).toThrowError(CdpRegistryError);
    expect(() => registry.route("tab-1", "grand")).toThrow(/FRAME_NOT_FOUND/);
  });

  it("binds owner backend node ids", () => {
    const registry = new FrameRegistry(() => "2026-02-27T00:00:00.000Z");

    registry.applyFrameTree(
      "tab-1",
      {
        frame: makeFrame("root"),
        childFrames: [{ frame: makeFrame("child", "root") }]
      },
      "session-main"
    );

    registry.bindFrameOwner("tab-1", "child", 777);

    expect(registry.listByTab("tab-1").find((frame) => frame.frameId === "child")?.ownerBackendNodeId).toBe(777);
  });
});
