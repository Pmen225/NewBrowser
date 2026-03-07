import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createTraceLogger } from "../../sidecar/src/observability/trace-logger";
import { runWithRpcRequestContext } from "../../sidecar/src/observability/request-context";
import { createReadPageDispatcher } from "../../sidecar/src/rpc/read-page-dispatcher";
import type { CdpClient } from "../../src/sidecar/read-page/types";

function parseJsonl(raw: string): Array<{
  event: string;
  request_id?: string;
}> {
  return raw
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as { event: string; request_id?: string });
}

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
                bounds: [[10, 20, 100, 40]]
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

describe("createReadPageDispatcher", () => {
  it("writes read-page artifacts from dispatch path", async () => {
    const traceRoot = await mkdtemp(join(tmpdir(), "task8-read-page-dispatcher-"));
    const traceLogger = createTraceLogger({
      rootDir: traceRoot,
      backendUuid: "backend-fixed",
      runId: "run-fixed"
    });

    const dispatcher = createReadPageDispatcher({
      getClientForTab(tabId) {
        return tabId === "tab-1" ? createMockCdp() : undefined;
      },
      traceLogger
    });

    const result = await runWithRpcRequestContext(
      {
        request_id: "req-read-page",
        action: "ReadPage",
        tab_id: "tab-1",
        params: {}
      },
      () => dispatcher.dispatch("ReadPage", "tab-1", {}, new AbortController().signal)
    );

    expect(result).toMatchObject({
      meta: {
        frame_count: 1,
        interactable_count: 1
      }
    });

    await traceLogger.flush();
    const lines = parseJsonl(await readFile(traceLogger.traceFilePath, "utf8"));
    expect(lines.some((line) => line.event === "artifact.read_page_yaml" && line.request_id === "req-read-page")).toBe(true);
    expect(lines.some((line) => line.event === "artifact.read_page_json" && line.request_id === "req-read-page")).toBe(true);
  });

  it("accepts supported read_page params", async () => {
    const dispatcher = createReadPageDispatcher({
      getClientForTab() {
        return createMockCdp();
      }
    });

    await expect(
      dispatcher.dispatch(
        "ReadPage",
        "tab-1",
        {
          depth: 2,
          filter: "interactive"
        },
        new AbortController().signal
      )
    ).resolves.toMatchObject({
      meta: {
        frame_count: 1,
        interactable_count: 1
      }
    });

    await expect(
      dispatcher.dispatch(
        "ReadPage",
        "tab-1",
        {
          filter: "checkbox"
        },
        new AbortController().signal
      )
    ).resolves.toMatchObject({
      meta: {
        frame_count: 1,
        interactable_count: 1
      }
    });
  });

  it("rejects invalid read_page params", async () => {
    const dispatcher = createReadPageDispatcher({
      getClientForTab() {
        return createMockCdp();
      }
    });

    await expect(
      dispatcher.dispatch(
        "ReadPage",
        "tab-1",
        {
          filter: "invalid"
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "INVALID_REQUEST",
      retryable: false
    });
  });

  it("returns dialog context instead of calling CDP when a JavaScript dialog is open", async () => {
    const dispatcher = createReadPageDispatcher({
      getClientForTab() {
        throw new Error("getClientForTab should not be called while a dialog is open");
      },
      getDialogForTab() {
        return {
          tabId: "tab-1",
          sessionId: "session-1",
          type: "confirm",
          message: "I am a JS Confirm",
          hasBrowserHandler: true,
          openedAt: "2026-03-06T00:00:00.000Z"
        };
      }
    });

    await expect(dispatcher.dispatch("ReadPage", "tab-1", {}, new AbortController().signal)).resolves.toMatchObject({
      yaml: expect.stringContaining("I am a JS Confirm"),
      tree: [],
      dialog: {
        open: true,
        type: "confirm",
        message: "I am a JS Confirm"
      }
    });
  });
});
