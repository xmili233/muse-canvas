import { PROVIDERS, PROTOCOLS } from "../shared/providers.mjs";

export function fail(message, status = 400, code = "invalid_request") {
  return Object.assign(new Error(message), { status, code });
}

export function validateConnection(value, { requireModel = true } = {}) {
  if (value?.mode === "demo") return { mode: "demo" };
  if (value?.mode !== "live" || !Object.hasOwn(PROVIDERS, value.provider))
    throw fail("请选择模型平台。", 400, "invalid_connection");
  const preset = PROVIDERS[value.provider];
  const protocol =
    value.provider === "custom" ? value.protocol : preset.protocol;
  if (!Object.hasOwn(PROTOCOLS, protocol))
    throw fail("请选择接口协议。", 400, "invalid_connection");
  let url;
  try {
    url = new URL(value.baseUrl || preset.baseUrl);
  } catch {
    throw fail("请输入完整的 API 地址。", 400, "invalid_url");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw fail(
      "API 地址需使用 HTTPS；本机接口可使用 HTTP。请勿在地址中包含密钥。",
      400,
      "invalid_url",
    );
  const apiKey = typeof value.apiKey === "string" ? value.apiKey.trim() : "";
  if (
    (!local && !apiKey) ||
    apiKey.length > 1024 ||
    (apiKey && !/^[!-~]+$/.test(apiKey))
  )
    throw fail("请输入有效的 API Key。", 400, "invalid_key");
  const model = typeof value.model === "string" ? value.model.trim() : "";
  if (
    (requireModel && !model) ||
    model.length > 200 ||
    /[\x00-\x1f\x7f]/.test(model)
  )
    throw fail("请输入模型 ID。", 400, "invalid_model");
  return {
    mode: "live",
    provider: value.provider,
    protocol,
    baseUrl: url.href.replace(/\/+$/, ""),
    model,
    apiKey,
  };
}

export function publicConnection(connection, token) {
  const { apiKey: _key, ...config } = connection;
  return { ...config, token };
}

function headers(connection) {
  const result = { "Content-Type": "application/json" };
  if (connection.protocol === "anthropic") {
    result["x-api-key"] = connection.apiKey;
    result["anthropic-version"] = "2023-06-01";
  } else if (connection.protocol === "gemini")
    result["x-goog-api-key"] = connection.apiKey;
  else if (connection.apiKey)
    result.Authorization = `Bearer ${connection.apiKey}`;
  return result;
}

function providerError(status) {
  if (status === 401)
    return fail("Key 无效，请检查后重试。", 401, "invalid_key");
  if (status === 429)
    return fail("请求过于频繁或额度不足，请稍后重试。", 429, "rate_limited");
  if (status === 400 || status === 422)
    return fail(
      "模型或接口配置不兼容，请检查模型 ID、协议和地址。",
      422,
      "invalid_model",
    );
  if (status === 403 || status === 404)
    return fail(
      "无法访问此模型或接口，请检查权限和 API 地址。",
      422,
      "model_unavailable",
    );
  return fail("模型服务暂时不可用，请稍后重试。", 502, "provider_unavailable");
}

async function fetchProvider(connection, path, body, options) {
  const response = await (options.fetchImpl || fetch)(
    `${connection.baseUrl}${path}`,
    {
      method: body ? "POST" : "GET",
      headers: headers(connection),
      redirect: "error",
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: options.signal
        ? AbortSignal.any([options.signal, AbortSignal.timeout(55000)])
        : AbortSignal.timeout(55000),
    },
  );
  if (!response.ok) throw providerError(response.status);
  return response.json();
}

export async function listModels(connection, options = {}) {
  if (connection.mode !== "live") throw fail("请选择模型平台。");
  const gemini = connection.protocol === "gemini";
  const anthropic = connection.protocol === "anthropic";
  const result = await fetchProvider(
    connection,
    `/models${gemini ? "?pageSize=1000" : anthropic ? "?limit=1000" : ""}`,
    null,
    options,
  );
  const models = gemini ? result.models : result.data;
  if (!Array.isArray(models))
    throw fail(
      "接口未返回模型列表，请手动输入模型 ID。",
      502,
      "invalid_response",
    );
  return [
    ...new Set(
      models
        .filter((item) => item && typeof item === "object")
        .filter(
          (item) =>
            !gemini ||
            item.supportedGenerationMethods?.includes("generateContent"),
        )
        .map((item) => (gemini ? item.name?.replace(/^models\//, "") : item.id))
        .filter(
          (id) => typeof id === "string" && id.length > 0 && id.length <= 200,
        ),
    ),
  ]
    .sort()
    .slice(0, 1000);
}

export async function requestCompletion(
  connection,
  { system, messages, schema },
  options = {},
) {
  const format = {
    type: "json_schema",
    name: "canvas_reply",
    strict: true,
    schema,
  };
  let path, body;
  switch (connection.protocol) {
    case "responses":
      path = "/responses";
      body = {
        model: connection.model,
        store: false,
        instructions: system,
        input: messages,
        text: { format },
      };
      break;
    case "anthropic":
      path = "/messages";
      body = {
        model: connection.model,
        max_tokens: 4096,
        system,
        messages,
        tools: [
          {
            name: "canvas_reply",
            description: "返回给用户的回复与画板建议。",
            input_schema: schema,
          },
        ],
        tool_choice: {
          type: "tool",
          name: "canvas_reply",
          disable_parallel_tool_use: true,
        },
      };
      break;
    case "gemini":
      path = `/models/${encodeURIComponent(connection.model)}:generateContent`;
      body = {
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map(({ role, content }) => ({
          role: role === "assistant" ? "model" : "user",
          parts: [{ text: content }],
        })),
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: schema,
          maxOutputTokens: 4096,
        },
      };
      break;
    case "chat":
      path = "/chat/completions";
      body = {
        model: connection.model,
        messages: [
          {
            role: "system",
            content: `${system}\n仅返回 JSON，严格遵循此 JSON Schema：${JSON.stringify(schema)}`,
          },
          ...messages,
        ],
        response_format: { type: "json_object" },
      };
      break;
    default:
      throw fail("接口协议无效。", 400, "invalid_connection");
  }
  const result = await fetchProvider(connection, path, body, options);
  let text;
  if (connection.protocol === "anthropic") {
    const tool = result.content?.find(
      (item) => item.type === "tool_use" && item.name === "canvas_reply",
    );
    if (tool && result.stop_reason !== "max_tokens") return tool.input;
  } else if (connection.protocol === "responses") {
    if (result.status !== "completed")
      throw fail("模型未能完成回复，请重试。", 502, "incomplete_response");
    text = result.output
      ?.flatMap((item) => item.content || [])
      .filter((item) => item.type === "output_text")
      .map((item) => item.text)
      .join("");
  } else if (connection.protocol === "gemini") {
    const candidate = result.candidates?.[0];
    if (candidate?.finishReason === "STOP")
      text = candidate.content?.parts
        ?.filter((item) => !item.thought)
        .map((item) => item.text || "")
        .join("");
  } else {
    const choice = result.choices?.[0];
    if (choice?.finish_reason === "stop") text = choice.message?.content;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw fail(
      "模型没有返回完整的画板内容，请重试或更换模型。",
      502,
      "invalid_response",
    );
  }
}
