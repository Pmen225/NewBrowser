import type { IncomingMessage, ServerResponse } from "node:http";

import type { SseData, SseEnvelope } from "../../../shared/src/transport";
import { serializeSseEnvelope } from "../../../shared/src/transport";

export interface SseHubOptions {
  heartbeatMs?: number;
  historySize?: number;
  sanitizeEnvelope?: (envelope: SseEnvelope) => SseEnvelope;
}

export interface PublishSseInput {
  event: string;
  data: SseData;
  retry?: number;
}

interface SseClient {
  id: number;
  response: ServerResponse;
}

function parseLastEventId(raw: string | undefined): number | null {
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export function createSseHub(options?: SseHubOptions) {
  const historySize = options?.historySize ?? 200;
  const heartbeatMs = options?.heartbeatMs ?? 20_000;
  const sanitizeEnvelope = options?.sanitizeEnvelope;

  const clients = new Map<number, SseClient>();
  const history: SseEnvelope[] = [];

  let nextClientId = 1;
  let nextEventId = 1;

  const dropClient = (clientId: number): void => {
    const client = clients.get(clientId);
    if (!client) {
      return;
    }

    clients.delete(clientId);
    if (!client.response.destroyed) {
      client.response.destroy();
    }
  };

  const writeToClient = (client: SseClient, payload: string): boolean => {
    if (client.response.writableEnded || client.response.destroyed) {
      dropClient(client.id);
      return false;
    }

    const ok = client.response.write(payload);
    if (!ok) {
      // Drop lagging clients to avoid unbounded server-side buffering.
      dropClient(client.id);
      return false;
    }

    return true;
  };

  const publish = (input: PublishSseInput): SseEnvelope => {
    const rawEnvelope: SseEnvelope = {
      id: String(nextEventId),
      event: input.event,
      data: input.data,
      retry: input.retry
    };
    nextEventId += 1;
    const envelope = sanitizeEnvelope ? sanitizeEnvelope(rawEnvelope) : rawEnvelope;

    history.push(envelope);
    if (history.length > historySize) {
      history.splice(0, history.length - historySize);
    }

    const serialized = serializeSseEnvelope(envelope);
    for (const client of clients.values()) {
      writeToClient(client, serialized);
    }

    return envelope;
  };

  const replaySince = (client: SseClient, lastEventId: string | undefined): void => {
    const parsed = parseLastEventId(lastEventId);
    if (parsed === null) {
      return;
    }

    for (const envelope of history) {
      const id = Number(envelope.id);
      if (Number.isFinite(id) && id > parsed) {
        if (!writeToClient(client, serializeSseEnvelope(envelope))) {
          break;
        }
      }
    }
  };

  const handleRequest = (request: IncomingMessage, response: ServerResponse): void => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type, Last-Event-ID, Cache-Control");

    if (request.method === "OPTIONS") {
      response.statusCode = 204;
      response.end();
      return;
    }

    if (request.method !== "GET") {
      response.statusCode = 405;
      response.setHeader("Allow", "GET");
      response.end();
      return;
    }

    response.statusCode = 200;
    response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.setHeader("X-Accel-Buffering", "no");
    response.flushHeaders();
    response.write(": connected\n\n");

    const clientId = nextClientId;
    nextClientId += 1;

    const client: SseClient = {
      id: clientId,
      response
    };

    clients.set(clientId, client);
    replaySince(client, request.headers["last-event-id"]?.toString());

    const closeClient = (): void => {
      clients.delete(clientId);
    };

    request.once("close", closeClient);
    response.once("close", closeClient);
  };

  const heartbeat = heartbeatMs > 0
    ? setInterval(() => {
        publish({
          event: "heartbeat",
          data: {
            type: "status",
            ts: new Date().toISOString(),
            payload: {
              heartbeat: true
            }
          }
        });
      }, heartbeatMs)
    : undefined;

  if (heartbeat && typeof heartbeat.unref === "function") {
    heartbeat.unref();
  }

  const close = (): void => {
    if (heartbeat) {
      clearInterval(heartbeat);
    }

    for (const client of clients.values()) {
      client.response.end();
    }
    clients.clear();
  };

  return {
    handleRequest,
    publish,
    getClientCount: () => clients.size,
    close
  };
}
