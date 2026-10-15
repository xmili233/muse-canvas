> **当前演示**：三类示例回复（梳理、延伸、行动）由固定规则生成，可以看作三个最简单的 Skill；Skill 的格式、加载和安装为设计方案。

工具让 Agent 能做事，Skill 让 Agent 知道怎么把一类事做好。Muse 采用 Agent Skills 开放格式：一个 Skill 就是一个文件夹，写明某类创作任务的做法。

## 怎么设计

```text
skills/
├── moodboard/                情绪板整理
│   ├── SKILL.md
│   ├── references/
│   │   └── composition.md    构图与配色的判断标准
│   └── assets/
│       └── layouts.json      三种版式模板
├── brainstorm/               创意发散
├── action-plan/              行动计划
└── journey-map/              用户旅程图
```

`moodboard/SKILL.md`：

```markdown
---
name: moodboard
description: 把零散的图片、色卡和文字整理成情绪板。用户提到情绪板、视觉方向、风格参考或配色时使用。
metadata:
  version: "1.0"
---

# 整理情绪板

1. 用 canvas_search 找出图片、色卡和描述风格的文字。
2. 提炼 3–5 个风格关键词，先请用户确认。
3. 从 assets/layouts.json 选择版式，用 canvas_propose 提交分组和标题。
4. 不删除用户的元素；需要移动时说明原因。

构图与配色的判断标准见 references/composition.md。
```

| 层级 | 内容 | 何时进入上下文 |
| --- | --- | --- |
| 目录 | 每个 Skill 的 `name` 和 `description` | 对话开始时 |
| 正文 | `SKILL.md` 全文 | 模型判断任务匹配，或用户输入 `/moodboard` 指定 |
| 资源 | `references/`、`assets/` 中的文件 | 正文要求时读取 |

1. **Skill 是文件夹**：`SKILL.md` 加可选的参考资料和模板；Muse 不执行 Skill 中的脚本，版式等确定性内容以数据模板提供，由 Muse 的代码应用。
2. **三级渐进加载**：对话开始只加载目录，任务匹配时加载正文，正文用到时再读取资源文件。
3. **两种触发方式**：模型根据 `description` 自动选择，用户也可以用 `/` 加名称直接指定。
4. **Skill 不带来新权限**：Skill 只能使用已有工具，写入仍然经过修改提案；第三方 Skill 安装前完整展示所有文件，默认禁用其中涉及外部访问的步骤。
5. **每个内置 Skill 附带评测用例**：几组示例画板、请求和期望结果，修改 Skill 后重新运行。
6. **与工具、记忆、知识库分工明确**：

| | 回答什么问题 | 例子 | 由谁维护 |
| --- | --- | --- | --- |
| 工具 | Agent 能做什么 | 查找元素、提交修改 | Muse 开发者 |
| Skill | 一类任务怎么做好 | 情绪板整理步骤 | 开发者或用户 |
| 记忆 | 这位用户、这块画板有什么特点 | 标题偏好短句 | Agent 提议，用户确认 |
| 知识库 | 有哪些参考资料 | 品牌手册 PDF | 用户导入 |

## 为什么这样设计

### 1. Skill 是文件夹

文件夹和 Markdown 不需要编程就能阅读、修改和分享，设计师也能把自己的工作方法写成 Skill。Agent Skills 是开放标准，已被 Claude、OpenAI Codex、Gemini CLI、GitHub Copilot、Cursor 等多款 Agent 支持，Muse 的 Skill 可以在其他 Agent 中复用，反之亦然。

Muse 运行在浏览器中，没有隔离的代码执行环境，执行 Skill 附带的脚本风险过高。版式这类需要精确执行的内容写成数据模板，由 Muse 自己的代码应用，结果可预期。

### 2. 三级渐进加载

规范建议每个 Skill 的目录信息约 100 token、正文不超过 5000 token，正文过长时拆分到资源文件。这样安装几十个 Skill 也不会挤占上下文。Anthropic 把渐进加载称为 Skill 的核心设计原则：资源按需读取，一个 Skill 能附带的资料几乎不受上下文限制。

### 3. 两种触发方式

自动选择依赖 `description` 的质量，所以描述要同时写清「做什么」和「什么时候用」，并包含用户可能说出的关键词。模型判断失误时，用户可以直接指定，结果可预期。

### 4. Skill 不带来新权限

Skill 的内容会进入上下文，恶意 Skill 本质上就是一次提示词注入。Anthropic 建议只安装可信来源的 Skill，安装前通读所有文件，并特别检查访问外部网络的指令。Muse 把「怎么做」和「能做什么」分开：Skill 决定做法，权限由运行框架决定，安装 Skill 不会扩大 Agent 的能力范围。

### 5. 每个内置 Skill 附带评测用例

Skill 本质上是提示词，措辞的细微变化就可能改变结果。没有评测用例，改动是变好还是变差无从判断。

### 6. 分工明确

如果所有内容都写进系统提示词，提示词会越来越长，各部分也难以单独更新。四者分开后各有维护者和生命周期：工具随版本发布，Skill 可以单独安装或停用，记忆由用户管理，资料由用户导入。

## 参考

- [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)（Anthropic）
- [Agent Skills 规范](https://agentskills.io/specification)
