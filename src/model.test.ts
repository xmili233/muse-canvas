import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fitViewport,
  initialWorkspace,
  isBoard,
  loadWorkspace,
  makeBoard,
  makeNode,
  removeNodes,
  workspaceReducer,
} from "./model.ts";

test("canvas edits undo and redo without changing the conversation", () => {
  let state = initialWorkspace();
  const original = state.boards[0];
  const added = makeNode("note", 0, 0);
  state = workspaceReducer(state, {
    type: "canvas",
    id: original.id,
    canvas: { nodes: [...original.nodes, added], edges: original.edges },
  });
  state = workspaceReducer(state, {
    type: "messages",
    id: original.id,
    messages: [{ id: "message", role: "user", content: "hello" }],
  });
  state = workspaceReducer(state, { type: "undo", id: original.id });
  assert.equal(state.boards[0].nodes.length, original.nodes.length);
  assert.equal(state.boards[0].messages[0].content, "hello");
  state = workspaceReducer(state, { type: "redo", id: original.id });
  assert.equal(state.boards[0].nodes.at(-1)?.id, added.id);
  state = workspaceReducer(state, { type: "undo", id: original.id });
  state = workspaceReducer(state, {
    type: "canvas",
    id: original.id,
    canvas: { nodes: [], edges: [] },
  });
  assert.equal(state.future[original.id].length, 0);
});
test("deleting the last board preserves a usable workspace", () => {
  const board = makeBoard();
  const next = workspaceReducer(
    { boards: [board], activeId: board.id, past: {}, future: {} },
    { type: "delete-board", id: board.id },
  );
  assert.equal(next.boards.length, 1);
  assert.equal(next.activeId, next.boards[0].id);
  assert.notEqual(next.activeId, board.id);
});
test("deleting a node removes all attached connections", () => {
  const board = initialWorkspace().boards[0];
  board.edges = [
    { id: "edge-one", from: "cover", to: "idea" },
    { id: "edge-two", from: "idea", to: "cover" },
  ];
  const next = removeNodes(board, ["cover"]);
  assert.equal(next.edges.length, 0);
  assert.ok(!next.nodes.some((n) => n.id === "cover"));
});
test("import validates finite coordinates, images, and connections", () => {
  const board = initialWorkspace().boards[0];
  assert.ok(isBoard(board));
  assert.ok(!isBoard({ ...board, nodes: [{ ...board.nodes[0], x: NaN }] }));
  assert.ok(
    !isBoard({
      ...board,
      nodes: [{ ...board.nodes[0], image: "javascript:alert(1)" }],
    }),
  );
  assert.ok(
    !isBoard({
      ...board,
      edges: [{ id: "edge", from: "idea", to: null }],
    }),
  );
});
test("loading preserves canvas content with or without a conversation", (t) => {
  const board = initialWorkspace().boards[0];
  board.nodes.push(makeNode("note", 20, 30, { content: "保存的内容" }));
  let saved = { ...board, messages: undefined as typeof board.messages | undefined };
  const storage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => JSON.stringify({
        activeId: board.id,
        boards: [saved],
      }),
    },
  });
  t.after(() => {
    if (storage) Object.defineProperty(globalThis, "localStorage", storage);
    else delete (globalThis as { localStorage?: Storage }).localStorage;
  });
  const loaded = loadWorkspace();
  assert.equal(loaded.activeId, board.id);
  assert.deepEqual(loaded.boards[0], board);
  assert.equal(loaded.boards[0].nodes.at(-1)?.content, "保存的内容");
  saved = { ...board, messages: [{ id: "m1", role: "user", content: "旧对话" }] };
  assert.deepEqual(loadWorkspace().boards[0], saved);
  assert.ok(!isBoard({ ...board, messages: [{ id: "m1", role: "assistant", content: "test", suggestions: [null] }] }));
});
test("fit keeps large and negative-coordinate boards visible", () => {
  const node = makeNode("note", -500, -200, { w: 1000, h: 500 });
  const view = fitViewport([node], 900, 700);
  assert.ok(node.x * view.z + view.x >= 0);
  assert.ok((node.x + node.w) * view.z + view.x <= 900);
  assert.ok(Number.isFinite(fitViewport([], 400, 500).z));
});
