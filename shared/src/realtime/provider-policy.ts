export type DeploymentMode = "local" | "vercel";
export type WebSocketMode = "direct" | "hosted_provider";

const VERCEL_HOSTED_PROVIDER_RECOMMENDATIONS = [
  "Ably",
  "PartyKit",
  "Pusher",
  "PubNub",
  "Firebase Realtime Database",
  "Supabase Realtime"
] as const;

export type HostedWebSocketProvider = (typeof VERCEL_HOSTED_PROVIDER_RECOMMENDATIONS)[number];

export interface RealtimePolicy {
  mode: DeploymentMode;
  allowsSse: boolean;
  allowsDirectWebSocket: boolean;
  recommendedHostedProviders: readonly HostedWebSocketProvider[];
  guidance: string;
}

export interface RealtimePolicyError extends Error {
  code: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export function createRealtimePolicyError(
  code: string,
  message: string,
  retryable: boolean,
  details?: Record<string, unknown>
): RealtimePolicyError {
  const error = new Error(message) as RealtimePolicyError;
  error.code = code;
  error.retryable = retryable;
  error.details = details;
  return error;
}

export function resolveRealtimePolicy(mode: DeploymentMode): RealtimePolicy {
  if (mode === "vercel") {
    return {
      mode,
      allowsSse: true,
      allowsDirectWebSocket: false,
      recommendedHostedProviders: VERCEL_HOSTED_PROVIDER_RECOMMENDATIONS,
      guidance: "Direct WebSocket upgrades are not available on Vercel Functions; use a hosted realtime provider."
    };
  }

  return {
    mode,
    allowsSse: true,
    allowsDirectWebSocket: true,
    recommendedHostedProviders: [],
    guidance: "Direct WebSocket and SSE are supported in local/self-hosted environments."
  };
}

export function assertDirectWebSocketAllowed(mode: DeploymentMode, websocketUrl?: string): void {
  const policy = resolveRealtimePolicy(mode);
  if (policy.allowsDirectWebSocket) {
    return;
  }

  throw createRealtimePolicyError(
    "WS_PROVIDER_REQUIRED",
    "Direct WebSocket transport is disabled for this deployment mode.",
    false,
    {
      mode,
      url: websocketUrl,
      recommended_providers: policy.recommendedHostedProviders
    }
  );
}
