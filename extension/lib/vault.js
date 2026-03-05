export const VAULT_STORAGE_KEY = "new-browser.byok.v1";
export const LEGACY_VAULT_STORAGE_KEY = "comet.byok.v1";
export const VAULT_VERSION = 1;
export const VAULT_ITERATIONS = 310000;
export const DEFAULT_AUTO_LOCK_MS = 600000;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function createMemoryStorageAdapter(initialValue) {
  const state = new Map();
  if (initialValue !== undefined) {
    state.set(VAULT_STORAGE_KEY, initialValue);
  }
  return {
    async get(key) {
      return state.get(key);
    },
    async set(key, value) {
      state.set(key, value);
    }
  };
}

export function createChromeStorageAdapter() {
  const area = chrome.storage.local;
  return {
    async get(key) {
      const result = await area.get(key);
      return result[key];
    },
    async set(key, value) {
      await area.set({
        [key]: value
      });
    }
  };
}

function toBase64(bytes) {
  let binary = "";
  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }

  if (typeof btoa === "function") {
    return btoa(binary);
  }

  return Buffer.from(binary, "binary").toString("base64");
}

function fromBase64(value) {
  const binary = typeof atob === "function" ? atob(value) : Buffer.from(value, "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function assertProvider(provider) {
  if (provider !== "openai" && provider !== "anthropic" && provider !== "google" && provider !== "deepseek") {
    throw new Error(`Unsupported provider: ${String(provider)}`);
  }
}

function normalizeVault(rawVault) {
  if (!rawVault || typeof rawVault !== "object") {
    return {
      version: VAULT_VERSION,
      providers: {},
      auto_lock_ms: DEFAULT_AUTO_LOCK_MS
    };
  }

  const root = rawVault;
  return {
    version: VAULT_VERSION,
    providers: root.providers && typeof root.providers === "object" ? root.providers : {},
    auto_lock_ms:
      typeof root.auto_lock_ms === "number" && Number.isFinite(root.auto_lock_ms) && root.auto_lock_ms > 0
        ? Math.floor(root.auto_lock_ms)
        : DEFAULT_AUTO_LOCK_MS
  };
}

async function deriveAesKey(passphrase, salt, iterations) {
  const material = await crypto.subtle.importKey("raw", textEncoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256"
    },
    material,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptApiKey(apiKey, passphrase) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveAesKey(passphrase, salt, VAULT_ITERATIONS);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    textEncoder.encode(apiKey)
  );

  return {
    encrypted_key_b64: toBase64(new Uint8Array(ciphertext)),
    iv_b64: toBase64(iv),
    salt_b64: toBase64(salt)
  };
}

async function decryptApiKey(entry, passphrase) {
  try {
    const iv = fromBase64(entry.iv_b64);
    const salt = fromBase64(entry.salt_b64);
    const ciphertext = fromBase64(entry.encrypted_key_b64);
    const key = await deriveAesKey(passphrase, salt, entry.iterations);
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      ciphertext
    );

    return textDecoder.decode(plaintext);
  } catch {
    const error = new Error("Invalid passphrase or corrupted vault entry");
    error.code = "VAULT_DECRYPT_FAILED";
    throw error;
  }
}

export async function readVault(storage = createChromeStorageAdapter()) {
  const raw = await storage.get(VAULT_STORAGE_KEY);
  if (raw !== undefined) {
    return normalizeVault(raw);
  }

  const legacy = await storage.get(LEGACY_VAULT_STORAGE_KEY);
  if (legacy === undefined) {
    return normalizeVault(undefined);
  }

  const normalized = normalizeVault(legacy);
  await storage.set(VAULT_STORAGE_KEY, normalized);
  return normalized;
}

export async function writeVault(vault, storage = createChromeStorageAdapter()) {
  const normalized = normalizeVault(vault);
  await storage.set(VAULT_STORAGE_KEY, normalized);
  return normalized;
}

export async function upsertProviderEntry(
  {
    provider,
    apiKey,
    passphrase,
    baseUrl,
    preferredModel,
    autoLockMs
  },
  storage = createChromeStorageAdapter()
) {
  assertProvider(provider);
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    throw new Error("apiKey is required");
  }
  if (typeof passphrase !== "string" || passphrase.length === 0) {
    throw new Error("passphrase is required");
  }

  const vault = await readVault(storage);
  const encrypted = await encryptApiKey(apiKey, passphrase);
  const now = new Date().toISOString();
  const existing = vault.providers[provider];

  vault.providers[provider] = {
    provider,
    encrypted_key_b64: encrypted.encrypted_key_b64,
    iv_b64: encrypted.iv_b64,
    salt_b64: encrypted.salt_b64,
    kdf: "PBKDF2-SHA256",
    iterations: VAULT_ITERATIONS,
    created_at: existing ? existing.created_at : now,
    updated_at: now,
    base_url: typeof baseUrl === "string" && baseUrl.trim().length > 0 ? baseUrl.trim() : undefined,
    preferred_model: typeof preferredModel === "string" && preferredModel.trim().length > 0 ? preferredModel.trim() : undefined
  };

  if (typeof autoLockMs === "number" && Number.isFinite(autoLockMs) && autoLockMs > 0) {
    vault.auto_lock_ms = Math.floor(autoLockMs);
  }

  await writeVault(vault, storage);
  return vault;
}

export async function unlockProviderEntry({ provider, passphrase }, storage = createChromeStorageAdapter()) {
  assertProvider(provider);
  if (typeof passphrase !== "string" || passphrase.length === 0) {
    throw new Error("passphrase is required");
  }

  const vault = await readVault(storage);
  const entry = vault.providers[provider];
  if (!entry) {
    const error = new Error(`No vault entry for provider: ${provider}`);
    error.code = "VAULT_ENTRY_NOT_FOUND";
    throw error;
  }

  const apiKey = await decryptApiKey(entry, passphrase);
  return {
    provider,
    apiKey,
    baseUrl: entry.base_url,
    preferredModel: entry.preferred_model,
    autoLockMs: vault.auto_lock_ms
  };
}
