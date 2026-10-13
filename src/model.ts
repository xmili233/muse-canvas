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
export type Board = {
  id: string;
  title: string;
  icon: string;
  updatedAt: number;
  nodes: CanvasNode[];
  edges: Edge[];
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
  };
}
export function initialWorkspace(): Workspace {
  const board = makeBoard("Welcome");
  board.nodes = [
    makeNode("banner", 0, 0, {
      id: "headline",
      w: 360,
      h: 73,
      content: "Node Examples",
      label: "",
      color: "#000000",
    }),
    makeNode("note", 0, 97, {
      id: "idea",
      w: 360,
      h: 263,
      label: "Notes",
      content:
        "Are the building blocks of all canvases. Use them to store quick ideas and annotate. You can also added statuses to notes!",
      color: "#ffffff",
    }),
    makeNode("note", 386, 25, {
      id: "text-file",
      w: 360,
      h: 190,
      label: "Text Files",
      content:
        "For longer documents that you want to view in its own tab, create a text file. Alternatively you can add other file formats like PDF, CSV, PSD (just try it).",
      color: "#ffffff",
    }),
    makeNode("attachment", 772, 25, {
      id: "attach",
      w: 240,
      h: 190,
      label: "Attach",
      content: "Attach a file to a note by placing it on top.",
      color: "#ffffff",
    }),
    makeNode("audio", 0, 386, {
      id: "audio",
      w: 360,
      h: 263,
      label: "Voice Memo and Transcription",
      content: "You can create or drop your own voice memo.",
      color: "#ffffff",
    }),
    makeNode("sticker", 386, 241, {
      id: "cover",
      w: 313,
      h: 313,
      label: "",
      content: "flower",
      color: "#1a1a1a",
    }),
    makeNode("attachment", 725, 241, {
      id: "pdf",
      w: 313,
      h: 72,
      label: "You can add files!",
      content: "PDF",
      color: "#ffffff",
    }),
    makeNode("nested", 725, 339, {
      id: "nested",
      w: 240,
      h: 215,
      label: "Canvas inside\na canvas",
      content: "",
      color: "#ffffff",
    }),
    makeNode("link", 386, 580, {
      id: "link",
      w: 407,
      h: 252,
      label: "AI canvas workspace\nfor your ideas.",
      content: "causal.so",
      color: "#121212",
    }),
    makeNode("swatch", 120, 675, {
      id: "swatch",
      w: 240,
      h: 240,
      label: "#1A1A1A",
      content: "Colour is important",
      color: "#1a1a1a",
    }),
    makeNode("sticker", 822, 585, {
      id: "doodle",
      w: 205,
      h: 205,
      label: "",
      content: "doodle",
      color: "transparent",
    }),
  ];
  board.nodes = board.nodes.map((n) => ({
    ...n,
    x: n.x * 0.984,
    y: n.y * 0.984,
    w: n.w * 0.984,
    h: n.h * 0.984,
  }));
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
      if (!boards.length) boards.push(makeBoard());
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
export function isBoard(value: unknown): value is Board {
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
          /^data:image\/(png|jpeg|webp|gif);base64,/.test(n.image)),
    ) &&
    Array.isArray(b.edges) &&
    b.edges.every(
      (e) =>
        e &&
        typeof e.id === "string" &&
        typeof e.from === "string" &&
        typeof e.to === "string",
    )
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
        boards: saved.boards.map(
          ({ id, title, icon, updatedAt, nodes, edges }: Board) => ({
            id, title, icon, updatedAt, nodes, edges,
          }),
        ),
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
