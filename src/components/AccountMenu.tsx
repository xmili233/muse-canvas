import { useEffect, useRef, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import {
  ChevronRight,
  ChevronsUpDown,
  CircleHelp,
  Keyboard,
  Settings2,
} from "lucide-react";
import { avatarInitials, type Preferences } from "../preferences";

type Props = {
  sidebarOpen: boolean;
  preferences: Preferences;
  onProfile: () => void;
  onSettings: () => void;
  onShortcuts: () => void;
  onAbout: () => void;
};

export default function AccountMenu({
  sidebarOpen,
  preferences,
  onProfile,
  onSettings,
  onShortcuts,
  onAbout,
}: Props) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const opensDialog = useRef(false);
  useEffect(() => {
    if (!sidebarOpen) setOpen(false);
  }, [sidebarOpen]);

  function select(action: () => void) {
    opensDialog.current = true;
    action();
  }

  const avatar = (
    <span
      className="user-avatar"
      style={{ backgroundColor: preferences.avatarColor }}
      aria-hidden="true"
    >
      {avatarInitials(preferences.name)}
    </span>
  );

  return (
    <Menu.Root
      open={open}
      onOpenChange={(value) => {
        if (value) opensDialog.current = false;
        setOpen(value);
      }}
    >
      <Menu.Trigger ref={trigger} className="user-row" aria-label="账户菜单">
        {avatar}
        <span className="user-name">{preferences.name}</span>
        <ChevronsUpDown className="user-menu-chevron" size={14} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          className="account-menu-positioner"
          side="top"
          align="start"
          sideOffset={8}
          collisionPadding={12}
        >
          <Menu.Popup
            className="account-menu"
            finalFocus={() => (opensDialog.current ? false : trigger.current)}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Menu.Item
              className="account-menu-profile"
              onClick={() => select(onProfile)}
            >
              {avatar}
              <span className="account-menu-identity">
                <strong>{preferences.name}</strong>
                <small>个人资料</small>
              </span>
              <ChevronRight size={15} />
            </Menu.Item>
            <Menu.Separator className="account-menu-separator" />
            <Menu.Item
              className="account-menu-item"
              onClick={() => select(onSettings)}
            >
              <Settings2 size={17} />
              <span>设置</span>
            </Menu.Item>
            <Menu.Item
              className="account-menu-item"
              onClick={() => select(onShortcuts)}
            >
              <Keyboard size={17} />
              <span>快捷键</span>
              <kbd>?</kbd>
            </Menu.Item>
            <Menu.Separator className="account-menu-separator" />
            <Menu.Item
              className="account-menu-item"
              onClick={() => select(onAbout)}
            >
              <CircleHelp size={17} />
              <span>关于 Muse</span>
            </Menu.Item>
            <div className="account-menu-footer">本地工作空间</div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
