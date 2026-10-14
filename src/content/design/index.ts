import overview from "./overview.md?raw";
import request from "./request.md?raw";
import context from "./context.md?raw";
import tools from "./tools.md?raw";
import permissions from "./permissions.md?raw";
import engineering from "./engineering.md?raw";

export const designSections = [
  { id: "overview", title: "概览", content: overview },
  { id: "request", title: "对话流程", content: request },
  { id: "context", title: "上下文与存储", content: context },
  { id: "tools", title: "工具扩展", content: tools },
  { id: "permissions", title: "权限控制", content: permissions },
  { id: "engineering", title: "工程取舍", content: engineering },
];
