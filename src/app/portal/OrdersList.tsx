"use client";

import Link from "next/link";
import { fmt, statusSlug } from "@/lib/store";
import { usePortal } from "./PortalShell";
import { ago } from "./meta";

export default function OrdersList({ mode }: { mode: "orders" | "receipts" }) {
  const { myOrders } = usePortal();

  if (!myOrders.length) {
    return (
      <div className="empty light">
        <div className="ei">🧾</div>
        <h3>No orders yet</h3>
        <p>Your submitted orders and receipts will appear here.</p>
      </div>
    );
  }

  return (
    <div className="orders">
      {myOrders.map((o) => (
        <Link className="ordercard clickrow" key={o.ref} href={`/portal/orders/${o.ref}`}>
          <div className="oc-head">
            <div>
              <div className="oc-ref mono">{o.ref}</div>
              <div className="oc-meta">{o.cases} cases · {o.fulfilment || "Next-day delivery"} · {ago(o.placed)}{o.tracking && o.tracking !== "PICKUP" ? ` · tracking ${o.tracking}` : ""}</div>
            </div>
            <div className="oc-right">
              <span className="oc-total mono">${fmt(o.total)}</span>
              <span className={`pobadge s-${statusSlug(o.status)}`}>{o.status}</span>
              <span className="ia">{mode === "receipts" ? "Receipt" : "View"}</span>
            </div>
          </div>
          <div className="oc-lines">{o.lines.slice(0, 6).map((l) => <span key={l.id} className="oc-line"><b className="mono">×{l.qty}</b> {l.name}</span>)}{o.lines.length > 6 && <span className="oc-line">+{o.lines.length - 6} more</span>}</div>
        </Link>
      ))}
    </div>
  );
}
