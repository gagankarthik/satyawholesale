"use client";

import { useRef, type ReactNode } from "react";
import { cx } from "./cx";

export interface TabItem {
  key: string;
  label: ReactNode;
  /** Optional count chip after the label. */
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (key: string) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * Segmented tab strip. Roving-focus keyboard support (←/→/Home/End) per the
 * WAI-ARIA tabs pattern; panels are the caller's — wire them with
 * `id`/`aria-controls` if needed.
 *
 * @example
 * <Tabs ariaLabel="Order buckets" value={tab} onChange={setTab}
 *   tabs={[{ key: "upcoming", label: "Upcoming", count: 3 }]} />
 */
export function Tabs({ tabs, value, onChange, ariaLabel, className }: TabsProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const idx = tabs.findIndex((t) => t.key === value);
    let next = -1;
    if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(tabs[next].key);
    ref.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  };

  return (
    <div ref={ref} className={cx("tabs", className)} role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown}>
      {tabs.map((t) => {
        const on = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            className={cx("tab", on && "on")}
            onClick={() => onChange(t.key)}
          >
            {t.label}
            {t.count != null && <span className="tabc">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
