import type { InteractableNode } from "./types";

function escapeString(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return `${value}`;
  }
  return `${Math.round(value * 100) / 100}`;
}

export function renderInteractablesYaml(nodes: InteractableNode[]): string {
  if (nodes.length === 0) {
    return "interactables: []";
  }

  const grouped = new Map<string, InteractableNode[]>();
  for (const node of nodes) {
    const existing = grouped.get(node.frame_id);
    if (existing) {
      existing.push(node);
      continue;
    }
    grouped.set(node.frame_id, [node]);
  }

  const lines: string[] = ["interactables:"];

  for (const [frameId, frameNodes] of grouped.entries()) {
    lines.push(`  - frame_id: \"${escapeString(frameId)}\"`);
    lines.push("    nodes:");

    for (const node of frameNodes) {
      lines.push(`      - ref_id: \"${escapeString(node.ref_id)}\"`);
      lines.push(`        role: \"${escapeString(node.role)}\"`);
      if (node.name) {
        lines.push(`        name: \"${escapeString(node.name)}\"`);
      }
      if (node.state) {
        lines.push("        state:");
        if (node.state.checked !== undefined) {
          lines.push(`          checked: ${node.state.checked}`);
        }
        if (node.state.disabled !== undefined) {
          lines.push(`          disabled: ${node.state.disabled}`);
        }
        if (node.state.expanded !== undefined) {
          lines.push(`          expanded: ${node.state.expanded}`);
        }
        if (node.state.selected !== undefined) {
          lines.push(`          selected: ${node.state.selected}`);
        }
        if (node.state.value !== undefined) {
          lines.push(`          value: \"${escapeString(node.state.value)}\"`);
        }
        if (Array.isArray(node.state.options) && node.state.options.length > 0) {
          lines.push("          options:");
          for (const option of node.state.options) {
            lines.push(`            - \"${escapeString(option)}\"`);
          }
        }
      }
      lines.push(
        `        bbox: {x: ${formatNumber(node.bbox.x)}, y: ${formatNumber(node.bbox.y)}, w: ${formatNumber(node.bbox.w)}, h: ${formatNumber(node.bbox.h)}}`
      );
      lines.push(
        `        click: {x: ${formatNumber(node.click.x)}, y: ${formatNumber(node.click.y)}}`
      );
      lines.push(`        source: \"${node.source}\"`);
      lines.push(
        `        actions: [${node.actions.map((action) => `\"${action}\"`).join(", ")}]`
      );
    }
  }

  return lines.join("\n");
}
