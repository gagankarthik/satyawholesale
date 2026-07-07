"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { fmt, productImg, statusSlug, ORDER_FLOW, type Order } from "@/lib/store";
import { Search } from "@/components/Icons";
import { EmptyState, ListToolbar, type ToolbarOption } from "@/components/ui";
import { usePortal } from "./PortalShell";
import { ago } from "./meta";

const SORTS: ToolbarOption[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "total-desc", label: "Highest total" },
  { value: "cases-desc", label: "Most cases" },
];

const STATUS_FILTERS: ToolbarOption[] = [
  { value: "all", label: "All statuses" },
  { value: "Pending", label: "Pending" },
  { value: "Processing", label: "Processing" },
  { value: "At Local Facility", label: "At Local Facility" },
  { value: "Out for delivery", label: "Out for delivery" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
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
  const { products } = usePortal();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");

  const imgFor = (lid: number) => productImg(products.find((p) => p.id === lid) ?? {});

  const view = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = orders.filter(
      (o) =>
        (status === "all" || o.status === status) &&
        (needle === "" ||
          o.ref.toLowerCase().includes(needle) ||
          o.lines.some((l) => l.name.toLowerCase().includes(needle)))
    );
    return [...list].sort((a, b) => {
      switch (sort) {
        case "oldest": return a.placed - b.placed;
        case "total-desc": return b.total - a.total;
        case "cases-desc": return b.cases - a.cases;
        default: return b.placed - a.placed;
      }
    });
  }, [orders, q, status, sort]);

  return (
    <>
      <ListToolbar
        search={{ value: q, onChange: setQ, placeholder: "Search orders…" }}
        filters={[{ label: "Status", value: status, onChange: setStatus, options: STATUS_FILTERS }]}
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
                    <div className="oc-meta">{o.cases} cases · {o.fulfilment || "Delivery"} · {ago(o.placed)}</div>
                  </div>
                  <div className="oc-right">
                    <span className="oc-total mono">${fmt(o.total)}</span>
                    <span className="ia">View</span>
                  </div>
                </div>
                <div className="oc-thumbs" aria-hidden="true">
                  {o.lines.slice(0, 7).map((l) => (
                    <span key={l.id} className="oc-th"><Image src={imgFor(l.id)} alt="" fill sizes="46px" style={{ objectFit: "contain" }} /></span>
                  ))}
                  {o.lines.length > 7 && <span className="oc-th more">+{o.lines.length - 7}</span>}
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
