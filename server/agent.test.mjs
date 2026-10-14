import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createReply,
  validateInput,
  validateReply,
  apiHandler,
} from "./agent.mjs";
import { createConnectionStore, CONNECTION_IDLE_MS } from "./connections.mjs";
import { createServer, request as httpRequest } from "node:http";
import { validateConnection } from "./modelProviders.mjs";
const testKey = "sk-test-only-not-a-real-key-123456";
const liveConnection = validateConnection({
  mode: "live",
  provider: "openai",
  model: "gpt-5-mini",
  apiKey: testKey,
});
const input = {
  prompt: "帮我制定下一步行动",
  board: {
    title: "品牌设计",
    nodes: [{ kind: "note", label: "Idea", content: "自然、自由" }],
  },
  history: [],
};
test("demo mode is explicit and uses the current board", async () => {
  const result = await createReply(input, { mode: "demo" });
  assert.equal(result.demo, true);
  assert.equal(result.suggestions.length, 3);
  assert.ok(result.suggestions[0].content.includes("品牌设计"));
});
test("empty prompts and malformed nodes are rejected", () => {
  assert.throws(() => validateInput({ ...input, prompt: "" }));
  assert.throws(() =>
    validateInput({ ...input, board: { title: "", nodes: [null] } }),
  );
  assert.throws(() =>
    validateReply({
      message: "ok",
      suggestions: [{ kind: "script", color: "red" }],
    }),
  );
});
test("real model response is validated and never exposes the key", async () => {
  const result = await createReply(input, {
    ...liveConnection,
    apiKey: "test-key",
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      assert.equal(options.headers.Authorization, "Bearer test-key");
      const request = JSON.parse(options.body);
      assert.equal(request.text.format.strict, true);
      assert.equal(request.store, false);
      return {
        ok: true,
        json: async () => ({
          status: "completed",
          output: [
            {
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    message: "这是下一步",
                    suggestions: [],
                  }),
                },
              ],
            },
          ],
        }),
      };
    },
  });
  assert.equal(result.demo, false);
  assert.equal(result.message, "这是下一步");
  assert.ok(!JSON.stringify(result).includes("test-key"));
});
test("provider errors do not silently fall back to demo", async () => {
  await assert.rejects(
    createReply(input, {
      ...liveConnection,
      apiKey: "test-key",
      fetchImpl: async () => ({ ok: false, status: 401 }),
    }),
    /Key 无效/,
  );
});

const providerReply = () =>
  Response.json({
    status: "completed",
    output: [
      {
        content: [
          {
            type: "output_text",
            text: JSON.stringify({ message: "这是下一步", suggestions: [] }),
          },
        ],
      },
    ],
  });

async function serve(t, fetchImpl) {
  const store = createConnectionStore();
  const server = createServer((req, res) =>
    apiHandler(
      req,
      res,
      () => {
        res.writeHead(404);
        res.end();
      },
      { connectionStore: store, fetchImpl },
    ),
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  );
  const url = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, token, extra = {}) =>
    fetch(url + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-Muse-Connection": token } : {}),
        ...extra,
      },
      body: JSON.stringify(body),
    });
  return { store, post, url };
}

test("missing credentials require a deliberate choice instead of auto demo", async (t) => {
  await assert.rejects(createReply(input), { code: "connection_required" });
  const { post, store } = await serve(t, () => {
    throw new Error("Provider must not be called");
  });
  const response = await post("/api/agent", input);
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "connection_required");
  assert.equal(store.size, 0);
});

test("temporary connections expire and can be explicitly deleted", () => {
  let time = 100;
  const store = createConnectionStore({ now: () => time });
  const token = store.create({ ...liveConnection });
  assert.equal(store.get(token).apiKey, testKey);
  time += CONNECTION_IDLE_MS + 1;
  store.prune();
  assert.equal(store.size, 0);
  assert.equal(store.get(token), undefined);
  const next = store.create({ mode: "demo" });
  store.delete(next);
  assert.equal(store.get(next), undefined);
});

test("explicit demo never calls OpenAI and continues with a temporary connection", async (t) => {
  const { post, store } = await serve(t, () => {
    throw new Error("Demo must stay local");
  });
  const response = await post("/api/agent", {
    ...input,
    connection: { mode: "demo", apiKey: testKey },
  });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.demo, true);
  assert.equal(result.connection.mode, "demo");
  assert.ok(!JSON.stringify(result).includes(testKey));
  assert.equal(store.get(result.connection.token).apiKey, undefined);
  const next = await post("/api/agent", input, result.connection.token);
  assert.equal((await next.json()).connection.token, result.connection.token);
});

test("connecting with a pending prompt makes one model request and never returns the key", async (t) => {
  let calls = 0;
  const { post } = await serve(t, async (url, options) => {
    calls++;
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(options.headers.Authorization, `Bearer ${testKey}`);
    assert.ok(!options.body.includes(testKey));
    return providerReply();
  });
  const response = await post("/api/agent", {
    ...input,
    connection: { ...liveConnection },
  });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(calls, 1);
  assert.equal(result.message, "这是下一步");
  assert.equal(result.connection.mode, "live");
  assert.ok(!JSON.stringify(result).includes(testKey));
  const next = await post("/api/agent", input, result.connection.token);
  assert.equal(next.status, 200);
  assert.equal(calls, 2);
});

test("standalone connection verifies access, mode changes revoke the old session", async (t) => {
  const { post, store, url } = await serve(t, async (providerURL) => {
    assert.equal(providerURL, "https://api.openai.com/v1/responses");
    return providerReply();
  });
  const connected = await (
    await post("/api/connection", {
      connection: { ...liveConnection },
    })
  ).json();
  assert.equal(connected.connection.mode, "live");
  const demo = await (
    await post(
      "/api/connection",
      { connection: { mode: "demo" } },
      connected.connection.token,
    )
  ).json();
  assert.equal(store.get(connected.connection.token), undefined);
  assert.equal(demo.connection.mode, "demo");
  await fetch(url + "/api/connection", {
    method: "DELETE",
    headers: { "X-Muse-Connection": demo.connection.token },
  });
  assert.equal(store.size, 0);
  assert.equal(
    (await post("/api/agent", input, demo.connection.token)).status,
    401,
  );
});

test("invalid credentials and provider limits never create a session or fall back", async (t) => {
  for (const status of [401, 429]) {
    await t.test(`provider status ${status}`, async (t) => {
      const { post, store } = await serve(
        t,
        async () => new Response(null, { status }),
      );
      const response = await post("/api/agent", {
        ...input,
        connection: { ...liveConnection },
      });
      const result = await response.json();
      assert.equal(response.status, status);
      assert.equal(result.demo, undefined);
      assert.equal(result.connection, undefined);
      assert.equal(store.size, 0);
      assert.ok(!JSON.stringify(result).includes(testKey));
    });
  }
});

test("revoked keys remove the active connection", async (t) => {
  let calls = 0;
  const { post, store } = await serve(t, async () =>
    ++calls === 1 ? providerReply() : new Response(null, { status: 401 }),
  );
  const first = await (
    await post("/api/agent", {
      ...input,
      connection: { ...liveConnection },
    })
  ).json();
  const response = await post("/api/agent", input, first.connection.token);
  assert.equal(response.status, 401);
  assert.equal(store.size, 0);
});

test("cross-origin and non-local credentials are rejected before the provider", async (t) => {
  const { post, url } = await serve(t, () => {
    throw new Error("Provider must not be called");
  });
  const body = { connection: { ...liveConnection } };
  assert.equal(
    (
      await post("/api/connection", body, null, {
        Origin: "https://other.example",
      })
    ).status,
    403,
  );
  const response = await new Promise((resolve, reject) => {
    const request = httpRequest(
      url + "/api/connection",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Host: "other.example" },
      },
      (response) => {
        let data = "";
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () =>
          resolve({ status: response.statusCode, body: JSON.parse(data) }),
        );
      },
    );
    request.on("error", reject);
    request.end(JSON.stringify(body));
  });
  assert.equal(response.status, 403);
  assert.equal(response.body.code, "local_connection_only");
});

test("cancelling a connection request aborts the provider without retaining a key", async (t) => {
  let started, cancelled;
  const start = new Promise((resolve) => {
    started = resolve;
  });
  const stop = new Promise((resolve) => {
    cancelled = resolve;
  });
  const { url, store } = await serve(t, async (_url, options) => {
    started();
    return await new Promise((_resolve, reject) =>
      options.signal.addEventListener(
        "abort",
        () => {
          cancelled();
          reject(new DOMException("Aborted", "AbortError"));
        },
        { once: true },
      ),
    );
  });
  const controller = new AbortController();
  const request = fetch(url + "/api/connection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connection: { ...liveConnection } }),
    signal: controller.signal,
  });
  await start;
  controller.abort();
  await assert.rejects(request, { name: "AbortError" });
  await stop;
  assert.equal(store.size, 0);
});

test("native provider protocols preserve the model, history and structured replies", async (t) => {
  const expected = { message: "模型回复", suggestions: [] };
  const cases = [
    {
      provider: "openai",
      model: "gpt-5-mini",
      path: "/responses",
      response: {
        status: "completed",
        output: [
          {
            content: [{ type: "output_text", text: JSON.stringify(expected) }],
          },
        ],
      },
    },
    {
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      path: "/messages",
      response: {
        stop_reason: "tool_use",
        content: [{ type: "tool_use", name: "canvas_reply", input: expected }],
      },
    },
    {
      provider: "google",
      model: "gemini-3.5-flash-lite",
      path: "/models/gemini-3.5-flash-lite:generateContent",
      response: {
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: JSON.stringify(expected) }] },
          },
        ],
      },
    },
    ...["deepseek", "qwen", "siliconflow", "openrouter", "ollama"].map(
      (provider) => ({
        provider,
        model: "selected-model",
        path: "/chat/completions",
        response: {
          choices: [
            {
              finish_reason: "stop",
              message: { content: JSON.stringify(expected) },
            },
          ],
        },
      }),
    ),
  ];
  for (const item of cases)
    await t.test(item.provider, async () => {
      const connection = validateConnection({
        mode: "live",
        provider: item.provider,
        model: item.model,
        apiKey: item.provider === "ollama" ? "" : testKey,
      });
      const result = await createReply(
        {
          ...input,
          history: [
            { role: "user", content: "上一条问题" },
            { role: "assistant", content: "上一条回复" },
          ],
        },
        {
          ...connection,
          fetchImpl: async (url, options) => {
            assert.equal(url, connection.baseUrl + item.path);
            assert.equal(options.redirect, "error");
            assert.ok(!url.includes(testKey));
            const body = JSON.parse(options.body);
            assert.ok(!options.body.includes(testKey));
            if (item.provider === "anthropic") {
              assert.equal(options.headers["x-api-key"], testKey);
              assert.equal(options.headers["anthropic-version"], "2023-06-01");
              assert.equal(body.tool_choice.name, "canvas_reply");
              assert.equal(body.messages[1].content, "上一条回复");
              assert.ok(body.system.includes("Muse"));
            } else if (item.provider === "google") {
              assert.equal(options.headers["x-goog-api-key"], testKey);
              assert.equal(body.contents[1].role, "model");
              assert.equal(
                body.generationConfig.responseMimeType,
                "application/json",
              );
              assert.ok(
                body.generationConfig.responseJsonSchema.properties.suggestions,
              );
            } else {
              assert.equal(body.model, item.model);
              assert.equal(
                options.headers.Authorization,
                item.provider === "ollama" ? undefined : `Bearer ${testKey}`,
              );
              if (item.provider === "openai") assert.equal(body.store, false);
              else assert.equal(body.response_format.type, "json_object");
            }
            return Response.json(item.response);
          },
        },
      );
      assert.deepEqual(result, { ...expected, demo: false });
    });
});

test("custom endpoints validate URL, protocol and model before sending credentials", () => {
  const custom = {
    mode: "live",
    provider: "custom",
    protocol: "chat",
    model: "local-model",
    apiKey: "",
    baseUrl: "http://127.0.0.1:11434/v1/",
  };
  assert.equal(validateConnection(custom).baseUrl, "http://127.0.0.1:11434/v1");
  for (const patch of [
    { baseUrl: "http://untrusted.example/v1", apiKey: testKey },
    { baseUrl: "https://user:secret@example.com/v1", apiKey: testKey },
    { baseUrl: "https://example.com/v1?api_key=secret", apiKey: testKey },
    { baseUrl: "https://example.com/v1", apiKey: "" },
    { protocol: "unknown" },
    { model: "" },
  ])
    assert.throws(() => validateConnection({ ...custom, ...patch }));
});

test("custom provider settings reach the selected endpoint and return only non-secret metadata", async (t) => {
  const { post, store } = await serve(t, async (url, options) => {
    assert.equal(url, "https://models.example/v2/chat/completions");
    assert.equal(JSON.parse(options.body).model, "team/my-model");
    return Response.json({
      choices: [
        {
          finish_reason: "stop",
          message: {
            content: JSON.stringify({
              message: "自定义模型回复",
              suggestions: [],
            }),
          },
        },
      ],
    });
  });
  const config = {
    mode: "live",
    provider: "custom",
    protocol: "chat",
    model: "team/my-model",
    baseUrl: "https://models.example/v2",
    apiKey: testKey,
  };
  const response = await post("/api/agent", { ...input, connection: config });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.connection.model, config.model);
  assert.equal(result.connection.baseUrl, config.baseUrl);
  assert.equal(result.connection.provider, "custom");
  assert.ok(!JSON.stringify(result).includes(testKey));
  assert.equal(store.get(result.connection.token).apiKey, testKey);
});

test("model discovery normalizes native catalogues without retaining credentials", async (t) => {
  for (const provider of ["openai", "anthropic", "google", "custom"])
    await t.test(provider, async (t) => {
      const { post, store } = await serve(t, async (url, options) => {
        assert.equal(options.method, "GET");
        assert.ok(!url.includes(testKey));
        return Response.json(
          provider === "google"
            ? {
                models: [
                  {
                    name: "models/gemini-test",
                    supportedGenerationMethods: ["generateContent"],
                  },
                  {
                    name: "models/embed",
                    supportedGenerationMethods: ["embedContent"],
                  },
                ],
              }
            : {
                data: [
                  null,
                  { id: "model-b" },
                  { id: "model-a" },
                  { id: "model-a" },
                  { id: 123 },
                ],
              },
        );
      });
      const response = await post("/api/models", {
        connection: {
          mode: "live",
          provider,
          apiKey: testKey,
          ...(provider === "custom"
            ? { protocol: "chat", baseUrl: "https://models.example/v1" }
            : {}),
        },
      });
      assert.equal(response.status, 200);
      assert.deepEqual(
        (await response.json()).models,
        provider === "google" ? ["gemini-test"] : ["model-a", "model-b"],
      );
      assert.equal(store.size, 0);
    });
});

test("truncated or invalid model output cannot become canvas notes", async () => {
  for (const response of [
    {
      choices: [
        {
          finish_reason: "length",
          message: { content: '{"message":"incomplete"}' },
        },
      ],
    },
    { choices: [{ finish_reason: "stop", message: { content: "not JSON" } }] },
    {
      choices: [
        {
          finish_reason: "stop",
          message: {
            content: '{"message":"invalid","suggestions":[{"kind":"script"}]}',
          },
        },
      ],
    },
  ])
    await assert.rejects(
      createReply(input, {
        ...validateConnection({
          mode: "live",
          provider: "deepseek",
          model: "deepseek-flash",
          apiKey: testKey,
        }),
        fetchImpl: async () => Response.json(response),
      }),
    );
});
