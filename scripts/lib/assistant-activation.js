import { execFile as execFileCallback } from "node:child_process";

import WebSocket from "ws";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function execFile(file, args) {
  return new Promise((resolvePromise, rejectPromise) => {
    execFileCallback(file, args, (error, stdout, stderr) => {
      if (error) {
        rejectPromise(error);
        return;
      }
      resolvePromise({ stdout, stderr });
    });
  });
}

export async function waitForSidecarHealth({
  healthUrl = "http://127.0.0.1:3210/health",
  timeoutMs = 30_000,
  pollMs = 250,
  fetchImpl = globalThis.fetch
} = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() <= deadline) {
    try {
      const response = await fetchImpl(healthUrl);
      if (response.ok) {
        const payload = await response.json();
        if (payload?.ok === true) {
          return payload;
        }
      }
    } catch (error) {
      lastError = error;
    }

    await sleep(pollMs);
  }

  const reason = lastError instanceof Error ? lastError.message : "timed out";
  throw new Error(`Assistant sidecar did not become healthy at ${healthUrl}: ${reason}`);
}

export function findAssistantServiceWorkerTarget(targetInfos) {
  if (!Array.isArray(targetInfos)) {
    return undefined;
  }

  return targetInfos.find((target) => {
    if (!target || typeof target !== "object") {
      return false;
    }
    return target.type === "service_worker" &&
      typeof target.url === "string" &&
      target.url.startsWith("chrome-extension://") &&
      target.url.endsWith("/background.js");
  });
}

function getRuntimeEvaluationPayload(evaluation) {
  const value = evaluation?.result?.value;
  const exceptionText =
    typeof evaluation?.exceptionDetails?.text === "string"
      ? evaluation.exceptionDetails.text
      : "";
  return { value, exceptionText };
}

export async function openAssistantSidePanel({
  browserWsUrl,
  extensionTargetUrl,
  wsImpl = WebSocket
}) {
  if (!browserWsUrl || typeof browserWsUrl !== "string") {
    throw new Error("A browser CDP websocket URL is required to open the Assistant side panel.");
  }

  const socket = new wsImpl(browserWsUrl);
  let nextId = 0;
  const pending = new Map();

  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject, method });
      const payload = { id, method, params };
      if (sessionId) {
        payload.sessionId = sessionId;
      }
      socket.send(JSON.stringify(payload));
    });
  }

  socket.on("message", (raw) => {
    const message = JSON.parse(String(raw));
    if (typeof message.id !== "number") {
      return;
    }
    const entry = pending.get(message.id);
    if (!entry) {
      return;
    }
    pending.delete(message.id);
    if (message.error) {
      entry.reject(new Error(`[${entry.method}] ${message.error.message || "CDP error"}`));
      return;
    }
    entry.resolve(message.result);
  });

  try {
    await new Promise((resolve, reject) => {
      socket.once("open", resolve);
      socket.once("error", reject);
    });

    const targets = await send("Target.getTargets");
    const extensionTarget =
      findAssistantServiceWorkerTarget(targets?.targetInfos) ||
      (extensionTargetUrl
        ? (targets?.targetInfos || []).find((target) => target?.url === extensionTargetUrl)
        : undefined);

    if (!extensionTarget?.targetId) {
      throw new Error("Assistant extension service worker target was not found.");
    }

    const { sessionId } = await send("Target.attachToTarget", {
      targetId: extensionTarget.targetId,
      flatten: true
    });

    await send("Runtime.enable", {}, sessionId);
    const evaluation = await send("Runtime.evaluate", {
      expression: `(async () => {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (!tab || typeof tab.id !== "number") {
          return { ok: false, reason: "no_active_tab" };
        }
        await chrome.sidePanel.open({ tabId: tab.id });
        return { ok: true, mode: "side_panel", tabId: tab.id };
      })()`,
      awaitPromise: true,
      returnByValue: true
    }, sessionId);

    const { value, exceptionText } = getRuntimeEvaluationPayload(evaluation);
    if (value?.ok) {
      return value;
    }

    const requiresGesture =
      exceptionText.includes("sidePanel.open()") &&
      exceptionText.includes("user gesture");

    if (requiresGesture) {
      const fallbackEvaluation = await send("Runtime.evaluate", {
        expression: `(async () => {
          const panelUrl = chrome.runtime.getURL("panel.html");
          const tab = await chrome.tabs.create({ url: panelUrl, active: true });
          if (!tab || typeof tab.id !== "number") {
            return { ok: false, reason: "panel_tab_create_failed" };
          }
          return { ok: true, mode: "panel_tab", tabId: tab.id, url: panelUrl };
        })()`,
        awaitPromise: true,
        returnByValue: true
      }, sessionId);

      const fallback = getRuntimeEvaluationPayload(fallbackEvaluation).value;
      if (fallback?.ok) {
        return fallback;
      }
      throw new Error(`Assistant panel fallback failed: ${fallback?.reason || "unknown_reason"}`);
    }

    throw new Error(`Assistant side panel failed to open: ${value?.reason || exceptionText || "unknown_reason"}`);
  } finally {
    try {
      socket.close();
    } catch {}
  }
}

export async function activateChromiumDesktop() {
  if (process.platform !== "darwin") {
    return;
  }
  await execFile("osascript", ["-e", 'tell application "Chromium" to activate']);
}
