"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "./cx";

export interface DropdownProps {
  /** Trigger contents; receives the open state for styling. */
  trigger: (open: boolean) => ReactNode;
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
  /** Trigger className (defaults to a bare button reset). */
  triggerClassName?: string;
}

/**
 * Generic popover dropdown. The panel is fixed-positioned from the trigger's
 * rect (so it never clips), and closes on outside click, Escape, scroll, or
 * resize. Used for the account menu and quick-search.
 */
export function Dropdown({ trigger, children, ariaLabel, className, triggerClassName }: DropdownProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setPos(null), []);

  useEffect(() => {
    if (!pos) return;
    const onDoc = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos, close]);

  const toggle = () => {
    if (pos) { close(); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 8, left: r.right });
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={triggerClassName}
        aria-haspopup="menu"
        aria-expanded={!!pos}
        aria-label={ariaLabel}
        onClick={toggle}
      >
        {trigger(!!pos)}
      </button>
      {pos && createPortal(
        <div ref={popRef} className={cx("menu-pop", className)} role="menu" style={{ top: pos.top, left: pos.left }} onClick={close}>
          {children}
        </div>,
        document.body
      )}
    </>
  );
}
