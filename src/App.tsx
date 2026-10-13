import { useEffect, useReducer, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Command,
  PanelLeft,
  Grip,
} from "lucide-react";
import {
  isBoard,
  loadWorkspace,
  makeBoard,
  uid,
  workspaceReducer,
  type Board,
  type CanvasSnapshot,
} from "./model";
import Sidebar from "./components/Sidebar";
import Canvas from "./components/Canvas";
import { IconButton, Modal, Toast } from "./components/Ui";
import { useMotionPreferences } from "./motion";

export default function App() {
  useMotionPreferences();
  const [state, dispatch] = useReducer(
    workspaceReducer,
    undefined,
    loadWorkspace,
  );
  const [leftOpen, setLeftOpen] = useState(() => window.innerWidth > 1050);
  const [compact, setCompact] = useState(() => window.innerWidth <= 900);
  const [dialog, setDialog] = useState<"help" | "rename" | "delete" | null>(
    null,
  );
  const [target, setTarget] = useState<Board | null>(null);
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    function changed() {
      setCompact(media.matches);
      setLeftOpen(!media.matches && window.innerWidth > 1050);
    }
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    if (!compact || !leftOpen) return;
    const panel = document.querySelector<HTMLElement>(".sidebar");
    const before = document.activeElement as HTMLElement | null;
    panel
      ?.querySelector<HTMLElement>("button")
      ?.focus({ preventScroll: true });
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
        setLeftOpen(false);
      }
    };
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("keydown", close);
      if (before?.isConnected)
        requestAnimationFrame(() => before.focus({ preventScroll: true }));
    };
  }, [compact, leftOpen]);
  const board = state.boards.find((b) => b.id === state.activeId)!;
  useEffect(() => {
    try {
      localStorage.setItem(
        "muse-workspace-v3",
        JSON.stringify({ boards: state.boards, activeId: state.activeId }),
      );
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [state.boards, state.activeId]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        newBoard();
      }
      if (
        e.key === "?" &&
        !(e.target as HTMLElement).closest("input,textarea,[contenteditable]")
      )
        setDialog("help");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  function newBoard() {
    dispatch({ type: "add-board", board: makeBoard() });
    if (window.innerWidth <= 900) setLeftOpen(false);
  }
  function toggleLeft() {
    setLeftOpen(!leftOpen);
  }
  function rename(value: Board) {
    setTarget(value);
    setName(value.title);
    setDialog("rename");
  }
  function updateCanvas(canvas: CanvasSnapshot) {
    dispatch({ type: "canvas", id: board.id, canvas });
  }
  async function importBoard(file?: File) {
    if (!file) return;
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error("画板文件不能超过 8 MB");
      const value: unknown = JSON.parse(await file.text());
      if (!isBoard(value)) throw new Error("这不是有效的 Muse 画板文件");
      dispatch({
        type: "add-board",
        board: {
          id: uid(),
          title: value.title,
          icon: value.icon,
          updatedAt: Date.now(),
          nodes: value.nodes,
          edges: value.edges,
        },
      });
      setNotice("画板已导入");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "导入失败");
    }
    if (importRef.current) importRef.current.value = "";
  }
  return (
    <div className={`app ${leftOpen ? "left-open" : ""}`}>
      <Sidebar
        open={leftOpen}
        boards={state.boards}
        activeId={board.id}
        onSelect={(id) => {
          dispatch({ type: "activate", id });
          if (window.innerWidth <= 900) setLeftOpen(false);
        }}
        onNew={newBoard}
        onClose={toggleLeft}
        onRename={rename}
        onDuplicate={(b) => {
          dispatch({
            type: "add-board",
            board: {
              ...structuredClone(b),
              id: uid(),
              title: `${b.title} · 副本`,
              updatedAt: Date.now(),
            },
          });
          setNotice("已创建画板副本");
        }}
        onDelete={(b) => {
          setTarget(b);
          setDialog("delete");
        }}
        onImport={() => importRef.current?.click()}
        onHelp={() => setDialog("help")}
      />
      <button
        className="panel-backdrop"
        data-open={compact && leftOpen}
        aria-hidden={!(compact && leftOpen)}
        inert={!(compact && leftOpen)}
        aria-label="关闭侧栏"
        onClick={() => setLeftOpen(false)}
      />
      <main className="workspace" inert={compact && leftOpen}>
        <header className="workspace-header">
          <div className="header-title">
            {!leftOpen && (
              <IconButton label="展开画板列表" onClick={toggleLeft}>
                <PanelLeft size={19} />
              </IconButton>
            )}
            <Grip className="breadcrumb-grid" size={14} />
            <button
              className="board-title"
              title="重命名画板"
              onClick={() => rename(board)}
            >
              {board.title}
            </button>
            <span
              className={`save-state ${saveError ? "save-error" : ""}`}
              title={
                saveError
                  ? "存储空间不足，当前修改暂时无法保存"
                  : "已保存到此浏览器"
              }
            >
              {saveError ? "保存失败" : <Check size={13} />}
            </span>
          </div>
        </header>
        <Canvas
          key={board.id}
          onNested={() =>
            dispatch({ type: "add-board", board: makeBoard("Untitled canvas") })
          }
          board={board}
          onChange={updateCanvas}
          onUndo={() => dispatch({ type: "undo", id: board.id })}
          onRedo={() => dispatch({ type: "redo", id: board.id })}
          canUndo={!!state.past[board.id]?.length}
          canRedo={!!state.future[board.id]?.length}
          notify={setNotice}
        />
      </main>
      <input
        hidden
        ref={importRef}
        type="file"
        accept="application/json,.json"
        onChange={(e) => importBoard(e.target.files?.[0])}
      />
      <Toast message={notice} />
      {saveError && (
        <div className="storage-warning" role="alert">
          浏览器存储空间不足，当前修改暂时无法保存。
        </div>
      )}
      <Modal
        open={dialog === "rename"}
        title="给画板起个名字"
        onClose={() => setDialog(null)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (target)
              dispatch({ type: "rename", id: target.id, title: name });
            setDialog(null);
          }}
        >
          <label className="field-label" htmlFor="board-name">
            画板名称
          </label>
          <input
            id="board-name"
            className="modal-input"
            autoFocus
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="primary-button modal-submit" type="submit">
            保存名称
            <ArrowRight size={16} />
          </button>
        </form>
      </Modal>
      <Modal
        open={dialog === "delete"}
        title="删除这个画板？"
        onClose={() => setDialog(null)}
      >
        <p className="modal-description">
          「{target?.title}」及其中的内容将从本地删除。删除后无法恢复。
        </p>
        <div className="modal-actions">
          <button className="secondary-button" onClick={() => setDialog(null)}>
            保留画板
          </button>
          <button
            className="danger-button"
            onClick={() => {
              if (target) dispatch({ type: "delete-board", id: target.id });
              setDialog(null);
              setNotice("画板已删除");
            }}
          >
            删除画板
          </button>
        </div>
      </Modal>
      <Modal
        open={dialog === "help"}
        title="给想法，多一点空间。"
        onClose={() => setDialog(null)}
      >
        <p className="modal-description">
          Muse 是你的自由创作画板。添加灵感、连接想法，把模糊的念头变清晰。
          画板自动保存在当前浏览器。
        </p>
        <div className="shortcut-list">
          {[
            ["V / H", "选择 / 拖动画布"],
            ["N / T / R", "添加便签 / 文字 / 形状"],
            ["L", "连接两个元素"],
            ["Space + 拖动", "平移画布"],
            ["⌘ / Ctrl + 滚轮", "缩放画布"],
            ["⌘ / Ctrl + Z", "撤销"],
            ["⌘ / Ctrl + Shift + Z", "重做"],
            ["⌘ / Ctrl + D", "复制选中元素"],
            ["Delete", "删除选中元素"],
            ["⌘ / Ctrl + K", "新建画板"],
            ["双击元素", "编辑文字"],
          ].map(([key, label]) => (
            <div key={key}>
              <span>{label}</span>
              <kbd>{key}</kbd>
            </div>
          ))}
        </div>
        <div className="help-footer">
          <Command size={16} />
          <span>为心流而设计 · Muse 0.1</span>
        </div>
      </Modal>
    </div>
  );
}
