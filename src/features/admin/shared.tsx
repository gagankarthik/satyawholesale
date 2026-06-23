"use client";

import { fmt, LOW_STOCK } from "@/lib/store";

/* =========================================================
   Admin shared kernel — cross-cutting types, formatters and
   the page header. Imported by every admin feature module.
   ========================================================= */

export type Tab =
  | "dashboard" | "products" | "import" | "categories" | "suppliers" | "promos"
  | "pos" | "inventory" | "orders" | "customers" | "users" | "warehouse"
  | "settings" | "possync";

/** Toast emitter passed to feature tabs. */
export type Flash = (message: string) => void;

/** Money, full precision. */
export const m = (n: number) => "$" + fmt(n);
/** Money, compact ($1.2k). */
export const k = (n: number) =>
  n >= 1000 ? "$" + Math.round(n / 100) / 10 + "k" : "$" + Math.round(n);

export function timeAgo(ms: number) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export const stockClass = (n: number) => (n <= 0 ? "oos" : n <= LOW_STOCK ? "low" : "ok");

export const fmtDate = (ts?: number) =>
  ts ? new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export function Head({ title, sub, children }: { title: string; sub: string; children?: React.ReactNode }) {
  return (
    <header className="adminbar">
      <div><h1>{title}</h1><p>{sub}</p></div>
      {children}
    </header>
  );
}
