import type { ReadPageRequest, ReadPageResponse } from "../../../src/sidecar/read-page/types";
import type { TraceLogger } from "./trace-logger";

export async function recordReadPageTraceArtifacts(
  traceLogger: TraceLogger,
  request: ReadPageRequest,
  response: ReadPageResponse
): Promise<void> {
  if (!response.ok) {
    await traceLogger.log({
      request_id: request.request_id,
      action: request.action,
      tab_id: request.tab_id,
      event: "read_page.error",
      error: {
        code: response.error.code,
        message: response.error.message,
        retryable: response.error.retryable
      }
    });
    return;
  }

  await traceLogger.writeArtifact({
    request_id: request.request_id,
    action: request.action,
    tab_id: request.tab_id,
    kind: "read_page_yaml",
    extension: "yaml",
    data: response.result.yaml
  });

  await traceLogger.writeArtifact({
    request_id: request.request_id,
    action: request.action,
    tab_id: request.tab_id,
    kind: "read_page_json",
    extension: "json",
    data: JSON.stringify(
      {
        tree: response.result.tree,
        meta: response.result.meta
      },
      null,
      2
    )
  });
}
