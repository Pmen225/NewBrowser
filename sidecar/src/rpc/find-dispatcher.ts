import { randomUUID } from "node:crypto";

import { parseFindParams, type FindMatch, type JsonObject } from "../../../shared/src/transport";
import { readPage } from "../../../src/sidecar/read-page/read-page";
import type { CdpClient, InteractableNode } from "../../../src/sidecar/read-page/types";
import type { ActionDispatcher } from "./dispatcher";

export interface FindDispatcherOptions {
  getClientForTab: (tabId: string) => CdpClient | undefined;
}

function createDispatcherError(
  code: string,
  message: string,
  retryable: boolean,
  details?: Record<string, unknown>
): Error & {
  code: string;
  retryable: boolean;
  details?: Record<string, unknown>;
} {
  const error = new Error(message) as Error & {
    code: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
  error.code = code;
  error.retryable = retryable;
  error.details = details;
  return error;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function scoreNode(node: InteractableNode, terms: string[]): number {
  const haystack = normalize(`${node.ref_id} ${node.role} ${node.name ?? ""}`);
  let score = 0;
  for (const term of terms) {
    if (!term) {
      continue;
    }

    if (haystack.includes(term)) {
      score += 1;
      if (node.name && normalize(node.name).includes(term)) {
        score += 1;
      }
      if (normalize(node.role).includes(term)) {
        score += 0.5;
      }
    }
  }

  return score;
}

export function createFindDispatcher(options: FindDispatcherOptions): ActionDispatcher {
  return {
    supports(action: string): boolean {
      return action === "find" || action === "Find";
    },
    async dispatch(action: string, tabId: string, params: JsonObject): Promise<JsonObject> {
      if (action !== "find" && action !== "Find") {
        throw createDispatcherError("UNKNOWN_ACTION", `Unknown action: ${action}`, false);
      }

      const parsed = parseFindParams(params);
      if (!parsed) {
        throw createDispatcherError("INVALID_REQUEST", "Invalid find params", false);
      }

      const requestedTabId = parsed.tab_id ?? tabId;
      let resolvedTabId = requestedTabId;
      let client = options.getClientForTab(requestedTabId);
      if (!client && requestedTabId !== tabId) {
        resolvedTabId = tabId;
        client = options.getClientForTab(tabId);
      }
      if (!client) {
        throw createDispatcherError("TAB_NOT_FOUND", `No active CDP session for tab_id=${resolvedTabId}`, false, {
          tab_id: resolvedTabId
        });
      }

      const response = await readPage(client, {
        request_id: randomUUID(),
        action: "ReadPage",
        tab_id: resolvedTabId,
        params: {}
      });
      if (!response.ok) {
        throw createDispatcherError(response.error.code, response.error.message, response.error.retryable);
      }

      const terms = normalize(parsed.query)
        .split(/\s+/)
        .filter((part) => part.length > 0);
      const matches: FindMatch[] = [];
      for (const node of response.result.tree) {
        const score = scoreNode(node, terms);
        if (score <= 0) {
          continue;
        }

        matches.push({
          ref: node.ref_id,
          text: node.name,
          role: node.role,
          score,
          coordinates: {
            x: node.click.x,
            y: node.click.y
          }
        });
      }

      matches.sort((left, right) => right.score - left.score);
      const limit =
        typeof parsed.limit === "number" && Number.isFinite(parsed.limit) && parsed.limit > 0
          ? Math.floor(parsed.limit)
          : 20;

      return {
        matches: matches.slice(0, limit)
      };
    }
  };
}
