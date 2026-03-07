import { describe, expect, it, vi } from "vitest";

import { waitForNavigation, waitForNetworkIdle, waitForSelector } from "../../src/cdp/wait-primitives";
import { FakeTransport } from "./helpers/fake-transport";

describe("waitForNavigation", () => {
  it("resolves when firstContentfulPaint fires for matching session", async () => {
    const transport = new FakeTransport();

    const promise = waitForNavigation(transport, {
      sessionId: "s1",
      timeoutMs: 200
    });

    await transport.emit("Page.lifecycleEvent", {
      sessionId: "s1",
      name: "firstContentfulPaint"
    });

    await expect(promise).resolves.toBeUndefined();
  });

  it("resolves when Page.loadEventFired fires for matching session", async () => {
    const transport = new FakeTransport();

    const promise = waitForNavigation(transport, {
      sessionId: "s1",
      timeoutMs: 200
    });

    await transport.emit("Page.loadEventFired", {
      sessionId: "s1",
      params: {}
    });

    await expect(promise).resolves.toBeUndefined();
  });

  it("ignores events for different sessions", async () => {
    const transport = new FakeTransport();

    const promise = waitForNavigation(transport, {
      sessionId: "s1",
      timeoutMs: 30
    });

    await transport.emit("Page.loadEventFired", {
      sessionId: "s2",
      params: {}
    });

    await expect(promise).rejects.toMatchObject({
      code: "NAVIGATION_TIMEOUT"
    });
  });

  it("rejects when aborted", async () => {
    const transport = new FakeTransport();
    const controller = new AbortController();

    const promise = waitForNavigation(transport, {
      sessionId: "s1",
      timeoutMs: 500,
      signal: controller.signal
    });

    controller.abort();

    await expect(promise).rejects.toMatchObject({
      code: "WAIT_ABORTED"
    });
  });

  it("rejects immediately when already aborted", async () => {
    const transport = new FakeTransport();
    const controller = new AbortController();
    controller.abort();

    await expect(
      waitForNavigation(transport, {
        sessionId: "s1",
        timeoutMs: 500,
        signal: controller.signal
      })
    ).rejects.toMatchObject({
      code: "WAIT_ABORTED"
    });
  });
});

describe("waitForSelector", () => {
  it("resolves when selector matches after polling", async () => {
    const transport = new FakeTransport();

    transport.queueResponse("Runtime.evaluate", {
      result: {
        value: false
      }
    });
    transport.queueResponse("Runtime.evaluate", {
      result: {
        value: true
      }
    });
    transport.queueResponse("DOM.getDocument", {
      root: {
        nodeId: 1
      }
    });
    transport.queueResponse("DOM.querySelector", {
      nodeId: 9
    });
    transport.queueResponse("DOM.describeNode", {
      node: {
        backendNodeId: 404
      }
    });

    const result = await waitForSelector(transport, {
      sessionId: "s1",
      selector: "button[data-test='save']",
      timeoutMs: 200,
      pollIntervalMs: 1
    });

    expect(result).toEqual({ backendNodeId: 404 });
  });

  it("times out when selector never appears", async () => {
    const transport = new FakeTransport();
    for (let i = 0; i < 10; i += 1) {
      transport.queueResponse("Runtime.evaluate", {
        result: {
          value: false
        }
      });
    }

    await expect(
      waitForSelector(transport, {
        sessionId: "s1",
        selector: ".missing",
        timeoutMs: 30,
        pollIntervalMs: 5
      })
    ).rejects.toMatchObject({
      code: "SELECTOR_TIMEOUT"
    });
  });
});

describe("waitForNetworkIdle", () => {
  it("resolves after quiet period with no inflight requests", async () => {
    vi.useFakeTimers();

    try {
      const transport = new FakeTransport();
      const promise = waitForNetworkIdle(transport, {
        sessionId: "s1",
        quietPeriodMs: 30,
        timeoutMs: 200
      });

      await vi.advanceTimersByTimeAsync(50);

      await expect(promise).resolves.toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("resets quiet timer when new request arrives", async () => {
    vi.useFakeTimers();

    try {
      const transport = new FakeTransport();
      const promise = waitForNetworkIdle(transport, {
        sessionId: "s1",
        quietPeriodMs: 40,
        timeoutMs: 500
      });

      await vi.advanceTimersByTimeAsync(20);
      await transport.emit("Network.requestWillBeSent", {
        sessionId: "s1",
        params: {
          requestId: "r1"
        }
      });
      await vi.advanceTimersByTimeAsync(20);
      await transport.emit("Network.loadingFinished", {
        sessionId: "s1",
        params: {
          requestId: "r1"
        }
      });

      await vi.advanceTimersByTimeAsync(30);
      let settled = false;
      void promise.then(() => {
        settled = true;
      });
      expect(settled).toBe(false);

      await vi.advanceTimersByTimeAsync(40);
      await expect(promise).resolves.toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("times out when requests keep coming", async () => {
    vi.useFakeTimers();

    try {
      const transport = new FakeTransport();
      const promise = waitForNetworkIdle(transport, {
        sessionId: "s1",
        quietPeriodMs: 20,
        timeoutMs: 80
      });

      await transport.emit("Network.requestWillBeSent", {
        sessionId: "s1",
        params: {
          requestId: "r1"
        }
      });

      const rejection = expect(promise).rejects.toMatchObject({
        code: "NETWORK_IDLE_TIMEOUT"
      });
      await vi.advanceTimersByTimeAsync(100);
      await rejection;
    } finally {
      vi.useRealTimers();
    }
  });
});
