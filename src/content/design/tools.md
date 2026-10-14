**以下为扩展方案，尚未实现通用工具安装与执行。**

工具需要声明用途、参数和权限，而不只是一个名称。例如创建便签：

```json
{
  "name": "canvas.create_note",
  "inputSchema": {
    "type": "object",
    "properties": { "content": { "type": "string" } },
    "required": ["content"]
  },
  "capabilities": ["canvas:write"],
  "requiresApproval": true
}
```

## 接入与调用

读取工具描述后，检查权限并由用户启用。每次调用仍需校验参数；涉及写入的操作先展示预览，获得允许后执行。

工具可以来自内置画板操作或 MCP 服务。启用工具不等于永久授权，调用结果需要明确展示成功、失败或拒绝。

协议参考：[MCP Tools](https://modelcontextprotocol.io/specification/latest/server/tools)。
