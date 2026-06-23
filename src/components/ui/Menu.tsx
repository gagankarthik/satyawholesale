"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { cx } from "./cx";

export interface MenuAction {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

export interface MenuProps {
  items: MenuAction[];
  /** Accessible label for the trigger. */
  label?: string;
}

/**
 * Accessible row/overflow action menu (the "⋯" pattern). The popover is
 * fixed-positioned from the trigger's rect so it escapes table `overflow`,
 * and closes on outside click, Escape, scroll, or resize.
 */
export function Menu({ items, label = "Row actions" }: MenuProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setPos(null), []);

  useEffect(() => {
    if (!pos) return;
    const onDoc = (e: globalThis.MouseEvent) => {
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

  const toggle = (e: ReactMouseEvent) => {
    e.stopPropagation();
    if (pos) { close(); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, left: r.right });
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="menu-trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={!!pos}
        onClick={toggle}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" />
        </svg>
      </button>
      {pos && createPortal(
        <div ref={popRef} className="menu-pop" role="menu" style={{ top: pos.top, left: pos.left }}>
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              className={cx("menu-item", it.danger && "danger")}
              onClick={(e) => { e.stopPropagation(); close(); it.onSelect(); }}
            >
              {it.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
