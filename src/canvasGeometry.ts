import { bounds, type CanvasNode } from "./model.ts";

export type Viewport = { x: number; y: number; z: number };
export const viewportTransform = (view: Viewport) =>
  `translate(${view.x}px, ${view.y}px) scale(${view.z})`;

export function dragNode(
  node: CanvasNode,
  dx: number,
  dy: number,
  zoom: number,
  resize: boolean,
): CanvasNode {
  return resize
    ? {
        ...node,
        w: Math.max(150, node.w + dx / zoom),
        h: Math.max(90, node.h + dy / zoom),
      }
    : { ...node, x: node.x + dx / zoom, y: node.y + dy / zoom };
}

export function connectionPath(from: CanvasNode, to: CanvasNode) {
  const x1 = from.x + from.w + 6,
    y1 = from.y + from.h / 2;
  const x2 = to.x - 10,
    y2 = to.y + to.h / 2;
  return `M${x1} ${y1} C${x1 + 40} ${y1},${x2 - 40} ${y2},${x2} ${y2}`;
}

export function initialViewport(nodes: CanvasNode[], width: number): Viewport {
  const box = bounds(nodes);
  return { z: 1, x: Math.max(32, (width - box.w) / 2) - box.x, y: 64 - box.y };
}
