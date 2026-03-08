import { describe, expect, it } from "vitest";

import { summarizeExtensionPresence } from "../../sidecar/src/extension-presence";

describe("extension presence", () => {
  it("treats a profile-installed extension as loaded even without a live target", () => {
    expect(
      summarizeExtensionPresence({
        targetInfos: [],
        installedExtensionId: "fccmflajnbbikgcalbpnfangabhgaced"
      })
    ).toMatchObject({
      loaded: true,
      targetDetected: false,
      installed: true,
      extensionId: "fccmflajnbbikgcalbpnfangabhgaced",
      detectionSource: "profile"
    });
  });

  it("prefers live targets when they are present", () => {
    expect(
      summarizeExtensionPresence({
        targetInfos: [
          {
            targetId: "target-1",
            type: "service_worker",
            url: "chrome-extension://fccmflajnbbikgcalbpnfangabhgaced/background.js"
          }
        ],
        installedExtensionId: "fccmflajnbbikgcalbpnfangabhgaced"
      })
    ).toMatchObject({
      loaded: true,
      targetDetected: true,
      installed: true,
      extensionId: "fccmflajnbbikgcalbpnfangabhgaced",
      detectionSource: "targets"
    });
  });
});
