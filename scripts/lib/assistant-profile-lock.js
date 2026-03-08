import { execFile as defaultExecFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function execFile(file, args) {
  return new Promise((resolve, reject) => {
    defaultExecFile(file, args, (error, stdout, stderr) => {
      if (error) {
        reject(Object.assign(error, { stdout, stderr }));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function writeJsonIfChanged(filePath, value, previous) {
  const nextText = JSON.stringify(value, null, 2);
  const previousText = previous === null ? null : JSON.stringify(previous, null, 2);
  if (nextText === previousText) {
    return false;
  }
  await writeFile(filePath, `${nextText}\n`, "utf8");
  return true;
}

function matchExtensionIdFromSettings(settings, extensionPath) {
  if (!isRecord(settings)) {
    return null;
  }

  const normalizedExtensionPath = path.resolve(extensionPath);
  for (const [extensionId, entry] of Object.entries(settings)) {
    if (!isRecord(entry)) {
      continue;
    }
    const installedPath = typeof entry.path === "string" ? path.resolve(entry.path) : "";
    if (installedPath === normalizedExtensionPath) {
      return extensionId;
    }
  }

  return null;
}

export function resolveAssistantExtensionId({
  preferences,
  securePreferences,
  extensionPath,
  explicitExtensionId
}) {
  const explicit = typeof explicitExtensionId === "string" ? explicitExtensionId.trim() : "";
  if (explicit) {
    return explicit;
  }

  const fromSecure = matchExtensionIdFromSettings(securePreferences?.extensions?.settings, extensionPath);
  if (fromSecure) {
    return fromSecure;
  }

  return matchExtensionIdFromSettings(preferences?.extensions?.settings, extensionPath);
}

export function applyAssistantPreferenceLock(preferences, extensionId) {
  const nextPreferences = cloneJson(preferences);
  const extensions = isRecord(nextPreferences.extensions) ? nextPreferences.extensions : {};
  const pinnedExtensions = Array.isArray(extensions.pinned_extensions)
    ? extensions.pinned_extensions.filter((value) => typeof value === "string" && value.trim().length > 0)
    : [];

  if (!pinnedExtensions.includes(extensionId)) {
    pinnedExtensions.unshift(extensionId);
  }

  nextPreferences.extensions = {
    ...extensions,
    pinned_extensions: [...new Set(pinnedExtensions)],
    ui: {
      ...(isRecord(extensions.ui) ? extensions.ui : {}),
      developer_mode: false
    }
  };

  return nextPreferences;
}

export function applyAssistantSecurePreferenceLock(securePreferences, extensionId, extensionPath) {
  const nextSecurePreferences = cloneJson(securePreferences);
  const extensions = isRecord(nextSecurePreferences.extensions) ? nextSecurePreferences.extensions : {};
  const settings = isRecord(extensions.settings) ? extensions.settings : {};
  const existingEntry = isRecord(settings[extensionId]) ? settings[extensionId] : {};

  nextSecurePreferences.extensions = {
    ...extensions,
    ui: {
      ...(isRecord(extensions.ui) ? extensions.ui : {}),
      developer_mode: false
    },
    settings: {
      ...settings,
      [extensionId]: {
        ...existingEntry,
        ...(typeof extensionPath === "string" && extensionPath.trim().length > 0 ? { path: path.resolve(extensionPath) } : {}),
        open_side_panel_on_icon_click: true,
        was_installed_by_default: true,
        was_installed_by_oem: false
      }
    }
  };

  return nextSecurePreferences;
}

export async function ensureProfileSearchEngine(profileRoot) {
  const webDataPath = path.join(profileRoot, "Default", "Web Data");
  const donorCandidates = process.platform === "darwin"
    ? [
        path.join(homedir(), "Library", "Application Support", "Google", "Chrome", "Default", "Web Data"),
        path.join(homedir(), "Library", "Application Support", "Chromium", "Default", "Web Data")
      ]
    : process.platform === "linux"
      ? [
          path.join(homedir(), ".config", "google-chrome", "Default", "Web Data"),
          path.join(homedir(), ".config", "chromium", "Default", "Web Data")
        ]
      : [];
  const script = `
import os, sqlite3, sys

db_path = sys.argv[1]
donor_paths = [value for value in sys.argv[2:] if value and os.path.exists(value)]
conn = sqlite3.connect(db_path, timeout=1)
cur = conn.cursor()
row = cur.execute("SELECT id, short_name, keyword, url FROM keywords WHERE id = 2").fetchone()
if not row:
    conn.close()
    print("missing")
    raise SystemExit(0)

short_name = (row[1] or "").strip().lower()
keyword = (row[2] or "").strip().lower()
url = row[3] or ""
needs_fix = short_name == "no search" or keyword == "nosearch" or "{searchTerms}" not in url

if not needs_fix:
    conn.close()
    print("unchanged")
    raise SystemExit(0)

copied = False
for donor_path in donor_paths:
    try:
        conn.execute("ATTACH DATABASE ? AS donor", (donor_path,))
        donor_row = conn.execute("SELECT * FROM donor.keywords WHERE id = 2").fetchone()
        if donor_row:
            columns = [info[1] for info in conn.execute("PRAGMA donor.table_info(keywords)") if info[1] != "id"]
            assignments = ", ".join(f"{column} = ?" for column in columns)
            values = donor_row[1:]
            conn.execute(f"UPDATE keywords SET {assignments} WHERE id = 2", values)
            conn.execute("DETACH DATABASE donor")
            copied = True
            break
        conn.execute("DETACH DATABASE donor")
    except Exception:
        try:
            conn.execute("DETACH DATABASE donor")
        except Exception:
            pass

if copied:
    conn.commit()
    conn.close()
    print("updated")
    raise SystemExit(0)

cur.execute(
    """
    UPDATE keywords
       SET short_name = ?,
           keyword = ?,
           favicon_url = ?,
           url = ?,
           safe_for_autoreplace = 1,
           originating_url = '',
           input_encodings = 'UTF-8',
           suggest_url = ?,
           prepopulate_id = 1,
           alternate_urls = ?,
           search_url_post_params = '',
           suggest_url_post_params = '',
           image_url = '',
           image_url_post_params = '',
           new_tab_url = ''
     WHERE id = 2
    """,
    (
        "Google",
        "google.com",
        "https://www.google.com/images/branding/product/ico/googleg_alldp.ico",
        "https://www.google.com/search?q={searchTerms}",
        "https://www.google.com/complete/search?client=chrome&q={searchTerms}",
        '["https://www.google.com/#q={searchTerms}","https://www.google.com/search#q={searchTerms}"]'
    )
)
conn.commit()
conn.close()
print("updated")
`;

  try {
    const { stdout } = await execFile("python3", ["-c", script, webDataPath, ...donorCandidates]);
    return stdout.includes("updated");
  } catch {
    return false;
  }
}

export async function hardenAssistantProfile({
  profileRoot,
  extensionPath,
  explicitExtensionId
}) {
  const preferencesPath = path.join(profileRoot, "Default", "Preferences");
  const securePreferencesPath = path.join(profileRoot, "Default", "Secure Preferences");
  const preferences = await readJson(preferencesPath);
  const securePreferences = await readJson(securePreferencesPath);
  const extensionId = resolveAssistantExtensionId({
    preferences,
    securePreferences,
    extensionPath,
    explicitExtensionId
  });

  if (!extensionId) {
    return {
      applied: false,
      extensionId: null,
      preferencesChanged: false,
      securePreferencesChanged: false
    };
  }

  const nextPreferences = applyAssistantPreferenceLock(preferences, extensionId);
  const nextSecurePreferences = applyAssistantSecurePreferenceLock(securePreferences, extensionId, extensionPath);
  await ensureProfileSearchEngine(profileRoot);

  return {
    applied: true,
    extensionId,
    preferencesChanged: await writeJsonIfChanged(preferencesPath, nextPreferences, preferences),
    securePreferencesChanged: await writeJsonIfChanged(securePreferencesPath, nextSecurePreferences, securePreferences)
  };
}
