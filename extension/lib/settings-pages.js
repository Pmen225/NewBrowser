export const DEFAULT_SETTINGS_PAGE_ID = "general";

const SETTINGS_PAGE_ALIASES = {
  provider: "general-providers",
  providers: "general-providers",
  models: "general-models",
  data: "data-controls",
  chats: "data-controls-chats",
  commands: "agent-mode-commands",
  advanced: "agent-mode-runtime",
  agent: "dev",
  "agent-mode": "dev"
};

const KNOWN_SETTINGS_PAGE_IDS = new Set([
  "general",
  "general-providers",
  "general-models",
  "web-browsing",
  "personalization",
  "personalization-voice",
  "personalization-memory",
  "data-controls",
  "data-controls-chats",
  "dev",
  "agent-mode-runtime",
  "agent-mode-commands"
]);

const DEV_SETTINGS_PAGE_IDS = new Set([
  "dev",
  "agent-mode-runtime",
  "agent-mode-commands"
]);

export function isDevSettingsPage(value) {
  const id = typeof value === "string" ? value.trim().toLowerCase() : "";
  return DEV_SETTINGS_PAGE_IDS.has(id);
}

export function resolveSettingsPageId(value, options = {}) {
  const developerModeEnabled = options?.developerModeEnabled === true;
  const rawId = typeof value === "string" ? value.trim().toLowerCase() : "";
  const normalisedId = SETTINGS_PAGE_ALIASES[rawId] || rawId || DEFAULT_SETTINGS_PAGE_ID;

  if (!KNOWN_SETTINGS_PAGE_IDS.has(normalisedId)) {
    return DEFAULT_SETTINGS_PAGE_ID;
  }

  if (!developerModeEnabled && DEV_SETTINGS_PAGE_IDS.has(normalisedId)) {
    return DEFAULT_SETTINGS_PAGE_ID;
  }

  return normalisedId;
}
