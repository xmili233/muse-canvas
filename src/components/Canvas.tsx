import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  FileText,
  Folder,
  Rows2,
  Link,
  Image,
  Mic,
  Shapes,
  Pencil,
  Check,
  Copy,
  Maximize,
  Minus,
  Plus,
  Redo2,
  Sparkles,
  Square,
  Trash2,
  Type,
  Undo2,
  X,
} from "lucide-react";
import {
  COLORS,
  fitViewport,
  makeNode,
  removeNodes,
  uid,
  type Board,
  type CanvasNode,
  type CanvasSnapshot,
  type NodeKind,
} from "../model";
import { IconButton, Logo } from "./Ui";
import ReferenceNode from "./ReferenceNode";
import {
  connectionPath,
  initialViewport,
  dragNode,
  viewportTransform,
  type Viewport,
} from "../canvasGeometry";
import { motionAllowed, motionEasing, revealElements } from "../motion";

type Props = {
  onNested: () => void;
  fitSignal: number;
  showGrid: boolean;
  onToggleGrid: () => void;
  board: Board;
  onChange: (value: CanvasSnapshot) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onAgent: () => void;
  notify: (message: string) => void;
};
type Tool = "select" | "hand" | "connect" | "draw";
type Gesture = {
  type: "pan" | "move" | "resize" | "draw";
  pointerId: number;
  sx: number;
  sy: number;
  x: number;
  y: number;
  node?: CanvasNode;
};
export default function Canvas({
  onNested,
  fitSignal,
  showGrid,
  onToggleGrid,
  board,
  onChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onAgent,
  notify,
}: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const world = useRef<HTMLDivElement>(null);
  const nodeElements = useRef(new Map<string, HTMLElement>());
  const edgeElements = useRef(new Map<string, SVGPathElement>());
  const view = useRef<Viewport>({ x: 0, y: 0, z: 1 });
  const viewAnimation = useRef<Animation | null>(null);
  const zoomTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [zoomPercent, setZoomPercent] = useState(100);
  const initialFrame = useRef(true);
  const lastFitSignal = useRef(fitSignal);
  const frame = useRef(0);
  const toolbar = useRef<HTMLDivElement>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const pendingPointer = useRef<{ x: number; y: number } | null>(null);
  const preview = useRef<CanvasNode | null>(null);
  const strokeLine = useRef<SVGPolylineElement>(null);
  const previousIds = useRef(new Set(board.nodes.map((node) => node.id)));
  const [tool, setTool] = useState<Tool>("select");
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [space, setSpace] = useState(false);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const strokePoints = useRef<Array<[number, number]>>([]);
  const selectedNode = board.nodes.find((n) => n.id === selected);
  const nodes = board.nodes;
  function stopViewAnimation() {
    const animation = viewAnimation.current;
    if (animation?.playState === "running" && world.current) {
      const matrix = new DOMMatrixReadOnly(
        getComputedStyle(world.current).transform,
      );
      view.current = { x: matrix.e, y: matrix.f, z: matrix.a };
      setZoomPercent(Math.round(matrix.a * 100));
      animation.cancel();
      world.current.style.transform = viewportTransform(view.current);
    }
    viewAnimation.current = null;
  }
  function setView(
    next: Viewport | ((current: Viewport) => Viewport),
    smooth = false,
  ) {
    stopViewAnimation();
    const previous = view.current;
    const value = typeof next === "function" ? next(previous) : next;
    view.current = value;
    if (world.current) {
      world.current.style.transform = viewportTransform(value);
      if (smooth && motionAllowed()) {
        viewAnimation.current = world.current.animate(
          [
            { transform: viewportTransform(previous) },
            { transform: viewportTransform(value) },
          ],
          { duration: 200, easing: motionEasing() },
        );
      }
    }
    if (stage.current) {
      stage.current.style.backgroundSize = `${24 * value.z}px ${24 * value.z}px`;
      stage.current.style.backgroundPosition = `${value.x}px ${value.y}px`;
    }
    if (value.z !== previous.z) {
      clearTimeout(zoomTimer.current);
      zoomTimer.current = setTimeout(
        () => setZoomPercent(Math.round(view.current.z * 100)),
        100,
      );
    }
  }
  const fit = (smooth = true) => {
    if (stage.current)
      setView(
        fitViewport(
          board.nodes,
          stage.current.clientWidth,
          stage.current.clientHeight,
        ),
        smooth,
      );
  };
  useLayoutEffect(() => {
    const added = board.nodes.filter(
      (node) => !previousIds.current.has(node.id) && node.kind !== "drawing",
    );
    revealElements(
      added.flatMap((node) => nodeElements.current.get(node.id) || []),
    );
    previousIds.current = new Set(board.nodes.map((node) => node.id));
  }, [board.nodes]);
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      clearTimeout(zoomTimer.current);
      clearTimeout(tooltipTimer.current);
      viewAnimation.current?.cancel();
    },
    [],
  );
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    if (initialFrame.current) {
      setView(initialViewport(board.nodes, el.clientWidth));
      initialFrame.current = false;
    } else if (lastFitSignal.current !== fitSignal) {
      fit(true);
    }
    lastFitSignal.current = fitSignal;
    setZoomPercent(Math.round(view.current.z * 100));
  }, [board.id, fitSignal]);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    function wheel(e: WheelEvent) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = el!.getBoundingClientRect();
        setView((v) => {
          const z = Math.max(
            0.15,
            Math.min(2.5, v.z * Math.exp(-e.deltaY * 0.006)),
          );
          const px = e.clientX - rect.left,
            py = e.clientY - rect.top;
          return {
            z,
            x: px - ((px - v.x) * z) / v.z,
            y: py - ((py - v.y) * z) / v.z,
          };
        });
      } else setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    }
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    let previousRect = el.getBoundingClientRect();
    const observer = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      // Keep the world under the same screen coordinates when panels change.
      setView((v) => ({
        ...v,
        x: v.x + previousRect.left - rect.left,
        y: v.y + previousRect.top - rect.top,
      }));
      previousRect = rect;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  function updateNode(id: string, patch: Partial<CanvasNode>) {
    onChange({
      nodes: board.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      edges: board.edges,
    });
  }
  function add(kind: NodeKind, patch: Partial<CanvasNode> = {}) {
    const el = stage.current!;
    const node = makeNode(
      kind,
      (el.clientWidth / 2 - view.current.x) / view.current.z - 135,
      (el.clientHeight / 2 - view.current.y) / view.current.z - 105,
      patch,
    );
    onChange({ nodes: [...board.nodes, node], edges: board.edges });
    setSelected(node.id);
    setTool("select");
    if (kind === "note" || kind === "text" || kind === "shape") {
      setDraft(node.content);
      setEditing(node.id);
    }
  }
  function duplicate() {
    if (!selectedNode) return;
    const node = {
      ...selectedNode,
      id: uid(),
      x: selectedNode.x + 32,
      y: selectedNode.y + 32,
    };
    onChange({ nodes: [...board.nodes, node], edges: board.edges });
    setSelected(node.id);
  }
  function remove() {
    if (selected) {
      onChange(removeNodes(board, [selected]));
      setSelected(null);
      setEditing(null);
    }
  }
  function edit(node: CanvasNode) {
    if (["image", "drawing", "sticker"].includes(node.kind)) return;
    setSelected(node.id);
    setDraft(node.content);
    setEditing(node.id);
  }
  function finishEdit() {
    if (editing) {
      const node = board.nodes.find((n) => n.id === editing);
      if (node && draft !== node.content)
        updateNode(editing, { content: draft });
      setEditing(null);
    }
  }
  useEffect(() => {
    function keydown(e: KeyboardEvent) {
      if (stage.current?.closest("main")?.inert) return;
      if (
        (e.target as HTMLElement).closest(
          "input,textarea,[contenteditable],dialog",
        )
      )
        return;
      if (e.key === " ") {
        e.preventDefault();
        setSpace(true);
      }
      if (e.key === "Escape") {
        setSelected(null);
        setConnectFrom(null);
        setTool("select");
      }
      if (e.metaKey || e.ctrlKey) {
        if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          e.shiftKey ? onRedo() : onUndo();
        }
        if (e.key.toLowerCase() === "d") {
          e.preventDefault();
          duplicate();
        }
        return;
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        remove();
      }
      if (e.key.toLowerCase() === "v") setTool("select");
      if (e.key.toLowerCase() === "h") setTool("hand");
      if (e.key.toLowerCase() === "p") setTool("draw");
      if (e.key.toLowerCase() === "n") add("note");
      if (e.key.toLowerCase() === "t") add("text");
      if (e.key.toLowerCase() === "r") add("shape", { color: "#ffffff" });
      if (e.key.toLowerCase() === "l") {
        setTool("connect");
        setConnectFrom(null);
      }
    }
    function keyup(e: KeyboardEvent) {
      if (e.key === " ") setSpace(false);
    }
    function blur() {
      setSpace(false);
    }
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", blur);
    };
  });
  function pointerDown(
    e: ReactPointerEvent,
    node?: CanvasNode,
    resize = false,
  ) {
    if (
      !e.isPrimary ||
      (e.button !== 0 && e.button !== 1) ||
      editing ||
      (e.target as HTMLElement).closest("button,textarea,input")
    )
      return;
    e.stopPropagation();
    stopViewAnimation();
    if (node)
      nodeElements.current
        .get(node.id)
        ?.getAnimations()
        .forEach((animation) => animation.cancel());
    if (tool === "draw" && !space) {
      const rect = stage.current!.getBoundingClientRect();
      strokePoints.current = [
        [
          (e.clientX - rect.left - view.current.x) / view.current.z,
          (e.clientY - rect.top - view.current.y) / view.current.z,
        ],
      ];
      gesture.current = {
        type: "draw",
        pointerId: e.pointerId,
        sx: e.clientX,
        sy: e.clientY,
        x: view.current.x,
        y: view.current.y,
      };
      stage.current?.setPointerCapture(e.pointerId);
      setSelected(null);
      return;
    }
    if (tool === "connect" && node) {
      if (connectFrom && connectFrom !== node.id) {
        if (
          !board.edges.some(
            (edge) => edge.from === connectFrom && edge.to === node.id,
          )
        )
          onChange({
            nodes: board.nodes,
            edges: [
              ...board.edges,
              { id: uid(), from: connectFrom, to: node.id },
            ],
          });
        setConnectFrom(null);
        setTool("select");
      } else {
        setConnectFrom(node.id);
        setSelected(node.id);
      }
      return;
    }
    const pan = tool === "hand" || space || e.button === 1 || !node;
    if (!pan && node) setSelected(node.id);
    if (!node) setSelected(null);
    gesture.current = {
      type: pan ? "pan" : resize ? "resize" : "move",
      pointerId: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      x: view.current.x,
      y: view.current.y,
      node,
    };
    stage.current?.setPointerCapture(e.pointerId);
  }
  function updateConnections(node: CanvasNode) {
    for (const edge of board.edges) {
      if (edge.from !== node.id && edge.to !== node.id) continue;
      const from =
        edge.from === node.id
          ? node
          : board.nodes.find((n) => n.id === edge.from);
      const to =
        edge.to === node.id ? node : board.nodes.find((n) => n.id === edge.to);
      if (from && to)
        edgeElements.current
          .get(edge.id)
          ?.setAttribute("d", connectionPath(from, to));
    }
  }
  function paintGesture() {
    const g = gesture.current,
      point = pendingPointer.current;
    if (!g || !point) return;
    if (g.type === "draw") {
      strokeLine.current?.setAttribute(
        "points",
        strokePoints.current.map((p) => p.join(",")).join(" "),
      );
      return;
    }
    const dx = point.x - g.sx,
      dy = point.y - g.sy;
    if (g.type === "pan") setView((v) => ({ ...v, x: g.x + dx, y: g.y + dy }));
    else if (g.node) {
      const node = dragNode(
        g.node,
        dx,
        dy,
        view.current.z,
        g.type === "resize",
      );
      preview.current = node;
      const element = nodeElements.current.get(node.id);
      if (element) {
        if (g.type === "resize") {
          element.style.width = `${node.w}px`;
          element.style.height = `${node.h}px`;
        } else
          element.style.transform = `translate(${node.x - g.node.x}px, ${node.y - g.node.y}px)`;
      }
      updateConnections(node);
    }
  }
  function pointerMove(e: ReactPointerEvent) {
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;
    pendingPointer.current = { x: e.clientX, y: e.clientY };
    if (g.type === "draw") {
      const rect = stage.current!.getBoundingClientRect();
      strokePoints.current.push([
        (e.clientX - rect.left - view.current.x) / view.current.z,
        (e.clientY - rect.top - view.current.y) / view.current.z,
      ]);
    }
    if (!frame.current)
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        paintGesture();
      });
  }
  function clearGesture(cancelled = false) {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    const original = gesture.current?.node;
    if (original) {
      const node = cancelled ? original : preview.current || original;
      const element = nodeElements.current.get(original.id);
      if (element) {
        element.style.left = `${node.x}px`;
        element.style.top = `${node.y}px`;
        element.style.width = `${node.w}px`;
        element.style.height = `${node.h}px`;
        element.style.transform = "";
      }
      updateConnections(node);
    }
    gesture.current = null;
    preview.current = null;
    pendingPointer.current = null;
    strokeLine.current?.setAttribute("points", "");
    strokePoints.current = [];
  }
  function pointerUp(e: ReactPointerEvent) {
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;
    pendingPointer.current = { x: e.clientX, y: e.clientY };
    paintGesture();
    if (g.type === "draw" && strokePoints.current.length > 1) {
      const points = strokePoints.current;
      const x = Math.min(...points.map((p) => p[0])) - 3,
        y = Math.min(...points.map((p) => p[1])) - 3;
      const w = Math.max(...points.map((p) => p[0])) - x + 3,
        h = Math.max(...points.map((p) => p[1])) - y + 3;
      const node = makeNode("drawing", x, y, {
        w,
        h,
        color: "transparent",
        content: points.map((p) => `${p[0] - x},${p[1] - y}`).join(" "),
      });
      onChange({ nodes: [...board.nodes, node], edges: board.edges });
    }
    if (
      preview.current &&
      (Math.abs(e.clientX - g.sx) > 1 || Math.abs(e.clientY - g.sy) > 1)
    )
      updateNode(preview.current.id, preview.current);
    clearGesture();
    if (stage.current?.hasPointerCapture(e.pointerId))
      stage.current.releasePointerCapture(e.pointerId);
  }
  function zoom(factor: number) {
    const el = stage.current!;
    setView((v) => {
      const z = Math.min(2.5, Math.max(0.15, v.z * factor));
      return {
        z,
        x: el.clientWidth / 2 - ((el.clientWidth / 2 - v.x) * z) / v.z,
        y: el.clientHeight / 2 - ((el.clientHeight / 2 - v.y) * z) / v.z,
      };
    }, true);
  }
  async function upload(file?: File) {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
        file.type,
      )
    ) {
      notify("请选择 PNG、JPG、WebP 或 GIF 图片");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      notify("图片需小于 2 MB，以便保存在本地");
      return;
    }
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      add("image", { image: data, content: file.name, label: file.name });
    } catch {
      notify("图片读取失败，请重试");
    }
    if (imageInput.current) imageInput.current.value = "";
  }
  return (
    <div className="canvas-container">
      <div className="canvas-topbar">
        <div className="canvas-status">
          <span className="status-dot" />
          自由画布
          <span className="subtle-divider" />
          {board.nodes.length} 个元素
        </div>
        <div className="history-controls">
          <IconButton label="撤销 (⌘Z)" disabled={!canUndo} onClick={onUndo}>
            <Undo2 size={16} />
          </IconButton>
          <IconButton label="重做 (⌘⇧Z)" disabled={!canRedo} onClick={onRedo}>
            <Redo2 size={16} />
          </IconButton>
        </div>
      </div>
      {selectedNode && !editing && (
        <div className="selection-tools" aria-label="元素工具">
          {COLORS.map((color) => (
            <button
              key={color}
              style={{ backgroundColor: color }}
              className={`color-swatch ${selectedNode.color === color ? "chosen" : ""}`}
              aria-label={`颜色 ${color}`}
              onClick={() => updateNode(selectedNode.id, { color })}
            >
              {selectedNode.color === color && <Check size={12} />}
            </button>
          ))}
          <span className="tool-divider" />
          <IconButton label="编辑元素" onClick={() => edit(selectedNode)}>
            <Type size={15} />
          </IconButton>
          <IconButton label="复制元素" onClick={duplicate}>
            <Copy size={15} />
          </IconButton>
          <IconButton label="删除元素" onClick={remove}>
            <Trash2 size={15} />
          </IconButton>
        </div>
      )}
      <div
        ref={stage}
        className={`canvas-stage tool-${tool} ${space ? "space-held" : ""} ${showGrid ? "has-grid" : ""}`}
        aria-label="可编辑画布"
        style={{
          backgroundSize: `${24 * view.current.z}px ${24 * view.current.z}px`,
          backgroundPosition: `${view.current.x}px ${view.current.y}px`,
        }}
        onPointerDown={(e) => pointerDown(e)}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={() => {
          clearGesture(true);
        }}
      >
        <div
          className="canvas-world"
          ref={world}
          style={{ transform: viewportTransform(view.current) }}
        >
          <svg className="connections" aria-label="元素连接线">
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path
                  d="M1 1L8 5L1 9"
                  fill="none"
                  stroke="#a2ada2"
                  strokeWidth="1.5"
                />
              </marker>
            </defs>
            {board.edges.map((edge) => {
              const from = nodes.find((n) => n.id === edge.from),
                to = nodes.find((n) => n.id === edge.to);
              if (!from || !to) return null;
              return (
                <path
                  key={edge.id}
                  ref={(el) => {
                    if (el) edgeElements.current.set(edge.id, el);
                    else edgeElements.current.delete(edge.id);
                  }}
                  d={connectionPath(from, to)}
                  stroke="#adb5a9"
                  strokeWidth="1.5"
                  fill="none"
                  strokeDasharray="4 5"
                  markerEnd="url(#arrow)"
                />
              );
            })}
          </svg>
          <svg className="stroke-preview">
            <polyline
              ref={strokeLine}
              points=""
              fill="none"
              stroke="#333"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {nodes.map((node) => (
            <article
              key={node.id}
              ref={(el) => {
                if (el) nodeElements.current.set(node.id, el);
                else nodeElements.current.delete(node.id);
              }}
              tabIndex={0}
              aria-label={`${node.kind === "note" ? "便签" : node.kind === "image" ? "图片" : "画布元素"}：${node.label || node.content.slice(0, 35)}`}
              className={`canvas-node node-${node.kind} ${selected === node.id ? "selected" : ""} ${connectFrom === node.id ? "connecting" : ""} ${editing === node.id ? "is-editing" : ""}`}
              style={{
                left: node.x,
                top: node.y,
                width: node.w,
                height: node.h,
                backgroundColor:
                  node.kind === "text" ? "transparent" : node.color,
              }}
              onPointerDown={(e) => pointerDown(e, node)}
              onDoubleClick={() => edit(node)}
              onFocus={() => {
                if (!editing) setSelected(node.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !editing) {
                  e.preventDefault();
                  edit(node);
                }
              }}
            >
              {[
                "banner",
                "audio",
                "attachment",
                "nested",
                "sticker",
                "link",
                "swatch",
                "drawing",
              ].includes(node.kind) ? (
                <ReferenceNode
                  node={node}
                  onNested={onNested}
                  onUpdate={(patch) => updateNode(node.id, patch)}
                  notify={notify}
                />
              ) : node.kind === "image" ? (
                <img
                  src={node.image?.startsWith("/")
                    ? `${import.meta.env.BASE_URL}${node.image.slice(1)}`
                    : node.image}
                  alt={node.content}
                  draggable={false}
                />
              ) : (
                <>
                  {node.label && <div className="node-label">{node.label}</div>}
                  <div className="node-content">{node.content}</div>
                </>
              )}
              {editing === node.id && (
                <div
                  className="overlay-editor"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <textarea
                    autoFocus
                    aria-label="编辑元素内容"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={finishEdit}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Escape") setEditing(null);
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter")
                        finishEdit();
                    }}
                  />
                </div>
              )}
              {selected === node.id && !editing && (
                <>
                  <span className="selection-corner top-left" />
                  <span className="selection-corner top-right" />
                  <span className="selection-corner bottom-left" />
                  <span
                    className="resize-handle"
                    aria-label="拖动调整大小"
                    onPointerDown={(e) => pointerDown(e, node, true)}
                  />
                </>
              )}
            </article>
          ))}
        </div>
        {board.nodes.length === 0 && (
          <div className="empty-canvas">
            <Logo />
            <span className="eyebrow">A LITTLE SPACE FOR BIG IDEAS</span>
            <h1>
              每个好想法，
              <br />
              都值得一块画板。
            </h1>
            <p>写下第一张便签，或让 Agent 帮你开始。</p>
            <div>
              <button className="primary-button" onClick={() => add("note")}>
                <Plus size={16} />
                添加便签
              </button>
              <button className="secondary-button" onClick={onAgent}>
                <Sparkles size={16} />和 Agent 聊聊
              </button>
            </div>
          </div>
        )}
      </div>
      {tool === "connect" && (
        <div className="canvas-instruction">
          {connectFrom
            ? "再选择一个元素，建立连接"
            : "选择两个元素，将想法连接起来"}
          <IconButton
            label="取消连接"
            onClick={() => {
              setTool("select");
              setConnectFrom(null);
            }}
          >
            <X size={14} />
          </IconButton>
        </div>
      )}
      <div className="canvas-bottom">
        <span className="canvas-hint">
          {selectedNode ? "双击编辑 · 拖动移动" : "按住空格拖动画布"}
        </span>
        <div
          className="drawing-toolbar"
          ref={toolbar}
          role="toolbar"
          aria-label="画布工具"
          onPointerEnter={() => {
            clearTimeout(tooltipTimer.current);
            tooltipTimer.current = setTimeout(() => {
              if (toolbar.current) toolbar.current.dataset.warm = "true";
            }, 400);
          }}
          onPointerLeave={() => {
            clearTimeout(tooltipTimer.current);
            tooltipTimer.current = setTimeout(() => {
              if (toolbar.current) delete toolbar.current.dataset.warm;
            }, 150);
          }}
        >
          <IconButton
            tooltip
            label="选择 (V)"
            aria-pressed={tool === "select"}
            className={tool === "select" ? "active" : ""}
            onClick={() => {
              setTool("select");
              setConnectFrom(null);
            }}
          >
            <Square size={16} />
          </IconButton>
          <IconButton tooltip label="添加文字 (T)" onClick={() => add("text")}>
            <FileText size={16} />
          </IconButton>
          <IconButton tooltip label="添加便签 (N)" onClick={() => add("note")}>
            <Rows2 size={16} />
          </IconButton>
          <IconButton
            tooltip
            label="添加子画板"
            onClick={() =>
              add("nested", {
                label: "新画板",
                content: "",
                w: 240,
                h: 215,
              })
            }
          >
            <Folder size={16} />
          </IconButton>
          <IconButton
            tooltip
            label="连接元素 (L)"
            className={tool === "connect" ? "active" : ""}
            onClick={() => {
              setTool("connect");
              setConnectFrom(null);
            }}
          >
            <Link size={16} />
          </IconButton>
          <IconButton
            tooltip
            label="添加图片"
            onClick={() => imageInput.current?.click()}
          >
            <Image size={16} />
          </IconButton>
          <IconButton
            tooltip
            label="添加语音卡片"
            onClick={() =>
              add("audio", {
                label: "语音记录",
                content: "添加一段录音，也可以写下文字记录。",
                w: 360,
                h: 263,
              })
            }
          >
            <Mic size={16} />
          </IconButton>
          <IconButton
            tooltip
            label="添加形状 (R)"
            onClick={() => add("shape", { color: "#ffffff" })}
          >
            <Shapes size={16} />
          </IconButton>
          <IconButton
            tooltip
            label="自由绘制 (P)"
            className={tool === "draw" ? "active" : ""}
            onClick={() => setTool("draw")}
          >
            <Pencil size={16} />
          </IconButton>
        </div>
        <div className="zoom-controls">
          <IconButton label="缩小" onClick={() => zoom(1 / 1.2)}>
            <Minus size={14} />
          </IconButton>
          <button className="zoom-value" onClick={() => fit()} title="适应画布">
            {zoomPercent}%
          </button>
          <IconButton label="放大" onClick={() => zoom(1.2)}>
            <Plus size={14} />
          </IconButton>
          <span className="tool-divider" />
          <IconButton label="适应画布" onClick={() => fit()}>
            <Maximize size={15} />
          </IconButton>
        </div>
      </div>
      <button
        className="grid-toggle"
        onClick={onToggleGrid}
        title="切换画布网格"
        aria-label="切换画布网格"
        aria-pressed={showGrid}
      >
        <span>⠿</span>
      </button>
      <input
        ref={imageInput}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(e) => upload(e.target.files?.[0])}
      />
    </div>
  );
}
