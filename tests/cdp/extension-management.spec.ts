import { describe, expect, it } from "vitest";

import { BrowserActionError } from "../../src/cdp/browser-actions";
import { manageExtensionsViaExtensionContext } from "../../sidecar/src/cdp/extension-management";
import { FakeTransport } from "./helpers/fake-transport";

describe("extension management bridge", () => {
  it("lists extensions through the extension context without leaking the protected-id lookup", async () => {
    const transport = new FakeTransport();
    transport.queueResponse("Target.getTargets", {
      targetInfos: [
        {
          targetId: "extension-worker",
          type: "service_worker",
          url: "chrome-extension://assistant-id/background.js",
          title: ""
        }
      ]
    });
    transport.queueResponse("Target.attachToTarget", {
      sessionId: "session-1"
    });
    transport.queueResponse("Runtime.evaluate", {
      result: {
        value: {
          ok: true,
          operation: "list",
          extensions: [
            {
              id: "assistant-id",
              name: "Atlas",
              enabled: true,
              isProtected: true
            }
          ]
        }
      }
    });
    transport.queueResponse("Target.detachFromTarget", {});

    await expect(
      manageExtensionsViaExtensionContext(transport, {
        operation: "list"
      })
    ).resolves.toMatchObject({
      status: "ok",
      operation: "list",
      extensions: [
        {
          id: "assistant-id",
          name: "Atlas",
          enabled: true,
          isProtected: true
        }
      ]
    });
  });

  it("protects the Assistant extension from disable and uninstall operations", async () => {
    const transport = new FakeTransport();
    transport.queueResponse("Target.getTargets", {
      targetInfos: [
        {
          targetId: "extension-worker",
          type: "service_worker",
          url: "chrome-extension://assistant-id/background.js",
          title: ""
        }
      ]
    });

    await expect(
      manageExtensionsViaExtensionContext(transport, {
        operation: "disable",
        extensionId: "assistant-id"
      })
    ).rejects.toBeInstanceOf(BrowserActionError);

    await expect(
      manageExtensionsViaExtensionContext(transport, {
        operation: "uninstall",
        extensionId: "assistant-id"
      })
    ).rejects.toMatchObject({
      code: "ASSISTANT_EXTENSION_PROTECTED"
    });
  });
});
