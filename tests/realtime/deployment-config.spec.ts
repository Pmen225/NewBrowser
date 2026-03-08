import { describe, expect, it } from "vitest";

import { normalizeDeploymentConfig } from "../../shared/src/realtime/deployment-config";

describe("deployment config normalization", () => {
  it("applies local/direct defaults and preserves provided URLs", () => {
    const config = normalizeDeploymentConfig(
      {
        sseUrl: "http://127.0.0.1:3000/events",
        wsUrl: "ws://127.0.0.1:3001/rpc"
      },
      { require: "both" }
    );

    expect(config).toMatchObject({
      deploymentMode: "local",
      webSocketMode: "direct",
      sseUrl: "http://127.0.0.1:3000/events",
      wsUrl: "ws://127.0.0.1:3001/rpc"
    });
  });

  it("rejects invalid deployment mode with deterministic structured error", () => {
    let thrown: unknown;
    try {
      normalizeDeploymentConfig(
        {
          deploymentMode: "cloud",
          sseUrl: "http://127.0.0.1:3000/events"
        },
        { require: "sse" }
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({
      code: "INVALID_DEPLOYMENT_MODE",
      retryable: false
    });
  });

  it("rejects invalid websocket mode with deterministic structured error", () => {
    let thrown: unknown;
    try {
      normalizeDeploymentConfig(
        {
          webSocketMode: "socketio",
          wsUrl: "ws://127.0.0.1:3001/rpc"
        },
        { require: "ws" }
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({
      code: "INVALID_WEBSOCKET_MODE",
      retryable: false
    });
  });

  it("rejects missing required URL fields", () => {
    let missingSse: unknown;
    try {
      normalizeDeploymentConfig({}, { require: "sse" });
    } catch (error) {
      missingSse = error;
    }

    expect(missingSse).toMatchObject({
      code: "MISSING_SSE_URL",
      retryable: false
    });

    let missingWs: unknown;
    try {
      normalizeDeploymentConfig({}, { require: "ws" });
    } catch (error) {
      missingWs = error;
    }

    expect(missingWs).toMatchObject({
      code: "MISSING_WS_URL",
      retryable: false
    });
  });

  it("rejects invalid URL protocols for required transports", () => {
    let invalidSse: unknown;
    try {
      normalizeDeploymentConfig(
        {
          sseUrl: "ws://127.0.0.1:3000/events"
        },
        { require: "sse" }
      );
    } catch (error) {
      invalidSse = error;
    }

    expect(invalidSse).toMatchObject({
      code: "INVALID_SSE_URL",
      retryable: false
    });

    let invalidWs: unknown;
    try {
      normalizeDeploymentConfig(
        {
          wsUrl: "http://127.0.0.1:3001/rpc"
        },
        { require: "ws" }
      );
    } catch (error) {
      invalidWs = error;
    }

    expect(invalidWs).toMatchObject({
      code: "INVALID_WS_URL",
      retryable: false
    });
  });

  it("allows relative SSE URLs for browser-compatible fetch-event-source usage", () => {
    const config = normalizeDeploymentConfig(
      {
        sseUrl: "/api/events"
      },
      { require: "sse" }
    );

    expect(config).toMatchObject({
      deploymentMode: "local",
      webSocketMode: "direct",
      sseUrl: "/api/events"
    });
  });
});
