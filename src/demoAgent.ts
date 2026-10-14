import { COLORS, type Board, type Suggestion } from "./model.ts";

export function createDemoReply(
  prompt: string,
  board: Pick<Board, "title" | "nodes">,
): { demo: true; message: string; suggestions: Suggestion[] } {
  const topic =
    board.title === "空白画板" || board.title === "未命名画板"
      ? prompt.slice(0, 28)
      : board.title;
  const content = board.nodes
    .filter((n) => !["image", "drawing", "sticker", "swatch"].includes(n.kind))
    .map((n) => n.content)
    .join("；");
  let items;
  if (/行动|下一步|计划|执行/.test(prompt)) {
    items = [
      [
        "01 / 明确方向",
        `为「${topic}」写下一句话目标。\n\n明确为谁创造，以及希望带来的改变。`,
      ],
      [
        "02 / 做一个小实验",
        "选出一个最有把握的想法，\n制作一个能被体验的最小版本。\n\n把注意力放在核心体验。",
      ],
      [
        "03 / 收集真实反馈",
        "邀请 3 位目标用户体验，\n记录他们的第一反应。\n\n保留有效的部分，再向前一步。",
      ],
    ];
  } else if (/创意|延伸|方向|可能/.test(prompt)) {
    items = [
      [
        "方向一 / 少一点",
        `「${topic}」的减法版本。\n\n只保留最打动人的一个元素，\n用留白让它更鲜明。`,
      ],
      [
        "方向二 / 日常的意外",
        "从熟悉的事物出发，\n加入一个出人意料的小细节。\n\n让理性与趣味同时存在。",
      ],
      [
        "方向三 / 参与其中",
        "把单向表达变成共同创造。\n\n留一个可以被填满的空白，\n让每个人带来自己的答案。",
      ],
    ];
  } else {
    items = [
      [
        "核心想法",
        content
          ? `${content.slice(0, 140)}\n\n把这些线索收束为一个清晰、可感知的体验。`
          : `围绕「${topic}」，\n先写下你最想实现的一件事。`,
      ],
      [
        "值得保留",
        "找到已有想法中最有辨识度的部分，\n让视觉、表达和体验指向同一件事。",
      ],
      [
        "可以继续追问",
        "它为谁而存在？\n希望让人产生什么感受？\n最小的一步会是什么？",
      ],
    ];
  }
  return {
    demo: true,
    message: `根据「${topic}」整理了 3 条示例建议，可以选择加入画板。`,
    suggestions: items.map(([label, content], i) => ({
      kind: "note",
      label,
      content,
      color: COLORS[i],
    })),
  };
}
