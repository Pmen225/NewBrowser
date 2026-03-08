import { afterEach, describe, expect, it, vi } from "vitest";
import { createAudioRecorderController, resolveRecordingMimeType } from "../../extension/lib/speech.js";

function makeWindow({ supportedMimeTypes }) {
  class FakeMediaRecorder {
    static isTypeSupported(value) {
      return supportedMimeTypes.includes(value);
    }

    constructor(stream, options = {}) {
      this.stream = stream;
      this.mimeType = options.mimeType ?? "";
    }

    start() {}

    stop() {
      if (typeof this.onstop === "function") {
        this.onstop();
      }
    }
  }

  return {
    MediaRecorder: FakeMediaRecorder,
    navigator: {
      mediaDevices: {
        async getUserMedia() {
          return {
            getTracks() {
              return [{ stop() {} }];
            }
          };
        }
      }
    }
  };
}

describe("speech recording helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("picks the first supported recording mime type", () => {
    const fakeWindow = makeWindow({
      supportedMimeTypes: ["audio/mp4", "audio/webm"]
    });
    expect(resolveRecordingMimeType("audio/ogg;codecs=opus", fakeWindow)).toBe("audio/webm");
  });

  it("falls back to a supported mime type when the preferred one is unavailable", async () => {
    const fakeWindow = makeWindow({
      supportedMimeTypes: ["audio/mp4"]
    });
    vi.stubGlobal("window", fakeWindow);

    const controller = createAudioRecorderController({
      mimeType: "audio/webm;codecs=opus",
      onError: vi.fn()
    });

    await controller.start();

    expect(controller.state).toBe("recording");
    expect(controller.supported).toBe(true);
    expect(controller.stop).toBeTypeOf("function");
    expect(controller.state).toBe("recording");
  });
});
