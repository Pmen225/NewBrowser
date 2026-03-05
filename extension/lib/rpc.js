const DEFAULT_TIMEOUT_MS = 60_000;

export function createPanelRpcClient(options) {
  const requestTimeoutMs = typeof options.requestTimeoutMs === "number" && options.requestTimeoutMs > 0 ? options.requestTimeoutMs : DEFAULT_TIMEOUT_MS;
  const rawWebSocketUrl = typeof options.wsUrl === "string" && options.wsUrl.length > 0
    ? options.wsUrl
    : typeof options.url === "string" && options.url.length > 0
      ? options.url
      : null;

  let ws = null;
  let requestOrdinal = 0;
  const pending = new Map();

  function notify(eventName, payload) {
    if (typeof options[eventName] === "function") {
      options[eventName](payload);
    }
  }

  function clearPending(reason) {
    for (const [requestId, state] of pending.entries()) {
      clearTimeout(state.timeout);
      state.reject(new Error(reason));
      pending.delete(requestId);
    }
  }

  function isOpen() {
    return ws && ws.readyState === WebSocket.OPEN;
  }

  function handleMessage(raw) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      notify("onProtocolError", "Received non-JSON RPC message");
      return;
    }

    notify("onMessage", parsed);

    if (!parsed || typeof parsed !== "object" || typeof parsed.request_id !== "string") {
      return;
    }

    const entry = pending.get(parsed.request_id);
    if (!entry) {
      return;
    }

    clearTimeout(entry.timeout);
    pending.delete(parsed.request_id);

    if (parsed.ok === true) {
      entry.resolve(parsed.result || {});
      return;
    }

    const errorMessage =
      parsed.error && typeof parsed.error.message === "string" ? parsed.error.message : "RPC call failed";
    const error = new Error(errorMessage);
    if (parsed.error && typeof parsed.error.code === "string") {
      error.code = parsed.error.code;
    }
    if (parsed.retryable === true) {
      error.retryable = true;
    }
    entry.reject(error);
  }

  let retryDelay = 1000;
  let retryTimer = null;
  let intentionalClose = false;

  function scheduleReconnect() {
    if (intentionalClose) return;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      connect();
    }, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 16000);
  }

  function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (!rawWebSocketUrl) {
      throw new Error("RPC WebSocket URL is required");
    }

    intentionalClose = false;
    ws = new WebSocket(rawWebSocketUrl);

    ws.addEventListener("open", () => {
      retryDelay = 1000;
      notify("onOpen");
    });

    ws.addEventListener("close", () => {
      clearPending("WebSocket disconnected");
      notify("onClose");
      scheduleReconnect();
    });

    ws.addEventListener("error", () => {
      notify("onError", new Error("WebSocket error"));
    });

    ws.addEventListener("message", (event) => {
      handleMessage(event.data);
    });
  }

  function disconnect() {
    if (!ws) {
      return;
    }

    intentionalClose = true;
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    const socket = ws;
    ws = null;
    clearPending("WebSocket closed");
    socket.close(1000, "Client closed");
  }

  function reconnect() {
    disconnect();
    intentionalClose = false;
    connect();
  }

  function call(action, tabId, params, callOptions = {}) {
    if (!isOpen()) {
      return Promise.reject(new Error("WebSocket is not connected"));
    }

    requestOrdinal += 1;
    const requestId = `ext-${Date.now()}-${requestOrdinal}`;

    const request = {
      request_id: requestId,
      action,
      tab_id: tabId,
      params
    };

    const timeoutMs =
      typeof callOptions.timeoutMs === "number" && Number.isFinite(callOptions.timeoutMs) && callOptions.timeoutMs > 0
        ? callOptions.timeoutMs
        : requestTimeoutMs;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error(`RPC timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      pending.set(requestId, {
        resolve,
        reject,
        timeout
      });

      ws.send(JSON.stringify(request));
      notify("onRequest", request);
    });
  }

  function cancelPending(reason = "Request canceled") {
    clearPending(reason);
  }

  return {
    connect,
    disconnect,
    reconnect,
    call,
    cancelPending,
    isOpen
  };
}
