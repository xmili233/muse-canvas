import { useEffect, useRef, useState } from "react";
import { Check, Grid2X2, LockKeyhole, UserRound } from "lucide-react";
import {
  AVATAR_COLORS,
  avatarInitials,
  type Preferences,
} from "../preferences";
import { Modal } from "./Ui";

export type SettingsSection = "profile" | "canvas";

type Props = {
  open: boolean;
  initialSection: SettingsSection;
  preferences: Preferences;
  onSave: (preferences: Preferences) => void;
  onClose: () => void;
};

export default function AccountSettings({
  open,
  initialSection,
  preferences,
  onSave,
  onClose,
}: Props) {
  const [section, setSection] = useState(initialSection);
  const [draft, setDraft] = useState(preferences);
  const tabs = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) {
      setSection(initialSection);
      setDraft(preferences);
    }
  }, [open, initialSection, preferences]);

  return (
    <Modal
      open={open}
      title="设置"
      className="account-settings"
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.name.trim()) onSave({ ...draft, name: draft.name.trim() });
        }}
      >
        <div className="settings-layout">
          <div
            className="settings-nav"
            role="tablist"
            aria-label="设置分类"
            ref={tabs}
            onKeyDown={(event) => {
              if (
                ![
                  "ArrowDown",
                  "ArrowUp",
                  "ArrowLeft",
                  "ArrowRight",
                  "Home",
                  "End",
                ].includes(event.key)
              )
                return;
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? "profile"
                  : event.key === "End"
                    ? "canvas"
                    : section === "profile"
                      ? "canvas"
                      : "profile";
              setSection(next);
              tabs.current
                ?.querySelector<HTMLButtonElement>(
                  `[aria-controls="settings-${next}"]`,
                )
                ?.focus();
            }}
          >
            <button
              type="button"
              id="profile-tab"
              role="tab"
              aria-selected={section === "profile"}
              aria-controls="settings-profile"
              tabIndex={section === "profile" ? 0 : -1}
              onClick={() => setSection("profile")}
            >
              <UserRound size={17} />
              个人资料
            </button>
            <button
              type="button"
              id="canvas-tab"
              role="tab"
              aria-selected={section === "canvas"}
              aria-controls="settings-canvas"
              tabIndex={section === "canvas" ? 0 : -1}
              onClick={() => setSection("canvas")}
            >
              <Grid2X2 size={17} />
              画布偏好
            </button>
          </div>
          <div
            className="settings-panel"
            id="settings-profile"
            role="tabpanel"
            aria-labelledby="profile-tab"
            hidden={section !== "profile"}
          >
            <h3>个人资料</h3>
            <p className="settings-description">让这块创作空间更像你。</p>
            <div className="profile-preview">
              <span
                className="profile-avatar"
                style={{ backgroundColor: draft.avatarColor }}
              >
                {avatarInitials(draft.name)}
              </span>
              <div>
                <strong>{draft.name.trim() || "你的名字"}</strong>
                <small>本地工作空间</small>
              </div>
            </div>
            <label className="field-label" htmlFor="profile-name">
              显示名称
            </label>
            <input
              id="profile-name"
              className="modal-input"
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
              maxLength={40}
              required
              autoComplete="nickname"
              placeholder="怎么称呼你？"
            />
            <fieldset className="avatar-colors">
              <legend className="field-label">头像颜色</legend>
              <div>
                {AVATAR_COLORS.map((color) => (
                  <label
                    key={color.value}
                    className="avatar-color"
                    style={{ backgroundColor: color.value }}
                  >
                    <input
                      type="radio"
                      name="avatar-color"
                      aria-label={color.label}
                      value={color.value}
                      checked={draft.avatarColor === color.value}
                      onChange={() =>
                        setDraft({ ...draft, avatarColor: color.value })
                      }
                    />
                    {draft.avatarColor === color.value && (
                      <Check size={16} aria-hidden="true" />
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <div
            className="settings-panel"
            id="settings-canvas"
            role="tabpanel"
            aria-labelledby="canvas-tab"
            hidden={section !== "canvas"}
          >
            <h3>画布偏好</h3>
            <p className="settings-description">用顺手的方式开始每一次创作。</p>
            {(
              [
                [
                  "showGrid",
                  "显示画布网格",
                  "在画布上显示点阵，帮助安排元素位置。",
                ],
                [
                  "openSidebar",
                  "启动时展开画板列表",
                  "下次打开工作空间时生效。",
                ],
                ["openAgent", "启动时展开 Agent", "下次打开工作空间时生效。"],
              ] as const
            ).map(([key, label, description]) => (
              <label key={key} className="preference-row">
                <span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
                <input
                  className="preference-switch"
                  role="switch"
                  aria-label={label}
                  type="checkbox"
                  checked={draft[key]}
                  onChange={(event) =>
                    setDraft({ ...draft, [key]: event.target.checked })
                  }
                />
              </label>
            ))}
          </div>
        </div>
        <div className="settings-footer">
          <span>
            <LockKeyhole size={13} />
            仅保存在此浏览器
          </span>
          <div>
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              取消
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={!draft.name.trim()}
            >
              保存更改
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
