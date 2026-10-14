export const PROTOCOLS = {
  chat: "OpenAI Chat Completions",
  responses: "OpenAI Responses",
  anthropic: "Anthropic Messages",
  gemini: "Google Gemini",
};

export const PROVIDERS = {
  openai: {
    name: "OpenAI",
    protocol: "responses",
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-5-mini", "gpt-4.1"],
    keyUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    name: "Anthropic / Claude",
    protocol: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    models: ["claude-sonnet-4-6", "claude-haiku-4-5"],
    keyUrl: "https://platform.claude.com/settings/keys",
  },
  google: {
    name: "Google / Gemini",
    protocol: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    models: ["gemini-3.5-flash-lite", "gemini-3.8-flash"],
    keyUrl: "https://aistudio.google.com/api-keys",
  },
  deepseek: {
    name: "DeepSeek",
    protocol: "chat",
    baseUrl: "https://api.deepseek.com",
    models: ["deepseek-flash", "deepseek-v4-pro"],
    keyUrl: "https://platform.deepseek.com/api_keys",
  },
  qwen: {
    name: "阿里云 / 千问",
    protocol: "chat",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: ["qwen-plus", "qwen-turbo"],
    keyUrl: "https://bailian.console.aliyun.com/",
  },
  siliconflow: {
    name: "硅基流动",
    protocol: "chat",
    baseUrl: "https://api.siliconflow.cn/v1",
    models: ["Qwen/Qwen3.6-27B"],
    keyUrl: "https://cloud.siliconflow.cn/account/ak",
  },
  openrouter: {
    name: "OpenRouter",
    protocol: "chat",
    baseUrl: "https://openrouter.ai/api/v1",
    models: ["openrouter/auto"],
    keyUrl: "https://openrouter.ai/settings/keys",
  },
  ollama: {
    name: "Ollama / 本地模型",
    protocol: "chat",
    baseUrl: "http://localhost:11434/v1",
    models: [],
    keyUrl: "",
  },
  custom: {
    name: "自定义接口",
    protocol: "chat",
    baseUrl: "",
    models: [],
    keyUrl: "",
  },
};
