(function initPageTargets() {
  if (globalThis.__atlasPageTargetsLoaded) return;
  globalThis.__atlasPageTargetsLoaded = true;

  const SUBJECT_TERMS = ["subject", "title", "headline"];
  const BODY_TERMS = ["message", "body", "reply", "comment", "description", "details", "notes", "content"];
  const trackedTargets = new Map();
  const elementToId = new WeakMap();

  function normaliseText(value) {
    return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function includesAny(value, terms) {
    return terms.some((term) => value.includes(term));
  }

  function isEditableElement(element) {
    if (!(element instanceof HTMLElement)) return false;
    if (element instanceof HTMLTextAreaElement) return true;
    if (element instanceof HTMLInputElement) {
      const type = normaliseText(element.type || "text");
      return ["", "text", "search", "url"].includes(type);
    }
    return element.isContentEditable === true;
  }

  function getEditableTarget(node) {
    if (!(node instanceof Element)) return null;
    const direct = node.closest("textarea, input, [contenteditable=''], [contenteditable='true']");
    return isEditableElement(direct) ? direct : null;
  }

  function ensureTargetId(element) {
    const existing = elementToId.get(element);
    if (existing) return existing;
    const nextId = `atlas-target-${crypto.randomUUID()}`;
    elementToId.set(element, nextId);
    trackedTargets.set(nextId, {
      element,
      selectionStart: undefined,
      selectionEnd: undefined,
      range: undefined
    });
    return nextId;
  }

  function getElementHintText(element) {
    const labelId = element.getAttribute("aria-labelledby");
    const labelText = labelId
      ? labelId
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent ?? "")
          .join(" ")
      : "";

    return normaliseText([
      element.getAttribute("aria-label"),
      element.getAttribute("placeholder"),
      element.getAttribute("name"),
      element.getAttribute("id"),
      labelText
    ].filter(Boolean).join(" "));
  }

  function classifyRole(element, hintText) {
    if (element.isContentEditable) return "body";
    if (element instanceof HTMLTextAreaElement) {
      if (includesAny(hintText, SUBJECT_TERMS)) return "subject";
      return "body";
    }
    if (element instanceof HTMLInputElement) {
      if (includesAny(hintText, SUBJECT_TERMS)) return "subject";
      if (includesAny(hintText, BODY_TERMS) && normaliseText(element.type || "text") === "text") return "body";
    }
    return null;
  }

  function snapshotSelection(element, tracked) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      tracked.selectionStart = typeof element.selectionStart === "number" ? element.selectionStart : element.value.length;
      tracked.selectionEnd = typeof element.selectionEnd === "number" ? element.selectionEnd : tracked.selectionStart;
      tracked.range = undefined;
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!element.contains(range.commonAncestorContainer)) return;
    tracked.range = range.cloneRange();
  }

  function buildTargetSnapshot(element, role, targetId, hintText) {
    return {
      targetId,
      role,
      tagName: element.tagName.toLowerCase(),
      inputType: element instanceof HTMLInputElement ? normaliseText(element.type || "text") : undefined,
      isContentEditable: element.isContentEditable === true,
      label: hintText,
      placeholder: element.getAttribute("placeholder") || "",
      canInsertHtml: false,
      updatedAt: Date.now()
    };
  }

  function publishTarget(role, target) {
    chrome.runtime.sendMessage({
      type: "ATLAS_INSERT_CONTEXT_UPDATE",
      role,
      target
    }).catch(() => {});
  }

  function rememberFocusedTarget(element) {
    const hintText = getElementHintText(element);
    const role = classifyRole(element, hintText);
    if (!role) return;

    const targetId = ensureTargetId(element);
    const tracked = trackedTargets.get(targetId);
    if (!tracked) return;
    snapshotSelection(element, tracked);
    publishTarget(role, buildTargetSnapshot(element, role, targetId, hintText));
  }

  function restoreEditableRange(element, tracked) {
    if (!tracked?.range || !tracked.range.commonAncestorContainer?.isConnected) {
      const fallback = document.createRange();
      fallback.selectNodeContents(element);
      fallback.collapse(false);
      return fallback;
    }
    return tracked.range.cloneRange();
  }

  function insertTextIntoControl(element, tracked, text, replaceAll) {
    element.focus();
    if (replaceAll) {
      element.setSelectionRange(0, element.value.length);
      element.setRangeText(text, 0, element.value.length, "end");
    } else {
      const start = typeof tracked?.selectionStart === "number" ? tracked.selectionStart : element.value.length;
      const end = typeof tracked?.selectionEnd === "number" ? tracked.selectionEnd : start;
      element.setSelectionRange(start, end);
      element.setRangeText(text, start, end, "end");
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function buildTextFragment(text) {
    const fragment = document.createDocumentFragment();
    const lines = String(text).split("\n");
    lines.forEach((line, index) => {
      fragment.appendChild(document.createTextNode(line));
      if (index < lines.length - 1) {
        fragment.appendChild(document.createElement("br"));
      }
    });
    return fragment;
  }

  function insertTextIntoContentEditable(element, tracked, text) {
    element.focus();
    const selection = window.getSelection();
    if (!selection) throw new Error("Selection unavailable");
    const range = restoreEditableRange(element, tracked);
    selection.removeAllRanges();
    selection.addRange(range);
    range.deleteContents();
    const fragment = buildTextFragment(text);
    range.insertNode(fragment);
    selection.removeAllRanges();
    const collapseRange = document.createRange();
    collapseRange.selectNodeContents(element);
    collapseRange.collapse(false);
    selection.addRange(collapseRange);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function applyDraft(role, targetId, artifact) {
    const tracked = trackedTargets.get(targetId);
    const element = tracked?.element;
    if (!element || !element.isConnected) {
      trackedTargets.delete(targetId);
      return { ok: false, role, error: "stale_target" };
    }

    if (role === "subject") {
      const text = String(artifact?.subject ?? "").trim();
      if (!text) return { ok: false, role, error: "insertion_failed" };
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        insertTextIntoControl(element, tracked, text, true);
        return { ok: true, role };
      }
      return { ok: false, role, error: "insertion_failed" };
    }

    const text = String(artifact?.body_text ?? artifact?.body_markdown ?? "").trim();
    if (!text) return { ok: false, role, error: "insertion_failed" };
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      insertTextIntoControl(element, tracked, text, false);
      return { ok: true, role };
    }
    if (element.isContentEditable) {
      insertTextIntoContentEditable(element, tracked, text);
      return { ok: true, role };
    }
    return { ok: false, role, error: "insertion_failed" };
  }

  document.addEventListener("focusin", (event) => {
    const target = getEditableTarget(event.target);
    if (!target) return;
    rememberFocusedTarget(target);
  }, true);

  document.addEventListener("selectionchange", () => {
    const active = getEditableTarget(document.activeElement);
    if (!active) return;
    const targetId = elementToId.get(active);
    if (!targetId) return;
    const tracked = trackedTargets.get(targetId);
    if (!tracked) return;
    snapshotSelection(active, tracked);
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== "ATLAS_INSERT_DRAFT") return;
    sendResponse(applyDraft(message.role, message.targetId, message.artifact));
    return true;
  });
})();
