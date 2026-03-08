import type { CdpClient, CdpFrameTree, FrameInfo, FrameMap, SnapshotIndex } from "./types";

function flattenFrames(root: CdpFrameTree): FrameInfo[] {
  const frames: FrameInfo[] = [];
  let ordinal = 0;

  const walk = (node: CdpFrameTree, parentFrameId?: string): void => {
    const frameId = node.frame.id;
    frames.push({
      frame_id: frameId,
      parent_frame_id: parentFrameId,
      frame_ordinal: ordinal,
      ref_prefix: `f${ordinal}`,
      offset: { x: 0, y: 0 }
    });
    ordinal += 1;

    if (node.childFrames) {
      for (const child of node.childFrames) {
        walk(child, frameId);
      }
    }
  };

  walk(root);
  return frames;
}

function indexByFrameId(frames: FrameInfo[]): Map<string, FrameInfo> {
  return new Map(frames.map((frame) => [frame.frame_id, frame]));
}

export async function buildFrameMap(cdp: CdpClient): Promise<FrameMap> {
  const { frameTree } = await cdp.Page.getFrameTree();
  const frames = flattenFrames(frameTree);

  for (const frame of frames) {
    if (!frame.parent_frame_id) {
      continue;
    }

    try {
      const owner = await cdp.DOM.getFrameOwner({ frameId: frame.frame_id });
      frame.owner_backend_node_id = owner.backendNodeId;
    } catch {
      frame.owner_backend_node_id = undefined;
    }
  }

  return {
    root_frame_id: frameTree.frame.id,
    frames,
    by_frame_id: indexByFrameId(frames)
  };
}

export function applyFrameOffsets(frameMap: FrameMap, snapshotsByFrame: Map<string, SnapshotIndex>): FrameMap {
  const framesById = new Map<string, FrameInfo>();
  const sortedFrames = [...frameMap.frames].sort((a, b) => a.frame_ordinal - b.frame_ordinal);

  for (const frame of sortedFrames) {
    if (!frame.parent_frame_id) {
      framesById.set(frame.frame_id, {
        ...frame,
        offset: { x: 0, y: 0 }
      });
      continue;
    }

    const parent = framesById.get(frame.parent_frame_id);
    const parentOffset = parent ? parent.offset : { x: 0, y: 0 };

    let ownerOffset = { x: 0, y: 0 };
    if (frame.owner_backend_node_id !== undefined) {
      const parentSnapshot = snapshotsByFrame.get(frame.parent_frame_id);
      const ownerNode = parentSnapshot?.by_backend_node_id.get(frame.owner_backend_node_id);
      if (ownerNode?.bbox) {
        ownerOffset = {
          x: ownerNode.bbox.x,
          y: ownerNode.bbox.y
        };
      }
    }

    framesById.set(frame.frame_id, {
      ...frame,
      offset: {
        x: parentOffset.x + ownerOffset.x,
        y: parentOffset.y + ownerOffset.y
      }
    });
  }

  const frames = frameMap.frames.map((frame) => {
    const resolved = framesById.get(frame.frame_id);
    return resolved ? resolved : frame;
  });

  return {
    root_frame_id: frameMap.root_frame_id,
    frames,
    by_frame_id: indexByFrameId(frames)
  };
}
