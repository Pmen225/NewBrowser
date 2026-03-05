import {
  createRealtimePolicyError,
  type DeploymentMode,
  type RealtimePolicyError,
  type WebSocketMode
} from "./provider-policy";

export interface DeploymentConfig {
  deploymentMode: DeploymentMode;
  webSocketMode: WebSocketMode;
  sseUrl: string;
  wsUrl: string;
  hostedProvider?: string;
}

export interface DeploymentConfigInput {
  deploymentMode?: DeploymentMode | string;
  webSocketMode?: WebSocketMode | string;
  sseUrl?: string;
  wsUrl?: string;
  hostedProvider?: string;
}

export interface NormalizeDeploymentConfigOptions {
  require?: "sse" | "ws" | "both";
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseDeploymentMode(value: unknown): DeploymentMode {
  if (value === undefined) {
    return "local";
  }

  if (value === "local" || value === "vercel") {
    return value;
  }

  throw createRealtimePolicyError(
    "INVALID_DEPLOYMENT_MODE",
    `Invalid deployment mode: ${String(value)}`,
    false,
    {
      deployment_mode: value,
      allowed_values: ["local", "vercel"]
    }
  );
}

function parseWebSocketMode(value: unknown): WebSocketMode {
  if (value === undefined) {
    return "direct";
  }

  if (value === "direct" || value === "hosted_provider") {
    return value;
  }

  throw createRealtimePolicyError(
    "INVALID_WEBSOCKET_MODE",
    `Invalid websocket mode: ${String(value)}`,
    false,
    {
      websocket_mode: value,
      allowed_values: ["direct", "hosted_provider"]
    }
  );
}

function requireUrl(value: string | undefined, code: string, message: string): string {
  if (value) {
    return value;
  }

  throw createRealtimePolicyError(code, message, false);
}

function assertAbsoluteProtocol(
  value: string,
  protocols: readonly string[],
  code: string,
  transport: "sse" | "ws"
): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw createRealtimePolicyError(code, `Invalid ${transport.toUpperCase()} URL: ${value}`, false, {
      url: value
    });
  }

  if (!protocols.includes(parsed.protocol)) {
    throw createRealtimePolicyError(code, `Invalid ${transport.toUpperCase()} URL protocol: ${parsed.protocol}`, false, {
      url: value,
      protocol: parsed.protocol,
      allowed_protocols: protocols
    });
  }

  return value;
}

function isRelativeSseUrl(value: string): boolean {
  return value.startsWith("/") || value.startsWith("./") || value.startsWith("../");
}

function assertSseUrl(value: string): string {
  if (isRelativeSseUrl(value)) {
    return value;
  }

  return assertAbsoluteProtocol(value, ["http:", "https:"], "INVALID_SSE_URL", "sse");
}

function assertWsUrl(value: string): string {
  return assertAbsoluteProtocol(value, ["ws:", "wss:"], "INVALID_WS_URL", "ws");
}

function normalizeHostedProvider(value: unknown): string | undefined {
  const provider = normalizeOptionalString(value);
  return provider?.toLowerCase();
}

export function normalizeDeploymentConfig(
  input: DeploymentConfigInput,
  options?: NormalizeDeploymentConfigOptions
): DeploymentConfig {
  const requireMode = options?.require ?? "both";
  const deploymentMode = parseDeploymentMode(input.deploymentMode);
  const webSocketMode = parseWebSocketMode(input.webSocketMode);
  const rawSseUrl = normalizeOptionalString(input.sseUrl);
  const rawWsUrl = normalizeOptionalString(input.wsUrl);

  if (requireMode === "sse" || requireMode === "both") {
    requireUrl(rawSseUrl, "MISSING_SSE_URL", "SSE URL is required");
  }

  if (requireMode === "ws" || requireMode === "both") {
    requireUrl(rawWsUrl, "MISSING_WS_URL", "WebSocket URL is required");
  }

  if (rawSseUrl) {
    assertSseUrl(rawSseUrl);
  }

  if (rawWsUrl) {
    assertWsUrl(rawWsUrl);
  }

  const sseUrl = rawSseUrl ?? "";
  const wsUrl = rawWsUrl ?? "";

  return {
    deploymentMode,
    webSocketMode,
    sseUrl,
    wsUrl,
    hostedProvider: normalizeHostedProvider(input.hostedProvider)
  };
}

export function isRealtimePolicyError(error: unknown): error is RealtimePolicyError {
  if (!error || typeof error !== "object") {
    return false;
  }

  const value = error as Partial<RealtimePolicyError>;
  return typeof value.code === "string" && typeof value.retryable === "boolean";
}
