import process from "node:process";

import { createCdpClient, resolveConfiguredExtensionId } from "../scripts/live-cdp-panel-check.mjs";

async function fetchBrowserWsUrl() {
  const response = await fetch("http://127.0.0.1:9555/json/version");
  if (!response.ok) {
    throw new Error(`Failed to fetch Chrome version endpoint: HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (!payload?.webSocketDebuggerUrl) {
    throw new Error("Chrome version endpoint did not include webSocketDebuggerUrl");
  }
  return String(payload.webSocketDebuggerUrl);
}

async function createPageSession(cdp) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send("DOM.enable", {}, sessionId);
  return { targetId, sessionId };
}

async function navigateSession(cdp, sessionId, url) {
  await cdp.send("Page.navigate", { url }, sessionId);
  await waitForFunction(cdp, sessionId, "document.readyState === 'complete'", 15_000);
}

async function evaluate(cdp, sessionId, expression) {
  const { result, exceptionDetails } = await cdp.send(
    "Runtime.evaluate",
    {
      expression,
      returnByValue: true,
      awaitPromise: true
    },
    sessionId
  );

  if (exceptionDetails) {
    throw new Error(exceptionDetails.text || "Runtime.evaluate failed");
  }

  return result?.value;
}

async function waitForFunction(cdp, sessionId, expression, timeoutMs, pollMs = 250) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = await evaluate(cdp, sessionId, expression).catch(() => false);
    if (value) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  throw new Error(`Timed out waiting for expression after ${timeoutMs}ms`);
}

async function closeTarget(cdp, targetId) {
  await cdp.send("Target.closeTarget", { targetId }).catch(() => {});
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required");
  }

  const extensionId = resolveConfiguredExtensionId();
  const browserWsUrl = await fetchBrowserWsUrl();
  const cdp = createCdpClient(browserWsUrl);
  await cdp.connect();

  const page = await createPageSession(cdp);
  try {
    await navigateSession(cdp, page.sessionId, `chrome-extension://${extensionId}/options.html`);
    await waitForFunction(cdp, page.sessionId, "document.getElementById('provider-id-input') instanceof HTMLInputElement", 15_000);
    await waitForFunction(
      cdp,
      page.sessionId,
      `(() => {
        const audioSupport = document.getElementById("audio-support");
        const modelModeSelect = document.getElementById("model-mode-select");
        return Boolean(audioSupport?.textContent?.includes("Narration:")) && modelModeSelect instanceof HTMLSelectElement;
      })()`,
      15_000
    );

    const result = await evaluate(
      cdp,
      page.sessionId,
      `(() => {
        const providerIdInput = document.getElementById("provider-id-input");
        const providerKeyInput = document.getElementById("provider-key-input");
        const providerModelInput = document.getElementById("provider-model-input");
        const providerSaveBtn = document.getElementById("provider-save-btn");
        if (!(providerIdInput instanceof HTMLInputElement) ||
            !(providerKeyInput instanceof HTMLInputElement) ||
            !(providerModelInput instanceof HTMLInputElement) ||
            !(providerSaveBtn instanceof HTMLButtonElement)) {
          return { ok: false, reason: "provider_form_missing" };
        }

        providerIdInput.focus();
        providerIdInput.value = "openai";
        providerIdInput.dispatchEvent(new Event("input", { bubbles: true }));
        providerKeyInput.value = ${JSON.stringify(apiKey)};
        providerKeyInput.dispatchEvent(new Event("input", { bubbles: true }));
        providerModelInput.value = "gpt-4.1-mini";
        providerModelInput.dispatchEvent(new Event("input", { bubbles: true }));
        providerSaveBtn.click();
        return { ok: true };
      })()`
    );

    if (!result?.ok) {
      throw new Error(`Failed to populate provider form: ${result?.reason || "unknown_reason"}`);
    }

    const saveResult = await waitForFunction(
      cdp,
      page.sessionId,
      `(() => {
        const status = document.getElementById("provider-save-status");
        if (status && !status.hidden && status.textContent.trim()) {
          return { kind: "status", text: status.textContent.trim() };
        }
        const listText = document.getElementById("provider-list")?.textContent?.trim() ?? "";
        const keyInput = document.getElementById("provider-key-input");
        const placeholder = keyInput instanceof HTMLInputElement ? keyInput.placeholder : "";
        if (listText.toLowerCase().includes("openai") || placeholder.includes("••••")) {
          return { kind: "ui", text: listText || placeholder };
        }
        return false;
      })()`,
      10_000
    );

    const providerListText = await evaluate(
      cdp,
      page.sessionId,
      `document.getElementById("provider-list")?.textContent?.trim() ?? ""`
    );

    console.log(JSON.stringify({ saveResult, providerListText }, null, 2));
  } finally {
    await closeTarget(cdp, page.targetId);
    await cdp.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
