import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  applyAssistantPreferenceLock,
  applyAssistantSecurePreferenceLock,
  hardenAssistantProfile,
  resolveAssistantExtensionId
} from "../../scripts/lib/assistant-profile-lock.js";

describe("assistant profile lock", () => {
  it("pins the assistant and disables developer mode in Preferences", () => {
    expect(
      applyAssistantPreferenceLock(
        {
          extensions: {
            pinned_extensions: ["other-extension"]
          }
        },
        "assistant-extension"
      )
    ).toEqual({
      extensions: {
        pinned_extensions: ["assistant-extension", "other-extension"],
        ui: {
          developer_mode: false
        }
      }
    });
  });

  it("locks the secure preferences entry for the assistant", () => {
    expect(
      applyAssistantSecurePreferenceLock(
        {
          extensions: {
            ui: {
              developer_mode: true
            },
            settings: {
              "assistant-extension": {
                open_side_panel_on_icon_click: false,
                was_installed_by_default: false
              }
            }
          }
        },
        "assistant-extension",
        "/tmp/assistant-extension"
      )
    ).toEqual({
      extensions: {
        ui: {
          developer_mode: false
        },
        settings: {
          "assistant-extension": {
            open_side_panel_on_icon_click: true,
            path: "/tmp/assistant-extension",
            was_installed_by_default: true,
            was_installed_by_oem: false
          }
        }
      }
    });
  });

  it("resolves the assistant extension id by matching the installed path", () => {
    expect(
      resolveAssistantExtensionId({
        preferences: null,
        securePreferences: {
          extensions: {
            settings: {
              abc123: {
                path: "/tmp/other"
              },
              assistantid: {
                path: "/tmp/assistant"
              }
            }
          }
        },
        extensionPath: "/tmp/assistant"
      })
    ).toBe("assistantid");
  });

  it("writes the hardened preference files for an existing profile", async () => {
    const profileRoot = mkdtempSync(path.join(tmpdir(), "assistant-profile-lock-"));
    const defaultDir = path.join(profileRoot, "Default");
    mkdirSync(defaultDir, { recursive: true });

    writeFileSync(
      path.join(defaultDir, "Preferences"),
      JSON.stringify(
        {
          extensions: {
            pinned_extensions: []
          }
        },
        null,
        2
      )
    );
    writeFileSync(
      path.join(defaultDir, "Secure Preferences"),
      JSON.stringify(
        {
          extensions: {
            ui: {
              developer_mode: true
            },
            settings: {
              assistantid: {
                path: "/tmp/assistant",
                open_side_panel_on_icon_click: false,
                was_installed_by_default: false
              }
            }
          }
        },
        null,
        2
      )
    );

    const result = await hardenAssistantProfile({
      profileRoot,
      extensionPath: "/tmp/assistant"
    });

    expect(result).toEqual({
      applied: true,
      extensionId: "assistantid",
      preferencesChanged: true,
      securePreferencesChanged: true
    });

    expect(JSON.parse(readFileSync(path.join(defaultDir, "Preferences"), "utf8"))).toMatchObject({
      extensions: {
        pinned_extensions: ["assistantid"],
        ui: {
          developer_mode: false
        }
      }
    });

    expect(JSON.parse(readFileSync(path.join(defaultDir, "Secure Preferences"), "utf8"))).toMatchObject({
      extensions: {
        ui: {
          developer_mode: false
        },
        settings: {
          assistantid: {
            open_side_panel_on_icon_click: true,
            path: "/tmp/assistant",
            was_installed_by_default: true
          }
        }
      }
    });
  });
});
