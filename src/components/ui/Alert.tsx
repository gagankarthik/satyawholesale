import { type ReactNode } from "react";
import { cx } from "./cx";

export type AlertTone = "info" | "success" | "warning" | "danger";

export interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/**
 * Inline callout for state the user must notice but not necessarily act on —
 * a variance on a PO, a pending application, a tax note. For interruptions
 * that need a decision, use Confirm (alert dialog) instead.
 *
 * @example <Alert tone="warning" title="Quantity variance">Received 25 vs invoiced 40.</Alert>
 */
export function Alert({ tone = "info", title, children, icon, className }: AlertProps) {
  return (
    <div className={cx("callout", `callout-${tone}`, className)} role={tone === "danger" || tone === "warning" ? "alert" : "status"}>
      {icon && <span className="callout-ic" aria-hidden="true">{icon}</span>}
      <div className="callout-body">
        {title && <b className="callout-title">{title}</b>}
        <div className="callout-text">{children}</div>
      </div>
    </div>
  );
}
