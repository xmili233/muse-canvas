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
npm test       # 数据、历史、导入与持久化、画布几何和 Agent 模拟逻辑测试
npm run build # TypeScript 检查和生产构建
npm start     # 构建后启动本地生产服务，http://localhost:4173
```

## 已实现

- 画板创建、搜索、切换、重命名、复制、删除、JSON 导入。
- 便签、文字、形状、图片、语音卡片和子画板入口；元素拖动、调整大小、双击编辑、颜色、复制、删除。
- 自由绘制与语音示例播放；可替换本地音频（不会自动转录）。Welcome 使用原创的「周末城市漫游」案例，包含街景图片、行程与灵感便签、可下载清单。
- 画布平移、缩放、适应视图、元素连线、撤销与重做。
- 自动保存在当前浏览器的 localStorage；图片限 2 MB，画板导入限 8 MB。存储不足时显示保存失败提示。
- 账户菜单、可编辑的本地个人资料、头像颜色、画布偏好、独立快捷键面板。
- 键盘快捷键、可收起侧栏、窄屏布局、减少动态效果设置。

## 账户与设置

点击左下角名称打开账户菜单。个人资料中可修改显示名称与头像颜色；设置中可切换画布网格及启动时的侧栏状态。更改保存在 `muse-preferences-v1`，与画板内容分开存储。快捷键与关于信息各有独立面板。

菜单使用 [Base UI Menu](https://base-ui.com/react/components/menu) 处理定位、方向键导航、点击外部关闭与焦点恢复，视觉参考用户提供的 ChatGPT 账户菜单。

## Agent

右侧 Agent 支持对话、引用画板文字、生成便签预览和添加到画板。每个画板独立保存对话，收起侧栏时保留输入草稿。

Agent 固定使用本地演示模式。发送后直接在浏览器生成示例建议，无需配置 Key，也不会访问模型服务。可以停止生成、恢复草稿、预览建议并添加到画板。界面明确标注演示模式，结果不代表真实模型推理。

## 代码组织

- `src/model.ts`：画板模型、历史记录、视图计算、导入校验。
- `src/App.tsx`：工作空间、持久化、画板管理。
- `src/components/Canvas.tsx`：画布交互与元素渲染。
- `src/components/Sidebar.tsx`：画板列表。
- `src/components/AccountMenu.tsx`、`AccountSettings.tsx`：账户入口与设置面板。
- `src/preferences.ts`：个人资料与画布偏好的加载、校验。
- `src/components/Agent.tsx`：Agent 对话、草稿与便签结果。
- `src/localPersistence.ts`：按画板保存的对话草稿。
- `src/demoAgent.ts`：纯浏览器运行的模拟建议生成。
- `src/components/DesignGuide.tsx`、`DesignMarkdown.tsx`：讲解弹窗、Markdown 和 Mermaid 渲染。
- `src/content/design/`：按章节维护的设计讲解 Markdown。
- `server/index.mjs`：本地生产服务。

## 本地数据与 Welcome

所有需要保留的工作区数据都在当前浏览器：画板与对话使用 `muse-workspace-v3`，个人资料和偏好使用 `muse-preferences-v1`，草稿按画板 ID 单独保存。Node 仅提供静态文件，不包含模型接口。

首次打开、没有有效的画板数据，或删除最后一块画板时，会创建带示例内容的 Welcome。已有有效画板时直接恢复，不额外插入 Welcome。清理浏览器站点数据会清除这些内容。刷新时会将旧 Welcome 的预置案例替换为新版城市漫游案例，保留后来添加的元素与对话；其他画板不变。

## 设计讲解

画板顶部的「设计讲解」打开参考 Fumadocs 布局的阅读弹窗：连续正文与右侧本页目录，不设左侧栏，只保留目录定位与关闭。支持 Markdown、Mermaid 流程图及 URL 章节定位，窄屏使用章节选择器。

直接打开 `http://localhost:5173/#design/overview` 可进入讲解。六个章节分别介绍设计总览、请求流程、本地数据、工具扩展、权限和工程取舍。未实现的工具安装与通用权限执行流程标为「设计方案」，与现有能力区分。章节内容维护在 `src/content/design/*.md`，讲解和图表库按需加载。

项目需求与视觉约束记录在 [PRODUCT.md](PRODUCT.md) 和 [DESIGN.md](DESIGN.md)。

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

## 设计技能来源

项目最初用于测试 Emil Kowalski 的设计与交互技能，技能现位于用户级目录 `~/.codex/skills/`，不随应用分发。上游为 [emilkowalski/skills](https://github.com/emilkowalski/skills)，初始参考版本为 `2d228630ba1446365f614a108cb8252f1feda202`（2026-10-13）。
