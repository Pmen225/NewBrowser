export const VAULT_STORAGE_KEY: string;
export const LEGACY_VAULT_STORAGE_KEY: string;
export const VAULT_VERSION: number;
export const VAULT_ITERATIONS: number;
export const DEFAULT_AUTO_LOCK_MS: number;

export interface VaultProviderEntry {
  provider: "openai" | "anthropic" | "google" | "deepseek";
  encrypted_key_b64: string;
  iv_b64: string;
  salt_b64: string;
  kdf: "PBKDF2-SHA256";
  iterations: number;
  created_at: string;
  updated_at: string;
  base_url?: string;
  preferred_model?: string;
}

export interface VaultRecord {
  version: 1;
  providers: Partial<Record<"openai" | "anthropic" | "google" | "deepseek", VaultProviderEntry>>;
  auto_lock_ms: number;
}

export interface VaultStorageAdapter {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

export function createMemoryStorageAdapter(initialValue?: unknown): VaultStorageAdapter;
export function createChromeStorageAdapter(): VaultStorageAdapter;
export function readVault(storage?: VaultStorageAdapter): Promise<VaultRecord>;
export function writeVault(vault: VaultRecord, storage?: VaultStorageAdapter): Promise<VaultRecord>;
export function upsertProviderEntry(
  input: {
    provider: "openai" | "anthropic" | "google" | "deepseek";
    apiKey: string;
    passphrase: string;
    baseUrl?: string;
    preferredModel?: string;
    autoLockMs?: number;
  },
  storage?: VaultStorageAdapter
): Promise<VaultRecord>;
export function unlockProviderEntry(
  input: {
    provider: "openai" | "anthropic" | "google" | "deepseek";
    passphrase: string;
  },
  storage?: VaultStorageAdapter
): Promise<{
  provider: "openai" | "anthropic" | "google" | "deepseek";
  apiKey: string;
  baseUrl?: string;
  preferredModel?: string;
  autoLockMs: number;
}>;
