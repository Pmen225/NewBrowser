import { BrowserActionError } from "../../../src/cdp/browser-actions";
import type { ICdpTransport } from "../../../src/cdp/types";
import type { ExtensionOperationParams, ExtensionOperationResult } from "../../../shared/src/transport";

type ExtensionOperationInput = ExtensionOperationParams & {
  extensionId?: string;
};

interface TargetInfoLike {
  targetId: string;
  type?: string;
  url?: string;
}

interface RuntimeValue {
  ok?: boolean;
  code?: string;
  error?: string;
  operation?: ExtensionOperationParams["operation"];
  extension_id?: string;
  extensions?: Array<{
    extension_id: string;
    name: string;
    enabled: boolean;
    install_type?: string;
    description?: string;
  }>;
}

interface CachedExtensionTarget {
  targetId: string;
  url: string;
  protectedExtensionId: string;
}

const EXTENSION_TARGET_CACHE = new WeakMap<ICdpTransport, CachedExtensionTarget>();

function chooseExtensionTarget(targetInfos: TargetInfoLike[]): TargetInfoLike | undefined {
  return (
    targetInfos.find((target) => target.type === "service_worker" && typeof target.url === "string" && target.url.endsWith("/background.js")) ??
    targetInfos.find((target) => target.type === "page" && typeof target.url === "string" && target.url.endsWith("/panel.html")) ??
    targetInfos.find((target) => typeof target.url === "string" && target.url.startsWith("chrome-extension://"))
  );
}

function extractAssistantExtensionId(targetUrl: string): string | null {
  const match = /^chrome-extension:\/\/([^/]+)\//.exec(targetUrl);
  return typeof match?.[1] === "string" && match[1].length > 0 ? match[1] : null;
}

function buildRuntimeExpression(params: ExtensionOperationParams, protectedExtensionId: string): string {
  const payload = JSON.stringify({
    operation: params.operation,
    extensionId: params.extension_id ?? "",
    query: params.query ?? "",
    protectedExtensionId
  });

  return `(
    async () => {
      const payload = ${payload};
      const matchesQuery = (item, query) => {
        if (!query) return true;
        const normalized = query.toLowerCase();
        return (
          String(item.name || "").toLowerCase().includes(normalized) ||
          String(item.id || "").toLowerCase().includes(normalized) ||
          String(item.description || "").toLowerCase().includes(normalized)
        );
      };

      if (payload.operation === "list") {
        const all = await chrome.management.getAll();
        return {
          ok: true,
          operation: "list",
          extensions: all
            .filter((item) => matchesQuery(item, payload.query))
            .map((item) => ({
              extension_id: item.id,
              name: item.name,
              enabled: item.enabled === true,
              install_type: item.installType,
              description: item.description || ""
            }))
        };
      }

      if (!payload.extensionId) {
        return {
          ok: false,
          code: "EXTENSION_ID_REQUIRED",
          error: "Extension ID required."
        };
      }

      if (payload.extensionId === payload.protectedExtensionId && (payload.operation === "disable" || payload.operation === "uninstall")) {
        return {
          ok: false,
          code: "ASSISTANT_EXTENSION_PROTECTED",
          error: "The Assistant extension cannot be disabled or uninstalled."
        };
      }

      if (payload.operation === "enable") {
        await chrome.management.setEnabled(payload.extensionId, true);
        return {
          ok: true,
          operation: "enable",
          extension_id: payload.extensionId
        };
      }

      if (payload.operation === "disable") {
        await chrome.management.setEnabled(payload.extensionId, false);
        return {
          ok: true,
          operation: "disable",
          extension_id: payload.extensionId
        };
      }

      await chrome.management.uninstall(payload.extensionId, { showConfirmDialog: false });
      return {
        ok: true,
        operation: "uninstall",
        extension_id: payload.extensionId
      };
    }
  )()`;
}

export async function manageExtensionsViaExtensionContext(
  transport: ICdpTransport,
  params: ExtensionOperationInput
): Promise<ExtensionOperationResult> {
  const legacyExtensionId = typeof params.extensionId === "string" && params.extensionId.trim().length > 0
    ? params.extensionId.trim()
    : undefined;
  const normalizedParams: ExtensionOperationParams = {
    operation: params.operation,
    extension_id: typeof params.extension_id === "string" && params.extension_id.trim().length > 0 ? params.extension_id.trim() : legacyExtensionId,
    query: typeof params.query === "string" && params.query.trim().length > 0 ? params.query.trim() : undefined
  };

  let cached = EXTENSION_TARGET_CACHE.get(transport);
  if (!cached) {
    const targetInfoResult = await transport.send<{ targetInfos?: TargetInfoLike[] }>("Target.getTargets", {});
    const targetInfos = targetInfoResult.targetInfos ?? [];
    const extensionTarget = chooseExtensionTarget(targetInfos);
    if (!extensionTarget || typeof extensionTarget.url !== "string") {
      throw new BrowserActionError("EXTENSION_MANAGEMENT_UNAVAILABLE", "Assistant extension target is not available", false);
    }

    const protectedExtensionId = extractAssistantExtensionId(extensionTarget.url);
    if (!protectedExtensionId) {
      throw new BrowserActionError("EXTENSION_MANAGEMENT_UNAVAILABLE", "Assistant extension id is unavailable", false);
    }

    cached = {
      targetId: extensionTarget.targetId,
      url: extensionTarget.url,
      protectedExtensionId
    };
    EXTENSION_TARGET_CACHE.set(transport, cached);
  }

  if (
    normalizedParams.extension_id === cached.protectedExtensionId &&
    (normalizedParams.operation === "disable" || normalizedParams.operation === "uninstall")
  ) {
    throw new BrowserActionError("ASSISTANT_EXTENSION_PROTECTED", "The Assistant extension cannot be disabled or uninstalled.", false);
  }

  const attached = await transport.send<{ sessionId: string }>("Target.attachToTarget", {
    targetId: cached.targetId,
    flatten: true
  });

  try {
    const evaluation = await transport.send<{ result?: { value?: RuntimeValue } }>(
      "Runtime.evaluate",
      {
        expression: buildRuntimeExpression(normalizedParams, cached.protectedExtensionId),
        awaitPromise: true,
        returnByValue: true
      },
      attached.sessionId
    );
    const value = evaluation.result?.value;
    if (!value?.ok || !value.operation) {
      throw new BrowserActionError(
        value?.code ?? "EXTENSION_MANAGEMENT_FAILED",
        value?.error ?? "Extension management failed in the extension context",
        false
      );
    }

    return {
      status: "ok",
      operation: value.operation,
      extension_id: value.extension_id,
      extensions: value.extensions
    };
  } finally {
    try {
      await transport.send("Target.detachFromTarget", { sessionId: attached.sessionId });
    } catch {
      // best effort only
    }
  }
}
