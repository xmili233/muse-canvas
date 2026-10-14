import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
} from "lucide-react";
import { PROVIDERS, PROTOCOLS } from "../../shared/providers.mjs";
import type {
  AgentConnection,
  ConnectionChoice,
  ConnectionError,
  ModelConnection,
  ProviderId,
  ProtocolId,
} from "../agentConnection";
import { IconButton } from "./Ui";

type Props = {
  open: boolean;
  connection: AgentConnection | null;
  hasPendingPrompt: boolean;
  busy: boolean;
  error: ConnectionError | null;
  onConnect: (choice: ConnectionChoice) => void;
  onClearError: () => void;
  onDisconnect: () => void;
};

function defaults(provider: ProviderId): ModelConnection {
  const preset = PROVIDERS[provider];
  return {
    provider,
    protocol: preset.protocol as ProtocolId,
    baseUrl: preset.baseUrl,
    model: preset.models[0] || "",
  };
}

export default function AgentConnectionForm({
  open,
  connection,
  hasPendingPrompt,
  busy,
  error,
  onConnect,
  onClearError,
  onDisconnect,
}: Props) {
  const [config, setConfig] = useState<ModelConnection>(() =>
    defaults("openai"),
  );
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const keyInput = useRef<HTMLInputElement>(null);
  const modelInput = useRef<HTMLInputElement>(null);
  const modelRequest = useRef<AbortController | null>(null);
  const preset = PROVIDERS[config.provider];
  const local =
    /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i.test(
      config.baseUrl,
    );
  const hasCredentials = !!apiKey.trim() || local;
  const locked = busy || loadingModels;

  useEffect(() => {
    if (open) {
      const initial =
        connection?.mode === "live" ? connection : defaults("openai");
      setConfig(initial);
      setModels([...PROVIDERS[initial.provider].models]);
      setCatalogError("");
      keyInput.current?.focus({ preventScroll: true });
    } else {
      modelRequest.current?.abort();
      setApiKey("");
      setShowKey(false);
    }
    return () => modelRequest.current?.abort();
  }, [open]);

  function changeConfig(patch: Partial<ModelConnection>) {
    setConfig((current) => ({ ...current, ...patch }));
    setCatalogError("");
    onClearError();
  }
  function chooseProvider(provider: ProviderId) {
    changeConfig(defaults(provider));
    setApiKey("");
    setShowKey(false);
    setModels([...PROVIDERS[provider].models]);
  }
  async function fetchModels() {
    if (!hasCredentials || locked) return;
    const controller = new AbortController();
    modelRequest.current = controller;
    setLoadingModels(true);
    setCatalogError("");
    onClearError();
    const timeout = setTimeout(() => controller.abort("timeout"), 20000);
    try {
      const response = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection: { mode: "live", ...config, apiKey },
        }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "无法获取模型列表，可手动填写模型 ID。");
      if (!data.models.length)
        throw new Error("接口未返回模型，可手动填写模型 ID。");
      setModels(data.models);
      if (!config.model)
        setConfig((current) => ({ ...current, model: data.models[0] }));
      modelInput.current?.focus({ preventScroll: true });
    } catch (failure) {
      if (!controller.signal.aborted || controller.signal.reason === "timeout")
        setCatalogError(
          controller.signal.aborted
            ? "获取超时，可手动填写模型 ID。"
            : (failure as Error).message,
        );
    } finally {
      clearTimeout(timeout);
      if (modelRequest.current === controller) {
        modelRequest.current = null;
        setLoadingModels(false);
      }
    }
  }

  return (
    <form
      className="connection-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (hasCredentials && config.model.trim() && !locked)
          onConnect({
            mode: "live",
            ...config,
            model: config.model.trim(),
            apiKey: apiKey.trim(),
          });
      }}
    >
      <div className="connection-field">
        <label htmlFor="agent-provider">平台</label>
        <select
          id="agent-provider"
          className="connection-input"
          value={config.provider}
          disabled={locked}
          onChange={(event) => chooseProvider(event.target.value as ProviderId)}
        >
          {Object.entries(PROVIDERS).map(([id, item]) => (
            <option key={id} value={id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      {config.provider === "custom" && (
        <div className="connection-field">
          <label htmlFor="agent-protocol">接口协议</label>
          <select
            id="agent-protocol"
            className="connection-input"
            value={config.protocol}
            disabled={locked}
            onChange={(event) =>
              changeConfig({ protocol: event.target.value as ProtocolId })
            }
          >
            {Object.entries(PROTOCOLS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}
      {config.provider === "custom" && (
        <div className="connection-field">
          <label htmlFor="agent-base-url">API 地址</label>
          <input
            id="agent-base-url"
            className="connection-input"
            type="url"
            placeholder="https://api.example.com/v1"
            value={config.baseUrl}
            readOnly={locked}
            onChange={(event) => changeConfig({ baseUrl: event.target.value })}
            autoComplete="off"
            spellCheck={false}
            required
          />
        </div>
      )}
      <div className="connection-field">
        <div className="connection-label-row">
          <label htmlFor="agent-model">模型</label>
          <button
            className="connection-fetch-models"
            type="button"
            onClick={fetchModels}
            disabled={!hasCredentials || locked}
            title="填写 Key 后从接口获取模型列表"
          >
            {loadingModels ? (
              <LoaderCircle size={12} className="connection-spinner" />
            ) : (
              <RefreshCw size={12} />
            )}
            获取列表
          </button>
        </div>
        <input
          id="agent-model"
          ref={modelInput}
          className="connection-input"
          list="agent-model-options"
          placeholder="选择或输入模型 ID"
          value={config.model}
          readOnly={locked}
          onChange={(event) => changeConfig({ model: event.target.value })}
          autoComplete="off"
          spellCheck={false}
          maxLength={200}
          required
        />
        <datalist id="agent-model-options">
          {models.map((model) => (
            <option key={model} value={model} />
          ))}
        </datalist>
      </div>
      <div className="connection-field">
        <div className="connection-label-row">
          <label htmlFor="agent-api-key">
            API Key{local && <span className="connection-optional">可选</span>}
          </label>
          {preset.keyUrl && (
            <a href={preset.keyUrl} target="_blank" rel="noreferrer">
              获取 Key ↗
            </a>
          )}
        </div>
        <div
          className={`connection-key-field ${error?.code === "invalid_key" ? "has-error" : ""}`}
        >
          <input
            id="agent-api-key"
            ref={keyInput}
            type={showKey ? "text" : "password"}
            placeholder={local ? "本地服务可留空" : "输入 API Key"}
            value={apiKey}
            readOnly={locked}
            onChange={(event) => {
              setApiKey(event.target.value);
              setCatalogError("");
              onClearError();
            }}
            maxLength={1024}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={error?.code === "invalid_key"}
            aria-describedby="connection-privacy"
          />
          <IconButton
            label={showKey ? "隐藏 Key" : "显示 Key"}
            onClick={() => setShowKey(!showKey)}
            disabled={locked}
          >
            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
          </IconButton>
        </div>
      </div>
      {config.provider !== "custom" && (
        <details className="connection-advanced" key={config.provider}>
          <summary>接口地址</summary>
          <input
            className="connection-input"
            aria-label="API 地址"
            type="url"
            value={config.baseUrl}
            readOnly={locked}
            onChange={(event) => changeConfig({ baseUrl: event.target.value })}
            autoComplete="off"
            spellCheck={false}
            required
          />
        </details>
      )}
      {(error || catalogError) && (
        <p className="connection-error" role="alert">
          {error?.message || catalogError}
        </p>
      )}
      <div className="connection-footer">
        <p
          id="connection-privacy"
          title="Key 仅用于所选接口，由本机服务在内存中保管，断开或闲置 30 分钟后清除。"
        >
          <LockKeyhole size={12} />
          Key 仅在本机临时使用，不保存到云端
        </p>
        {connection && (
          <button type="button" onClick={onDisconnect} disabled={locked}>
            断开
          </button>
        )}
      </div>
      <div className="connection-actions">
        <button
          className="connection-demo"
          type="button"
          onClick={() => onConnect({ mode: "demo" })}
          disabled={locked}
        >
          模拟体验
        </button>
        <button
          className="connection-submit"
          type="submit"
          disabled={
            !hasCredentials ||
            !config.model.trim() ||
            !config.baseUrl.trim() ||
            locked
          }
        >
          {busy ? (
            <>
              <LoaderCircle size={15} className="connection-spinner" />
              连接中…
            </>
          ) : (
            <>
              {hasPendingPrompt ? "连接并发送" : "连接"}
              <ArrowRight size={15} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
