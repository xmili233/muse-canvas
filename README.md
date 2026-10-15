# Muse — 自由创作画板

面向创作者、设计师和策划者的 Web 画板，用于收集素材、制作情绪板和整理思路。项目实现了画布编辑、多画板管理和本地保存，并通过规则驱动的 Agent 演示「提问 → 预览建议 → 确认加入画板」的协作流程。

## 在线体验

[打开画板](https://xmili233.github.io/muse-canvas/) · [阅读设计讲解](https://xmili233.github.io/muse-canvas/#design/overview) · [查看源码](https://github.com/xmili233/muse-canvas)

已通过 GitHub Pages 上线，无需注册或配置模型密钥。画板与对话数据保存在访问者当前浏览器中。

建议按以下顺序体验：

1. 在 Welcome 示例中拖动便签、编辑文字，尝试缩放和撤销。
2. 在右侧 Agent 中输入“整理这块画板”，查看建议预览，再选择加入画板。
3. 新建自己的画板并添加内容，刷新页面检查保存结果。
4. 打开顶部“设计讲解”，了解交互设计、实现边界与后续 Agent 架构方案。

## 实现重点与取舍

技术栈：React 19、TypeScript、Vite；菜单等交互使用 Base UI，图标使用 Lucide，设计讲解通过 Markdown 与 Mermaid 呈现。

| 实现重点 | 做法与取舍 | 主要代码 |
| --- | --- | --- |
| 缩放下的画布操作 | 将拖动、调整大小时的指针位移换算为画布坐标，统一处理视口变换；连线随节点位置更新。坐标计算独立于界面，便于验证。 | [canvasGeometry.ts](./src/canvasGeometry.ts)、[Canvas.tsx](./src/components/Canvas.tsx) |
| 编辑状态与撤销重做 | 使用 reducer 管理画板与节点状态，维护画布编辑历史；对话更新不进入画布撤销栈，避免撤销编辑时同时回退聊天。 | [model.ts](./src/model.ts) |
| 本地持久化 | 保存画板、会话、草稿和偏好；导入时校验数据结构，读取异常数据时提供默认工作区，写入失败时显示提示。使用 localStorage 降低体验门槛，同时接受容量和跨设备能力的限制。 | [App.tsx](./src/App.tsx)、[localPersistence.ts](./src/localPersistence.ts)、[preferences.ts](./src/preferences.ts) |
| 建议预览与确认写入 | Agent 建议与画板修改分离：先展示便签预览，确认后再加入画板，并记录已应用状态。用户确认是写入画板的前置条件，生成建议时不改变现有内容。 | [Agent.tsx](./src/components/Agent.tsx)、[demoAgent.ts](./src/demoAgent.ts) |

## 当前范围与边界

- **画布与画板管理可直接使用**：支持文字、便签、图片、形状、连线和自由绘制，以及多画板创建、搜索、重命名、复制、删除和 JSON 导入；包含平移、缩放、撤销重做、键盘快捷键和窄屏布局。
- **Agent 是本地规则演示**：按输入和画板文字生成预设类型的建议，不调用模型，不分析图片内容，也不执行外部工具。
- **数据仅保存在当前浏览器**：没有云端同步、多人协作或账号系统；个人资料仅用于本地展示，清理站点数据会清除已保存内容。
- **资源受浏览器存储约束**：单张图片最大 2 MB，导入画板 JSON 最大 8 MB。存储不足时会提示保存失败。
- **架构设计与已实现功能分别说明**：设计讲解中的模型循环、工具、Skill、记忆、知识库、权限与评估属于进一步接入真实 Agent 的方案，各章标明当前实现范围。

## 本地运行

推荐使用 **Node.js 24** 和 npm，与 CI 的运行版本一致。

```bash
npm ci
npm run dev
```

访问终端输出的地址，默认是 `http://127.0.0.1:5173/`；端口被占用时 Vite 会提示实际地址。

```bash
npm test        # 运行现有测试
npm run build   # TypeScript 检查与生产构建
npm run preview # 预览 dist/ 中的构建结果
```

测试覆盖画布坐标、编辑历史、导入校验、本地存储和规则演示逻辑。例如：[坐标测试](./src/canvasGeometry.test.ts)、[状态测试](./src/model.test.ts)、[Agent 演示测试](./src/demoAgent.test.ts)。

推送到 `main` 后，[GitHub Actions](./.github/workflows/deploy.yml) 会运行测试和构建，再发布到 GitHub Pages。线上构建使用 `npm run build -- --base=/muse-canvas/`；应用可作为静态站点运行，无需业务后端或数据库。

## 设计资料与参考

- [PRODUCT.md](./PRODUCT.md)：目标用户、产品目的与能力边界。
- [DESIGN.md](./DESIGN.md)：视觉、排版和交互规范。
- [设计讲解章节](./src/content/design/)：Agent 设计方案与工程取舍；也可在[线上阅读](https://xmili233.github.io/muse-canvas/#design/overview)。
- 设计与交互参考了 [Emil Kowalski 的设计技能](https://github.com/emilkowalski/skills)。
- 第三方资源许可：[本地字体](./public/fonts/OFL.txt)、[GitHub 图标](./public/THIRD_PARTY_NOTICES.txt)。
