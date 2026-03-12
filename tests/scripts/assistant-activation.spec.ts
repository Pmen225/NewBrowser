import { describe, expect, it, vi } from "vitest";

import {
  findAssistantServiceWorkerTarget,
  isAssistantServiceWorkerMissingError,
  openAssistantSidePanel,
  waitForSidecarHealth
} from "../../scripts/lib/assistant-activation.js";

describe("assistant activation", () => {
  it("waits until the sidecar health endpoint returns ok", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        ok: true,
        async json() {
          return { ok: true, extension_loaded: true };
        }
      });

    await expect(waitForSidecarHealth({
      healthUrl: "http://127.0.0.1:3210/health",
      timeoutMs: 50,
      pollMs: 1,
      fetchImpl
    })).resolves.toEqual({ ok: true, extension_loaded: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("finds the Assistant background service worker target", () => {
    expect(findAssistantServiceWorkerTarget([
      { type: "page", url: "chrome-extension://abc/panel.html" },
      { type: "service_worker", url: "chrome-extension://abc/background.js", targetId: "sw-1" }
    ])).toEqual({
      type: "service_worker",
      url: "chrome-extension://abc/background.js",
      targetId: "sw-1"
    });
  });

  it("classifies the missing service-worker target error", () => {
    expect(isAssistantServiceWorkerMissingError(new Error("Assistant extension service worker target was not found."))).toBe(true);
    expect(isAssistantServiceWorkerMissingError(new Error("other failure"))).toBe(false);
  });

  it("falls back to opening the panel page when sidePanel.open requires a user gesture", async () => {
    class FakeWebSocket {
      constructor() {
        this.handlers = new Map();
        queueMicrotask(() => this.handlers.get("open")?.());
      }

      once(event, handler) {
        this.handlers.set(event, handler);
      }

      on(event, handler) {
        this.handlers.set(event, handler);
      }

      send(raw) {
        const message = JSON.parse(String(raw));
        const respond = (result) => {
          queueMicrotask(() => this.handlers.get("message")?.(JSON.stringify({
            id: message.id,
            result
          })));
        };

        if (message.method === "Target.getTargets") {
          respond({
            targetInfos: [
              {
                type: "service_worker",
                url: "chrome-extension://abc/background.js",
                targetId: "sw-1"
              }
            ]
          });
          return;
        }

        if (message.method === "Target.attachToTarget") {
          respond({ sessionId: "session-1" });
          return;
        }

        if (message.method === "Runtime.enable") {
          respond({});
          return;
        }

        if (message.method === "Runtime.evaluate") {
          const isFallback = String(message.params?.expression || "").includes("chrome.tabs.create");
          respond(isFallback
            ? {
                result: {
                  type: "object",
                  value: { ok: true, mode: "panel_tab", tabId: 7, url: "chrome-extension://abc/panel.html" }
                }
              }
            : {
                result: { type: "object", value: {} },
                exceptionDetails: {
                  text: "Uncaught (in promise) Error: `sidePanel.open()` may only be called in response to a user gesture."
                }
              });
          return;
        }

        throw new Error(`Unexpected CDP method in test: ${message.method}`);
      }

      close() {}
    }

    await expect(openAssistantSidePanel({
      browserWsUrl: "ws://127.0.0.1:9555/devtools/browser/test",
      wsImpl: FakeWebSocket
    })).resolves.toEqual({
      ok: true,
      mode: "panel_tab",
      tabId: 7,
      url: "chrome-extension://abc/panel.html"
    });
  });
});
