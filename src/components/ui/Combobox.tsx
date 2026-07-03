"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { cx } from "./cx";

export interface ComboOption {
  value: string;
  label: string;
  /** Muted second line (SKU, price, stock…). */
  hint?: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  options: ComboOption[];
  /** Currently selected value ("" for none). */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  /** Extra row pinned under the list (e.g. a "scan barcode" action). */
  footer?: ReactNode;
}

/**
 * Searchable single-select — a text input that filters a listbox. Replaces
 * native `<select>`s that hold big catalogs: type to filter, ↑/↓ to move,
 * Enter to pick, Esc to close.
 *
 * @example
 * <Combobox ariaLabel="Add product" placeholder="Search products…"
 *   options={products.map((p) => ({ value: String(p.id), label: p.name, hint: sku(p) }))}
 *   value={addId} onChange={setAddId} />
 */
export function Combobox({ options, value, onChange, placeholder, ariaLabel, emptyText = "No matches.", disabled, className, footer }: ComboboxProps) {
  const uid = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [openState, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  const selected = options.find((o) => o.value === value) ?? null;
  const open = openState && !disabled;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = options.filter((o) => !o.disabled);
    if (!q) return pool.slice(0, 50);
    return pool.filter((o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q)).slice(0, 50);
  }, [options, query]);

  useEffect(() => setCursor(0), [query, open]);
  // keep the active option scrolled into view
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const pick = (v: string) => {
    onChange(v);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) { setOpen(true); return; }
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, matches.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (matches[cursor]) pick(matches[cursor].value); }
    else if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
  };

  return (
    <div
      ref={rootRef}
      className={cx("combo", disabled && "disabled", className)}
      onBlur={(e) => { if (!rootRef.current?.contains(e.relatedTarget as Node)) { setOpen(false); setQuery(""); } }}
    >
      <input
        ref={inputRef}
        className="combo-input"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${uid}-list`}
        aria-activedescendant={open && matches[cursor] ? `${uid}-o-${matches[cursor].value}` : undefined}
        aria-label={ariaLabel}
        autoComplete="off"
        disabled={disabled}
        placeholder={selected ? undefined : placeholder}
        value={open ? query : selected?.label ?? ""}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={onKeyDown}
      />
      <span className="combo-chev" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      {open && (
        <div ref={listRef} id={`${uid}-list`} className="combo-pop" role="listbox" aria-label={ariaLabel}>
          {matches.length === 0 && <div className="combo-empty">{emptyText}</div>}
          {matches.map((o, i) => (
            <button
              key={o.value}
              type="button"
              id={`${uid}-o-${o.value}`}
              role="option"
              aria-selected={o.value === value}
              data-active={i === cursor || undefined}
              className={cx("combo-opt", i === cursor && "active", o.value === value && "picked")}
              onMouseEnter={() => setCursor(i)}
              onMouseDown={(e) => { e.preventDefault(); pick(o.value); }}
            >
              <span className="combo-l">{o.label}</span>
              {o.hint && <span className="combo-h mono">{o.hint}</span>}
            </button>
          ))}
          {footer && <div className="combo-foot">{footer}</div>}
        </div>
      )}
    </div>
  );
}
