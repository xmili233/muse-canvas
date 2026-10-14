export type NodeKind =
  | "note"
  | "text"
  | "shape"
  | "image"
  | "banner"
  | "audio"
  | "attachment"
  | "nested"
  | "sticker"
  | "link"
  | "swatch"
  | "drawing";
export type CanvasNode = {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  content: string;
  label: string;
  color: string;
  image?: string;
  audio?: string;
};
export type Edge = { id: string; from: string; to: string };
export type Suggestion = {
  kind: "note" | "text";
  content: string;
  label: string;
  color: string;
};
export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: Suggestion[];
  applied?: boolean;
  demo?: boolean;
};
export type Board = {
  id: string;
  title: string;
  icon: string;
  updatedAt: number;
  nodes: CanvasNode[];
  edges: Edge[];
  messages: Message[];
};
export type CanvasSnapshot = Pick<Board, "nodes" | "edges">;
export type Workspace = {
  boards: Board[];
  activeId: string;
  past: Record<string, CanvasSnapshot[]>;
  future: Record<string, CanvasSnapshot[]>;
};
export type Action =
  | { type: "activate"; id: string }
  | { type: "add-board"; board: Board }
  | { type: "delete-board"; id: string }
  | { type: "rename"; id: string; title: string }
  | { type: "canvas"; id: string; canvas: CanvasSnapshot }
  | { type: "messages"; id: string; messages: Message[] }
  | { type: "undo" | "redo"; id: string };

export const uid = () => crypto.randomUUID();
export const COLORS = ["#fbf0cc", "#dfece4", "#e7e4f2", "#f3dfd7", "#ffffff"];
export function makeNode(
  kind: NodeKind,
  x: number,
  y: number,
  patch: Partial<CanvasNode> = {},
): CanvasNode {
  return {
    id: uid(),
    kind,
    x,
    y,
    w: kind === "text" ? 370 : kind === "image" ? 360 : 270,
    h: kind === "text" ? 130 : kind === "image" ? 250 : 210,
    content:
      kind === "text"
        ? "一个新想法，\n从这里开始。"
        : kind === "shape"
          ? "让想法连接"
          : "双击，写下你的想法…",
    label: kind === "note" ? "灵感便签" : "",
    color: kind === "text" ? "transparent" : "#ffffff",
    ...patch,
  };
}
export function makeBoard(title = "未命名画板"): Board {
  return {
    id: uid(),
    title,
    icon: "board",
    updatedAt: Date.now(),
    nodes: [],
    edges: [],
    messages: [],
  };
}
export function makeWelcomeBoard(): Board {
  const board = makeBoard("Welcome");
  board.nodes = [
    makeNode("text", 0, 0, {
      id: "headline",
      w: 300,
      h: 90,
      content: "离线片刻",
      color: "transparent",
    }),
    makeNode("image", 0, 104, {
      id: "cover",
      w: 300,
      h: 380,
      image: "/welcome/offline-poster.svg",
      content: "OFFLINE，城市漫游字体海报",
      label: "离线片刻 · 字体提案",
      color: "#191919",
    }),
    makeNode("image", 326, 0, {
      id: "street",
      w: 524,
      h: 350,
      image: "/welcome/city-walk.webp",
      content: "蓝门、旧墙与晨光，城市漫游影像参考。",
      label: "城市漫游 · 影像参考",
      color: "#efe8dc",
    }),
    makeNode("note", 326, 376, {
      id: "idea",
      w: 296,
      h: 200,
      label: "把注意力还给街道",
      content: "不设目的地，不赶时间。\n把沿途的光、颜色和偶遇，\n收集成一页周末笔记。",
      color: "#ffffff",
    }),
    makeNode("note", 0, 510, {
      id: "collect",
      w: 300,
      h: 194,
      label: "这一页，留给细节",
      content: "一扇旧窗的比例\n一段树影的留白\n一句没来得及记下的话",
      color: "#ffffff",
    }),
    makeNode("swatch", 648, 376, {
      id: "tone",
      w: 202,
      h: 132,
      label: "雾蓝",
      content: "#DCE4E7",
      color: "#dce4e7",
    }),
    makeNode("text", 648, 532, {
      id: "slow-down",
      w: 202,
      h: 142,
      content: "走慢一点，\n看见多一点。",
      color: "transparent",
    }),
    makeNode("attachment", 326, 602, {
      id: "packing-list",
      w: 296,
      h: 172,
      label: "随身笔记",
      content: "带上相机，留出一页空白。",
      color: "#ffffff",
    }),
  ];
  return board;
}

export function initialWorkspace(): Workspace {
  const board = makeWelcomeBoard();
  return { boards: [board], activeId: board.id, past: {}, future: {} };
}

export function workspaceReducer(state: Workspace, action: Action): Workspace {
  const board =
    "id" in action ? state.boards.find((b) => b.id === action.id) : undefined;
  switch (action.type) {
    case "activate":
      return board ? { ...state, activeId: action.id } : state;
    case "add-board":
      return {
        ...state,
        boards: [action.board, ...state.boards],
        activeId: action.board.id,
      };
    case "delete-board": {
      if (!board) return state;
      const boards = state.boards.filter((b) => b.id !== action.id);
      if (!boards.length) return initialWorkspace();
      const past = { ...state.past };
      const future = { ...state.future };
      delete past[action.id];
      delete future[action.id];
      return {
        ...state,
        boards,
        past,
        future,
        activeId: state.activeId === action.id ? boards[0].id : state.activeId,
      };
    }
    case "rename":
      return {
        ...state,
        boards: state.boards.map((b) =>
          b.id === action.id
            ? { ...b, title: action.title.trim().slice(0, 80) || "未命名画板" }
            : b,
        ),
      };
    case "messages":
      return {
        ...state,
        boards: state.boards.map((b) =>
          b.id === action.id ? { ...b, messages: action.messages } : b,
        ),
      };
    case "canvas": {
      if (!board) return state;
      return {
        ...state,
        boards: state.boards.map((b) =>
          b.id === action.id
            ? { ...b, ...action.canvas, updatedAt: Date.now() }
            : b,
        ),
        past: {
          ...state.past,
          [action.id]: [
            ...(state.past[action.id] || []),
            { nodes: board.nodes, edges: board.edges },
          ].slice(-60),
        },
        future: { ...state.future, [action.id]: [] },
      };
    }
    case "undo":
    case "redo": {
      if (!board) return state;
      const from = action.type === "undo" ? "past" : "future";
      const to = action.type === "undo" ? "future" : "past";
      const stack = state[from][action.id] || [];
      if (!stack.length) return state;
      return {
        ...state,
        boards: state.boards.map((b) =>
          b.id === action.id ? { ...b, ...stack[stack.length - 1] } : b,
        ),
        [from]: { ...state[from], [action.id]: stack.slice(0, -1) },
        [to]: {
          ...state[to],
          [action.id]: [
            ...(state[to][action.id] || []),
            { nodes: board.nodes, edges: board.edges },
          ],
        },
      };
    }
  }
}

export function bounds(nodes: CanvasNode[]) {
  if (!nodes.length) return { x: 0, y: 0, w: 1000, h: 750 };
  const x = Math.min(...nodes.map((n) => n.x)),
    y = Math.min(...nodes.map((n) => n.y));
  return {
    x,
    y,
    w: Math.max(...nodes.map((n) => n.x + n.w)) - x,
    h: Math.max(...nodes.map((n) => n.y + n.h)) - y,
  };
}
export function fitViewport(
  nodes: CanvasNode[],
  width: number,
  height: number,
) {
  const box = bounds(nodes);
  const z = Math.max(
    0.12,
    Math.min(1, (width - 100) / box.w, (height - 145) / box.h),
  );
  return {
    z,
    x: (width - box.w * z) / 2 - box.x * z,
    y: (height - 65 - box.h * z) / 2 - box.y * z,
  };
}
export function removeNodes(board: Board, ids: string[]): CanvasSnapshot {
  return {
    nodes: board.nodes.filter((n) => !ids.includes(n.id)),
    edges: board.edges.filter(
      (e) => !ids.includes(e.from) && !ids.includes(e.to),
    ),
  };
}
type StoredBoard = Omit<Board, "messages"> & { messages?: Message[] };

function refreshWelcomeExample(board: Board): Board {
  if (
    board.title !== "Welcome" ||
    !board.nodes.some((node) => node.id === "headline" &&
      ["Node Examples", "出门走走，灵感就在路上。"].includes(node.content))
  ) return board;

  const exampleIds = new Set([
    "headline", "idea", "text-file", "attach", "audio", "cover",
    "pdf", "nested", "link", "swatch", "doodle",
    "slow-down", "afternoon", "collect", "packing-list",
  ]);
  const additions = board.nodes.filter((node) => !exampleIds.has(node.id));
  const nodes = [...makeWelcomeBoard().nodes, ...additions];
  const ids = new Set(nodes.map((node) => node.id));
  return {
    ...board,
    nodes,
    edges: board.edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to)),
    updatedAt: Date.now(),
  };
}


export function isBoard(value: unknown): value is StoredBoard {
  if (!value || typeof value !== "object") return false;
  const b = value as Board;
  return (
    typeof b.id === "string" &&
    typeof b.title === "string" &&
    Array.isArray(b.nodes) &&
    b.nodes.length <= 1000 &&
    b.nodes.every(
      (n) =>
        n &&
        typeof n.id === "string" &&
        [
          "note",
          "text",
          "shape",
          "image",
          "banner",
          "audio",
          "attachment",
          "nested",
          "sticker",
          "link",
          "swatch",
          "drawing",
        ].includes(n.kind) &&
        [n.x, n.y, n.w, n.h].every(Number.isFinite) &&
        n.w > 0 &&
        n.h > 0 &&
        typeof n.content === "string" &&
        typeof n.label === "string" &&
        typeof n.color === "string" &&
        (n.audio === undefined ||
          /^data:audio\/[a-zA-Z0-9.+-]+;base64,/.test(n.audio)) &&
        (n.image === undefined ||
          n.image === "/welcome/city-walk.webp" ||
          n.image === "/welcome/offline-poster.svg" ||
          /^data:image\/(png|jpeg|webp|gif);base64,/.test(n.image)),
    ) &&
    Array.isArray(b.edges) &&
    b.edges.every(
      (e) =>
        e &&
        typeof e.id === "string" &&
        typeof e.from === "string" &&
        typeof e.to === "string",
    ) &&
    (b.messages === undefined ||
      (Array.isArray(b.messages) &&
        b.messages.every(
          (m) =>
            m &&
            typeof m.id === "string" &&
            ["user", "assistant"].includes(m.role) &&
            typeof m.content === "string" &&
            (!m.suggestions ||
              (Array.isArray(m.suggestions) &&
                m.suggestions.every(
                  (s) =>
                    s &&
                    ["note", "text"].includes(s.kind) &&
                    typeof s.content === "string" &&
                    typeof s.label === "string" &&
                    typeof s.color === "string",
                ))),
        )))
  );
}
export function loadWorkspace(): Workspace {
  try {
    const saved = JSON.parse(
      localStorage.getItem("muse-workspace-v3") || "null",
    );
    if (
      saved &&
      Array.isArray(saved.boards) &&
      saved.boards.length &&
      saved.boards.every(isBoard)
    ) {
      return {
        boards: saved.boards.map((board: StoredBoard) => refreshWelcomeExample({
          ...board,
          messages: board.messages ?? [],
        })),
        activeId: saved.boards.some((b: Board) => b.id === saved.activeId)
          ? saved.activeId
          : saved.boards[0].id,
        past: {},
        future: {},
      };
    }
  } catch {
    /* A damaged cache must not prevent opening the workspace. */
  }
  return initialWorkspace();
}
