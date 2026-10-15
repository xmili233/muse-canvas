import { lazy, Suspense, useEffect, useReducer, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  PanelLeft,
  PanelRight,
  Sparkles,
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
  type Message,
} from "./model";
import Sidebar from "./components/Sidebar";
import Canvas from "./components/Canvas";
import Agent from "./components/Agent";
import { saveDraft } from "./localPersistence";
import { designSectionFromHash } from "./designRoute";
const loadDesignGuide = () => import("./components/DesignGuide");
const DesignGuide = lazy(loadDesignGuide);
import AccountSettings, {
  type SettingsSection,
} from "./components/AccountSettings";
import { AboutDialog, ShortcutsDialog } from "./components/WorkspaceHelp";
import {
  loadPreferences,
  PREFERENCES_KEY,
  type Preferences,
} from "./preferences";
import { IconButton, Modal, Toast } from "./components/Ui";
import { useMotionPreferences } from "./motion";
import githubMark from "./assets/github-mark.svg";

export default function App() {
  useMotionPreferences();
  const [state, dispatch] = useReducer(
    workspaceReducer,
    undefined,
    loadWorkspace,
  );
  const [preferences, setPreferences] = useState(loadPreferences);
  const [designOpen, setDesignOpen] = useState(
    () => designSectionFromHash(location.hash) !== null,
  );
  const [designLoaded, setDesignLoaded] = useState(designOpen);
  const [settingsSection, setSettingsSection] =
    useState<SettingsSection>("profile");
  const [leftOpen, setLeftOpen] = useState(
    () => window.innerWidth > 1050 && preferences.openSidebar,
  );
  const [rightOpen, setRightOpen] = useState(
    () => window.innerWidth > 900 && preferences.openAgent,
  );
  const [compact, setCompact] = useState(() => window.innerWidth <= 900);
  const [dialog, setDialog] = useState<
    "shortcuts" | "about" | "settings" | "rename" | "delete" | null
  >(null);
  const [target, setTarget] = useState<Board | null>(null);
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");
  const [fitSignal, setFitSignal] = useState(0);
  const [saveError, setSaveError] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const changed = () => {
      const open = designSectionFromHash(location.hash) !== null;
      setDesignOpen(open);
      if (open) setDesignLoaded(true);
    };
    addEventListener("hashchange", changed);
    return () => removeEventListener("hashchange", changed);
  }, []);
  function openDesign() {
    if (designSectionFromHash(location.hash) === null)
      history.replaceState(
        null,
        "",
        `${location.pathname}${location.search}#design/overview`,
      );
    setDesignLoaded(true);
    setDesignOpen(true);
  }
  function closeDesign() {
    setDesignOpen(false);
    if (designSectionFromHash(location.hash) !== null)
      history.replaceState(null, "", `${location.pathname}${location.search}`);
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLButtonElement>(".design-entry")
        ?.focus({ preventScroll: true }),
    );
  }

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    function changed() {
      setCompact(media.matches);
      setLeftOpen(
        !media.matches && window.innerWidth > 1050 && preferences.openSidebar,
      );
      setRightOpen(!media.matches && preferences.openAgent);
    }
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, [preferences.openSidebar, preferences.openAgent]);
  useEffect(() => {
    if (!compact || (!leftOpen && !rightOpen)) return;
    const panel = document.querySelector<HTMLElement>(
      leftOpen ? ".sidebar" : ".agent-panel",
    );
    const before = document.activeElement as HTMLElement | null;
    panel
      ?.querySelector<HTMLElement>(rightOpen ? "textarea" : "button")
      ?.focus({ preventScroll: true });
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
        setLeftOpen(false);
        setRightOpen(false);
      }
    };
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("keydown", close);
      if (before?.isConnected)
        requestAnimationFrame(() => before.focus({ preventScroll: true }));
    };
  }, [compact, leftOpen, rightOpen]);
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
      if (document.querySelector("dialog[open]")) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        newBoard();
      }
      if (
        e.key === "?" &&
        !(e.target as HTMLElement).closest("input,textarea,[contenteditable]")
      )
        setDialog("shortcuts");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  function openSettings(section: SettingsSection) {
    setSettingsSection(section);
    setDialog("settings");
  }
  function closeAccountDialog() {
    setDialog(null);
    requestAnimationFrame(() => {
      const trigger = document.querySelector<HTMLButtonElement>(".user-row");
      if (!trigger?.closest("[inert]")) trigger?.focus({ preventScroll: true });
    });
  }
  function updatePreferences(value: Preferences) {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(value));
      setPreferences(value);
      return true;
    } catch {
      setNotice("偏好保存失败，请检查浏览器存储空间");
      return false;
    }
  }
  function newBoard() {
    dispatch({ type: "add-board", board: makeBoard() });
    if (window.innerWidth <= 900) setLeftOpen(false);
  }
  function toggleLeft() {
    setLeftOpen(!leftOpen);
    if (window.innerWidth <= 900) setRightOpen(false);
  }
  function toggleRight() {
    setRightOpen(!rightOpen);
    if (window.innerWidth <= 900) setLeftOpen(false);
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
          ...value,
          id: uid(),
          updatedAt: Date.now(),
          messages: value.messages ?? [],
        },
      });
      setNotice("画板已导入");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "导入失败");
    }
    if (importRef.current) importRef.current.value = "";
  }
  return (
    <div
      className={`app ${leftOpen ? "left-open" : ""} ${rightOpen ? "right-open" : ""}`}
    >
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
        preferences={preferences}
        onProfile={() => openSettings("profile")}
        onSettings={() => openSettings("canvas")}
        onShortcuts={() => setDialog("shortcuts")}
        onAbout={() => setDialog("about")}
      />
      {
        <button
          className="panel-backdrop"
          data-open={compact && (leftOpen || rightOpen)}
          aria-hidden={!(compact && (leftOpen || rightOpen))}
          inert={!(compact && (leftOpen || rightOpen))}
          aria-label="关闭侧栏"
          onClick={() => {
            setLeftOpen(false);
            setRightOpen(false);
          }}
        />
      }
      <main className="workspace" inert={compact && (leftOpen || rightOpen)}>
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
          <div className="header-actions">
            <nav className="project-links" aria-label="项目相关">
              <button
                type="button"
                className="design-entry"
                aria-haspopup="dialog"
                onPointerEnter={loadDesignGuide}
                onFocus={loadDesignGuide}
                onClick={openDesign}
              >
                <BookOpen size={14} aria-hidden="true" />
                设计讲解
              </button>
              <a
                className="github-entry"
                href="https://github.com/xmili233/muse-canvas"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="在 GitHub 查看源代码"
                title="在 GitHub 查看源代码"
              >
                <img src={githubMark} width={20} height={20} alt="" />
              </a>
            </nav>
            {!rightOpen && (
              <button className="open-agent" onClick={toggleRight}>
                <Sparkles size={16} />
                <span>Agent</span>
                <PanelRight size={15} />
              </button>
            )}
          </div>
        </header>
        <Canvas
          key={board.id}
          fitSignal={fitSignal}
          showGrid={preferences.showGrid}
          onToggleGrid={() =>
            updatePreferences({
              ...preferences,
              showGrid: !preferences.showGrid,
            })
          }
          onNested={() =>
            dispatch({ type: "add-board", board: makeBoard("Untitled canvas") })
          }
          board={board}
          onChange={updateCanvas}
          onUndo={() => dispatch({ type: "undo", id: board.id })}
          onRedo={() => dispatch({ type: "redo", id: board.id })}
          canUndo={!!state.past[board.id]?.length}
          canRedo={!!state.future[board.id]?.length}
          onAgent={() => {
            setRightOpen(true);
            if (window.innerWidth <= 900) setLeftOpen(false);
          }}
          notify={setNotice}
        />
      </main>
      <Agent
        open={rightOpen}
        key={board.id}
        board={board}
        onClose={toggleRight}
        onMessages={(messages: Message[]) =>
          dispatch({ type: "messages", id: board.id, messages })
        }
        onChange={(canvas) => {
          updateCanvas(canvas);
          setFitSignal((n) => n + 1);
        }}
        notify={setNotice}
      />
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
              if (target) {
                dispatch({ type: "delete-board", id: target.id });
                try {
                  saveDraft(target.id, "");
                } catch {
                  /* Board deletion does not depend on draft cleanup. */
                }
              }
              setDialog(null);
              setNotice("画板已删除");
            }}
          >
            删除画板
          </button>
        </div>
      </Modal>
      <AccountSettings
        open={dialog === "settings"}
        initialSection={settingsSection}
        preferences={preferences}
        onClose={closeAccountDialog}
        onSave={(value) => {
          if (updatePreferences(value)) {
            closeAccountDialog();
            setNotice("设置已保存");
          }
        }}
      />
      <ShortcutsDialog
        open={dialog === "shortcuts"}
        onClose={closeAccountDialog}
      />
      <AboutDialog open={dialog === "about"} onClose={closeAccountDialog} />
      {designLoaded && (
        <Suspense
          fallback={
            <div className="design-loading" role="status">
              正在打开设计讲解…
            </div>
          }
        >
          <DesignGuide open={designOpen} onClose={closeDesign} />
        </Suspense>
      )}
    </div>
  );
}
