import type { ReactNode } from "react";
import { cx } from "./cx";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

/** Status pill. Map domain state → tone in the caller. */
export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return <span className={cx("uibadge", `t-${tone}`, className)}>{children}</span>;
}
