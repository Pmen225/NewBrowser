import { describe, expect, it } from "vitest";

import { filterInteractables } from "../../src/sidecar/read-page/interactable-filter";

describe("filterInteractables", () => {
  it("drops oversized generic wrapper nodes when concrete controls are present", () => {
    const result = filterInteractables({
      frame_id: "frame-1",
      frame_ordinal: 0,
      ref_prefix: "f0",
      filter_mode: "interactive",
      ax_nodes: [
        {
          nodeId: "1",
          backendDOMNodeId: 101,
          role: { value: "button" },
          name: { value: "Submit" }
        }
      ],
      snapshot_index: {
        frame_id: "frame-1",
        by_backend_node_id: new Map([
          [
            101,
            {
              backend_node_id: 101,
              bbox: { x: 8, y: 88, w: 72, h: 24 },
              is_clickable: true,
              is_visible: true
            }
          ],
          [
            999,
            {
              backend_node_id: 999,
              bbox: { x: 0, y: 0, w: 1280, h: 240 },
              is_clickable: true,
              is_visible: true
            }
          ]
        ])
      },
      focus_backend_node_id: undefined
    });

    expect(result.nodes).toEqual([
      expect.objectContaining({
        ref_id: "f0:101",
        role: "button",
        name: "Submit"
      })
    ]);
  });
});
