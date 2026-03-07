import { describe, expect, it } from "vitest";

import type {
  CdpCaptureSnapshotResult,
  CdpClient,
  CdpFrameTree,
  CdpGetFullAXTreeResponse,
  ReadPageRequest
} from "../../src/sidecar/read-page/types";
import { readPage } from "../../src/sidecar/read-page/read-page";
import { handleReadPageTool } from "../../src/sidecar/tools/read-page-tool";

interface FixtureByFrame<T> {
  [frameId: string]: T;
}

function createRequest(tabId = "tab-1", params: ReadPageRequest["params"] = {}): ReadPageRequest {
  return {
    request_id: "req-1",
    action: "ReadPage",
    tab_id: tabId,
    params
  };
}

function createMockCdp(input: {
  frameTree: CdpFrameTree;
  snapshots: FixtureByFrame<CdpCaptureSnapshotResult>;
  axTrees: FixtureByFrame<CdpGetFullAXTreeResponse>;
  frameOwners?: FixtureByFrame<number>;
  domLabelsByBackendNodeId?: Record<number, { name: string; role?: string }>;
  throwOnAxFrame?: string;
  onAxRequest?: (params: { depth: number; frameId: string }) => void;
}): CdpClient {
  return {
    Page: {
      async getFrameTree() {
        return { frameTree: input.frameTree };
      }
    },
    DOMSnapshot: {
      async captureSnapshot() {
        const entries = Object.entries(input.snapshots);
        if (entries.length === 0) {
          throw new Error("snapshot not found");
        }

        const [firstFrameId, firstSnapshot] = entries[0];
        const documents = entries.flatMap(([frameId, snapshot]) =>
          snapshot.documents.map((document) => ({
            ...document,
            frameId: document.frameId ?? frameId
          }))
        );

        return {
          strings: firstSnapshot.strings,
          documents: documents.length > 0 ? documents : firstSnapshot.documents.map((doc) => ({ ...doc, frameId: firstFrameId }))
        };
      }
    },
    Accessibility: {
      async getFullAXTree(params) {
        input.onAxRequest?.(params);
        if (input.throwOnAxFrame && params.frameId === input.throwOnAxFrame) {
          throw new Error("No frame with given id");
        }
        const tree = input.axTrees[params.frameId];
        if (!tree) {
          throw new Error(`ax tree not found for frame ${params.frameId}`);
        }
        return tree;
      }
    },
    DOM: {
      async getFrameOwner(params) {
        const backendNodeId = input.frameOwners?.[params.frameId];
        if (backendNodeId === undefined) {
          throw new Error(`owner not found for frame ${params.frameId}`);
        }
        return { backendNodeId };
      },
      async resolveNode(params) {
        return {
          object: {
            objectId: `obj-${params.backendNodeId}`
          }
        };
      }
    },
    Runtime: {
      async callFunctionOn(params) {
        const backendNodeId = Number(params.objectId.replace(/^obj-/, ""));
        const label = input.domLabelsByBackendNodeId?.[backendNodeId];
        return {
          result: {
            value: label ?? {}
          }
        };
      }
    }
  };
}

function snapshot(
  backendNodeIds: number[],
  bounds: Array<[number, number, number, number]>,
  options?: {
    clickableNodeIndexes?: number[];
    styleByLayoutIndex?: Array<[display: string, visibility: string]>;
    scrollOffsetX?: number;
    scrollOffsetY?: number;
  }
): CdpCaptureSnapshotResult {
  const styleEntries = options?.styleByLayoutIndex ?? bounds.map(() => ["block", "visible"]);
  const strings = ["block", "visible", "none", "hidden", "collapse"];
  const styleIndex = new Map<string, number>([
    ["block", 0],
    ["visible", 1],
    ["none", 2],
    ["hidden", 3],
    ["collapse", 4]
  ]);

  return {
    strings,
    documents: [
      {
        nodes: {
          backendNodeId: backendNodeIds,
          isClickable: options?.clickableNodeIndexes ? { index: options.clickableNodeIndexes } : undefined
        },
        layout: {
          nodeIndex: backendNodeIds.map((_, idx) => idx),
          bounds,
          styles: styleEntries.map(([display, visibility]) => [styleIndex.get(display)!, styleIndex.get(visibility)!])
        },
        scrollOffsetX: options?.scrollOffsetX ?? 0,
        scrollOffsetY: options?.scrollOffsetY ?? 0
      }
    ]
  };
}

function axNode(input: {
  nodeId: string;
  backendDOMNodeId?: number;
  role?: string;
  name?: string;
  ignored?: boolean;
  focusable?: boolean;
  editable?: boolean;
  childIds?: string[];
  value?: unknown;
  state?: Record<string, unknown>;
}) {
  const properties: Array<{ name: string; value: { value: unknown } }> = [];
  if (input.focusable) {
    properties.push({
      name: "focusable",
      value: {
        value: true
      }
    });
  }
  if (input.editable) {
    properties.push({
      name: "editable",
      value: {
        value: true
      }
    });
  }
  for (const [name, value] of Object.entries(input.state ?? {})) {
    properties.push({
      name,
      value: {
        value
      }
    });
  }

  return {
    nodeId: input.nodeId,
    backendDOMNodeId: input.backendDOMNodeId,
    ignored: input.ignored,
    role: input.role ? { value: input.role } : undefined,
    name: input.name ? { value: input.name } : undefined,
    value: input.value !== undefined ? { value: input.value } : undefined,
    properties,
    childIds: input.childIds
  };
}

describe("readPage", () => {
  it("captures single-frame interactables and dom-clickable fallback", async () => {
    const cdp = createMockCdp({
      frameTree: {
        frame: { id: "root" }
      },
      snapshots: {
        root: snapshot(
          [101, 102, 103, 104, 105],
          [
            [10, 20, 100, 30],
            [10, 60, 220, 36],
            [10, 110, 200, 20],
            [10, 150, 80, 18],
            [12, 180, 100, 24]
          ],
          {
            clickableNodeIndexes: [4],
            styleByLayoutIndex: [
              ["block", "visible"],
              ["block", "visible"],
              ["block", "visible"],
              ["none", "visible"],
              ["block", "visible"]
            ]
          }
        )
      },
      axTrees: {
        root: {
          nodes: [
            axNode({ nodeId: "n1", backendDOMNodeId: 101, role: "button", name: "Submit" }),
            axNode({ nodeId: "n2", backendDOMNodeId: 102, role: "textbox", name: "Email" }),
            axNode({ nodeId: "n3", backendDOMNodeId: 103, role: "link", name: "Pricing" }),
            axNode({ nodeId: "n4", backendDOMNodeId: 104, role: "button", name: "Hidden" }),
            axNode({ nodeId: "n5", backendDOMNodeId: 999, role: "button", name: "MissingBox" })
          ]
        }
      }
    });

    const response = await readPage(cdp, createRequest());

    expect(response.ok).toBe(true);
    if (!response.ok) {
      return;
    }

    expect(response.result.tree).toHaveLength(4);
    expect(response.result.tree.map((node) => node.ref_id)).toEqual(["f0:101", "f0:102", "f0:103", "f0:105"]);
    expect(response.result.tree[0]).toMatchObject({
      role: "button",
      name: "Submit",
      source: "ax",
      bbox: { x: 10, y: 20, w: 100, h: 30 },
      click: { x: 60, y: 35 },
      actions: ["click", "key"]
    });
    expect(response.result.tree[1].actions).toEqual(["click", "type", "key"]);
    expect(response.result.tree[3]).toMatchObject({
      role: "generic",
      source: "dom_clickable",
      actions: ["click"]
    });
    expect(response.result.yaml).toContain("ref_id: \"f0:101\"");
    expect(response.result.meta.frame_count).toBe(1);
    expect(response.result.meta.interactable_count).toBe(4);
  });

  it("labels dom-clickable fallback nodes from DOM text when accessibility names are missing", async () => {
    const cdp = createMockCdp({
      frameTree: {
        frame: { id: "root" }
      },
      snapshots: {
        root: snapshot(
          [301],
          [[10, 20, 200, 36]],
          {
            clickableNodeIndexes: [0]
          }
        )
      },
      axTrees: {
        root: {
          nodes: []
        }
      },
      domLabelsByBackendNodeId: {
        301: {
          name: "Click for JS Prompt",
          role: "button"
        }
      }
    });

    const response = await readPage(cdp, createRequest());

    expect(response.ok).toBe(true);
    if (!response.ok) {
      return;
    }

    expect(response.result.tree).toEqual([
      expect.objectContaining({
        ref_id: "f0:301",
        role: "button",
        name: "Click for JS Prompt",
        source: "dom_clickable",
        actions: ["click"]
      })
    ]);
    expect(response.result.yaml).toContain("name: \"Click for JS Prompt\"");
  });

  it("includes accessibility state for checkboxes, options, and editable values", async () => {
    const cdp = createMockCdp({
      frameTree: {
        frame: { id: "root" }
      },
      snapshots: {
        root: snapshot(
          [201, 202, 203, 204],
          [
            [10, 20, 24, 24],
            [10, 60, 220, 36],
            [10, 110, 220, 30],
            [10, 150, 220, 30]
          ]
        )
      },
      axTrees: {
        root: {
          nodes: [
            axNode({ nodeId: "n1", backendDOMNodeId: 201, role: "checkbox", state: { checked: "true" } }),
            axNode({ nodeId: "n2", backendDOMNodeId: 202, role: "combobox", value: "Option 2", state: { expanded: false } }),
            axNode({ nodeId: "n3", backendDOMNodeId: 203, role: "option", name: "Option 2", state: { selected: true } }),
            axNode({ nodeId: "n4", backendDOMNodeId: 204, role: "textbox", name: "Code", value: "Atlas works", state: { disabled: true } })
          ]
        }
      }
    });

    const response = await readPage(cdp, createRequest());

    expect(response.ok).toBe(true);
    if (!response.ok) {
      return;
    }

    expect(response.result.tree).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ref_id: "f0:201",
          role: "checkbox",
          state: {
            checked: true
          }
        }),
        expect.objectContaining({
          ref_id: "f0:202",
          role: "combobox",
          state: {
            expanded: false,
            value: "Option 2"
          }
        }),
        expect.objectContaining({
          ref_id: "f0:203",
          role: "option",
          state: {
            selected: true
          }
        }),
        expect.objectContaining({
          ref_id: "f0:204",
          role: "textbox",
          state: {
            disabled: true,
            value: "Atlas works"
          }
        })
      ])
    );
    expect(response.result.yaml).toContain("checked: true");
    expect(response.result.yaml).toContain("value: \"Option 2\"");
    expect(response.result.yaml).toContain("selected: true");
    expect(response.result.yaml).toContain("disabled: true");
  });

  it("attaches hidden option labels to combobox state so collapsed selects remain actionable", async () => {
    const cdp = createMockCdp({
      frameTree: {
        frame: { id: "root" }
      },
      snapshots: {
        root: snapshot(
          [401],
          [[10, 20, 220, 36]]
        )
      },
      axTrees: {
        root: {
          nodes: [
            axNode({
              nodeId: "combo",
              backendDOMNodeId: 401,
              role: "combobox",
              value: "Please select an option",
              state: { expanded: false },
              childIds: ["option-1", "option-2", "option-3"]
            }),
            axNode({ nodeId: "option-1", role: "option", name: "Please select an option", state: { selected: true } }),
            axNode({ nodeId: "option-2", role: "option", name: "Option 1" }),
            axNode({ nodeId: "option-3", role: "option", name: "Option 2" })
          ]
        }
      }
    });

    const response = await readPage(cdp, createRequest());

    expect(response.ok).toBe(true);
    if (!response.ok) {
      return;
    }

    expect(response.result.tree).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ref_id: "f0:401",
          role: "combobox",
          state: {
            expanded: false,
            value: "Please select an option",
            options: ["Please select an option", "Option 1", "Option 2"]
          }
        })
      ])
    );
    expect(response.result.yaml).toContain("options:");
    expect(response.result.yaml).toContain("- \"Option 2\"");
  });

  it("resolves DOM snapshot frameId string-table indexes back to frame ids", async () => {
    const rootFrameId = "root";
    const baseSnapshot = snapshot([301], [[40, 50, 120, 32]]);
    const cdp = createMockCdp({
      frameTree: {
        frame: { id: rootFrameId }
      },
      snapshots: {
        [rootFrameId]: {
          strings: [...baseSnapshot.strings, rootFrameId],
          documents: baseSnapshot.documents.map((document) => ({
            ...document,
            frameId: baseSnapshot.strings.length
          }))
        }
      },
      axTrees: {
        [rootFrameId]: {
          nodes: [
            axNode({ nodeId: "n1", backendDOMNodeId: 301, role: "button", name: "Continue" })
          ]
        }
      }
    });

    const response = await readPage(cdp, createRequest());

    expect(response.ok).toBe(true);
    if (!response.ok) {
      return;
    }

    expect(response.result.tree).toHaveLength(1);
    expect(response.result.tree[0]).toMatchObject({
      ref_id: "f0:301",
      frame_id: rootFrameId,
      role: "button",
      name: "Continue"
    });
  });

  it("applies iframe owner offsets to nested frame elements", async () => {
    const cdp = createMockCdp({
      frameTree: {
        frame: { id: "root" },
        childFrames: [{ frame: { id: "child", parentId: "root" } }]
      },
      snapshots: {
        root: snapshot([200], [[300, 100, 500, 300]]),
        child: snapshot([301], [[10, 20, 100, 40]])
      },
      axTrees: {
        root: { nodes: [] },
        child: {
          nodes: [axNode({ nodeId: "child-1", backendDOMNodeId: 301, role: "button", name: "Pay" })]
        }
      },
      frameOwners: {
        child: 200
      }
    });

    const response = await readPage(cdp, createRequest());

    expect(response.ok).toBe(true);
    if (!response.ok) {
      return;
    }

    expect(response.result.tree).toHaveLength(1);
    expect(response.result.tree[0]).toMatchObject({
      ref_id: "f1:301",
      frame_id: "child",
      bbox: { x: 310, y: 120, w: 100, h: 40 },
      click: { x: 360, y: 140 }
    });
  });

  it("returns retryable stale-frame error when frame becomes invalid during capture", async () => {
    const cdp = createMockCdp({
      frameTree: {
        frame: { id: "root" },
        childFrames: [{ frame: { id: "child", parentId: "root" } }]
      },
      snapshots: {
        root: snapshot([200], [[300, 100, 500, 300]]),
        child: snapshot([301], [[10, 20, 100, 40]])
      },
      axTrees: {
        root: { nodes: [] },
        child: { nodes: [] }
      },
      frameOwners: {
        child: 200
      },
      throwOnAxFrame: "child"
    });

    const response = await readPage(cdp, createRequest());

    expect(response.ok).toBe(false);
    if (response.ok) {
      return;
    }

    expect(response.error).toMatchObject({
      code: "READPAGE_FRAME_STALE",
      retryable: true
    });
  });

  it("honors requested depth and includes non-interactive nodes when filter=all", async () => {
    const axRequests: Array<{ depth: number; frameId: string }> = [];
    const cdp = createMockCdp({
      frameTree: {
        frame: { id: "root" }
      },
      snapshots: {
        root: snapshot(
          [101, 102],
          [
            [10, 20, 100, 30],
            [10, 60, 160, 20]
          ]
        )
      },
      axTrees: {
        root: {
          nodes: [
            axNode({ nodeId: "n1", backendDOMNodeId: 101, role: "button", name: "Submit" }),
            axNode({ nodeId: "n2", backendDOMNodeId: 102, role: "heading", name: "Welcome" })
          ]
        }
      },
      onAxRequest(params) {
        axRequests.push(params);
      }
    });

    const response = await readPage(cdp, createRequest("tab-1", { depth: 2, filter: "all" }));

    expect(response.ok).toBe(true);
    if (!response.ok) {
      return;
    }

    expect(axRequests).toEqual([{ depth: 2, frameId: "root" }]);
    expect(response.result.tree).toHaveLength(2);
    expect(response.result.tree[1]).toMatchObject({
      ref_id: "f0:102",
      role: "heading",
      name: "Welcome",
      actions: []
    });
  });

  it("focuses read_page results on descendants of the requested ref_id", async () => {
    const cdp = createMockCdp({
      frameTree: {
        frame: { id: "root" }
      },
      snapshots: {
        root: snapshot(
          [101, 102, 103],
          [
            [10, 20, 200, 120],
            [20, 40, 120, 24],
            [20, 80, 120, 24]
          ]
        )
      },
      axTrees: {
        root: {
          nodes: [
            axNode({ nodeId: "n1", backendDOMNodeId: 101, role: "group", name: "Form", childIds: ["n2"] }),
            axNode({ nodeId: "n2", backendDOMNodeId: 102, role: "textbox", name: "Email" }),
            axNode({ nodeId: "n3", backendDOMNodeId: 103, role: "button", name: "Cancel" })
          ]
        }
      }
    });

    const response = await readPage(cdp, createRequest("tab-1", { filter: "all", ref_id: "f0:101" }));

    expect(response.ok).toBe(true);
    if (!response.ok) {
      return;
    }

    expect(response.result.tree.map((node) => node.ref_id)).toEqual(["f0:102"]);
  });

  it("rejects duplicate ref collisions as non-retryable", async () => {
    const cdp = createMockCdp({
      frameTree: {
        frame: { id: "root" }
      },
      snapshots: {
        root: snapshot([101], [[10, 20, 100, 30]])
      },
      axTrees: {
        root: {
          nodes: [
            axNode({ nodeId: "n1", backendDOMNodeId: 101, role: "button", name: "A" }),
            axNode({ nodeId: "n2", backendDOMNodeId: 101, role: "button", name: "B" })
          ]
        }
      }
    });

    const response = await readPage(cdp, createRequest());

    expect(response.ok).toBe(false);
    if (response.ok) {
      return;
    }

    expect(response.error).toMatchObject({
      code: "READPAGE_REF_COLLISION",
      retryable: false
    });
  });

  it("produces stable ordering and yaml across repeated runs", async () => {
    const cdp = createMockCdp({
      frameTree: {
        frame: { id: "root" }
      },
      snapshots: {
        root: snapshot(
          [120, 110],
          [
            [10, 80, 10, 10],
            [10, 20, 10, 10]
          ]
        )
      },
      axTrees: {
        root: {
          nodes: [
            axNode({ nodeId: "n1", backendDOMNodeId: 120, role: "button", name: "Later" }),
            axNode({ nodeId: "n2", backendDOMNodeId: 110, role: "button", name: "Sooner" })
          ]
        }
      }
    });

    const one = await readPage(cdp, createRequest());
    const two = await readPage(cdp, createRequest());

    expect(one.ok).toBe(true);
    expect(two.ok).toBe(true);
    if (!one.ok || !two.ok) {
      return;
    }

    expect(one.result.tree.map((node) => node.ref_id)).toEqual(["f0:110", "f0:120"]);
    expect(two.result.tree.map((node) => node.ref_id)).toEqual(["f0:110", "f0:120"]);
    expect(one.result.yaml).toBe(two.result.yaml);
  });
});

describe("handleReadPageTool", () => {
  it("returns tab-not-found error when tab is missing", async () => {
    const response = await handleReadPageTool(
      {
        getClientForTab() {
          return undefined;
        }
      },
      createRequest("missing-tab")
    );

    expect(response.ok).toBe(false);
    if (response.ok) {
      return;
    }

    expect(response.error).toMatchObject({
      code: "TAB_NOT_FOUND",
      retryable: false
    });
  });

  it("delegates read page requests to readPage implementation", async () => {
    const cdp = createMockCdp({
      frameTree: {
        frame: { id: "root" }
      },
      snapshots: {
        root: snapshot([101], [[10, 20, 100, 30]])
      },
      axTrees: {
        root: {
          nodes: [axNode({ nodeId: "n1", backendDOMNodeId: 101, role: "button", name: "Submit" })]
        }
      }
    });

    const response = await handleReadPageTool(
      {
        getClientForTab(tabId) {
          return tabId === "tab-1" ? cdp : undefined;
        }
      },
      createRequest("tab-1")
    );

    expect(response.ok).toBe(true);
    if (!response.ok) {
      return;
    }

    expect(response.result.tree[0].ref_id).toBe("f0:101");
  });

  it("emits read-page observability callbacks with request and response payloads", async () => {
    const cdp = createMockCdp({
      frameTree: {
        frame: { id: "root" }
      },
      snapshots: {
        root: snapshot([101], [[10, 20, 100, 30]])
      },
      axTrees: {
        root: {
          nodes: [axNode({ nodeId: "n1", backendDOMNodeId: 101, role: "button", name: "Submit" })]
        }
      }
    });

    const request = createRequest("tab-1");
    const observed: Array<{
      request_id: string;
      ok: boolean;
      action: string;
    }> = [];

    const response = await handleReadPageTool(
      {
        getClientForTab(tabId) {
          return tabId === "tab-1" ? cdp : undefined;
        }
      },
      request,
      {
        async onResponse(nextRequest, nextResponse) {
          observed.push({
            request_id: nextRequest.request_id,
            ok: nextResponse.ok,
            action: nextRequest.action
          });
        }
      }
    );

    expect(response.ok).toBe(true);
    expect(observed).toEqual([
      {
        request_id: request.request_id,
        ok: true,
        action: "ReadPage"
      }
    ]);
  });
});
