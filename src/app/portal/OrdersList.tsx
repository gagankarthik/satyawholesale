"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { fmt, statusSlug, ORDER_FLOW, type Order } from "@/lib/store";
import { Search } from "@/components/Icons";
import { EmptyState, ListToolbar, type ToolbarOption } from "@/components/ui";
import { ago } from "./meta";

const SORTS: ToolbarOption[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "total-desc", label: "Highest total" },
  { value: "cases-desc", label: "Most cases" },
];

export default function OrdersList({
  orders,
  emptyTitle = "No orders here",
  emptyDesc = "Orders will show here as their status changes.",
}: {
  orders: Order[];
  emptyTitle?: string;
  emptyDesc?: string;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");

  const view = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = orders.filter(
      (o) =>
        needle === "" ||
        o.ref.toLowerCase().includes(needle) ||
        o.lines.some((l) => l.name.toLowerCase().includes(needle))
    );
    return [...list].sort((a, b) => {
      switch (sort) {
        case "oldest": return a.placed - b.placed;
        case "total-desc": return b.total - a.total;
        case "cases-desc": return b.cases - a.cases;
        default: return b.placed - a.placed;
      }
    });
  }, [orders, q, sort]);

  return (
    <>
      <ListToolbar
        search={{ value: q, onChange: setQ, placeholder: "Search orders…" }}
        sort={{ value: sort, onChange: setSort, options: SORTS }}
      />

      {!view.length ? (
        <EmptyState variant="light" icon={<Search />} title={emptyTitle} description={emptyDesc} />
      ) : (
        <div className="orders rise-in">
          {view.map((o) => {
            const idx = ORDER_FLOW.indexOf(o.status);
            const progress = idx < 0 ? 0 : ((idx + 1) / ORDER_FLOW.length) * 100;
            const cancelled = o.status === "Cancelled";
            return (
              <Link className="ordercard clickrow" key={o.ref} href={`/portal/orders/${o.ref}`}>
                <div className="oc-head">
                  <div>
                    <div className="oc-ref mono">{o.ref}</div>
                    <div className="oc-meta">{o.cases} cases · {o.fulfilment || "Next-day delivery"} · {ago(o.placed)}</div>
                  </div>
                  <div className="oc-right">
                    <span className="oc-total mono">${fmt(o.total)}</span>
                    <span className="ia">View</span>
                  </div>
                </div>
                <div className="oc-track">
                  {cancelled ? (
                    <span className="oc-stage cancelled">This order was cancelled</span>
                  ) : (
                    <div className="oc-prog" aria-label={`Status: ${o.status}`}>
                      <span className="oc-prog-bar"><span className={`oc-prog-fill s-${statusSlug(o.status)}`} style={{ width: `${progress}%` }} /></span>
                      <span className="oc-stage">{o.status}</span>
                    </div>
                  )}
                  {!cancelled && (
                    o.tracking && o.tracking !== "PICKUP" ? (
                      <span className="oc-trk">Tracking <b className="oc-trknum mono">{o.tracking}</b></span>
                    ) : o.tracking === "PICKUP" ? (
                      <span className="oc-trk muted">Warehouse pickup</span>
                    ) : (
                      <span className="oc-trk muted">Tracking once shipped</span>
                    )
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
