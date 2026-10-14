# Emil UI Playground

独立测试 Emil Kowalski 设计与交互技能的空白 Git 项目。

## 开始测试

1. 在 Codex 中将 `/Users/zhiwei/repos/emil-ui-playground` 添加为项目。
2. 在任意项目的新对话中使用已安装的全局技能。
3. 明确指定技能和任务，例如：

   > 使用 emil-design-eng，设计并实现一个类似 Causal 的轻量工作区：浅灰画布、紧凑侧栏、底部工具栏和白色内容卡片。先确定布局与层次，再打磨交互细节。完成后在浏览器中检查实际效果。

   或先比较局部设计：

   > 使用 prototype，为底部工具栏制作三个可交互的设计版本，让我直接切换比较。

项目尚未选择应用框架或安装应用依赖，测试任务可以自行指定。

## 已安装技能

技能已安装到用户级目录 `~/.codex/skills/`，本项目不再存放副本，共 15 个：

| 技能 | 用途 |
| --- | --- |
| `emil-design-eng` | UI、组件与交互细节 |
| `prototype` | 制作多个可比较的 UI 版本 |
| `animate` | Web 动画实现 |
| `animate-expo` | React Native / Expo 动画 |
| `review-animations` | 动画审查 |
| `improve-animations` | 动画改进规划 |
| `find-animation-opportunities` | 判断适合添加动效的位置 |
| `animation-performance` | 动画性能排查 |
| `animation-vocabulary` | 用准确术语描述动效 |
| `apple-design` | Apple 界面与动效原则 |
| `mobile-native` | 改善移动 Web 的操作体验 |
| `pick-ui-library` | 选择合适的 UI 库 |
| `break-ui` | 用极端数据检验界面 |
| `ask-sonner` | Sonner 通知组件 |
| `write-swift` | Swift 开发 |

## 来源版本

- 仓库：[emilkowalski/skills](https://github.com/emilkowalski/skills)
- 安装日期：2026-10-13
- 安装时的 `main` 提交：[`2d228630ba1446365f614a108cb8252f1feda202`](https://github.com/emilkowalski/skills/commit/2d228630ba1446365f614a108cb8252f1feda202)
- 保留上游技能及配套文件原文；许可证见 `~/.codex/skills/LICENSE.emilkowalski`。

---

# Muse — 自由创作画板

视觉按用户提供的 Causal 截图实现：极简窄侧栏、浅灰点阵画布、白色节点卡片、底部胶囊工具栏。基于 React 19、TypeScript 和 Vite 的本地 Web 应用。左侧为可收起的画板列表，中间是可编辑画布，右侧是 Agent；两侧可独立收起，窄屏下改为覆盖式侧栏。

## 运行

需要 Node.js 24+。

```bash
npm install
npm run dev
```

打开 `http://localhost:5173`。

```bash
npm test       # 数据、历史、导入与持久化、画布几何和 Agent 接口测试
npm run build # TypeScript 检查和生产构建
npm start     # 构建后启动本地生产服务，http://localhost:4173
```

## 已实现

- 画板创建、搜索、切换、重命名、复制、删除、JSON 导入。
- 便签、文字、形状、图片、语音卡片和子画板入口；元素拖动、调整大小、双击编辑、颜色、复制、删除。
- 自由绘制与语音示例播放；可替换本地音频（不会自动转录）。欢迎画板含参考图对应的节点示例。
- 画布平移、缩放、适应视图、元素连线、撤销与重做。
- 自动保存在当前浏览器的 localStorage；图片限 2 MB，画板导入限 8 MB。存储不足时显示保存失败提示。
- 账户菜单、可编辑的本地个人资料、头像颜色、画布偏好、独立快捷键面板。
- 键盘快捷键、可收起侧栏、窄屏布局、减少动态效果设置。

## 账户与设置

点击左下角名称打开账户菜单。个人资料中可修改显示名称与头像颜色；设置中可切换画布网格及启动时的侧栏状态。更改保存在 `muse-preferences-v1`，与画板内容分开存储。快捷键与关于信息各有独立面板。

菜单使用 [Base UI Menu](https://base-ui.com/react/components/menu) 处理定位、方向键导航、点击外部关闭与焦点恢复，视觉参考用户提供的 ChatGPT 账户菜单。

## Agent

右侧 Agent 支持对话、引用画板文字、生成便签预览和添加到画板。每个画板独立保存对话，收起侧栏时保留输入草稿。

首次输入问题并发送时，会从输入区展开居中的连接弹窗。选择平台、模型并输入 Key，或主动选择模拟模式。连接成功后自动继续原问题；失败、取消均保留输入。模拟模式明确标注，不调用真实模型，也不会在真实调用失败后自动启用。

API Key 只由本地 Node 服务在会话内存中临时保管，不写入配置文件、浏览器存储、画板或日志。前端仅保留短期连接标识和非敏感的模型配置；刷新页面需重新选择连接。断开连接会立即删除服务端会话，闲置 30 分钟后过期（后台每分钟清理），关闭本地服务也会清除。连接在当前页面的所有画板间共享。

预置 OpenAI、Anthropic / Claude、Google / Gemini、DeepSeek、千问、硅基流动、OpenRouter 和 Ollama。支持从接口读取模型列表，也可直接输入模型 ID。自定义连接可设置 Base URL，并选择 OpenAI Chat Completions、OpenAI Responses、Anthropic Messages 或 Gemini 协议；预置平台也可展开修改接口地址。

本地服务向选定的平台鉴权并生成回复，用户密钥连接仅接受 localhost / 回环地址访问。外部 API 地址要求 HTTPS，本机地址允许 HTTP，Ollama 等本地接口可不填 Key。单独点击连接会发送一次简短请求验证模型；带着待发送问题连接时只发送原问题一次。所有平台的返回内容都会校验后再呈现为画板建议。
发送内容包括当前画板文字和最近 8 条对话；可通过输入框旁的回形针关闭画板引用，画板图片不会上传。点击添加后，生成的便签才会写入画布。

## 代码组织

- `src/model.ts`：画板模型、历史记录、视图计算、导入校验。
- `src/App.tsx`：工作空间、持久化、画板管理。
- `src/components/Canvas.tsx`：画布交互与元素渲染。
- `src/components/Sidebar.tsx`：画板列表。
- `src/components/AccountMenu.tsx`、`AccountSettings.tsx`：账户入口与设置面板。
- `src/preferences.ts`：个人资料与画布偏好的加载、校验。
- `src/components/Agent.tsx`：Agent 对话、草稿与便签结果。
- `server/agent.mjs`：本地演示、输入校验与模型连接。
- `server/connections.mjs`：仅内存中的连接会话及过期清理。
- `shared/providers.mjs`：平台预设和协议列表。
- `server/modelProviders.mjs`：多平台协议、连接校验和模型发现。
- `src/components/AgentConnectionForm.tsx`：首次使用引导和连接切换。
- `server/index.mjs`：本地生产服务。

上方保留本项目原始的设计技能说明和来源信息。

## 字体与排版

- 本地托管 Inter 可变字体，中文使用系统字体；字体许可证见 `public/fonts/OFL.txt`。
- 界面文字以 13px 为基准，画板正文 16px / 24px，卡片标题 18px / 26px。
- 画板默认以 100% 缩放打开，使用工具栏手动缩放或适应视图。

## 动效与交互

- 画板列表使用 220ms 的滑动过渡，开关列表时画布内容保持原有屏幕位置。
- 新增便签使用 200ms 淡入和轻微位移，绘制轨迹与键盘操作即时响应。
- 弹窗、提示条使用可反向衔接的 CSS 过渡；工具栏提示首次延迟出现，相邻工具立即显示。
- 拖动、平移、缩放和绘制通过 DOM 与 `requestAnimationFrame` 更新，手势结束后才提交画板数据。
- 尊重 `prefers-reduced-motion`；减少动态效果时保留淡入反馈，去掉位移、缩放和音频波形动画。

实现使用 CSS 与浏览器 Web Animations API，没有新增动画依赖。弹窗的进出场遵循 [MDN 原生 dialog 动画方式](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog#animating_dialogs)。
