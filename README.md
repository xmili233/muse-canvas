# Muse — 自由创作画板

Muse 是一个用来收集灵感、整理思路和探索创作方向的 Web 画板。你可以把便签、文字、图片、形状和连线放在同一块画布上，再通过右侧的 Agent 演示体验「提问 → 预览建议 → 加入画板」的流程。

无需注册或配置模型 Key，打开即可使用。画板与对话保存在当前浏览器中。

## 适合谁

- **创作者、设计师和策划者**：收集素材、制作情绪板、梳理选题，将零散想法组织成可继续创作的方向。
- **产品与前端开发者**：体验画布编辑和 Agent 协作流程，通过项目内的「设计讲解」了解交互设计、数据管理和工程取舍。
- **面试官与项目评审者**：直接操作作品，结合设计讲解了解项目的实现范围、技术选择和完成度。

## 在线体验

**状态：已上线。** 通过 GitHub Pages 提供在线体验，无需安装或注册：

- [打开 Muse 画板](https://xmili233.github.io/muse-canvas/)
- [直接阅读设计讲解](https://xmili233.github.io/muse-canvas/#design/overview)
- [查看源代码](https://github.com/xmili233/muse-canvas)

在线版本的数据保存在当前浏览器中，也可以按照下方「本地运行」启动项目。

## 可以做什么

- **自由组织想法**：添加和编辑便签、文字、图片、形状与连线；支持拖动、调整大小、自由绘制和语音示例播放。
- **管理多个画板**：创建、搜索、重命名、复制、删除和 JSON 导入，在不同主题之间切换。
- **浏览与编辑画布**：平移、缩放、适应视图、撤销与重做；两侧面板可收起，窄屏也可使用。
- **体验 Agent 协作**：引用画板文字提出问题，预览示例建议，再决定是否将便签加入画板。
- **了解背后的设计**：从页面顶部打开「设计讲解」，阅读核心流程、数据存储、扩展设计与工程取舍。

首次打开会展示「周末城市漫游」示例画板，可以直接编辑，也可以新建自己的画板。

## 建议体验顺序

1. 浏览 Welcome 示例，尝试拖动便签、编辑文字或添加图片。
2. 在右侧 Agent 中提出问题，查看建议预览，将需要的便签加入画板。
3. 新建一个画板整理自己的主题，刷新页面后查看内容是否恢复。
4. 点击顶部「设计讲解」，结合刚才的操作了解实现方式。

## 当前实现范围

- **Agent 为本地模拟演示**：由浏览器内的规则生成示例建议，不连接真实模型，不访问外部模型服务，也不提供模型 Key 配置。
- **数据保存在本机浏览器**：画板、对话、输入草稿和个人偏好使用 localStorage 持久化；没有云端同步或多人协作。清理站点数据会清除这些内容。
- **个人资料用于本地展示**：可修改名称和头像颜色，不涉及账号注册或登录。
- **资源有大小限制**：图片最大 2 MB，导入画板 JSON 最大 8 MB；存储空间不足时会显示保存失败提示。
- **规划能力有明确标记**：工具安装与通用权限执行属于设计方案，讲解中会与已实现功能区分。

## 本地运行

需要 Node.js 24+。在项目目录执行：

```bash
npm ci
npm run dev
```

打开 <http://localhost:5173/>，或直接访问[设计讲解](http://localhost:5173/#design/overview)。

```bash
npm test       # 数据、画布历史、持久化与 Agent 模拟逻辑测试
npm run build # TypeScript 检查及生产构建，输出到 dist/
npm start     # 构建后启动本地生产服务：http://localhost:4173
```

## 部署到 GitHub Pages

Muse 的运行功能都在浏览器中完成，可以构建为静态站点，由 GitHub Pages 托管；不需要部署模型服务或数据库。Node.js 仅用于构建和本地预览。

仓库已公开，并通过 [GitHub Actions 工作流](./.github/workflows/deploy.yml)自动部署。推送到 `main` 后，工作流会安装依赖、运行测试、构建站点，再将 `dist/` 发布到 GitHub Pages；也可在 [Actions 页面](https://github.com/xmili233/muse-canvas/actions/workflows/deploy.yml)手动触发。

线上构建使用 `npm run build -- --base=/muse-canvas/`。示例图片和音频跟随 Vite 的基础路径加载，本地开发和普通构建仍使用根路径。仓库的 **Settings → Pages → Source** 配置为 **GitHub Actions**。

部署方式参考 [GitHub Pages 说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)与 [Vite 部署指南](https://vite.dev/guide/static-deploy.html#github-pages)。

## 设计与实现

项目使用 React 19、TypeScript 和 Vite；设计讲解支持 Markdown 和 Mermaid，相关依赖按需加载。界面支持键盘快捷键、窄屏布局和系统减少动态效果设置。

- [PRODUCT.md](./PRODUCT.md)：目标用户、产品目的与能力边界。
- [DESIGN.md](./DESIGN.md)：视觉、排版和交互规范。
- [src/content/design/](./src/content/design/)：项目内设计讲解的章节内容。

项目初始设计与交互参考了 [Emil Kowalski 的设计技能](https://github.com/emilkowalski/skills)。本地字体的许可说明见 [public/fonts/OFL.txt](./public/fonts/OFL.txt)。
