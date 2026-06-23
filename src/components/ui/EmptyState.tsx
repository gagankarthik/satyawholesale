import type { ReactNode } from "react";
import { cx } from "./cx";

export interface EmptyStateProps {
  /** Emoji or icon node. */
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  /** Optional call-to-action (e.g. a <Button/>). */
  action?: ReactNode;
  /** `light` adds a card surface. */
  variant?: "plain" | "light";
  className?: string;
}

/** Consistent empty/zero-data state with optional recovery action. */
export function EmptyState({ icon = "📭", title, description, action, variant = "plain", className }: EmptyStateProps) {
  return (
    <div className={cx("empty", variant === "light" && "light", className)} role="status">
      <div className="ei" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
