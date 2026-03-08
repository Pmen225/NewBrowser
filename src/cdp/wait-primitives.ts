import type { ICdpTransport } from "./types";

export interface WaitForNavigationOptions {
  sessionId: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface WaitForSelectorOptions {
  sessionId: string;
  selector: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
  signal?: AbortSignal;
}

export interface WaitForNetworkIdleOptions {
  sessionId: string;
  quietPeriodMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

const DEFAULT_NAVIGATION_TIMEOUT_MS = 10_000;
const DEFAULT_SELECTOR_TIMEOUT_MS = 5_000;
const DEFAULT_SELECTOR_POLL_MS = 100;
const DEFAULT_NETWORK_TIMEOUT_MS = 15_000;
const DEFAULT_NETWORK_QUIET_MS = 500;
const NETWORK_CHECK_INTERVAL_MS = 50;

export class WaitPrimitiveError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "WaitPrimitiveError";
    this.code = code;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function extractSessionId(payload: unknown): string | undefined {
  const record = asRecord(payload);
  const sessionId = record?.sessionId;
  return typeof sessionId === "string" ? sessionId : undefined;
}

function extractEventParams(payload: unknown): Record<string, unknown> | null {
  const record = asRecord(payload);
  return asRecord(record?.params);
}

function extractLifecycleName(payload: unknown): string | undefined {
  const record = asRecord(payload);
  if (typeof record?.name === "string") {
    return record.name;
  }

  const params = extractEventParams(payload);
  return typeof params?.name === "string" ? params.name : undefined;
}

function isAbortError(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new WaitPrimitiveError("WAIT_ABORTED", "Wait aborted");
  }
}

async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return;
  }

  await new Promise<void>((resolveSleep) => {
    const timer = setTimeout(() => {
      cleanup();
      resolveSleep();
    }, ms);

    const onAbort = (): void => {
      clearTimeout(timer);
      cleanup();
      resolveSleep();
    };

    const cleanup = (): void => {
      signal?.removeEventListener("abort", onAbort);
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function waitForNavigation(transport: ICdpTransport, options: WaitForNavigationOptions): Promise<void> {
  const timeoutMs = typeof options.timeoutMs === "number" && options.timeoutMs > 0 ? Math.floor(options.timeoutMs) : DEFAULT_NAVIGATION_TIMEOUT_MS;
  await new Promise<void>((resolveWait, rejectWait) => {
    let settled = false;

    const settle = (handler: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      handler();
    };

    const onLoad = (payload: unknown): void => {
      const eventSessionId = extractSessionId(payload);
      if (eventSessionId && eventSessionId !== options.sessionId) return;
      settle(resolveWait);
    };

    const onLifecycle = (payload: unknown): void => {
      const eventSessionId = extractSessionId(payload);
      if (eventSessionId && eventSessionId !== options.sessionId) return;
      if (extractLifecycleName(payload) !== "firstContentfulPaint") return;
      settle(resolveWait);
    };

    const onAbort = (): void => {
      settle(() => rejectWait(new WaitPrimitiveError("WAIT_ABORTED", "Wait aborted")));
    };

    const timer = setTimeout(() => {
      settle(() => rejectWait(new WaitPrimitiveError("NAVIGATION_TIMEOUT", `Navigation did not complete within ${timeoutMs}ms`)));
    }, timeoutMs);

    const cleanup = (): void => {
      clearTimeout(timer);
      transport.off("Page.loadEventFired", onLoad);
      transport.off("Page.lifecycleEvent", onLifecycle);
      options.signal?.removeEventListener("abort", onAbort);
    };

    transport.on("Page.loadEventFired", onLoad);
    transport.on("Page.lifecycleEvent", onLifecycle);

    if (options.signal) {
      if (options.signal.aborted) { onAbort(); return; }
      options.signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

function createSelectorProbeExpression(selector: string): string {
  return `(function() {
    const el = document.querySelector(${JSON.stringify(selector)});
    return el ? true : false;
  })()`;
}

function readBackendNodeId(payload: unknown): number | undefined {
  const record = asRecord(payload);
  const node = asRecord(record?.node);
  const backendNodeId = node?.backendNodeId;
  return typeof backendNodeId === "number" && Number.isFinite(backendNodeId) ? backendNodeId : undefined;
}

async function resolveSelectorBackendNodeId(
  transport: ICdpTransport,
  sessionId: string,
  selector: string
): Promise<number | undefined> {
  const documentResponse = await transport.send<{ root?: { nodeId?: number } }>(
    "DOM.getDocument",
    {
      depth: 1
    },
    sessionId
  );

  const rootNodeId = documentResponse.root?.nodeId;
  if (typeof rootNodeId !== "number" || !Number.isFinite(rootNodeId)) {
    return undefined;
  }

  const queryResult = await transport.send<{ nodeId?: number }>(
    "DOM.querySelector",
    {
      nodeId: rootNodeId,
      selector
    },
    sessionId
  );

  if (typeof queryResult.nodeId !== "number" || !Number.isFinite(queryResult.nodeId) || queryResult.nodeId <= 0) {
    return undefined;
  }

  const described = await transport.send<unknown>(
    "DOM.describeNode",
    {
      nodeId: queryResult.nodeId
    },
    sessionId
  );

  return readBackendNodeId(described);
}

export async function waitForSelector(
  transport: ICdpTransport,
  options: WaitForSelectorOptions
): Promise<{ backendNodeId: number }> {
  const timeoutMs =
    typeof options.timeoutMs === "number" && options.timeoutMs > 0 ? Math.floor(options.timeoutMs) : DEFAULT_SELECTOR_TIMEOUT_MS;
  const pollIntervalMs =
    typeof options.pollIntervalMs === "number" && options.pollIntervalMs > 0
      ? Math.floor(options.pollIntervalMs)
      : DEFAULT_SELECTOR_POLL_MS;

  const started = Date.now();

  while (Date.now() - started <= timeoutMs) {
    isAbortError(options.signal);

    const probe = await transport.send<{ result?: { value?: unknown } }>(
      "Runtime.evaluate",
      {
        expression: createSelectorProbeExpression(options.selector),
        returnByValue: true,
        awaitPromise: true
      },
      options.sessionId
    );

    if (probe.result?.value === true) {
      const backendNodeId = await resolveSelectorBackendNodeId(transport, options.sessionId, options.selector);
      if (typeof backendNodeId === "number" && Number.isFinite(backendNodeId) && backendNodeId > 0) {
        return {
          backendNodeId
        };
      }
    }

    await sleep(pollIntervalMs, options.signal);
  }

  throw new WaitPrimitiveError("SELECTOR_TIMEOUT", `Selector \"${options.selector}\" not found within ${timeoutMs}ms`);
}

function extractRequestId(payload: unknown): string | undefined {
  const root = asRecord(payload);
  const params = asRecord(root?.params);

  const fromParams = params?.requestId;
  if (typeof fromParams === "string" && fromParams.length > 0) {
    return fromParams;
  }

  const fromRoot = root?.requestId;
  if (typeof fromRoot === "string" && fromRoot.length > 0) {
    return fromRoot;
  }

  return undefined;
}

export async function waitForNetworkIdle(transport: ICdpTransport, options: WaitForNetworkIdleOptions): Promise<void> {
  const quietPeriodMs =
    typeof options.quietPeriodMs === "number" && options.quietPeriodMs >= 0
      ? Math.floor(options.quietPeriodMs)
      : DEFAULT_NETWORK_QUIET_MS;
  const timeoutMs = typeof options.timeoutMs === "number" && options.timeoutMs > 0 ? Math.floor(options.timeoutMs) : DEFAULT_NETWORK_TIMEOUT_MS;

  await new Promise<void>((resolveWait, rejectWait) => {
    const inFlightRequestIds = new Set<string>();
    let inFlightCount = 0;
    let lastActivityMs = Date.now();

    const matchesSession = (payload: unknown): boolean => {
      const sessionId = extractSessionId(payload);
      return !sessionId || sessionId === options.sessionId;
    };

    const onRequest = (payload: unknown): void => {
      if (!matchesSession(payload)) {
        return;
      }

      const requestId = extractRequestId(payload);
      if (requestId) {
        inFlightRequestIds.add(requestId);
      }
      inFlightCount += 1;
      lastActivityMs = Date.now();
    };

    const onFinished = (payload: unknown): void => {
      if (!matchesSession(payload)) {
        return;
      }

      const requestId = extractRequestId(payload);
      if (requestId) {
        if (inFlightRequestIds.delete(requestId)) {
          inFlightCount = Math.max(0, inFlightCount - 1);
        }
      } else {
        inFlightCount = Math.max(0, inFlightCount - 1);
      }

      lastActivityMs = Date.now();
    };

    const onAbort = (): void => {
      cleanup();
      rejectWait(new WaitPrimitiveError("WAIT_ABORTED", "Wait aborted"));
    };

    const checker = setInterval(() => {
      if (inFlightCount === 0 && Date.now() - lastActivityMs >= quietPeriodMs) {
        cleanup();
        resolveWait();
      }
    }, NETWORK_CHECK_INTERVAL_MS);

    const timer = setTimeout(() => {
      cleanup();
      rejectWait(new WaitPrimitiveError("NETWORK_IDLE_TIMEOUT", `Network not idle within ${timeoutMs}ms`));
    }, timeoutMs);

    const cleanup = (): void => {
      clearInterval(checker);
      clearTimeout(timer);
      transport.off("Network.requestWillBeSent", onRequest);
      transport.off("Network.loadingFinished", onFinished);
      transport.off("Network.loadingFailed", onFinished);
      options.signal?.removeEventListener("abort", onAbort);
    };

    transport.on("Network.requestWillBeSent", onRequest);
    transport.on("Network.loadingFinished", onFinished);
    transport.on("Network.loadingFailed", onFinished);

    if (options.signal) {
      if (options.signal.aborted) {
        onAbort();
        return;
      }
      options.signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}
