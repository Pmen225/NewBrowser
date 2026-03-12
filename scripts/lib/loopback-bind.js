import http from "node:http";

const CLASSIFICATION_BY_CODE = {
  EPERM: "loopback_bind_permission_failure",
  EACCES: "loopback_bind_permission_failure",
  EADDRINUSE: "loopback_bind_port_in_use",
  EADDRNOTAVAIL: "loopback_bind_address_unavailable",
  EAFNOSUPPORT: "loopback_bind_unsupported",
  EINVAL: "loopback_bind_invalid_config"
};

function normalizeErrorCode(error) {
  const code = error && typeof error === "object" ? error.code : undefined;
  return typeof code === "string" ? code : "UNKNOWN";
}

export function classifyLoopbackBindFailure(error) {
  const code = normalizeErrorCode(error);
  const classification = CLASSIFICATION_BY_CODE[code] || "loopback_bind_failure";
  const message = error instanceof Error ? error.message : String(error ?? "unknown error");
  return {
    code,
    classification,
    message
  };
}

export function formatLoopbackBindFailure(error, context = {}) {
  const verdict = classifyLoopbackBindFailure(error);
  const host = typeof context.host === "string" ? context.host : "127.0.0.1";
  const port = Number.isInteger(context.port) ? context.port : 0;
  const label = typeof context.label === "string" && context.label.length > 0 ? context.label : "loopback server";
  return `${label} failed to bind on ${host}:${port}; classification=${verdict.classification}; code=${verdict.code}; detail=${verdict.message}`;
}

export async function listenWithLoopbackGuard(server, { host = "127.0.0.1", port = 0, label = "loopback server" } = {}) {
  await new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off?.("error", onError);
      reject(new Error(formatLoopbackBindFailure(error, { host, port, label })));
    };

    server.once?.("error", onError);

    try {
      server.listen(port, host, () => {
        server.off?.("error", onError);
        resolve(undefined);
      });
    } catch (error) {
      server.off?.("error", onError);
      reject(new Error(formatLoopbackBindFailure(error, { host, port, label })));
    }
  });
}

export async function assertLoopbackBindReady({ host = "127.0.0.1", createServerImpl = http.createServer } = {}) {
  const probeServer = createServerImpl((_req, res) => {
    res.statusCode = 204;
    res.end();
  });

  try {
    await listenWithLoopbackGuard(probeServer, {
      host,
      port: 0,
      label: "loopback bind preflight"
    });
  } finally {
    await new Promise((resolve) => {
      probeServer.close(() => resolve(undefined));
    });
  }
}
