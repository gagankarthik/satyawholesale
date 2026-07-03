"use client";

import { useId, useState, type ReactNode } from "react";
import { cx } from "./cx";

export interface AccordionItem {
  id: string;
  title: ReactNode;
  content: ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  /** id of the item open on first render. */
  defaultOpen?: string;
  /** Allow several panels open at once (default: one at a time). */
  multiple?: boolean;
  className?: string;
}

/**
 * Accordion — a vertical stack of disclosure panels. Height animates via the
 * grid-rows trick (no JS measuring); reduced motion collapses instantly.
 *
 * @example
 * <Accordion defaultOpen="hours" items={[{ id: "hours", title: "Warehouse hours", content: <p>…</p> }]} />
 */
export function Accordion({ items, defaultOpen, multiple = false, className }: AccordionProps) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(defaultOpen ? [defaultOpen] : []));
  const uid = useId();

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(multiple ? prev : prev.has(id) ? [] : []);
      if (prev.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className={cx("acc", className)}>
      {items.map((it) => {
        const on = open.has(it.id);
        const hid = `${uid}-h-${it.id}`;
        const pid = `${uid}-p-${it.id}`;
        return (
          <div key={it.id} className={cx("acc-item", on && "on")}>
            <h3 className="acc-h">
              <button type="button" id={hid} className="acc-q" aria-expanded={on} aria-controls={pid} onClick={() => toggle(it.id)}>
                {it.title}
                <span className="acc-ic" aria-hidden="true" />
              </button>
            </h3>
            <div id={pid} role="region" aria-labelledby={hid} className="acc-a">
              <div className="acc-body">{it.content}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
