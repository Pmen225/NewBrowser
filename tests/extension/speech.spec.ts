import { afterEach, describe, expect, it, vi } from "vitest";

import { createDictationController } from "../../extension/lib/speech.js";

class MockSpeechRecognition {
  static instances = [];

  continuous = false;
  interimResults = false;
  maxAlternatives = 0;
  onresult = null;
  onerror = null;
  onend = null;
  started = 0;
  stopped = 0;

  constructor() {
    MockSpeechRecognition.instances.push(this);
  }

  start() {
    this.started += 1;
  }

  stop() {
    this.stopped += 1;
    this.onend?.();
  }
}

describe("dictation controller", () => {
  afterEach(() => {
    MockSpeechRecognition.instances.length = 0;
    vi.unstubAllGlobals();
  });

  it("forwards only finalized transcripts by default", () => {
    const onText = vi.fn();

    vi.stubGlobal("window", {
      SpeechRecognition: MockSpeechRecognition
    });

    const controller = createDictationController({ onText });
    controller.start();

    const recognition = MockSpeechRecognition.instances[0];
    expect(recognition.interimResults).toBe(false);

    const interim = Object.assign([{ transcript: "draft" }], { isFinal: false });
    const final = Object.assign([{ transcript: "final text" }], { isFinal: true });

    recognition.onresult?.({
      resultIndex: 0,
      results: [interim, final]
    });
    expect(onText).not.toHaveBeenCalled();

    recognition.onresult?.({
      resultIndex: 1,
      results: [interim, final]
    });
    expect(onText).toHaveBeenCalledTimes(1);
    expect(onText).toHaveBeenCalledWith("final text");
  });

  it("only emits interim callbacks when interim mode is explicitly enabled", () => {
    const onText = vi.fn();
    const onInterim = vi.fn();

    vi.stubGlobal("window", {
      SpeechRecognition: MockSpeechRecognition
    });

    const controller = createDictationController({ onText, onInterim, interim: true });
    controller.start();

    const recognition = MockSpeechRecognition.instances[0];
    expect(recognition.interimResults).toBe(true);

    const interim = Object.assign([{ transcript: "draft" }], { isFinal: false });
    const final = Object.assign([{ transcript: "final text" }], { isFinal: true });

    recognition.onresult?.({
      resultIndex: 0,
      results: [interim, final]
    });

    expect(onInterim).toHaveBeenCalledWith("draft");
    expect(onText).toHaveBeenCalledWith("final text");
  });
});
