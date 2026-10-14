import { Keyboard, LockKeyhole } from "lucide-react";
import { Logo, Modal } from "./Ui";

type Props = { open: boolean; onClose: () => void };

export function ShortcutsDialog({ open, onClose }: Props) {
  const mod = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";
  const groups: Array<{ title: string; items: Array<[string, string[]]> }> = [
    {
      title: "画布与导航",
      items: [
        ["选择元素", ["V"]],
        ["拖动画布", ["H"]],
        ["临时平移", ["Space", "拖动"]],
        ["缩放画布", [mod, "滚轮"]],
        ["新建画板", [mod, "K"]],
      ],
    },
    {
      title: "添加与编辑",
      items: [
        ["添加便签", ["N"]],
        ["添加文字", ["T"]],
        ["添加形状", ["R"]],
        ["自由绘制", ["P"]],
        ["连接元素", ["L"]],
        ["复制选中元素", [mod, "D"]],
        ["删除选中元素", ["Delete"]],
      ],
    },
    {
      title: "历史与帮助",
      items: [
        ["撤销", [mod, "Z"]],
        ["重做", [mod, "Shift", "Z"]],
        ["查看快捷键", ["?"]],
        ["取消当前操作", ["Esc"]],
      ],
    },
  ];
  return (
    <Modal
      open={open}
      title="快捷键"
      className="shortcuts-dialog"
      onClose={onClose}
    >
      <p className="settings-description">
        在画布上使用。编辑文字时不会触发画布快捷键。
      </p>
      <div className="shortcut-groups">
        {groups.map((group) => (
          <section key={group.title}>
            <h3>{group.title}</h3>
            {group.items.map(([label, keys]) => (
              <div className="shortcut-row" key={label}>
                <span>{label}</span>
                <span className="shortcut-keys">
                  {keys.map((key) => (
                    <kbd key={key}>{key}</kbd>
                  ))}
                </span>
              </div>
            ))}
          </section>
        ))}
      </div>
      <div className="help-footer">
        <Keyboard size={15} />
        双击元素，也可以直接编辑文字。
      </div>
    </Modal>
  );
}

export function AboutDialog({ open, onClose }: Props) {
  return (
    <Modal
      open={open}
      title="关于 Muse"
      className="about-dialog"
      onClose={onClose}
    >
      <div className="about-brand">
        <Logo />
        <div>
          <strong>Muse</strong>
          <span>版本 0.1.0</span>
        </div>
      </div>
      <h3>给想法，多一点空间。</h3>
      <p className="modal-description">
        用便签、文字、图片和连线展开思路，也可以邀请 Agent 一起整理灵感。
      </p>
      <div className="about-storage">
        <LockKeyhole size={17} />
        <div>
          <strong>你的本地工作空间</strong>
          <p>
            画板、个人资料和偏好保存在当前浏览器，重新打开即可继续创作。
          </p>
        </div>
      </div>
    </Modal>
  );
}
