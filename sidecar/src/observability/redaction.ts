import type { JsonObject } from "../../../shared/src/transport";

const REDACTED = "[REDACTED]";

function isSensitiveKey(key: string): boolean {
  const normalized = key.trim().toLowerCase();
  return (
    normalized === "api_key" ||
    normalized === "x-api-key" ||
    normalized === "authorization" ||
    normalized === "apikey" ||
    normalized === "api-key" ||
    normalized === "key" ||
    normalized === "token" ||
    normalized.endsWith("_api_key") ||
    normalized.endsWith("_token") ||
    normalized.endsWith("_secret")
  );
}

function redactSensitiveQueryParams(value: string): string {
  try {
    const url = new URL(value);
    let changed = false;
    for (const key of url.searchParams.keys()) {
      if (isSensitiveKey(key)) {
        url.searchParams.set(key, REDACTED);
        changed = true;
      }
    }
    return changed ? url.toString() : value;
  } catch {
    return value;
  }
}

function redactUnknown(value: unknown): unknown {
  if (typeof value === "string") {
    return redactSensitiveQueryParams(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactUnknown(item));
  }

  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(input)) {
      if (isSensitiveKey(key)) {
        output[key] = REDACTED;
      } else {
        output[key] = redactUnknown(item);
      }
    }
    return output;
  }

  return value;
}

export function redactSensitiveJson(value: JsonObject | undefined): JsonObject | undefined {
  if (!value) {
    return undefined;
  }

  return redactUnknown(value) as JsonObject;
}
