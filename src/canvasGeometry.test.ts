import { test } from "node:test";
import assert from "node:assert/strict";
import {
  connectionPath,
  initialViewport,
  dragNode,
  viewportTransform,
} from "./canvasGeometry.ts";
import { makeNode } from "./model.ts";

test("drag uses world coordinates at any zoom without mutating the stored node", () => {
  const node = makeNode("note", 100, 200);
  const next = dragNode(node, 40, -20, 0.5, false);
  assert.equal(next.x, 180);
  assert.equal(next.y, 160);
  assert.equal(node.x, 100);
});

test("resize keeps the anchor fixed and enforces minimum usable dimensions", () => {
  const node = makeNode("note", -20, 30);
  const next = dragNode(node, -1000, -1000, 2, true);
  assert.deepEqual([next.x, next.y, next.w, next.h], [-20, 30, 150, 90]);
});

test("connections follow the dragged endpoint", () => {
  const from = makeNode("note", 0, 0, { w: 100, h: 100 });
  const to = makeNode("note", 300, 100, { w: 100, h: 100 });
  assert.equal(connectionPath(from, to), "M106 50 C146 50,250 150,290 150");
  assert.equal(
    connectionPath(dragNode(from, 50, 0, 1, false), to),
    "M156 50 C196 50,250 150,290 150",
  );
});

test("viewport serializes a single composite transform", () => {
  assert.equal(
    viewportTransform({ x: -10, y: 25, z: 0.75 }),
    "translate(-10px, 25px) scale(0.75)",
  );
});

test("opening a board preserves readable 100% zoom across viewport widths", () => {
  const node = makeNode("note", 0, 0, { w: 1020, h: 900 });
  for (const width of [390, 896, 1440]) {
    const view = initialViewport([node], width);
    assert.equal(view.z, 1);
    assert.ok(view.x >= 32);
    assert.equal(view.y, 64);
  }
});
