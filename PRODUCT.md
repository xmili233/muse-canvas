# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
创作者在画板中组织想法；面试官通过可运行的作品和设计讲解理解作者的产品与工程能力。

## Product Purpose
Muse 是可编辑画板与 Agent 交互演示结合的本地优先 Web 应用，也是用户放在简历中的项目。无需账号即可体验画板和模拟模式。

## Capabilities and Constraints
- 画板、对话、草稿和偏好由当前浏览器的 localStorage 持久化，不依赖用户数据云端数据库。
- Agent 仅提供浏览器内模拟演示，无 Key 配置、模型连接或外部模型请求。
- 无有效画板时初始化 Welcome；已有内容不被演示数据覆盖。
- 示例建议先预览，由用户决定是否添加到画板。
- 通用 Tool 安装与细粒度工具权限属于设计方案，讲解必须明确区分现状和规划。
- 设计讲解采用 Fumadocs 布局的大弹窗，当前入口位于画板头部右侧，后续可独立移动。

## Brand Commitments
保留现有 Causal / OpenAI 风格、低饱和中性色、Inter 和紧凑工具区。讲解内容使用自然中文。

## Product Principles
- 让访客先体验，再按兴趣深入理解实现。
- 展示真实实现、约束和取舍，不虚构能力或性能数据。
- 保留用户已有画板与内容。
