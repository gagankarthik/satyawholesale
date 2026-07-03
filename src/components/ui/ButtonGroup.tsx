"use client";

import { type ReactNode } from "react";
import { cx } from "./cx";

export interface ButtonGroupOption<V extends string = string> {
  value: V;
  label: ReactNode;
  /** Icon-only options should still pass a label via `ariaLabel`. */
  ariaLabel?: string;
  title?: string;
}

export interface ButtonGroupProps<V extends string = string> {
  options: ButtonGroupOption<V>[];
  value: V;
  onChange: (value: V) => void;
  ariaLabel: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Segmented button group — a single-choice toggle group for switching a view
 * or mode (not for navigation, that's Tabs; not for forms, that's RadioGroup).
 *
 * @example
 * <ButtonGroup ariaLabel="Chart range" value={range} onChange={setRange}
 *   options={[{ value: "7d", label: "7 days" }, { value: "30d", label: "30 days" }]} />
 */
export function ButtonGroup<V extends string = string>({ options, value, onChange, ariaLabel, size = "md", className }: ButtonGroupProps<V>) {
  return (
    <div className={cx("btngroup", size === "sm" && "btngroup-sm", className)} role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={o.value === value ? "on" : ""}
          aria-pressed={o.value === value}
          aria-label={o.ariaLabel}
          title={o.title}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
