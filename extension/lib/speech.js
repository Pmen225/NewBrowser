function safeWindow() {
  return typeof window === "undefined" ? null : window;
}

const DEFAULT_RECORDING_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus"
];

export function isNarrationSupported() {
  const win = safeWindow();
  return Boolean(win?.speechSynthesis && typeof win.SpeechSynthesisUtterance === "function");
}

export function stopNarration() {
  const win = safeWindow();
  try {
    win?.speechSynthesis?.cancel?.();
  } catch {}
}

export function speakText(text, { rate = 1, pitch = 1, lang } = {}) {
  const win = safeWindow();
  if (!isNarrationSupported()) {
    return { ok: false, error: "narration_unavailable" };
  }

  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) {
    return { ok: false, error: "empty" };
  }

  try {
    const utterance = new win.SpeechSynthesisUtterance(trimmed);
    if (typeof lang === "string" && lang.trim().length > 0) {
      utterance.lang = lang.trim();
    }
    if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
      utterance.rate = rate;
    }
    if (typeof pitch === "number" && Number.isFinite(pitch) && pitch > 0) {
      utterance.pitch = pitch;
    }
    win.speechSynthesis.cancel();
    win.speechSynthesis.speak(utterance);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "unknown" };
  }
}

export function isAudioRecordingSupported() {
  const win = safeWindow();
  return Boolean(
    win &&
    typeof win.MediaRecorder === "function" &&
    typeof win.navigator?.mediaDevices?.getUserMedia === "function"
  );
}

export function resolveRecordingMimeType(preferredMimeType, win = safeWindow()) {
  if (!win || typeof win.MediaRecorder !== "function") {
    return null;
  }

  const candidates = [];
  if (typeof preferredMimeType === "string" && preferredMimeType.trim().length > 0) {
    candidates.push(preferredMimeType.trim());
  }
  for (const candidate of DEFAULT_RECORDING_MIME_TYPES) {
    if (!candidates.includes(candidate)) {
      candidates.push(candidate);
    }
  }

  const supportsMimeType = typeof win.MediaRecorder.isTypeSupported === "function"
    ? win.MediaRecorder.isTypeSupported.bind(win.MediaRecorder)
    : null;
  if (!supportsMimeType) {
    return candidates[0] ?? null;
  }

  for (const candidate of candidates) {
    try {
      if (supportsMimeType(candidate) === true) {
        return candidate;
      }
    } catch {}
  }

  return null;
}

export function createAudioRecorderController({ onChunk, onStateChange, onError, mimeType } = {}) {
  const win = safeWindow();
  if (!isAudioRecordingSupported()) {
    return {
      supported: false,
      state: "idle",
      async start() {},
      async stop() { return null; },
      async toggle() { return null; }
    };
  }

  let state = "idle";
  let recorder = null;
  let stream = null;
  let chunks = [];

  const setState = (nextState) => {
    state = nextState;
    onStateChange?.(nextState);
  };

  const cleanup = () => {
    if (stream) {
      for (const track of stream.getTracks()) {
        try {
          track.stop();
        } catch {}
      }
    }
    stream = null;
    recorder = null;
  };

  return {
    supported: true,
    get state() {
      return state;
    },
    async start() {
      if (state === "recording") {
        return;
      }

      try {
        stream = await win.navigator.mediaDevices.getUserMedia({ audio: true });
        chunks = [];
        const resolvedMimeType = resolveRecordingMimeType(mimeType, win);
        recorder = resolvedMimeType
          ? new win.MediaRecorder(stream, { mimeType: resolvedMimeType })
          : new win.MediaRecorder(stream);
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
            onChunk?.(event.data);
          }
        };
        recorder.onerror = (event) => {
          setState("idle");
          cleanup();
          onError?.(typeof event?.error?.message === "string" ? event.error.message : "audio_recording_error");
        };
        recorder.onstop = () => {
          setState("idle");
          cleanup();
        };
        recorder.start();
        setState("recording");
      } catch (error) {
        setState("idle");
        cleanup();
        onError?.(error instanceof Error ? error.message : "audio_recording_error");
      }
    },
    async stop() {
      if (!recorder || state !== "recording") {
        return null;
      }

      return await new Promise((resolve) => {
        const activeRecorder = recorder;
        activeRecorder.onstop = async () => {
          try {
            const outputMimeType =
              typeof activeRecorder.mimeType === "string" && activeRecorder.mimeType.trim().length > 0
                ? activeRecorder.mimeType.trim()
                : resolveRecordingMimeType(mimeType, win) ?? "audio/webm";
            const blob = new Blob(chunks, { type: outputMimeType });
            const arrayBuffer = await blob.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = "";
            for (const value of bytes) {
              binary += String.fromCharCode(value);
            }
            setState("idle");
            cleanup();
            resolve({
              mimeType: outputMimeType,
              base64: btoa(binary)
            });
          } catch (error) {
            setState("idle");
            cleanup();
            onError?.(error instanceof Error ? error.message : "audio_recording_error");
            resolve(null);
          }
        };
        setState("stopping");
        try {
          activeRecorder.stop();
        } catch {
          setState("idle");
          cleanup();
          resolve(null);
        }
      });
    },
    async toggle() {
      if (state === "recording") {
        return await this.stop();
      }
      if (state === "stopping") {
        return null;
      }
      await this.start();
      return null;
    }
  };
}
