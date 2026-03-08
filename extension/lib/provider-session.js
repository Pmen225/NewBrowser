export const PROVIDER_SESSION_STORAGE_KEY = "ui.session.unlockedProviders";

export function normalizeProviderId(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "gemini") {
    return "google";
  }
  return normalized;
}

function wrapChromeArea(area) {
  if (!area || (typeof area.get !== "function" && typeof area.set !== "function")) {
    return null;
  }
  const get = (key) =>
    new Promise((resolve) => {
      if (typeof area.get === "function") {
        area.get(key, (value) => resolve(value));
        return;
      }
      resolve({});
    });
  const set = (obj) =>
    new Promise((resolve) => {
      if (typeof area.set === "function") {
        area.set(obj, () => resolve());
        return;
      }
      resolve();
    });
  return { get, set };
}

function getPersistentStorageArea() {
  // Use local storage (persistent) so keys survive browser restarts.
  const wrappedLocal = wrapChromeArea(globalThis.chrome?.storage?.local);
  if (wrappedLocal) {
    return wrappedLocal;
  }

  const wrappedSession = wrapChromeArea(globalThis.chrome?.storage?.session);
  if (wrappedSession) {
    return wrappedSession;
  }

  if (typeof globalThis.localStorage === "object" && globalThis.localStorage !== null) {
    return {
      async get(key) {
        const raw = globalThis.localStorage.getItem(key);
        return raw ? { [key]: JSON.parse(raw) } : {};
      },
      async set(obj) {
        for (const [key, value] of Object.entries(obj)) {
          globalThis.localStorage.setItem(key, JSON.stringify(value));
        }
      }
    };
  }

  return null;
}

export async function readUnlockedProviders(area = getPersistentStorageArea()) {
  if (!area) {
    return [];
  }

  const payload = await area.get(PROVIDER_SESSION_STORAGE_KEY);
  const raw = payload?.[PROVIDER_SESSION_STORAGE_KEY];
  if (!raw || typeof raw !== "object") {
    return [];
  }

  const normalized = [];
  for (const entry of Object.values(raw)) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const provider = normalizeProviderId(entry.provider);
    const apiKey = typeof entry.apiKey === "string" ? entry.apiKey.trim() : "";
    if (!provider || !apiKey) {
      continue;
    }
    normalized.push({
      provider,
      apiKey,
      baseUrl: typeof entry.baseUrl === "string" ? entry.baseUrl.trim() : "",
      preferredModel: typeof entry.preferredModel === "string" ? entry.preferredModel.trim() : "",
      unlockedAt: typeof entry.unlockedAt === "string" ? entry.unlockedAt : new Date().toISOString()
    });
  }

  return normalized.sort((left, right) => left.provider.localeCompare(right.provider));
}

export async function rememberUnlockedProviderSession(entry, area = getPersistentStorageArea()) {
  if (!area || !entry || typeof entry !== "object" || typeof entry.apiKey !== "string") {
    return;
  }

  const provider = normalizeProviderId(entry.provider);
  const apiKey = entry.apiKey.trim();
  if (!provider || !apiKey) {
    return;
  }

  const current = await readUnlockedProviders(area);
  const next = Object.create(null);
  for (const item of current) {
    if (normalizeProviderId(item.provider) !== provider) {
      next[item.provider] = item;
    }
  }
  next[provider] = {
    provider,
    apiKey,
    baseUrl: typeof entry.baseUrl === "string" ? entry.baseUrl : "",
    preferredModel: typeof entry.preferredModel === "string" ? entry.preferredModel : "",
    unlockedAt: new Date().toISOString()
  };

  await area.set({
    [PROVIDER_SESSION_STORAGE_KEY]: next
  });
}

export async function forgetUnlockedProviderSession(provider, area = getPersistentStorageArea()) {
  const normalizedProvider = normalizeProviderId(provider);
  if (!area || !normalizedProvider) {
    return;
  }

  const current = await readUnlockedProviders(area);
  const next = Object.create(null);
  for (const item of current) {
    if (normalizeProviderId(item.provider) !== normalizedProvider) {
      next[item.provider] = item;
    }
  }

  await area.set({
    [PROVIDER_SESSION_STORAGE_KEY]: next
  });
}
