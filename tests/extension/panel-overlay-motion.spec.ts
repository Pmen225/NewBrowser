import { describe, expect, it } from "vitest";

import {
  deriveOverlayCueForToolDone,
  deriveOverlayCueForToolStart
} from "../../extension/panel.js";

describe("panel overlay motion", () => {
  it("plans immediate cursor motion for coordinate-based computer clicks", () => {
    expect(
      deriveOverlayCueForToolStart("computer", {
        action: "click",
        coordinate: [240, 180]
      })
    ).toEqual({
      cursor: {
        x: 240,
        y: 180
      },
      click: {
        x: 240,
        y: 180
      }
    });
  });

  it("keeps navigate and reading phases visibly active without faking a giant highlight box", () => {
    expect(
      deriveOverlayCueForToolStart("navigate", {
        url: "https://example.com"
      })
    ).toEqual({
      cursor: {
        x: 0.82,
        y: 0.08
      }
    });

    expect(deriveOverlayCueForToolStart("read_page", {})).toEqual({
      cursor: {
        x: 0.5,
        y: 0.18
      }
    });

    expect(deriveOverlayCueForToolStart("get_page_text", {})).toEqual({
      cursor: {
        x: 0.5,
        y: 0.18
      }
    });
  });

  it("replays resolved target geometry from completed tool events", () => {
    expect(
      deriveOverlayCueForToolDone("computer", {
        cursor: { x: 512, y: 288 },
        click: { x: 512, y: 288 },
        highlight: { x: 480, y: 240, w: 96, h: 72 }
      })
    ).toEqual({
      cursor: {
        x: 512,
        y: 288
      },
      click: {
        x: 512,
        y: 288
      },
      highlight: {
        x: 480,
        y: 240,
        w: 96,
        h: 72
      }
    });
  });

  it("uses find-result coordinates when the backend resolves a concrete match", () => {
    expect(
      deriveOverlayCueForToolDone("find", {
        cursor: { x: 60, y: 35 }
      })
    ).toEqual({
      cursor: {
        x: 60,
        y: 35
      }
    });
  });
});
