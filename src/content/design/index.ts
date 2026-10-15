import overview from "./overview.md?raw";
import loop from "./loop.md?raw";
import context from "./context.md?raw";
import tools from "./tools.md?raw";
import skills from "./skills.md?raw";
import memory from "./memory.md?raw";
import knowledge from "./knowledge.md?raw";
import permissions from "./permissions.md?raw";
import evals from "./evals.md?raw";
import engineering from "./engineering.md?raw";

export const designSections = [
  { id: "overview", title: "概览", content: overview },
  { id: "loop", title: "Agent 循环", content: loop },
  { id: "context", title: "上下文工程", content: context },
  { id: "tools", title: "工具设计", content: tools },
  { id: "skills", title: "Skill 技能", content: skills },
  { id: "memory", title: "记忆", content: memory },
  { id: "knowledge", title: "知识库", content: knowledge },
  { id: "permissions", title: "权限与安全", content: permissions },
  { id: "evals", title: "评估与观测", content: evals },
  { id: "engineering", title: "实现与取舍", content: engineering },
];
