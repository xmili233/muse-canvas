import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowRight,
  History,
  Paperclip,
  Headphones,
  ArrowUp,
  Check,
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
import { loadDraft, saveDraft } from "../localPersistence";
import { createDemoReply } from "../demoAgent";

type Props = {
  open: boolean;
  board: Board;
  onClose: () => void;
  onMessages: (messages: Message[]) => void;
  onChange: (canvas: CanvasSnapshot) => void;
  notify: (message: string) => void;
};
export default function Agent({
  open,
  board,
  onClose,
  onMessages,
  onChange,
  notify,
}: Props) {
  const [input, setInput] = useState(() => loadDraft(board.id));
  const [busy, setBusy] = useState(false);
  const [context, setContext] = useState(true);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(board);
  latest.current = board;
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  useEffect(() => {
    scroller.current?.scrollTo({
      top: scroller.current.scrollHeight,
      behavior: "instant",
    });
  }, [board.messages, pendingPrompt, busy]);
  useEffect(() => {
    try {
      saveDraft(board.id, pendingPrompt ?? input);
    } catch {
      notify("草稿暂时无法保存到浏览器");
    }
  }, [board.id, input, pendingPrompt]);

  function prepareTransition() {
    composerBefore.current = composer.current?.getBoundingClientRect() || null;
  }
  function send(value = input) {
    const prompt = value.trim();
    if (!prompt || timer.current) return;
    const snapshot = latest.current;
    prepareTransition();
    setPendingPrompt(prompt);
    setInput("");
    setBusy(true);
    // Keep the pending and cancel interactions visible in the local demo.
    timer.current = setTimeout(() => {
      timer.current = null;
      const result = createDemoReply(
        prompt,
        context ? snapshot : { title: "空白画板", nodes: [] },
      );
      prepareTransition();
      onMessages([
        ...snapshot.messages,
        { id: uid(), role: "user", content: prompt },
        {
          id: uid(),
          role: "assistant",
          content: result.message,
          suggestions: result.suggestions,
          demo: true,
        },
      ]);
      setPendingPrompt(null);
      setBusy(false);
      textarea.current?.focus({ preventScroll: true });
    }, 450);
  }
  function cancel() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    prepareTransition();
    setBusy(false);
    setInput(pendingPrompt ?? input);
    setPendingPrompt(null);
    textarea.current?.focus({ preventScroll: true });
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
            {busy && (
              <div className="agent-thinking">
                <span className="mini-mascot">••</span>正在生成示例
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
              <span className="agent-mode">演示模式</span>
            </div>
            <button
              className="send-button"
              type={busy ? "button" : "submit"}
              disabled={!busy && !input.trim()}
              aria-label={busy ? "停止生成" : "发送消息"}
              onClick={busy ? (event) => {
                event.preventDefault();
                cancel();
              } : undefined}
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
        open={info}
        title="Agent 演示"
        onClose={() => setInfo(false)}
      >
        <p className="modal-description">
          在本地模拟整理思路、延伸创意和生成便签的流程，不调用真实模型。
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
