"use client";

import Link from "next/link";
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

/* =========================================================
   Workflow guide — a numbered stepper that makes the admin
   flows legible. Reused on the stock-in (PO → ledger →
   product → live) and customer-onboarding surfaces.
   ========================================================= */
export interface FlowStep { key: string; label: string; desc: string; href?: string }

/** Replenishment / product onboarding flow: supplier → live to customers. */
export const PRODUCT_FLOW: FlowStep[] = [
  { key: "supplier", label: "Suppliers", desc: "Who you buy from", href: "/admin/suppliers" },
  { key: "po", label: "Purchase order", desc: "Order stock in", href: "/admin/purchaseorder" },
  { key: "receive", label: "Receive", desc: "Log cases that arrive", href: "/admin/purchaseorder" },
  { key: "ledger", label: "Stock ledger", desc: "Every change recorded", href: "/admin/inventory" },
  { key: "product", label: "Products", desc: "Price, barcode, publish", href: "/admin/products" },
  { key: "live", label: "Live to customers", desc: "Sold in the portal", href: "/portal" },
];

/** Customer / trade-account onboarding flow: apply → ordering. */
export const CUSTOMER_FLOW: FlowStep[] = [
  { key: "apply", label: "Application", desc: "Store applies on the site" },
  { key: "review", label: "Review docs", desc: "Licenses & business info", href: "/admin/accounts" },
  { key: "approve", label: "Approve", desc: "Activate the trade account", href: "/admin/accounts" },
  { key: "order", label: "Orders & invoices", desc: "They buy in the portal", href: "/admin/orders" },
];

export function FlowGuide({ steps, active, title = "How this works" }: { steps: FlowStep[]; active: string; title?: string }) {
  const activeIdx = steps.findIndex((s) => s.key === active);
  return (
    <section className="flowguide" aria-label={title}>
      <span className="fg-title">{title}</span>
      <ol className="fg-steps">
        {steps.map((s, i) => {
          const state = i < activeIdx ? "done" : i === activeIdx ? "on" : "next";
          const body = (
            <>
              <span className="fg-num">{i + 1}</span>
              <span className="fg-text"><span className="fg-label">{s.label}</span><span className="fg-desc">{s.desc}</span></span>
            </>
          );
          return (
            <li key={s.key} className={`fg-step ${state}`} aria-current={state === "on" ? "step" : undefined}>
              {s.href ? <Link href={s.href} className="fg-inner">{body}</Link> : <span className="fg-inner">{body}</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
