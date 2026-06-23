"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "./cx";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Footer actions (rendered in a button row). */
  footer?: ReactNode;
  size?: "md" | "wide";
  className?: string;
}

/**
 * Accessible dialog: `role="dialog"` + `aria-modal`, Escape to close,
 * overlay-click to close, body-scroll lock, focus moved into the dialog
 * on open and restored to the trigger on close.
 */
export function Modal({ open, onClose, title, children, footer, size = "md", className }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useRef(`modal-${Math.random().toString(36).slice(2)}`).current;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={ref}
        className={cx("modal", size === "wide" && "wide", className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h3 id={titleId}>{title}</h3>}
        {children}
        {footer && <div className="modalbtns" style={{ marginTop: 20 }}>{footer}</div>}
      </div>
    </div>
  );
}
