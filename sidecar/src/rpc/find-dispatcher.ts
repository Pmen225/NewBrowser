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

const GENERIC_ROLE_TERMS = new Set([
  "button",
  "link",
  "input",
  "textbox",
  "text",
  "field",
  "checkbox",
  "radio",
  "dropdown",
  "select",
  "menu",
  "tab"
]);

function scoreNode(node: InteractableNode, terms: string[]): number {
  const refText = normalize(node.ref_id);
  const roleText = normalize(node.role);
  const nameText = normalize(node.name ?? "");
  const significantTerms = terms.filter((term) => !GENERIC_ROLE_TERMS.has(term));
  const hasSignificantLabelMatch =
    significantTerms.length === 0 ||
    significantTerms.some((term) => nameText.includes(term) || refText.includes(term));
  if (!hasSignificantLabelMatch) {
    return 0;
  }

  let score = 0;
  for (const term of terms) {
    if (!term) {
      continue;
    }

    const nameMatched = nameText.includes(term);
    const refMatched = refText.includes(term);
    const roleMatched = roleText.includes(term);

    if (nameMatched) {
      score += 2;
      continue;
    }

    if (refMatched) {
      score += 1;
      continue;
    }

    if (roleMatched && (significantTerms.length === 0 || !GENERIC_ROLE_TERMS.has(term))) {
      score += 0.5;
      continue;
    }

    if (roleMatched && hasSignificantLabelMatch) {
      score += 0.25;
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
