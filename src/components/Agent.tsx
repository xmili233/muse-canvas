import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowRight,
  History,
  Paperclip,
  Headphones,
  ArrowUp,
  Check,
  ChevronDown,
  PanelRightClose,
  Plus,
  Square,
} from "lucide-react";
import {
  bounds,
  makeNode,
  uid,
  type Board,
  type CanvasSnapshot,
  type Message,
  type Suggestion,
} from "../model";
import { IconButton, Modal } from "./Ui";
import { motionAllowed, motionEasing, revealElements } from "../motion";
import AgentConnectionForm from "./AgentConnectionForm";
import type {
  AgentConnection,
  ConnectionChoice,
  ConnectionError,
} from "../agentConnection";

type Props = {
  open: boolean;
  connection: AgentConnection | null;
  onConnectionChange: (connection: AgentConnection | null) => void;
  board: Board;
  onClose: () => void;
  onMessages: (messages: Message[]) => void;
  onChange: (canvas: CanvasSnapshot) => void;
  notify: (message: string) => void;
};
export default function Agent({
  open,
  connection,
  onConnectionChange,
  board,
  onClose,
  onMessages,
  onChange,
  notify,
}: Props) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [context, setContext] = useState(true);
  const [setupOpen, setSetupOpen] = useState(false);
  const [connectionOrigin, setConnectionOrigin] = useState<DOMRect | null>(
    null,
  );
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [error, setError] = useState<ConnectionError | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const hasActivity = board.messages.length > 0 || !!pendingPrompt;
  const [info, setInfo] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLDivElement>(null);
  const composerBefore = useRef<DOMRect | null>(null);
  const messageIds = useRef(
    new Set(board.messages.map((message) => message.id)),
  );
  useLayoutEffect(() => {
    const before = composerBefore.current;
    if (before && composer.current && motionAllowed()) {
      composer.current
        .getAnimations()
        .forEach((animation) => animation.cancel());
      const after = composer.current.getBoundingClientRect();
      composer.current.animate(
        [
          {
            transform: `translate(${before.left - after.left}px, ${before.top - after.top}px)`,
          },
          { transform: getComputedStyle(composer.current).transform },
        ],
        { duration: 220, easing: motionEasing() },
      );
    }
    composerBefore.current = null;
  }, [hasActivity]);
  useLayoutEffect(() => {
    const added = [
      ...(scroller.current?.querySelectorAll<HTMLElement>(
        "[data-message-id]",
      ) || []),
    ].filter((el) => !messageIds.current.has(el.dataset.messageId!));
    revealElements(added);
    messageIds.current = new Set(board.messages.map((message) => message.id));
  }, [board.messages]);
  const controller = useRef<AbortController | null>(null);
  const latest = useRef(board);
  latest.current = board;
  useEffect(() => () => controller.current?.abort("unmount"), []);
  useEffect(() => {
    scroller.current?.scrollTo({
      top: scroller.current.scrollHeight,
      behavior: "instant",
    });
  }, [board.messages, pendingPrompt, busy]);

  function prepareTransition() {
    composerBefore.current = composer.current?.getBoundingClientRect() || null;
  }
  function openConnection(trigger: HTMLElement | null = composer.current) {
    setConnectionOrigin(trigger?.getBoundingClientRect() || null);
    setSetupOpen(true);
  }
  async function request<T>(
    path: string,
    body: unknown,
    abort: AbortController,
    method = "POST",
  ): Promise<T> {
    const response = await fetch(path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(connection ? { "X-Muse-Connection": connection.token } : {}),
      },
      ...(method === "DELETE" ? {} : { body: JSON.stringify(body) }),
      signal: abort.signal,
    });
    const data = await response.json();
    if (!response.ok)
      throw Object.assign(
        new Error(data.error || "暂时无法连接本地服务，请重试。"),
        { code: data.code },
      );
    return data;
  }
  function beginRequest() {
    if (controller.current) return null;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError(null);
    const timeout = setTimeout(() => abort.abort("timeout"), 60000);
    return {
      abort,
      finish: () => {
        clearTimeout(timeout);
        if (controller.current === abort) {
          controller.current = null;
          setBusy(false);
        }
      },
    };
  }
  function displayError(
    value: unknown,
    abort: AbortController,
  ): ConnectionError {
    if (abort.signal.reason === "timeout")
      return { message: "响应超时，请稍后重试。", code: "timeout" };
    const failure = value as Error & { code?: string };
    return {
      message: failure.code
        ? failure.message
        : "暂时无法连接本地服务，请检查网络后重试。",
      code: failure.code,
    };
  }
  async function runPrompt(prompt: string, choice?: ConnectionChoice) {
    const running = beginRequest();
    if (!running) return;
    const { abort, finish } = running;
    const snapshot = latest.current;
    prepareTransition();
    setPendingPrompt(prompt);
    setInput("");
    try {
      const data = await request<{
        connection: AgentConnection;
        message: string;
        suggestions: Suggestion[];
        demo: boolean;
      }>(
        "/api/agent",
        {
          prompt,
          board: context
            ? {
                title: snapshot.title,
                nodes: snapshot.nodes.map(({ kind, label, content }) => ({
                  kind,
                  label,
                  content,
                })),
              }
            : { title: "空白画板", nodes: [] },
          history: snapshot.messages
            .slice(-8)
            .map(({ role, content }) => ({ role, content })),
          ...(choice ? { connection: choice } : {}),
        },
        abort,
      );
      if (abort.signal.aborted) return;
      const returnToInput =
        setupOpen || composer.current?.contains(document.activeElement);
      prepareTransition();
      onConnectionChange(data.connection);
      onMessages([
        ...snapshot.messages,
        { id: uid(), role: "user", content: prompt },
        {
          id: uid(),
          role: "assistant",
          content: data.message,
          suggestions: data.suggestions,
          demo: data.demo,
        },
      ]);
      setPendingPrompt(null);
      setSetupOpen(false);
      if (returnToInput)
        requestAnimationFrame(() =>
          textarea.current?.focus({ preventScroll: true }),
        );
    } catch (value) {
      if (abort.signal.aborted && abort.signal.reason !== "timeout") return;
      const failure = displayError(value, abort);
      setError(failure);
      if (
        choice ||
        failure.code === "connection_required" ||
        failure.code === "invalid_key"
      ) {
        if (!choice) onConnectionChange(null);
        if (!setupOpen) openConnection();
      } else {
        setInput(prompt);
        setPendingPrompt(null);
      }
    } finally {
      finish();
    }
  }
  function send(value = input) {
    const prompt = value.trim();
    if (!prompt || controller.current) return;
    prepareTransition();
    setError(null);
    if (!connection) {
      setPendingPrompt(prompt);
      setInput("");
      openConnection();
    } else void runPrompt(prompt);
  }
  async function chooseConnection(choice: ConnectionChoice) {
    if (pendingPrompt) {
      await runPrompt(pendingPrompt, choice);
      return;
    }
    const running = beginRequest();
    if (!running) return;
    const { abort, finish } = running;
    try {
      const data = await request<{ connection: AgentConnection }>(
        "/api/connection",
        { connection: choice },
        abort,
      );
      if (!abort.signal.aborted) {
        onConnectionChange(data.connection);
        prepareTransition();
        setSetupOpen(false);
        requestAnimationFrame(() =>
          textarea.current?.focus({ preventScroll: true }),
        );
      }
    } catch (value) {
      if (!abort.signal.aborted || abort.signal.reason === "timeout")
        setError(displayError(value, abort));
    } finally {
      finish();
    }
  }
  function backToEditor() {
    controller.current?.abort("cancel");
    controller.current = null;
    prepareTransition();
    setBusy(false);
    setInput(pendingPrompt ?? input);
    setPendingPrompt(null);
    setSetupOpen(false);
    setError(null);
    requestAnimationFrame(() =>
      textarea.current?.focus({ preventScroll: true }),
    );
  }
  async function disconnect() {
    const running = beginRequest();
    if (!running) return;
    const { abort, finish } = running;
    try {
      await request("/api/connection", null, abort, "DELETE");
      if (!abort.signal.aborted) {
        onConnectionChange(null);
        backToEditor();
      }
    } catch (value) {
      if (!abort.signal.aborted || abort.signal.reason === "timeout")
        setError(displayError(value, abort));
    } finally {
      finish();
    }
  }
  function apply(message: Message) {
    if (message.applied || !message.suggestions?.length) return;
    const current = latest.current;
    const box = bounds(current.nodes);
    const additions = message.suggestions.map((s: Suggestion, i) =>
      makeNode(
        s.kind,
        current.nodes.length ? box.x + (i % 3) * 305 : 80 + (i % 3) * 305,
        current.nodes.length
          ? box.y + box.h + 65 + Math.floor(i / 3) * 235
          : 100 + Math.floor(i / 3) * 235,
        { content: s.content, label: s.label, color: s.color, w: 275, h: 195 },
      ),
    );
    onChange({ nodes: [...current.nodes, ...additions], edges: current.edges });
    onMessages(
      current.messages.map((m) =>
        m.id === message.id ? { ...m, applied: true } : m,
      ),
    );
    notify(`已将 ${additions.length} 个想法添加到画板`);
  }
  return (
    <aside
      className={`agent-panel ${hasActivity ? "has-messages" : "agent-idle"}`}
      aria-label="AI Agent"
      inert={!open}
      aria-hidden={!open}
    >
      <header className="agent-header">
        <button
          className="new-chat"
          onClick={() => {
            if (!busy) {
              composerBefore.current =
                composer.current?.getBoundingClientRect() || null;
              setPendingPrompt(null);
              setError(null);
              setSetupOpen(false);
              onMessages([]);
            }
          }}
          disabled={busy}
        >
          <Headphones size={13} />
          New chat
        </button>
        <IconButton
          label="对话记录"
          onClick={() =>
            scroller.current?.scrollTo({ top: 0, behavior: "smooth" })
          }
        >
          <History size={13} />
        </IconButton>
        <IconButton label="收起 Agent" onClick={onClose}>
          <PanelRightClose size={13} />
        </IconButton>
      </header>
      {hasActivity && (
        <div ref={scroller} className="agent-scroll" aria-live="polite">
          <div className="messages">
            {board.messages.map((message) => (
              <div
                key={message.id}
                data-message-id={message.id}
                className={`message message-${message.role}`}
              >
                {message.role === "assistant" && (
                  <div className="message-byline">
                    <span className="mini-mascot">••</span>
                    <strong>Agent</strong>
                    {message.demo && <span>模拟结果</span>}
                  </div>
                )}
                <div className="message-content">{message.content}</div>
                {!!message.suggestions?.length && (
                  <div className="suggestion-result">
                    <div className="suggestion-previews">
                      {message.suggestions.map((s, i) => (
                        <div key={i} style={{ background: s.color }}>
                          <small>{s.label}</small>
                          <span>{s.content}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      className={`apply-button ${message.applied ? "applied" : ""}`}
                      disabled={message.applied}
                      onClick={() => apply(message)}
                    >
                      {message.applied ? (
                        <Check size={14} />
                      ) : (
                        <Plus size={14} />
                      )}{" "}
                      {message.applied
                        ? "Added to canvas"
                        : `Add ${message.suggestions.length} notes to canvas`}
                      <ArrowRight size={13} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {pendingPrompt && (
              <div className="message message-user message-pending">
                <div className="message-content">{pendingPrompt}</div>
                <span className="pending-label">
                  {busy ? "正在处理" : "待发送"}
                </span>
              </div>
            )}
            {busy && !setupOpen && (
              <div className="agent-thinking">
                <span className="mini-mascot">••</span>Thinking
                <span className="thinking-dots">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      <div ref={composer} className="composer-section">
        {!hasActivity && (
          <div className="agent-intro">
            <button
              className="agent-mascot"
              aria-label="查看 Agent 能力"
              onClick={() => setInfo(true)}
            >
              <i />
              <i />
            </button>
            <button className="agent-tip" onClick={() => setInfo(true)}>
              See what the agent can do
            </button>
          </div>
        )}
        <form
          className={`composer ${busy ? "is-busy" : ""}`}
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <textarea
            ref={textarea}
            aria-label="发送给 Agent 的消息"
            placeholder="Start typing..."
            value={input}
            maxLength={6000}
            rows={2}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                send();
              }
            }}
          />
          {error && !setupOpen && (
            <p className="agent-request-error" role="alert">
              {error.message}
            </p>
          )}
          <div className="composer-actions">
            <div className="composer-left">
              <button
                type="button"
                className={`context-clip ${context ? "enabled" : ""}`}
                aria-label="引用当前画板"
                aria-pressed={context}
                title={context ? "当前画板已作为上下文" : "引用当前画板"}
                onClick={() => setContext(!context)}
              >
                <Paperclip size={13} />
              </button>
              <button
                type="button"
                className="model-picker"
                onClick={(event) => {
                  openConnection(event.currentTarget);
                  setError(null);
                }}
                disabled={busy}
              >
                <span>
                  {connection?.mode === "live"
                    ? connection.model
                    : connection?.mode === "demo"
                      ? "模拟模式"
                      : "连接模型"}
                </span>
                <ChevronDown size={11} />
              </button>
            </div>
            <button
              className="send-button"
              type={busy ? "button" : "submit"}
              disabled={!busy && !input.trim()}
              aria-label={busy ? "停止生成" : "发送消息"}
              onClick={busy ? backToEditor : undefined}
            >
              {busy ? (
                <Square size={10} fill="currentColor" />
              ) : (
                <ArrowUp size={13} />
              )}
            </button>
          </div>
        </form>
      </div>
      <Modal
        open={setupOpen}
        title="连接模型"
        onClose={backToEditor}
        className="connection-dialog"
        origin={connectionOrigin}
      >
        <AgentConnectionForm
          open={setupOpen}
          connection={connection}
          hasPendingPrompt={!!pendingPrompt}
          busy={busy}
          error={error}
          onConnect={chooseConnection}
          onClearError={() => setError(null)}
          onDisconnect={disconnect}
        />
      </Modal>
      <Modal
        open={info}
        title="What can the agent do?"
        onClose={() => setInfo(false)}
      >
        <p className="modal-description">
          结合当前画板，梳理思路、延伸创意，并将结果转成便签。
        </p>
        <div className="agent-prompts">
          {[
            "帮我梳理这块画板的核心想法",
            "根据当前画板，延伸 3 个创意方向",
            "把画板里的想法转成可以执行的下一步",
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => {
                setInfo(false);
                send(prompt);
              }}
            >
              {prompt}
              <ArrowRight size={14} />
            </button>
          ))}
        </div>
      </Modal>
    </aside>
  );
}
