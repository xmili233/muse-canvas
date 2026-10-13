import { useState } from "react";
import {
  Copy,
  Ellipsis,
  Grip,
  HelpCircle,
  PanelLeftClose,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import type { Board } from "../model";
import { IconButton } from "./Ui";

type Props = {
  open: boolean;
  boards: Board[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onClose: () => void;
  onRename: (board: Board) => void;
  onDelete: (board: Board) => void;
  onDuplicate: (board: Board) => void;
  onImport: () => void;
  onHelp: () => void;
};
export default function Sidebar(props: Props) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  return (
    <aside
      className="sidebar"
      aria-label="画板列表"
      inert={!props.open}
      aria-hidden={!props.open}
    >
      <div className="sidebar-top">
        <IconButton label="收起画板列表" onClick={props.onClose}>
          <PanelLeftClose size={13} />
        </IconButton>
        <div className="sidebar-top-tools">
          <IconButton label="搜索画板" onClick={() => setSearch(!search)}>
            <Search size={13} />
          </IconButton>
          <IconButton label="导入画板" onClick={props.onImport}>
            <Upload size={13} />
          </IconButton>
        </div>
      </div>
      {search && (
        <label className="board-search">
          <Search size={13} />
          <input
            autoFocus
            aria-label="搜索画板"
            placeholder="Search canvases..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      )}
      <nav className="board-list">
        {props.boards
          .filter((b) => b.title.toLowerCase().includes(query.toLowerCase()))
          .map((board) => (
            <div
              className={`board-row ${props.activeId === board.id ? "active" : ""}`}
              key={board.id}
            >
              <button
                className="board-link"
                onClick={() => {
                  props.onSelect(board.id);
                  setMenu(null);
                }}
              >
                <Grip size={14} />
                <span>{board.title}</span>
              </button>
              <IconButton
                className="board-more"
                label={`管理 ${board.title}`}
                onClick={() => setMenu(menu === board.id ? null : board.id)}
              >
                <Ellipsis size={14} />
              </IconButton>
              {menu === board.id && (
                <>
                  <button
                    className="menu-dismiss"
                    aria-label="关闭菜单"
                    onClick={() => setMenu(null)}
                  />
                  <div className="board-menu" role="menu">
                    <button
                      role="menuitem"
                      onClick={() => {
                        props.onRename(board);
                        setMenu(null);
                      }}
                    >
                      <Pencil size={14} />
                      Rename
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        props.onDuplicate(board);
                        setMenu(null);
                      }}
                    >
                      <Copy size={14} />
                      Duplicate
                    </button>
                    <button
                      className="danger"
                      role="menuitem"
                      onClick={() => {
                        props.onDelete(board);
                        setMenu(null);
                      }}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        {props.boards.filter((b) =>
          b.title.toLowerCase().includes(query.toLowerCase()),
        ).length === 0 && <p className="search-empty">No canvases found</p>}
      </nav>
      <div className="sidebar-bottom">
        <button className="new-board" onClick={props.onNew}>
          <Plus size={14} />
          <span>New space</span>
        </button>
        <button className="user-row" onClick={props.onHelp}>
          <span className="user-avatar">z</span>
          <span>zhiwei wang</span>
          <HelpCircle className="user-help" size={13} />
        </button>
      </div>
    </aside>
  );
}
