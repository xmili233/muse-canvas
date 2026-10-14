import {
  useEffect,
  useLayoutEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { Check, X } from "lucide-react";

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand-mark ${small ? "small" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
        <path
          d="M7 24V10.5a2.5 2.5 0 0 1 4.5-1.4L16 16l4.5-6.9a2.5 2.5 0 0 1 4.5 1.4V24M7 18h18"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
export function IconButton({
  label,
  children,
  className = "",
  tooltip = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  tooltip?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={tooltip ? undefined : label}
      data-tooltip={tooltip ? label : undefined}
      className={`icon-button ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
export function Modal({
  open,
  title,
  children,
  onClose,
  className = "",
  origin,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
  origin?: DOMRect | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      if (origin) {
        // Capture the trigger before opening the viewport-centered top layer.
        const x = origin.x + origin.width / 2 - window.innerWidth / 2;
        const y = origin.y + origin.height / 2 - window.innerHeight / 2;
        dialog.style.setProperty(
          "--modal-from",
          `translate(${x}px, ${y}px) scale(0.94)`,
        );
      }
      dialog.showModal();
    } else dialog.close();
  }, [open, origin]);
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      data-from-trigger={origin ? "true" : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <IconButton label="关闭" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </div>
      {children}
    </dialog>
  );
}

export function Toast({ message }: { message: string }) {
  const previous = useRef(message);
  useEffect(() => {
    if (message) previous.current = message;
  }, [message]);
  return (
    <div
      className="toast"
      data-open={!!message}
      role="status"
      aria-hidden={!message}
    >
      <Check size={16} />
      {message || previous.current}
    </div>
  );
}
