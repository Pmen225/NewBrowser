import { readPage } from "../read-page/read-page";
import type { CdpClient, ReadPageRequest, ReadPageResponse } from "../read-page/types";

export interface ReadPageTabRegistry {
  getClientForTab: (tabId: string) => CdpClient | undefined;
}

export interface ReadPageToolObservability {
  onResponse?: (request: ReadPageRequest, response: ReadPageResponse) => Promise<void> | void;
}

async function emitResponse(
  observability: ReadPageToolObservability | undefined,
  request: ReadPageRequest,
  response: ReadPageResponse
): Promise<void> {
  if (!observability?.onResponse) {
    return;
  }

  try {
    await observability.onResponse(request, response);
  } catch {
    return;
  }
}

export async function handleReadPageTool(
  registry: ReadPageTabRegistry,
  request: ReadPageRequest,
  observability?: ReadPageToolObservability
): Promise<ReadPageResponse> {
  const cdp = registry.getClientForTab(request.tab_id);
  if (!cdp) {
    const response: ReadPageResponse = {
      request_id: request.request_id,
      ok: false,
      error: {
        code: "TAB_NOT_FOUND",
        message: `No active CDP session for tab_id=${request.tab_id}`,
        retryable: false
      }
    };
    await emitResponse(observability, request, response);
    return response;
  }

  const response = await readPage(cdp, request);
  await emitResponse(observability, request, response);
  return response;
}
