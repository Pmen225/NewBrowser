import { describe, expect, it } from "vitest";

import {
  DEFAULT_AUTO_LOCK_MS,
  LEGACY_VAULT_STORAGE_KEY,
  VAULT_STORAGE_KEY,
  VAULT_ITERATIONS,
  createMemoryStorageAdapter,
  readVault,
  unlockProviderEntry,
  upsertProviderEntry
} from "../../extension/lib/vault.js";

describe("extension vault", () => {
  it("encrypts and decrypts provider keys", async () => {
    const storage = createMemoryStorageAdapter();

    await upsertProviderEntry(
      {
        provider: "openai",
        apiKey: "sk-openai-test",
        passphrase: "correct horse battery staple",
        baseUrl: "https://api.openai.com/v1",
        preferredModel: "gpt-4.1-mini"
      },
      storage
    );

    const vault = await readVault(storage);
    expect(vault.version).toBe(1);
    expect(vault.auto_lock_ms).toBe(DEFAULT_AUTO_LOCK_MS);
    expect(vault.providers.openai).toMatchObject({
      provider: "openai",
      kdf: "PBKDF2-SHA256",
      iterations: VAULT_ITERATIONS,
      base_url: "https://api.openai.com/v1",
      preferred_model: "gpt-4.1-mini"
    });
    expect(vault.providers.openai?.encrypted_key_b64).not.toContain("sk-openai-test");

    const unlocked = await unlockProviderEntry(
      {
        provider: "openai",
        passphrase: "correct horse battery staple"
      },
      storage
    );

    expect(unlocked).toEqual({
      provider: "openai",
      apiKey: "sk-openai-test",
      baseUrl: "https://api.openai.com/v1",
      preferredModel: "gpt-4.1-mini",
      autoLockMs: DEFAULT_AUTO_LOCK_MS
    });
  });

  it("fails decryption with wrong passphrase", async () => {
    const storage = createMemoryStorageAdapter();

    await upsertProviderEntry(
      {
        provider: "anthropic",
        apiKey: "sk-ant-test",
        passphrase: "passphrase-1"
      },
      storage
    );

    await expect(
      unlockProviderEntry(
        {
          provider: "anthropic",
          passphrase: "wrong-passphrase"
        },
        storage
      )
    ).rejects.toMatchObject({
      code: "VAULT_DECRYPT_FAILED"
    });
  });

  it("migrates legacy Comet vault key into new New Browser key", async () => {
    const map = new Map<string, unknown>();
    const storage = {
      async get(key: string) {
        return map.get(key);
      },
      async set(key: string, value: unknown) {
        map.set(key, value);
      }
    };

    map.set(LEGACY_VAULT_STORAGE_KEY, {
      version: 1,
      providers: {
        deepseek: {
          provider: "deepseek",
          encrypted_key_b64: "cipher",
          iv_b64: "iv",
          salt_b64: "salt",
          kdf: "PBKDF2-SHA256",
          iterations: 310000,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z"
        }
      },
      auto_lock_ms: DEFAULT_AUTO_LOCK_MS
    });

    const migrated = await readVault(storage);
    expect(migrated.providers.deepseek?.provider).toBe("deepseek");
    expect(await storage.get(VAULT_STORAGE_KEY)).toEqual(migrated);
    expect(await storage.get(LEGACY_VAULT_STORAGE_KEY)).toBeDefined();
  });
});
