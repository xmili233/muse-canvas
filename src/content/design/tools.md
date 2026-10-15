> **当前演示**：没有工具调用；「生成建议 → 预览 → 加入画板」对应本章写入工具的确认流程，新便签的位置也由代码计算。

工具是 Agent 读写画板的唯一通道。Muse 只提供少量面向任务的工具，所有写入都先生成修改提案。

## 怎么设计

| 工具 | 作用 | 权限 |
| --- | --- | --- |
| `canvas_search` | 按文字、类型、颜色或区域查找元素 | 读取当前画板 |
| `canvas_read` | 读取指定元素的完整内容和连线 | 读取当前画板 |
| `canvas_view` | 获取指定区域的截图 | 读取当前画板 |
| `canvas_propose` | 提交一组修改，生成预览 | 修改画板，需确认 |
| `board_list` / `board_read` | 查看其他画板的摘要和内容 | 读取其他画板，需授权 |
| `knowledge_search` / `knowledge_read` | 检索和阅读导入的资料 | 读取知识库 |
| `memory_view` / `memory_edit` | 查看和更新记忆 | 写入按记忆规则确认 |
| `skill_load` | 加载 Skill 正文或资源文件 | 读取 |
| 外部工具（MCP） | 网页读取、图片搜索等 | 访问外部，需确认 |

`canvas_propose` 的一次调用：

```json
{
  "summary": "在「这一页，留给细节」右侧补充两个观察角度",
  "operations": [
    { "_type": "create", "ref": "a", "kind": "note", "label": "光线",
      "content": "清晨和傍晚各拍一次同一扇窗",
      "place": { "near": "n3", "side": "right" } },
    { "_type": "create", "ref": "b", "kind": "note", "label": "声音",
      "content": "记下三处让你停下脚步的声音",
      "place": { "below": "a" } },
    { "_type": "connect", "from": "n3", "to": "a" },
    { "_type": "update", "id": "n4", "label": "主色 · 雾蓝" }
  ]
}
```

工具返回：

```text
已生成预览 p7：新增 2 个便签、1 条连线，修改 1 个元素，等待用户确认。
```

1. **少量面向任务的工具**：按「查找、阅读、提出修改」设计，而不是为移动、改色、改字号各提供一个接口；描述写清用途、边界并附示例。
2. **写入只有一个入口**：`canvas_propose` 一次提交一组操作，校验后展示预览；用户确认后作为一次画板修改写入，对应一步撤销。
3. **语义化位置，坐标由代码计算**：模型只说明「放在 n3 右侧」「排成三列」，Muse 计算坐标、避开重叠并对齐。
4. **结果精简，错误给出下一步**：返回摘要和短编号，大结果分页；错误说明原因和建议操作，例如「n9 不存在，可能已被删除，请用 canvas_search 重新查找」。
5. **逐项校验模型输出**：先按 Schema 校验参数，再检查编号是否存在、内容长度和数量上限；不合格的操作单独退回并说明原因，其余照常预览。
6. **外部能力通过 MCP 接入**：外部工具需声明读取、写入或访问外部的能力标签；工具数量较多时只保留工具搜索入口，用到时再加载定义。

## 为什么这样设计

### 1. 少量面向任务的工具

Anthropic 在《Writing effective tools for agents》中建议按 Agent 要完成的任务整合工具，而不是照搬底层 API。功能重叠的工具越多，模型越难选对，工具定义本身也会占用上下文。

JSON Schema 只能说明参数格式，说明不了用法：`place` 何时填 `near`、何时填 `below`。Anthropic 的内部测试中，为工具附上调用示例后，复杂参数的准确率从 72% 提高到 90%。

### 2. 写入只有一个入口

所有修改经过同一个入口，权限检查、校验和预览只需实现一次，也不会被绕过。一组操作要么整体进入预览，要么不生成预览，模型中途出错不会让画板停在半完成状态。

确认后的修改作为一次画板操作进入现有撤销历史，一次撤销即可还原整组修改。用户也一次看到完整的方案，与当前演示中的「Add 3 notes to canvas」一致。

### 3. 语义化位置，坐标由代码计算

模型擅长判断元素之间的关系，不擅长精确的几何计算。由代码计算坐标，间距与对齐保持一致，也不会产生重叠，输出还更短。tldraw 的画布 Agent 同样提供对齐、分布、排列等高层操作。当前演示中，新便签的位置已经由代码根据现有内容的边界计算。

### 4. 结果精简，错误给出下一步

工具结果会进入上下文，冗长的结果挤占后续步骤的空间。分页、截断和过滤是 Anthropic 推荐的基本做法。

错误信息是写给模型看的。只返回「失败」，模型往往会原样重试；说明原因和下一步，模型可以自行纠正。

### 5. 逐项校验模型输出

模型可能写错编号，用户也可能在 Agent 思考时删除了元素，模型看到的画板已经过期。tldraw 在应用每个操作前先校验和修正，原因相同。逐项退回而不是整体拒绝，一处错误不会让整组好建议作废。

### 6. 外部能力通过 MCP 接入

MCP 是 Agent 连接外部工具的通用协议，Muse 不必为每个服务单独开发接入。能力标签直接决定权限检查的方式，见「权限与安全」。

接入的工具一多，定义本身就会占用大量上下文。Anthropic 的示例中，58 个工具的定义在对话开始前就占用约 55K token；改为按需搜索工具后，token 用量下降约 85%。

## 参考

- [Writing effective tools for agents — with agents](https://www.anthropic.com/engineering/writing-tools-for-agents)（Anthropic）
- [Introducing advanced tool use on the Claude Developer Platform](https://www.anthropic.com/engineering/advanced-tool-use)（Anthropic）
- [Agent starter kit](https://tldraw.dev/starter-kits/agent)（tldraw）
- [MCP 规范：Tools](https://modelcontextprotocol.io/specification/latest/server/tools)
