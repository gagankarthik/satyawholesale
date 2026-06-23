import type { ReactNode } from "react";
import { cx } from "./cx";

export type TooltipSide = "top" | "bottom" | "right" | "left";

export interface TooltipProps {
  label: string;
  children: ReactNode;
  side?: TooltipSide;
  className?: string;
}

/**
 * Lightweight CSS tooltip for content-area controls (icon buttons, status
 * chips, etc.). Shows on hover/focus. Don't use it inside `overflow:hidden`
 * scroll containers (e.g. the collapsed sidebar) — use a native `title` there.
 */
export function Tooltip({ label, children, side = "top", className }: TooltipProps) {
  return (
    <span className={cx("tip", `tip-${side}`, className)} data-tip={label}>
      {children}
    </span>
  );
}
