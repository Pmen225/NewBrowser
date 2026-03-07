import { describe, expect, it } from "vitest";

import { createFindDispatcher } from "../../sidecar/src/rpc/find-dispatcher";
import type { CdpClient } from "../../src/sidecar/read-page/types";

function createMockCdp(): CdpClient {
  return {
    Page: {
      async getFrameTree() {
        return {
          frameTree: {
            frame: {
              id: "root"
            }
          }
        };
      }
    },
    DOMSnapshot: {
      async captureSnapshot() {
        return {
          documents: [
            {
              frameId: "root",
              nodes: {
                backendNodeId: [101],
                isClickable: {
                  index: [0]
                }
              },
              layout: {
                nodeIndex: [0],
                bounds: [[10, 20, 100, 30]]
              },
              scrollOffsetX: 0,
              scrollOffsetY: 0
            }
          ],
          strings: []
        };
      }
    },
    Accessibility: {
      async getFullAXTree() {
        return {
          nodes: [
            {
              nodeId: "ax-1",
              frameId: "root",
              backendDOMNodeId: 101,
              role: {
                value: "button"
              },
              name: {
                value: "Submit"
              }
            }
          ]
        };
      }
    },
    DOM: {
      async getFrameOwner() {
        return {
          backendNodeId: 101
        };
      }
    }
  };
}

describe("createFindDispatcher", () => {
  it("returns click coordinates alongside refs", async () => {
    const dispatcher = createFindDispatcher({
      getClientForTab(tabId) {
        return tabId === "tab-1" ? createMockCdp() : undefined;
      }
    });

    await expect(
      dispatcher.dispatch(
        "find",
        "tab-1",
        {
          query: "submit"
        },
        new AbortController().signal
      )
    ).resolves.toEqual({
      matches: [
        {
          ref: "f0:101",
          text: "Submit",
          role: "button",
          score: 2,
          coordinates: {
            x: 60,
            y: 35
          }
        }
      ]
    });
  });

  it("falls back to dispatcher tab when params.tab_id is stale", async () => {
    const dispatcher = createFindDispatcher({
      getClientForTab(tabId) {
        return tabId === "tab-1" ? createMockCdp() : undefined;
      }
    });

    await expect(
      dispatcher.dispatch(
        "find",
        "tab-1",
        {
          query: "submit",
          tab_id: "stale-tab"
        },
        new AbortController().signal
      )
    ).resolves.toMatchObject({
      matches: [
        {
          ref: "f0:101",
          text: "Submit"
        }
      ]
    });
  });
});
