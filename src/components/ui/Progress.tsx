"use client";

import { cx } from "./cx";

export interface ProgressProps {
  value: number;
  max: number;
  /** Accessible name, e.g. "Cases received". */
  ariaLabel: string;
  /** Visible "25/40" style figure after the bar. */
  showFigure?: boolean;
  /** success turns the bar green when complete. */
  tone?: "default" | "success";
  className?: string;
}

/**
 * Determinate progress bar for quantities with a known target — cases
 * received against ordered, bin capacity used. Not for unknown waits
 * (use Spinner / Skeleton for those).
 *
 * @example <Progress value={received} max={ordered} ariaLabel="Cases received" showFigure />
 */
export function Progress({ value, max, ariaLabel, showFigure, tone = "default", className }: ProgressProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const done = max > 0 && value >= max;
  return (
    <span className={cx("progress-wrap", className)}>
      <span
        className={cx("progress", tone === "success" && done && "done")}
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(value, max)}
      >
        <span className="progress-bar" style={{ width: `${pct}%` }} />
      </span>
      {showFigure && <span className="progress-fig mono">{value}/{max}</span>}
    </span>
  );
}
