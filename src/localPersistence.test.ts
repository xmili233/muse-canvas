import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import {
  loadDraft,
  saveDraft,
} from "./localPersistence.ts";
import { loadWorkspace, makeBoard, makeNode, workspaceReducer } from "./model.ts";
import { designSectionFromHash } from "./designRoute.ts";

function memoryStorage(t: TestContext) {
  const values = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete (globalThis as { localStorage?: Storage }).localStorage;
  });
  return values;
}
test("empty and damaged workspace data create Welcome without overwriting valid work", (t) => {
  const values = memoryStorage(t);
  for (const value of [null, "{bad json", JSON.stringify({ boards: [] })]) {
    if (value === null) values.delete("muse-workspace-v3");
    else values.set("muse-workspace-v3", value);
    const workspace = loadWorkspace();
    assert.equal(workspace.boards.length, 1);
    assert.equal(workspace.boards[0].title, "Welcome");
    assert.ok(workspace.boards[0].nodes.length > 0);
  }
  const board = makeBoard("我的内容");
  values.set(
    "muse-workspace-v3",
    JSON.stringify({ boards: [board], activeId: board.id }),
  );
  assert.deepEqual(loadWorkspace().boards, [board]);
  const next = workspaceReducer(loadWorkspace(), {
    type: "delete-board",
    id: board.id,
  });
  assert.equal(next.boards[0].title, "Welcome");
  assert.ok(next.boards[0].nodes.length > 0);
});
test("refresh replaces the old Welcome example and keeps user additions and conversations", (t) => {
  const values = memoryStorage(t);
  const board = makeBoard("Welcome");
  const added = makeNode("note", 100, 900, { content: "我的新想法" });
  board.nodes = [
    makeNode("banner", 0, 0, { id: "headline", content: "Node Examples" }),
    makeNode("sticker", 300, 200, { id: "cover", content: "flower" }),
    makeNode("link", 300, 500, { id: "link", content: "causal.so" }),
    added,
  ];
  board.messages = [{ id: "chat", role: "user", content: "保留这段对话" }];
  const other = makeBoard("我的画板");
  values.set("muse-workspace-v3", JSON.stringify({ boards: [board, other], activeId: board.id }));
  const next = loadWorkspace();
  assert.equal(next.activeId, board.id);
  assert.equal(next.boards[0].id, board.id);
  assert.ok(next.boards[0].nodes.some((node) => node.image === "/welcome/city-walk.webp"));
  assert.ok(!next.boards[0].nodes.some((node) => node.content === "Node Examples"));
  assert.deepEqual(next.boards[0].nodes.at(-1), added);
  assert.deepEqual(next.boards[0].messages, board.messages);
  assert.deepEqual(next.boards[1], other);
  next.boards[0].nodes[0].content = "我修改过的新示例";
  values.set("muse-workspace-v3", JSON.stringify(next));
  assert.equal(loadWorkspace().boards[0].nodes[0].content, "我修改过的新示例");
});

test("drafts restore independently per board and can be cleared", (t) => {
  memoryStorage(t);
  saveDraft("a", "尚未发送");
  saveDraft("b", "另一个想法");
  assert.equal(loadDraft("a"), "尚未发送");
  assert.equal(loadDraft("b"), "另一个想法");
  saveDraft("a", "");
  assert.equal(loadDraft("a"), "");
  assert.equal(loadDraft("b"), "另一个想法");
});
test("design deep links handle malformed input and regular workspace URLs", () => {
  assert.equal(designSectionFromHash(""), null);
  assert.equal(designSectionFromHash("#other"), null);
  assert.equal(designSectionFromHash("#design"), "overview");
  assert.equal(designSectionFromHash("#design/tools"), "tools");
  assert.equal(designSectionFromHash("#design/%E0%A4%A"), "overview");
});
