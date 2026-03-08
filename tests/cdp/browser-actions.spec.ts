import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import type { BrowserActionRuntime } from "../../src/cdp/browser-actions";
import type { JavaScriptDialogRecord } from "../../src/cdp/types";
import { executeComputerBatch, executeFormInput, executeNavigate, executeTabOperation, resolveNavigationUrl } from "../../src/cdp/browser-actions";

// ─── URL resolution (omnibox behaviour) ─────────────────────────────────────
describe("resolveNavigationUrl", () => {
  // Already fully qualified
  it("passes through https:// URLs unchanged", () => {
    expect(resolveNavigationUrl("https://youtube.com")).toBe("https://youtube.com");
  });
  it("passes through http:// URLs unchanged", () => {
    expect(resolveNavigationUrl("http://example.com/path?q=1")).toBe("http://example.com/path?q=1");
  });
  it("passes through chrome:// URLs unchanged", () => {
    expect(resolveNavigationUrl("chrome://settings")).toBe("chrome://settings");
  });
  it("passes through about:blank unchanged", () => {
    expect(resolveNavigationUrl("about:blank")).toBe("about:blank");
  });
  it("passes through data: URLs unchanged", () => {
    expect(resolveNavigationUrl("data:text/html,<h1>hi</h1>")).toBe("data:text/html,<h1>hi</h1>");
  });

  // Domain inference (the key feature)
  it("prepends https:// to bare domain youtube.com", () => {
    expect(resolveNavigationUrl("youtube.com")).toBe("https://youtube.com");
  });
  it("prepends https:// to www subdomain", () => {
    expect(resolveNavigationUrl("www.google.com")).toBe("https://www.google.com");
  });
  it("prepends https:// to subdomain.domain.tld", () => {
    expect(resolveNavigationUrl("en.wikipedia.org/wiki/JavaScript")).toBe("https://en.wikipedia.org/wiki/JavaScript");
  });
  it("prepends https:// to domain with path", () => {
    expect(resolveNavigationUrl("github.com/user/repo")).toBe("https://github.com/user/repo");
  });
  it("prepends https:// to domain with query string", () => {
    expect(resolveNavigationUrl("google.com/search?q=foo")).toBe("https://google.com/search?q=foo");
  });

  // localhost special case
  it("prepends http:// to localhost", () => {
    expect(resolveNavigationUrl("localhost")).toBe("http://localhost");
  });
  it("prepends http:// to localhost with port", () => {
    expect(resolveNavigationUrl("localhost:3000")).toBe("http://localhost:3000");
  });
  it("prepends http:// to localhost with path", () => {
    expect(resolveNavigationUrl("localhost:3210/rpc")).toBe("http://localhost:3210/rpc");
  });

  // Bare words → search
  it("converts bare word 'youtube' to Google search", () => {
    expect(resolveNavigationUrl("youtube")).toBe("https://www.google.com/search?q=youtube");
  });
  it("converts search phrase to Google search URL", () => {
    expect(resolveNavigationUrl("best pizza near me")).toBe(
      "https://www.google.com/search?q=best%20pizza%20near%20me"
    );
  });
  it("converts single word with no TLD to search", () => {
    expect(resolveNavigationUrl("amazon")).toBe("https://www.google.com/search?q=amazon");
  });

  // Edge cases
  it("trims whitespace before processing", () => {
    expect(resolveNavigationUrl("  youtube.com  ")).toBe("https://youtube.com");
  });
});
import { FakeTransport } from "./helpers/fake-transport";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function createRuntime() {
  const transport = new FakeTransport();
  let currentDialog: JavaScriptDialogRecord | undefined;

  const runtime: BrowserActionRuntime = {
    send: transport.send.bind(transport),
    route() {
      return {
        sessionId: "session-main",
        frameId: "root"
      };
    },
    routeByFrameOrdinal(_tabId, frameOrdinal) {
      if (frameOrdinal === 2) {
        return {
          sessionId: "session-child",
          frameId: "child-frame"
        };
      }

      return {
        sessionId: "session-main",
        frameId: "root"
      };
    },
    getTab(tabId) {
      return {
        tabId,
        targetId: `target-${tabId}`,
        sessionId: "session-main",
        status: "attached",
        attachedAt: "2026-02-27T00:00:00.000Z"
      };
    },
    listTabs() {
      return [
        {
          tabId: "tab-1",
          targetId: "target-tab-1",
          sessionId: "session-main",
          status: "attached",
          attachedAt: "2026-02-27T00:00:00.000Z"
        }
      ];
    },
    getJavaScriptDialog() {
      return currentDialog;
    },
    clearJavaScriptDialog() {
      currentDialog = undefined;
    }
  };

  return {
    transport,
    runtime,
    getDialog: () => currentDialog,
    setDialog: (dialog: JavaScriptDialogRecord | undefined) => {
      currentDialog = dialog;
    }
  };
}

describe("browser CDP action wrappers", () => {
  it("executes click + type + key in order for ComputerBatch", async () => {
    const { transport, runtime } = createRuntime();

    transport.queueResponse("DOM.resolveNode", { object: { objectId: "obj-click" } });
    transport.queueResponse("DOM.scrollIntoViewIfNeeded", {});
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: {
          x: 24,
          y: 36
        }
      }
    });
    transport.queueResponse("Input.dispatchMouseEvent", {});
    transport.queueResponse("Input.dispatchMouseEvent", {});

    transport.queueResponse("DOM.resolveNode", { object: { objectId: "obj-type" } });
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: {
          blocked: false
        }
      }
    });
    transport.queueResponse("DOM.focus", {});
    transport.queueResponse("Input.insertText", {});

    transport.queueResponse("Input.dispatchKeyEvent", {});
    transport.queueResponse("Input.dispatchKeyEvent", {});
    transport.queueResponse("Page.captureScreenshot", {
      data: Buffer.from("fake-png").toString("base64")
    });

    const result = await executeComputerBatch(
      runtime,
      "tab-click-sequence",
      {
        steps: [
          {
            kind: "click",
            ref: "f0:101"
          },
          {
            kind: "type",
            ref: "f0:102",
            text: "hello"
          },
          {
            kind: "key",
            key: "Enter"
          }
        ]
      },
      new AbortController().signal
    );

    expect(result).toEqual({
      steps: [
        { index: 0, ok: true },
        { index: 1, ok: true },
        { index: 2, ok: true }
      ],
      completed_steps: 3,
      screenshot_b64: Buffer.from("fake-png").toString("base64"),
      overlay: {
        cursor: {
          x: 24,
          y: 36
        },
        click: {
          x: 24,
          y: 36
        }
      }
    });

    expect(transport.sendCalls.map((call) => call.method)).toEqual([
      "Page.addScriptToEvaluateOnNewDocument",
      "Runtime.evaluate",
      "DOM.resolveNode",
      "DOM.scrollIntoViewIfNeeded",
      "Runtime.callFunctionOn",
      "Input.dispatchMouseEvent",
      "Input.dispatchMouseEvent",
      "DOM.resolveNode",
      "Runtime.callFunctionOn",
      "DOM.focus",
      "Input.insertText",
      "Input.dispatchKeyEvent",
      "Input.dispatchKeyEvent",
      "Page.captureScreenshot"
    ]);
  });

  it("supports explicit screenshot steps in ComputerBatch", async () => {
    const { transport, runtime } = createRuntime();
    transport.queueResponse("Page.captureScreenshot", {
      data: Buffer.from("png-data").toString("base64")
    });

    const result = await executeComputerBatch(
      runtime,
      "tab-1",
      {
        steps: [{ kind: "screenshot" }]
      },
      new AbortController().signal
    );

    expect(result).toEqual({
      steps: [{ index: 0, ok: true }],
      completed_steps: 1,
      screenshot_b64: Buffer.from("png-data").toString("base64")
    });
    expect(transport.sendCalls).toEqual([
      {
        method: "Page.addScriptToEvaluateOnNewDocument",
        params: expect.objectContaining({ source: expect.stringContaining("__atlasConsentSweep") }),
        sessionId: "session-main"
      },
      {
        method: "Runtime.evaluate",
        params: expect.objectContaining({ expression: expect.stringContaining("__atlasConsentSweep") }),
        sessionId: "session-main"
      },
      {
        method: "Page.captureScreenshot",
        params: { format: "png" },
        sessionId: "session-main"
      }
    ]);
  });

  it("runs a consent preflight before ComputerBatch interactions", async () => {
    const { transport, runtime } = createRuntime();
    transport.queueResponse("Input.dispatchKeyEvent", {});
    transport.queueResponse("Input.dispatchKeyEvent", {});
    transport.queueResponse("Page.captureScreenshot", {
      data: Buffer.from("preflight-png").toString("base64")
    });

    await executeComputerBatch(
      runtime,
      "tab-1",
      {
        steps: [{ kind: "key", key: "Enter" }]
      },
      new AbortController().signal
    );

    expect(transport.sendCalls.slice(0, 2)).toEqual([
      {
        method: "Page.addScriptToEvaluateOnNewDocument",
        params: expect.objectContaining({ source: expect.stringContaining("__atlasConsentSweep") }),
        sessionId: "session-main"
      },
      {
        method: "Runtime.evaluate",
        params: expect.objectContaining({ expression: expect.stringContaining("__atlasConsentSweep") }),
        sessionId: "session-main"
      }
    ]);
  });

  it("uses native mouse events for ref clicks so dialog-triggering elements cannot block page evaluation", async () => {
    const { transport, runtime } = createRuntime();

    transport.queueResponse("DOM.resolveNode", { object: { objectId: "obj-native-click" } });
    transport.queueResponse("DOM.scrollIntoViewIfNeeded", {});
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: {
          x: 120,
          y: 48
        }
      }
    });
    transport.queueResponse("Input.dispatchMouseEvent", {});
    transport.queueResponse("Input.dispatchMouseEvent", {});
    transport.queueResponse("Page.captureScreenshot", {
      data: Buffer.from("native-click-png").toString("base64")
    });

    const result = await executeComputerBatch(
      runtime,
      "tab-native-click",
      {
        steps: [{ kind: "click", ref: "f0:211" }]
      },
      new AbortController().signal
    );

    expect(result).toEqual({
      steps: [{ index: 0, ok: true }],
      completed_steps: 1,
      screenshot_b64: Buffer.from("native-click-png").toString("base64"),
      overlay: {
        cursor: {
          x: 120,
          y: 48
        },
        click: {
          x: 120,
          y: 48
        }
      }
    });
    expect(transport.sendCalls).toEqual([
      {
        method: "Page.addScriptToEvaluateOnNewDocument",
        params: expect.objectContaining({ source: expect.stringContaining("__atlasConsentSweep") }),
        sessionId: "session-main"
      },
      {
        method: "Runtime.evaluate",
        params: expect.objectContaining({ expression: expect.stringContaining("__atlasConsentSweep") }),
        sessionId: "session-main"
      },
      {
        method: "DOM.resolveNode",
        params: { backendNodeId: 211 },
        sessionId: "session-main"
      },
      {
        method: "DOM.scrollIntoViewIfNeeded",
        params: { backendNodeId: 211 },
        sessionId: "session-main"
      },
      {
        method: "Runtime.callFunctionOn",
        params: {
          objectId: "obj-native-click",
          functionDeclaration:
            "function() { const rect = this.getBoundingClientRect && this.getBoundingClientRect(); if (!rect || !Number.isFinite(rect.left) || !Number.isFinite(rect.top) || rect.width <= 0 || rect.height <= 0) return null; return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; }",
          returnByValue: true,
          awaitPromise: true
        },
        sessionId: "session-main"
      },
      {
        method: "Input.dispatchMouseEvent",
        params: {
          type: "mousePressed",
          button: "left",
          x: 120,
          y: 48,
          clickCount: 1
        },
        sessionId: "session-main"
      },
      {
        method: "Input.dispatchMouseEvent",
        params: {
          type: "mouseReleased",
          button: "left",
          x: 120,
          y: 48,
          clickCount: 1
        },
        sessionId: "session-main"
      },
      {
        method: "Page.captureScreenshot",
        params: { format: "png" },
        sessionId: "session-main"
      }
    ]);
  });

  it("surfaces an unexpected JavaScript dialog after a click and stops the batch before later steps", async () => {
    const { transport, runtime, setDialog } = createRuntime();
    runtime.send = (async (method, params, sessionId) => {
      const result = await transport.send(method, params, sessionId);
      if (
        method === "Input.dispatchMouseEvent" &&
        params &&
        typeof params === "object" &&
        (params as { type?: string }).type === "mouseReleased"
      ) {
        setDialog({
          tabId: "tab-dialog-stop",
          sessionId: "session-main",
          type: "prompt",
          message: "Enter Atlas",
          defaultPrompt: "",
          hasBrowserHandler: false,
          openedAt: "2026-03-06T00:00:00.000Z"
        });
      }
      return result;
    }) as BrowserActionRuntime["send"];

    transport.queueResponse("DOM.resolveNode", { object: { objectId: "obj-dialog-stop" } });
    transport.queueResponse("DOM.scrollIntoViewIfNeeded", {});
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: {
          x: 48,
          y: 52
        }
      }
    });
    transport.queueResponse("Input.dispatchMouseEvent", {});
    transport.queueResponse("Input.dispatchMouseEvent", {});
    const result = await executeComputerBatch(
      runtime,
      "tab-dialog-stop",
      {
        steps: [
          { kind: "click", ref: "f0:212" },
          { kind: "key", key: "Enter" }
        ]
      },
      new AbortController().signal
    );

    expect(result).toEqual({
      steps: [{ index: 0, ok: true }],
      completed_steps: 1,
      overlay: {
        cursor: {
          x: 48,
          y: 52
        },
        click: {
          x: 48,
          y: 52
        }
      },
      javascript_dialog: {
        type: "prompt",
        message: "Enter Atlas",
        default_prompt: ""
      }
    });
    expect(transport.sendCalls.map((call) => call.method)).toEqual([
      "Page.addScriptToEvaluateOnNewDocument",
      "Runtime.evaluate",
      "DOM.resolveNode",
      "DOM.scrollIntoViewIfNeeded",
      "Runtime.callFunctionOn",
      "Input.dispatchMouseEvent",
      "Input.dispatchMouseEvent"
    ]);
  });

  it("does not capture a screenshot when a single-step click surfaces a JavaScript dialog", async () => {
    const { transport, runtime, setDialog } = createRuntime();
    runtime.send = (async (method, params, sessionId) => {
      const result = await transport.send(method, params, sessionId);
      if (
        method === "Input.dispatchMouseEvent" &&
        params &&
        typeof params === "object" &&
        (params as { type?: string }).type === "mouseReleased"
      ) {
        setDialog({
          tabId: "tab-dialog-single-click",
          sessionId: "session-main",
          type: "prompt",
          message: "Enter Atlas",
          defaultPrompt: "",
          hasBrowserHandler: false,
          openedAt: "2026-03-06T00:00:00.000Z"
        });
      }
      return result;
    }) as BrowserActionRuntime["send"];

    transport.queueResponse("DOM.resolveNode", { object: { objectId: "obj-dialog-single-click" } });
    transport.queueResponse("DOM.scrollIntoViewIfNeeded", {});
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: {
          x: 334,
          y: 291
        }
      }
    });
    transport.queueResponse("Input.dispatchMouseEvent", {});
    transport.queueResponse("Input.dispatchMouseEvent", {});

    const result = await executeComputerBatch(
      runtime,
      "tab-dialog-single-click",
      {
        steps: [{ kind: "click", ref: "f0:500" }]
      },
      new AbortController().signal
    );

    expect(result).toEqual({
      steps: [{ index: 0, ok: true }],
      completed_steps: 1,
      overlay: {
        cursor: {
          x: 334,
          y: 291
        },
        click: {
          x: 334,
          y: 291
        }
      },
      javascript_dialog: {
        type: "prompt",
        message: "Enter Atlas",
        default_prompt: ""
      }
    });
    expect(transport.sendCalls.map((call) => call.method)).toEqual([
      "Page.addScriptToEvaluateOnNewDocument",
      "Runtime.evaluate",
      "DOM.resolveNode",
      "DOM.scrollIntoViewIfNeeded",
      "Runtime.callFunctionOn",
      "Input.dispatchMouseEvent",
      "Input.dispatchMouseEvent"
    ]);
  });

  it("handles JavaScript dialogs in ComputerBatch", async () => {
    const { transport, runtime, setDialog } = createRuntime();
    setDialog({
      tabId: "tab-dialog-only",
      sessionId: "session-main",
      type: "prompt",
      message: "Atlas?",
      defaultPrompt: "Atlas",
      hasBrowserHandler: false,
      openedAt: "2026-03-06T00:00:00.000Z"
    });
    runtime.send = (async (method, params, sessionId) => {
      const result = await transport.send(method, params, sessionId);
      if (method === "Page.handleJavaScriptDialog") {
        setDialog(undefined);
      }
      return result;
    }) as BrowserActionRuntime["send"];

    transport.queueResponse("Page.handleJavaScriptDialog", {});
    transport.queueResponse("Page.captureScreenshot", {
      data: Buffer.from("dialog-png").toString("base64")
    });

    const result = await executeComputerBatch(
      runtime,
      "tab-dialog-only",
      {
        steps: [{ kind: "dialog", accept: true, prompt_text: "Atlas prompt" }]
      },
      new AbortController().signal
    );

    expect(result).toEqual({
      steps: [{ index: 0, ok: true }],
      completed_steps: 1,
      screenshot_b64: Buffer.from("dialog-png").toString("base64")
    });
    expect(transport.sendCalls).toEqual([
      {
        method: "Page.addScriptToEvaluateOnNewDocument",
        params: expect.objectContaining({ source: expect.stringContaining("__atlasConsentSweep") }),
        sessionId: "session-main"
      },
      {
        method: "Runtime.evaluate",
        params: expect.objectContaining({ expression: expect.stringContaining("__atlasConsentSweep") }),
        sessionId: "session-main"
      },
      {
        method: "Page.handleJavaScriptDialog",
        params: { accept: true, promptText: "Atlas prompt" },
        sessionId: "session-main"
      },
      {
        method: "Page.captureScreenshot",
        params: { format: "png" },
        sessionId: "session-main"
      }
    ]);
  });

  it("waits for a dialog step when the prompt opens shortly after the step starts", async () => {
    const { transport, runtime, setDialog } = createRuntime();
    runtime.send = (async (method, params, sessionId) => {
      const result = await transport.send(method, params, sessionId);
      if (method === "Page.handleJavaScriptDialog") {
        setDialog(undefined);
      }
      return result;
    }) as BrowserActionRuntime["send"];

    transport.queueResponse("Page.handleJavaScriptDialog", {});
    transport.queueResponse("Page.captureScreenshot", {
      data: Buffer.from("delayed-dialog-png").toString("base64")
    });

    const openDialogLater = setTimeout(() => {
      setDialog({
        tabId: "tab-delayed-dialog",
        sessionId: "session-main",
        type: "prompt",
        message: "Atlas?",
        defaultPrompt: "",
        hasBrowserHandler: false,
        openedAt: "2026-03-08T00:00:00.000Z"
      });
    }, 350);

    try {
      const result = await executeComputerBatch(
        runtime,
        "tab-delayed-dialog",
        {
          steps: [{ kind: "dialog", accept: true, prompt_text: "Atlas prompt" }]
        },
        new AbortController().signal
      );

      expect(result).toEqual({
        steps: [{ index: 0, ok: true }],
        completed_steps: 1,
        screenshot_b64: Buffer.from("delayed-dialog-png").toString("base64")
      });
      expect(transport.sendCalls.map((call) => call.method)).toEqual([
        "Page.addScriptToEvaluateOnNewDocument",
        "Runtime.evaluate",
        "Page.handleJavaScriptDialog",
        "Page.captureScreenshot"
      ]);
    } finally {
      clearTimeout(openDialogLater);
    }
  });

  it("clears local dialog state after handling when Chromium does not emit a close event", async () => {
    const { transport, runtime, setDialog, getDialog } = createRuntime();
    setDialog({
      tabId: "tab-dialog-sticky",
      sessionId: "session-main",
      type: "prompt",
      message: "Atlas?",
      defaultPrompt: "",
      hasBrowserHandler: false,
      openedAt: "2026-03-08T00:00:00.000Z"
    });

    transport.queueResponse("Page.handleJavaScriptDialog", {});
    transport.queueResponse("Page.captureScreenshot", {
      data: Buffer.from("sticky-dialog-png").toString("base64")
    });

    const result = await executeComputerBatch(
      runtime,
      "tab-dialog-sticky",
      {
        steps: [{ kind: "dialog", accept: true, prompt_text: "Atlas prompt" }]
      },
      new AbortController().signal
    );

    expect(result).toEqual({
      steps: [{ index: 0, ok: true }],
      completed_steps: 1,
      screenshot_b64: Buffer.from("sticky-dialog-png").toString("base64")
    });
    expect(getDialog()).toBeUndefined();
    expect(transport.sendCalls.map((call) => call.method)).toEqual([
      "Page.addScriptToEvaluateOnNewDocument",
      "Runtime.evaluate",
      "Page.handleJavaScriptDialog",
      "Page.captureScreenshot"
    ]);
  });

  it("returns DIALOG_NOT_OPEN when a dialog step is issued without an active dialog", async () => {
    const { runtime } = createRuntime();

    const result = await executeComputerBatch(
      runtime,
      "tab-no-dialog",
      {
        steps: [{ kind: "dialog", accept: true, prompt_text: "Atlas prompt" }]
      },
      new AbortController().signal
    );

    expect(result).toEqual({
      steps: [{ index: 0, ok: false, error_code: "DIALOG_NOT_OPEN" }],
      completed_steps: 0
    });
  });

  it("uses a deferred element click when a ref click is immediately followed by a dialog step", async () => {
    const { transport, runtime, setDialog } = createRuntime();
    runtime.send = (async (method, params, sessionId) => {
      const result = await transport.send(method, params, sessionId);
      if (
        method === "Input.dispatchMouseEvent" &&
        params &&
        typeof params === "object" &&
        (params as { type?: string }).type === "mouseReleased"
      ) {
        setDialog({
          tabId: "tab-dialog-click",
          sessionId: "session-main",
          type: "prompt",
          message: "Enter Atlas",
          defaultPrompt: "",
          hasBrowserHandler: false,
          openedAt: "2026-03-06T00:00:00.000Z"
        });
      }
      if (method === "Page.handleJavaScriptDialog") {
        setDialog(undefined);
      }
      return result;
    }) as BrowserActionRuntime["send"];

    transport.queueResponse("DOM.resolveNode", { object: { objectId: "obj-dialog-click" } });
    transport.queueResponse("DOM.scrollIntoViewIfNeeded", {});
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: {
          x: 90,
          y: 110
        }
      }
    });
    transport.queueResponse("Input.dispatchMouseEvent", {});
    transport.queueResponse("Input.dispatchMouseEvent", {});
    transport.queueResponse("Page.handleJavaScriptDialog", {});
    transport.queueResponse("Page.captureScreenshot", {
      data: Buffer.from("click-dialog-png").toString("base64")
    });

    const result = await executeComputerBatch(
      runtime,
      "tab-dialog-click",
      {
        steps: [
          { kind: "click", ref: "f0:311" },
          { kind: "dialog", accept: true }
        ]
      },
      new AbortController().signal
    );

    expect(result).toEqual({
      steps: [
        { index: 0, ok: true },
        { index: 1, ok: true }
      ],
      completed_steps: 2,
      screenshot_b64: Buffer.from("click-dialog-png").toString("base64"),
      overlay: {
        cursor: {
          x: 90,
          y: 110
        },
        click: {
          x: 90,
          y: 110
        }
      }
    });
    expect(transport.sendCalls.map((call) => call.method)).toEqual([
      "Page.addScriptToEvaluateOnNewDocument",
      "Runtime.evaluate",
      "DOM.resolveNode",
      "DOM.scrollIntoViewIfNeeded",
      "Runtime.callFunctionOn",
      "Input.dispatchMouseEvent",
      "Input.dispatchMouseEvent",
      "Page.handleJavaScriptDialog",
      "Page.captureScreenshot"
    ]);
  });

  it("surfaces a JavaScript dialog even when mouseReleased never resolves", async () => {
    const { transport, runtime, setDialog } = createRuntime();
    runtime.send = ((method, params, sessionId) => {
      if (
        method === "Input.dispatchMouseEvent" &&
        params &&
        typeof params === "object" &&
        (params as { type?: string }).type === "mouseReleased"
      ) {
        void transport.send(method, params, sessionId);
        setDialog({
          tabId: "tab-dialog-blocked-release",
          sessionId: "session-main",
          type: "prompt",
          message: "Enter Atlas",
          defaultPrompt: "",
          hasBrowserHandler: false,
          openedAt: "2026-03-06T00:00:00.000Z"
        });
        return new Promise(() => undefined);
      }

      return transport.send(method, params, sessionId);
    }) as BrowserActionRuntime["send"];

    transport.queueResponse("DOM.resolveNode", { object: { objectId: "obj-dialog-blocked-release" } });
    transport.queueResponse("DOM.scrollIntoViewIfNeeded", {});
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: {
          x: 144,
          y: 188
        }
      }
    });
    transport.queueResponse("Input.dispatchMouseEvent", {});
    transport.queueResponse("Input.dispatchMouseEvent", {});
    const result = await executeComputerBatch(
      runtime,
      "tab-dialog-blocked-release",
      {
        steps: [
          { kind: "click", ref: "f0:402" },
          { kind: "key", key: "Enter" }
        ]
      },
      new AbortController().signal
    );

    expect(result).toEqual({
      steps: [{ index: 0, ok: true }],
      completed_steps: 1,
      overlay: {
        cursor: {
          x: 144,
          y: 188
        },
        click: {
          x: 144,
          y: 188
        }
      },
      javascript_dialog: {
        type: "prompt",
        message: "Enter Atlas",
        default_prompt: ""
      }
    });
    expect(transport.sendCalls.map((call) => call.method)).toEqual([
      "Page.addScriptToEvaluateOnNewDocument",
      "Runtime.evaluate",
      "DOM.resolveNode",
      "DOM.scrollIntoViewIfNeeded",
      "Runtime.callFunctionOn",
      "Input.dispatchMouseEvent",
      "Input.dispatchMouseEvent"
    ]);
  });

  it("surfaces a synthetic dialog when mouseReleased never resolves and CDP never reports one", async () => {
    const { transport, runtime } = createRuntime();
    runtime.send = ((method, params, sessionId) => {
      if (
        method === "Input.dispatchMouseEvent" &&
        params &&
        typeof params === "object" &&
        (params as { type?: string }).type === "mouseReleased"
      ) {
        void transport.send(method, params, sessionId);
        return new Promise(() => undefined);
      }

      return transport.send(method, params, sessionId);
    }) as BrowserActionRuntime["send"];

    transport.queueResponse("DOM.resolveNode", { object: { objectId: "obj-dialog-synthetic" } });
    transport.queueResponse("DOM.scrollIntoViewIfNeeded", {});
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: {
          x: 180,
          y: 220
        }
      }
    });
    transport.queueResponse("Input.dispatchMouseEvent", {});
    transport.queueResponse("Input.dispatchMouseEvent", {});
    const result = await executeComputerBatch(
      runtime,
      "tab-dialog-synthetic",
      {
        steps: [
          { kind: "click", ref: "f0:403" },
          { kind: "key", key: "Enter" }
        ]
      },
      new AbortController().signal
    );

    expect(result).toEqual({
      steps: [{ index: 0, ok: true }],
      completed_steps: 1,
      overlay: {
        cursor: {
          x: 180,
          y: 220
        },
        click: {
          x: 180,
          y: 220
        }
      },
      javascript_dialog: {
        type: "dialog",
        message: ""
      }
    });
    expect(transport.sendCalls.map((call) => call.method)).toEqual([
      "Page.addScriptToEvaluateOnNewDocument",
      "Runtime.evaluate",
      "DOM.resolveNode",
      "DOM.scrollIntoViewIfNeeded",
      "Runtime.callFunctionOn",
      "Input.dispatchMouseEvent",
      "Input.dispatchMouseEvent"
    ]);
  });

  it("types into the active element when a ComputerBatch type step omits ref", async () => {
    const { transport, runtime } = createRuntime();
    transport.queueResponse("Runtime.evaluate", {
      result: {
        value: {
          blocked: false
        }
      }
    });
    transport.queueResponse("Input.insertText", {});
    transport.queueResponse("Page.captureScreenshot", {
      data: Buffer.from("focused-png").toString("base64")
    });

    const result = await executeComputerBatch(
      runtime,
      "tab-1",
      {
        steps: [{ kind: "type", text: "focused text" }]
      },
      new AbortController().signal
    );

    expect(result).toEqual({
      steps: [{ index: 0, ok: true }],
      completed_steps: 1,
      screenshot_b64: Buffer.from("focused-png").toString("base64")
    });
    expect(transport.sendCalls.map((call) => call.method)).toEqual([
      "Page.addScriptToEvaluateOnNewDocument",
      "Runtime.evaluate",
      "Runtime.evaluate",
      "Input.insertText",
      "Page.captureScreenshot"
    ]);
  });

  it("returns NAVIGATION_FAILED for Page.navigate errorText", async () => {
    const { transport, runtime } = createRuntime();

    transport.queueResponse("Page.navigate", {
      frameId: "root",
      errorText: "net::ERR_NAME_NOT_RESOLVED"
    });

    await expect(
      executeNavigate(
        runtime,
        "tab-1",
        {
          mode: "to",
          url: "https://bad-domain.invalid"
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "NAVIGATION_FAILED",
      retryable: false
    });
  });

  it("treats navigation as successful when the page reached the requested URL after a load wait timeout", async () => {
    const { transport, runtime } = createRuntime();

    runtime.waitForLoadEvent = async () => {
      throw new Error("Timed out waiting for navigation");
    };

    transport.queueResponse("Page.addScriptToEvaluateOnNewDocument", {
      identifier: "stealth-script"
    });
    transport.queueResponse("Page.navigate", {
      frameId: "root",
      loaderId: "loader-1"
    });
    transport.queueResponse("Page.getNavigationHistory", {
      currentIndex: 1,
      entries: [
        {
          id: 1,
          url: "https://example.com/"
        },
        {
          id: 2,
          url: "https://the-internet.herokuapp.com/"
        }
      ]
    });
    transport.queueResponse("Runtime.evaluate", {
      result: {
        value: true
      }
    });

    await expect(
      executeNavigate(
        runtime,
        "tab-1",
        {
          mode: "to",
          url: "https://the-internet.herokuapp.com"
        },
        new AbortController().signal
      )
    ).resolves.toEqual({
      url: "https://the-internet.herokuapp.com",
      frame_id: "root",
      loader_id: "loader-1"
    });
  });

  it("uses the sensitive-page bridge for allowed chrome:// navigation", async () => {
    const { runtime } = createRuntime();
    const navigateSensitivePage = vi.fn(async () => ({
      tabId: "tab-1",
      chromeTabId: 11,
      url: "chrome://settings/"
    }));
    const waitForLoadEvent = vi.fn(async () => undefined);

    runtime.navigateSensitivePage = navigateSensitivePage;
    runtime.waitForLoadEvent = waitForLoadEvent;

    await expect(
      executeNavigate(
        runtime,
        "tab-1",
        {
          mode: "to",
          url: "chrome://settings",
          allow_sensitive_browser_pages: true
        },
        new AbortController().signal
      )
    ).resolves.toEqual({
      url: "chrome://settings/"
    });

    expect(navigateSensitivePage).toHaveBeenCalledWith("tab-1", "chrome://settings");
    expect(waitForLoadEvent).toHaveBeenCalled();
  });

  it("supports modifier key chords in ComputerBatch key steps", async () => {
    const { transport, runtime } = createRuntime();

    transport.queueResponse("Input.dispatchKeyEvent", {});
    transport.queueResponse("Input.dispatchKeyEvent", {});
    transport.queueResponse("Input.dispatchKeyEvent", {});
    transport.queueResponse("Input.dispatchKeyEvent", {});
    transport.queueResponse("Page.captureScreenshot", {
      data: Buffer.from("keys-png").toString("base64")
    });

    const result = await executeComputerBatch(
      runtime,
      "tab-1",
      {
        steps: [{ kind: "key", key: "ctrl+a" }]
      },
      new AbortController().signal
    );

    expect(result).toEqual({
      steps: [{ index: 0, ok: true }],
      completed_steps: 1,
      screenshot_b64: Buffer.from("keys-png").toString("base64")
    });
    expect(transport.sendCalls).toEqual([
      {
        method: "Input.dispatchKeyEvent",
        params: { type: "keyDown", key: "Control" },
        sessionId: "session-main"
      },
      {
        method: "Input.dispatchKeyEvent",
        params: { type: "keyDown", key: "a" },
        sessionId: "session-main"
      },
      {
        method: "Input.dispatchKeyEvent",
        params: { type: "keyUp", key: "a" },
        sessionId: "session-main"
      },
      {
        method: "Input.dispatchKeyEvent",
        params: { type: "keyUp", key: "Control" },
        sessionId: "session-main"
      },
      {
        method: "Page.captureScreenshot",
        params: { format: "png" },
        sessionId: "session-main"
      }
    ]);
  });

  it("returns NO_HISTORY_ENTRY for back navigation at history boundary", async () => {
    const { transport, runtime } = createRuntime();

    transport.queueResponse("Page.getNavigationHistory", {
      currentIndex: 0,
      entries: [
        {
          id: 1,
          url: "https://example.com"
        }
      ]
    });

    await expect(
      executeNavigate(
        runtime,
        "tab-1",
        {
          mode: "back"
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "NO_HISTORY_ENTRY",
      retryable: false
    });
  });

  it("fills text/select/checkbox fields and emits input/change", async () => {
    const { transport, runtime } = createRuntime();

    transport.queueResponse("DOM.resolveNode", { object: { objectId: "obj-a" } });
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: {
          blocked: false
        }
      }
    });
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: true
      }
    });
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: "john@example.com"
      }
    });
    transport.queueResponse("DOM.resolveNode", { object: { objectId: "obj-b" } });
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: true
      }
    });
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: "UK"
      }
    });
    transport.queueResponse("DOM.resolveNode", { object: { objectId: "obj-c" } });
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: true
      }
    });
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: true
      }
    });

    const result = await executeFormInput(
      runtime,
      "tab-1",
      {
        fields: [
          {
            ref: "f0:501",
            kind: "text",
            value: "john@example.com"
          },
          {
            ref: "f0:502",
            kind: "select",
            value: "UK"
          },
          {
            ref: "f0:503",
            kind: "checkbox",
            value: true
          }
        ]
      },
      new AbortController().signal
    );

    expect(result).toEqual({
      updated: 3,
      applied: [
        { ref: "f0:501", kind: "text", requested_value: "john@example.com", confirmed_value: "john@example.com" },
        { ref: "f0:502", kind: "select", requested_value: "UK", confirmed_value: "UK" },
        { ref: "f0:503", kind: "checkbox", requested_value: true, confirmed_value: true }
      ]
    });
    expect(transport.sendCalls.filter((call) => call.method === "Runtime.callFunctionOn")).toHaveLength(7);
  });

  it("accepts string form_input writes on select elements through the text path", async () => {
    const { transport, runtime } = createRuntime();
    transport.queueResponse("DOM.resolveNode", { object: { objectId: "obj-select" } });
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: {
          blocked: false
        }
      }
    });
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: true
      }
    });
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: "United Kingdom"
      }
    });

    await expect(
      executeFormInput(
        runtime,
        "tab-1",
        {
          fields: [
            {
              ref: "f0:504",
              kind: "text",
              value: "United Kingdom"
            }
          ]
        },
        new AbortController().signal
      )
    ).resolves.toEqual({
      updated: 1,
      applied: [
        {
          ref: "f0:504",
          kind: "text",
          requested_value: "United Kingdom",
          confirmed_value: "United Kingdom"
        }
      ]
    });
  });

  it("sets file inputs through DOM.setFileInputFiles", async () => {
    const { transport, runtime } = createRuntime();
    const uploadPath = path.join(ROOT, "package.json");

    transport.queueResponse("DOM.resolveNode", { object: { objectId: "obj-file" } });
    transport.queueResponse("DOM.setFileInputFiles", {});
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: true
      }
    });
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: "package.json"
      }
    });

    await expect(
      executeFormInput(
        runtime,
        "tab-1",
        {
          fields: [
            {
              ref: "f0:505",
              kind: "file",
              value: uploadPath
            }
          ]
        },
        new AbortController().signal
      )
    ).resolves.toEqual({
      updated: 1,
      applied: [
        {
          ref: "f0:505",
          kind: "file",
          requested_value: uploadPath,
          confirmed_value: "package.json"
        }
      ]
    });

    expect(transport.sendCalls).toContainEqual({
      method: "DOM.setFileInputFiles",
      params: {
        files: [uploadPath],
        backendNodeId: 505,
        objectId: "obj-file"
      },
      sessionId: "session-main"
    });
  });

  it("runs a consent preflight before FormInput interactions", async () => {
    const { transport, runtime } = createRuntime();
    transport.queueResponse("DOM.resolveNode", { object: { objectId: "obj-preflight" } });
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: {
          blocked: false
        }
      }
    });
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: true
      }
    });
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: "Atlas"
      }
    });

    await executeFormInput(
      runtime,
      "tab-1",
      {
        fields: [
          {
            ref: "f0:509",
            kind: "text",
            value: "Atlas"
          }
        ]
      },
      new AbortController().signal
    );

    expect(transport.sendCalls.slice(0, 2)).toEqual([
      {
        method: "Page.addScriptToEvaluateOnNewDocument",
        params: expect.objectContaining({ source: expect.stringContaining("__atlasConsentSweep") }),
        sessionId: "session-main"
      },
      {
        method: "Runtime.evaluate",
        params: expect.objectContaining({ expression: expect.stringContaining("__atlasConsentSweep") }),
        sessionId: "session-main"
      }
    ]);
  });

  it("rejects relative file upload paths", async () => {
    const { transport, runtime } = createRuntime();

    transport.queueResponse("DOM.resolveNode", { object: { objectId: "obj-file" } });

    await expect(
      executeFormInput(
        runtime,
        "tab-1",
        {
          fields: [
            {
              ref: "f0:506",
              kind: "file",
              value: "relative-upload.txt"
            }
          ]
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "FILE_PATH_INVALID",
      retryable: false
    });
  });

  it("returns per-step SENSITIVE_INPUT_BLOCKED when typing into a password field", async () => {
    const { transport, runtime } = createRuntime();

    transport.queueResponse("DOM.resolveNode", { object: { objectId: "obj-password" } });
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: {
          blocked: true,
          reason: "password_input"
        }
      }
    });

    const result = await executeComputerBatch(
      runtime,
      "tab-1",
      {
        steps: [
          {
            kind: "type",
            ref: "f0:700",
            text: "secret"
          }
        ]
      },
      new AbortController().signal
    );

    expect(result).toEqual({
      steps: [{ index: 0, ok: false, error_code: "SENSITIVE_INPUT_BLOCKED" }],
      completed_steps: 0
    });
  });

  it("rejects FormInput when a text field targets a password input", async () => {
    const { transport, runtime } = createRuntime();

    transport.queueResponse("DOM.resolveNode", { object: { objectId: "obj-password" } });
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: {
          blocked: true,
          reason: "password_input"
        }
      }
    });

    await expect(
      executeFormInput(
        runtime,
        "tab-1",
        {
          fields: [
            {
              ref: "f0:701",
              kind: "text",
              value: "secret"
            }
          ]
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "SENSITIVE_INPUT_BLOCKED",
      retryable: false
    });
  });

  it("returns REQUEST_ABORTED when batch starts with aborted signal", async () => {
    const { runtime } = createRuntime();
    const controller = new AbortController();
    controller.abort();

    await expect(
      executeComputerBatch(
        runtime,
        "tab-1",
        {
          steps: [{ kind: "key", key: "Enter" }]
        },
        controller.signal
      )
    ).rejects.toMatchObject({
      code: "REQUEST_ABORTED",
      retryable: true
    });
  });

  it("returns TARGET_CLOSE_FAILED when Target.closeTarget reports success=false", async () => {
    const { transport, runtime } = createRuntime();
    transport.queueResponse("Target.closeTarget", { success: false });

    await expect(
      executeTabOperation(
        runtime,
        "tab-1",
        {
          operation: "close",
          target_tab_id: "tab-1"
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "TARGET_CLOSE_FAILED",
      retryable: false
    });
  });

  it("uses the runtime group hook for real tab grouping", async () => {
    const { runtime } = createRuntime();
    const groupTabs = vi.fn(async (tabIds: string[], options?: { groupName?: string; groupColor?: string }) => ({
      tabIds,
      chromeTabIds: [11, 12],
      groupId: 7,
      groupName: options?.groupName ?? "Agent"
    }));
    runtime.groupTabs = groupTabs;

    await expect(
      executeTabOperation(
        runtime,
        "tab-1",
        {
          operation: "group",
          tab_ids: ["tab-1", "tab-2"],
          group_name: "New Tabs Group",
          group_color: "blue"
        },
        new AbortController().signal
      )
    ).resolves.toEqual({
      tab_id: "tab-1",
      status: "ok",
      group_name: "New Tabs Group",
      grouped_tabs: ["tab-1", "tab-2"]
    });

    expect(groupTabs).toHaveBeenCalledWith(["tab-1", "tab-2"], {
      groupName: "New Tabs Group",
      groupColor: "blue"
    });
  });

  it("returns TAB_GROUPING_UNAVAILABLE when no runtime group hook exists", async () => {
    const { runtime } = createRuntime();

    await expect(
      executeTabOperation(
        runtime,
        "tab-1",
        {
          operation: "group",
          tab_ids: ["tab-1"]
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "TAB_GROUPING_UNAVAILABLE",
      retryable: false
    });
  });

  it("uses the runtime ungroup hook for real tab ungrouping", async () => {
    const { runtime } = createRuntime();
    const ungroupTabs = vi.fn(async (tabIds: string[]) => ({
      tabIds,
      chromeTabIds: [11]
    }));
    runtime.ungroupTabs = ungroupTabs;

    await expect(
      executeTabOperation(
        runtime,
        "tab-1",
        {
          operation: "ungroup",
          target_tab_id: "tab-1"
        },
        new AbortController().signal
      )
    ).resolves.toEqual({
      tab_id: "tab-1",
      status: "ok"
    });

    expect(ungroupTabs).toHaveBeenCalledWith(["tab-1"]);
  });
});
