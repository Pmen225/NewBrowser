function safeWindow() {
  return typeof window === "undefined" ? null : window;
}

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

export function isDictationSupported() {
  const win = safeWindow();
  return Boolean(win && (win.SpeechRecognition || win.webkitSpeechRecognition));
}

export function createDictationController({ onText, onInterim, onError, language, continuous, interim } = {}) {
  const win = safeWindow();
  const Recognition = win?.SpeechRecognition || win?.webkitSpeechRecognition;
  if (!Recognition) {
    return {
      supported: false,
      active: false,
      start() {},
      stop() {},
      toggle() {}
    };
  }

  const useContinuous = continuous === true;
  const useInterim    = interim === true;
  const useLang       = typeof language === "string" && language.trim().length > 0 ? language.trim() : "";

  let active = false;
  let recognition = null;

  const ensure = () => {
    if (recognition) {
      return recognition;
    }
    recognition = new Recognition();
    recognition.continuous      = useContinuous;
    recognition.interimResults  = useInterim;
    recognition.maxAlternatives = 1;
    if (useLang) recognition.lang = useLang;
    recognition.onresult = (event) => {
      try {
        if (useContinuous || useInterim) {
          // In continuous/interim mode, stream partial results
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result?.[0]?.transcript;
            if (typeof transcript !== "string" || !transcript.trim()) continue;
            if (result.isFinal) {
              onText?.(transcript.trim());
            } else {
              onInterim?.(transcript.trim());
            }
          }
        } else {
          const result = event.results?.[event.resultIndex ?? 0];
          if (result?.isFinal === false) return;
          const transcript = result?.[0]?.transcript;
          if (typeof transcript === "string" && transcript.trim().length > 0) {
            onText?.(transcript.trim());
          }
        }
      } catch {}
    };
    recognition.onerror = (event) => {
      active = false;
      onError?.(typeof event?.error === "string" ? event.error : "speech_error");
    };
    recognition.onend = () => {
      active = false;
    };
    return recognition;
  };

  return {
    supported: true,
    get active() {
      return active;
    },
    start() {
      try {
        ensure().start();
        active = true;
      } catch (error) {
        active = false;
        onError?.(error instanceof Error ? error.message : "speech_error");
      }
    },
    stop() {
      try {
        recognition?.stop?.();
      } catch {}
      active = false;
    },
    toggle() {
      if (active) {
        this.stop();
      } else {
        this.start();
      }
    }
  };
}
