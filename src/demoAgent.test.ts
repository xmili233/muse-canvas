import { test } from "node:test";
import assert from "node:assert/strict";
import { createDemoReply } from "./demoAgent.ts";
import { COLORS, makeBoard, makeNode } from "./model.ts";

test("local summary uses text context without modifying the board", () => {
  const board = makeBoard("设计提案");
  board.nodes = [
    makeNode("note", 0, 0, { content: "留白与清晰的层次" }),
    makeNode("image", 300, 0, { content: "不要把图片描述当成笔记" }),
  ];
  const before = structuredClone(board);
  const reply = createDemoReply("整理这块画板", board);
  assert.equal(reply.demo, true);
  assert.ok(reply.suggestions[0].content.includes("留白与清晰的层次"));
  assert.ok(!reply.suggestions[0].content.includes("不要把图片描述当成笔记"));
  assert.equal(reply.suggestions.length, 3);
  assert.ok(reply.suggestions.every((item) => item.kind === "note" && COLORS.includes(item.color)));
  assert.deepEqual(board, before);
});

test("local demo distinguishes action plans from creative directions", () => {
  const board = makeBoard("离线片刻");
  const action = createDemoReply("给我一个行动计划", board);
  const creative = createDemoReply("延伸三个创意方向", board);
  assert.equal(action.suggestions[0].label, "01 / 明确方向");
  assert.equal(creative.suggestions[0].label, "方向一 / 少一点");
  assert.ok(action.suggestions[0].content.includes("离线片刻"));
  assert.notDeepEqual(action.suggestions, creative.suggestions);
});

test("empty canvases can be demonstrated without credentials or a service", () => {
  const reply = createDemoReply("构思一本摄影集", makeBoard("空白画板"));
  assert.ok(reply.message.includes("构思一本摄影集"));
  assert.ok(reply.suggestions[0].content.includes("构思一本摄影集"));
});
