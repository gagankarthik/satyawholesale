"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { fmt, orderGrand, type PayStatus } from "@/lib/store";
import { Card } from "@/components/Icons";
import { Badge, Button, EmptyState, KpiCard, ListToolbar, Skeleton, type BadgeTone, type ToolbarOption } from "@/components/ui";
import { usePortal } from "../PortalShell";
import { ago } from "../meta";

const payTone = (p: PayStatus): BadgeTone =>
  p === "Paid" ? "success" : p === "Partial" ? "warning" : p === "Refunded" ? "neutral" : "danger";

const STATUS_OPTS: ToolbarOption[] = [
  { value: "all", label: "All payments" },
  { value: "Unpaid", label: "Unpaid" },
  { value: "Partial", label: "Partial" },
  { value: "Paid", label: "Paid" },
  { value: "Refunded", label: "Refunded" },
];
const SORT_OPTS: ToolbarOption[] = [
  { value: "newest", label: "Newest first" },
  { value: "amount-desc", label: "Highest amount" },
];

export default function PortalPayments() {
  const { myOrders, ready, error, reload } = usePortal();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");

  const billed = myOrders.filter((o) => o.status !== "Cancelled");
  const outstanding = billed
    .filter((o) => (o.paymentStatus || "Unpaid") === "Unpaid" || o.paymentStatus === "Partial")
    .reduce((s, o) => s + orderGrand(o), 0);
  const paid = billed.filter((o) => o.paymentStatus === "Paid").reduce((s, o) => s + orderGrand(o), 0);

  const view = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = billed.filter(
      (o) =>
        (status === "all" || (o.paymentStatus || "Unpaid") === status) &&
        (needle === "" || o.ref.toLowerCase().includes(needle))
    );
    return [...list].sort((a, b) => (sort === "amount-desc" ? orderGrand(b) - orderGrand(a) : b.placed - a.placed));
  }, [billed, q, status, sort]);

  if (!ready) {
    return (
      <>
        <div className="kpis auto rise-in">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={104} radius={16} />)}</div>
        <div className="panel" style={{ padding: 4 }}>{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={56} radius={10} />)}</div>
      </>
    );
  }

  if (error && !billed.length) {
    return (
      <EmptyState
        title="Couldn't load"
        description="There was a problem loading your data."
        action={<Button variant="ghost" onClick={reload}>Retry</Button>}
      />
    );
  }

  if (!billed.length) {
    return (
      <EmptyState
        variant="light"
        icon={<Card />}
        title="No invoices yet"
        description="Once you place an order, its invoice and payment status show up here."
      />
    );
  }

  return (
    <>
      <div className="kpis auto rise-in">
        <KpiCard tone={outstanding > 0 ? "danger" : "default"} label="Outstanding balance" value={`$${fmt(outstanding)}`} foot="unpaid & partial" />
        <KpiCard label="Paid" value={`$${fmt(paid)}`} foot="settled invoices" />
        <KpiCard label="Invoices" value={billed.length} foot="all time" />
      </div>

      <ListToolbar
        search={{ value: q, onChange: setQ, placeholder: "Search invoice #…" }}
        filters={[{ label: "Status", value: status, onChange: setStatus, options: STATUS_OPTS }]}
        sort={{ value: sort, onChange: setSort, options: SORT_OPTS }}
      />

      {!view.length ? (
        <EmptyState variant="light" icon={<Card />} title="No matching invoices" description="Try a different search or filter." />
      ) : (
        <div className="panel" style={{ padding: 4 }}>
          {view.map((o) => {
            const ps = o.paymentStatus || "Unpaid";
            return (
              <Link key={o.ref} className="orow" href={`/portal/orders/${o.ref}`}>
                <div>
                  <div className="oref mono">{o.ref}</div>
                  <div className="osub">{o.payment || "Net 15"} · {ago(o.placed)}</div>
                </div>
                <Badge tone={payTone(ps)}>{ps}</Badge>
                <span className="oamt mono">${fmt(orderGrand(o))}</span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
