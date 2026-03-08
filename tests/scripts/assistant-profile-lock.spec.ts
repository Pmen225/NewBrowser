import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  applyAssistantPreferenceLock,
  applyAssistantSecurePreferenceLock,
  ensureProfileSearchEngine,
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

  it("replaces Chromium's no-search placeholder with a real default search engine", async () => {
    const profileRoot = mkdtempSync(path.join(tmpdir(), "assistant-profile-search-"));
    const defaultDir = path.join(profileRoot, "Default");
    mkdirSync(defaultDir, { recursive: true });
    const webDataPath = path.join(defaultDir, "Web Data");

    execFileSync("python3", ["-c", `
import sqlite3, sys
conn = sqlite3.connect(sys.argv[1])
cur = conn.cursor()
cur.execute("CREATE TABLE keywords (id INTEGER PRIMARY KEY, short_name VARCHAR NOT NULL, keyword VARCHAR NOT NULL, favicon_url VARCHAR NOT NULL, url VARCHAR NOT NULL, safe_for_autoreplace INTEGER, originating_url VARCHAR, date_created INTEGER DEFAULT 0, usage_count INTEGER DEFAULT 0, input_encodings VARCHAR, suggest_url VARCHAR, prepopulate_id INTEGER DEFAULT 0, created_by_policy INTEGER DEFAULT 0, last_modified INTEGER DEFAULT 0, sync_guid VARCHAR, alternate_urls VARCHAR, image_url VARCHAR, search_url_post_params VARCHAR, suggest_url_post_params VARCHAR, image_url_post_params VARCHAR, new_tab_url VARCHAR, last_visited INTEGER DEFAULT 0, created_from_play_api INTEGER DEFAULT 0, is_active INTEGER DEFAULT 0, starter_pack_id INTEGER DEFAULT 0, enforced_by_policy INTEGER DEFAULT 0, featured_by_policy INTEGER DEFAULT 0, url_hash BLOB)")
cur.execute("INSERT INTO keywords (id, short_name, keyword, favicon_url, url, safe_for_autoreplace, prepopulate_id) VALUES (2, 'No Search', 'nosearch', '', 'http://{searchTerms}', 1, 1)")
conn.commit()
conn.close()
`, webDataPath]);

    const changed = await ensureProfileSearchEngine(profileRoot);

    expect(changed).toBe(true);

    const row = execFileSync("python3", ["-c", `
import sqlite3, sys, json
conn = sqlite3.connect(sys.argv[1])
cur = conn.cursor()
row = cur.execute("SELECT short_name, keyword, url, suggest_url FROM keywords WHERE id = 2").fetchone()
conn.close()
print(json.dumps(row))
`, webDataPath], { encoding: "utf8" }).trim();

    expect(JSON.parse(row)).toEqual([
      "Google",
      "google.com",
      "https://www.google.com/search?q={searchTerms}",
      "https://www.google.com/complete/search?client=chrome&q={searchTerms}"
    ]);
  });
});
