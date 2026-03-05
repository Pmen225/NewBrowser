const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp"
]);

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp"
]);

const TEXT_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".json",
  ".csv",
  ".tsv",
  ".html",
  ".htm",
  ".xml",
  ".yml",
  ".yaml",
  ".log",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".css"
]);

const TEXT_MIME_TYPES = new Set([
  "application/json",
  "application/ld+json",
  "application/xml",
  "application/x-yaml",
  "application/yaml"
]);

function getExtension(name) {
  if (typeof name !== "string") {
    return "";
  }
  const lastDot = name.lastIndexOf(".");
  if (lastDot <= 0) {
    return "";
  }
  return name.slice(lastDot).toLowerCase();
}

function clampText(text, maxChars) {
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) {
    return "";
  }
  if (!Number.isFinite(maxChars) || maxChars <= 0 || trimmed.length <= maxChars) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxChars)}...`;
}

async function readTextFromFile(fileLike) {
  if (typeof fileLike?.text === "function") {
    return fileLike.text();
  }

  if (typeof FileReader === "function" && fileLike instanceof Blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("file_read_failed"));
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.readAsText(fileLike);
    });
  }

  throw new Error("file_read_unsupported");
}

export function isImageFile(fileLike) {
  if (!fileLike || typeof fileLike !== "object") return false;
  const mimeType = typeof fileLike.type === "string" ? fileLike.type.toLowerCase() : "";
  if (mimeType.startsWith("image/") || IMAGE_MIME_TYPES.has(mimeType)) return true;
  return IMAGE_EXTENSIONS.has(getExtension(fileLike.name));
}

export async function readImageAsDataUrl(fileLike) {
  if (typeof fileLike?.arrayBuffer === "function") {
    const buffer = await fileLike.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const b64 = btoa(binary);
    const mime = (typeof fileLike.type === "string" && fileLike.type) ? fileLike.type : "image/png";
    return `data:${mime};base64,${b64}`;
  }
  if (typeof FileReader === "function" && fileLike instanceof Blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("image_read_failed"));
      reader.onload = () => resolve(/** @type {string} */ (reader.result));
      reader.readAsDataURL(fileLike);
    });
  }
  throw new Error("image_read_unsupported");
}

export async function readImportedImageAttachments(files) {
  const attachments = [];
  const list = Array.isArray(files) ? files : Array.from(files ?? []);
  for (const fileLike of list) {
    if (!isImageFile(fileLike)) continue;
    let dataUrl = "";
    try {
      dataUrl = await readImageAsDataUrl(fileLike);
    } catch { continue; }
    if (!dataUrl) continue;
    attachments.push({
      id: `${Date.now()}-${attachments.length}`,
      type: "image",
      source: "local",
      name: typeof fileLike.name === "string" && fileLike.name.trim() ? fileLike.name.trim() : `Image ${attachments.length + 1}`,
      mimeType: typeof fileLike.type === "string" ? fileLike.type : "image/png",
      dataUrl,
      sizeBytes: typeof fileLike.size === "number" && Number.isFinite(fileLike.size) ? fileLike.size : undefined
    });
  }
  return attachments;
}

export function isReadableTextFile(fileLike) {
  if (!fileLike || typeof fileLike !== "object") {
    return false;
  }

  const mimeType = typeof fileLike.type === "string" ? fileLike.type.toLowerCase() : "";
  if (mimeType.startsWith("text/") || TEXT_MIME_TYPES.has(mimeType)) {
    return true;
  }

  return TEXT_EXTENSIONS.has(getExtension(fileLike.name));
}

export async function readImportedAttachments(files, { maxCharsPerAttachment = 4000 } = {}) {
  const attachments = [];
  const list = Array.isArray(files) ? files : Array.from(files ?? []);

  for (const fileLike of list) {
    if (!isReadableTextFile(fileLike)) {
      continue;
    }

    let rawText = "";
    try {
      rawText = await readTextFromFile(fileLike);
    } catch {
      continue;
    }

    const textContent = clampText(rawText, maxCharsPerAttachment);
    if (!textContent) {
      continue;
    }

    attachments.push({
      id: `${Date.now()}-${attachments.length}`,
      source: "local",
      name:
        typeof fileLike.name === "string" && fileLike.name.trim().length > 0
          ? fileLike.name.trim()
          : `File ${attachments.length + 1}`,
      mimeType: typeof fileLike.type === "string" ? fileLike.type : "",
      textContent,
      sizeBytes: typeof fileLike.size === "number" && Number.isFinite(fileLike.size) ? fileLike.size : undefined,
      isTextReadable: true
    });
  }

  return attachments;
}

export function buildAttachmentPromptPrefix(attachments) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return "";
  }

  const sections = attachments
    .filter((attachment) => typeof attachment?.textContent === "string" && attachment.textContent.trim().length > 0)
    .map((attachment) => {
      const name = typeof attachment.name === "string" && attachment.name.trim().length > 0
        ? attachment.name.trim()
        : "Attachment";
      return `[Attached file: ${name}]\n${attachment.textContent.trim()}`;
    });

  return sections.length > 0 ? `${sections.join("\n\n")}\n\n` : "";
}
