# Task 10 Deployment Considerations

## Scope
- Support two deployment modes: `local` and `vercel`.
- Keep SSE available in both modes.
- Allow direct WebSocket only in `local`.
- Require `hosted_provider` WebSocket mode in `vercel`.
- Do not implement a concrete hosted provider SDK in this task.

## Deployment Matrix

| Deployment mode | SSE | Direct WebSocket | Hosted provider WebSocket |
| --- | --- | --- | --- |
| `local` | Supported | Supported | Optional |
| `vercel` | Supported | Blocked (`WS_PROVIDER_REQUIRED`) | Supported |

## Runtime Config Contract

`DeploymentConfig` is normalized and validated before client startup:

```ts
type DeploymentMode = "local" | "vercel";
type WebSocketMode = "direct" | "hosted_provider";

interface DeploymentConfig {
  deploymentMode: DeploymentMode;
  webSocketMode: WebSocketMode;
  sseUrl: string;
  wsUrl: string;
  hostedProvider?: string;
}
```

Defaults:
- `deploymentMode`: `local`
- `webSocketMode`: `direct`

## Validation and Failure Modes

Deterministic non-retryable errors:
- `INVALID_DEPLOYMENT_MODE`
- `INVALID_WEBSOCKET_MODE`
- `MISSING_SSE_URL`
- `MISSING_WS_URL`
- `INVALID_SSE_URL` (must be `http:` or `https:`)
- `INVALID_WS_URL` (must be `ws:` or `wss:`)
- `WS_PROVIDER_REQUIRED` for `vercel + direct websocket`

All policy/config errors remain structured with:
- `code`
- `retryable`
- optional `details`

## Topology Guidance

### Local
- UI and sidecar can both run on localhost.
- UI uses:
  - SSE: `http://localhost:<port>/events`
  - WS RPC: `ws://localhost:<port>/rpc` (direct mode)

### Vercel UI
- SSE remains available via HTTP route handlers/streams.
- Direct WebSocket upgrades are not supported in Vercel Functions.
- Use a hosted realtime provider endpoint for WebSocket transport and set `webSocketMode` to `hosted_provider`.

## Verification

Task 10 validation coverage includes:
- Unit tests for config normalization and deterministic errors.
- Realtime policy tests for local/vercel direct-WS behavior.
- E2E UI/UX tests proving:
  - SSE works in both modes.
  - Vercel-mode SSE sends `Cache-Control: no-cache`.
  - Direct WS is blocked on Vercel and allowed locally.
