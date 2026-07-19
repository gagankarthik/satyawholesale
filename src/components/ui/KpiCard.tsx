import type { ReactNode } from "react";
import { cx } from "./cx";
import { Skeleton } from "./Skeleton";

export type KpiTone = "default" | "accent" | "warn" | "danger";

export interface KpiCardProps {
  label: ReactNode;
  value: ReactNode;
  foot?: ReactNode;
  tone?: KpiTone;
  /** Renders a skeleton in place of the value. */
  loading?: boolean;
  /** Optional related icon, shown large in a tinted tile on the card's right. */
  icon?: ReactNode;
}

/** Metric card with tone, optional right-side icon, and built-in loading state. */
export function KpiCard({ label, value, foot, tone = "default", loading = false, icon }: KpiCardProps) {
  return (
    <div className={cx("kpi", tone === "accent" && "accent", tone === "warn" && "warn", tone === "danger" && "danger")}>
      <div className="kpi-body">
        <div className="kl">{label}</div>
        <div className="kv">{loading ? <Skeleton width={92} height={28} /> : value}</div>
        {foot && <div className="kf">{foot}</div>}
      </div>
      {icon && <span className="kpi-ic" aria-hidden="true">{icon}</span>}
    </div>
  );
}
