"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOrders, type Order, type OrderStatus } from "@/lib/store";
import { downloadCsv } from "@/lib/csv";
import { Plus, Search } from "@/components/Icons";
import { Head, tableEmpty, m, k, timeAgo } from "../shared";
import { KpiCard, DataTable, Badge, Button, EmptyState, ListToolbar, Skeleton, ViewToggle, type Column, type ToolbarOption, type ViewMode } from "@/components/ui";
import { ov, statusTone, payTone, O_STATUSES } from "./_shared";

export function OrdersTab() {
  const { orders, setStatus, ready, error, refresh } = useOrders();
  const router = useRouter();
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState<ViewMode>("table");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSel = (key: string) => setSelected((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const toggleAllSel = (keys: string[], select: boolean) => setSelected((s) => { const n = new Set(s); keys.forEach((k) => (select ? n.add(k) : n.delete(k))); return n; });
  const bulkStatus = (st: OrderStatus) => { selected.forEach((ref) => setStatus(ref, st)); setSelected(new Set()); };

  const rows = useMemo(() => {
    const list = orders.filter((o) =>
      (filter === "all" || o.status === filter) &&
      (query.trim() === "" || o.ref.toLowerCase().includes(query.toLowerCase()) || o.store.toLowerCase().includes(query.toLowerCase()))
    );
    return [...list].sort((a, b) => {
      switch (sort) {
        case "oldest": return a.placed - b.placed;
        case "total-desc": return b.total - a.total;
        case "cases-desc": return b.cases - a.cases;
        default: return b.placed - a.placed;
      }
    });
  }, [orders, filter, query, sort]);
  const rev = orders.reduce((s, o) => s + o.total, 0);

  const exportOrders = () => {
    downloadCsv(
      `orders-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Order", "Store", "Placed", "Cases", "Subtotal", "Total", "Payment", "Status", "Ship to"],
      rows.map((o) => [o.ref, o.store, new Date(o.placed).toLocaleDateString(), o.cases, o.total, ov(o).grand, ov(o).paymentStatus, o.status, o.shipping || o.store]),
    );
  };

  const STATUS_OPTS: ToolbarOption[] = [
    { value: "all", label: "All statuses" },
    ...O_STATUSES.map((s) => ({ value: s, label: s })),
    { value: "Cancelled", label: "Cancelled" },
  ];
  const SORT_OPTS: ToolbarOption[] = [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "total-desc", label: "Highest total" },
    { value: "cases-desc", label: "Most cases" },
  ];

  /* ---------- list ---------- */
  const columns: Column<Order>[] = [
    { key: "ref", header: "Order", sortValue: (o) => o.ref, render: (o) => <span className="mono" style={{ fontWeight: 600 }}>{o.ref}</span> },
    { key: "store", header: "Store", sortValue: (o) => o.store.toLowerCase(), render: (o) => o.store },
    { key: "placed", header: "Placed", sortValue: (o) => o.placed, render: (o) => <span className="muted" style={{ fontSize: 13 }}>{new Date(o.placed).toLocaleDateString()}</span> },
    { key: "cases", header: "Cases", align: "right", sortValue: (o) => o.cases, render: (o) => <span className="mono">{o.cases}</span> },
    { key: "total", header: "Total", align: "right", sortValue: (o) => ov(o).grand, render: (o) => <span className="mono">{m(ov(o).grand)}</span> },
    { key: "payment", header: "Payment", sortValue: (o) => ov(o).paymentStatus, render: (o) => <Badge tone={payTone(ov(o).paymentStatus)}>{ov(o).paymentStatus}</Badge> },
    { key: "status", header: "Status", sortValue: (o) => o.status, render: (o) => <Badge tone={statusTone(o.status)}>{o.status}</Badge> },
    { key: "shipto", header: "Ship to", sortValue: (o) => (o.shipping || o.store).toLowerCase(), render: (o) => <span className="shipcell" title={o.shipping || o.store}>{o.shipping || o.store}</span> },
  ];

  return (
    <>
      <Head title="Orders">
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="ghost" size="sm" onClick={exportOrders} disabled={!rows.length}>Export CSV</Button>
          <Button variant="primary" size="sm" onClick={() => router.push("/admin/orders/new")}><Plus /> New order</Button>
        </div>
      </Head>
      <div className="kpis">
        <KpiCard tone="accent" label="All-time sales" value={k(rev)} foot={`${orders.length} orders`} />
        <KpiCard label="Open" value={orders.filter((o) => o.status !== "Completed").length} foot="in fulfillment" />
        <KpiCard label="Avg order" value={k(orders.length ? rev / orders.length : 0)} foot="per order" />
        <KpiCard label="Cases shipped" value={orders.reduce((s, o) => s + o.cases, 0)} foot="all time" />
      </div>

      <ListToolbar
        search={{ value: query, onChange: setQuery, placeholder: "Search order # or store…" }}
        filters={[{ label: "Status", value: filter, onChange: (v) => setFilter(v as OrderStatus | "all"), options: STATUS_OPTS }]}
        sort={{ value: sort, onChange: setSort, options: SORT_OPTS }}
        right={<ViewToggle view={view} onChange={setView} />}
      />

      {view === "table" && selected.size > 0 && (
        <div className="bulkbar">
          <span className="bulk-count">{selected.size} selected</span>
          <label className="bulk-set">Set status
            <select value="" onChange={(e) => { if (e.target.value) bulkStatus(e.target.value as OrderStatus); }}>
              <option value="">Choose…</option>
              {O_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => bulkStatus("Cancelled")}>Cancel selected</button>
          <button type="button" className="bulk-clear" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {view === "table" ? (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(o) => o.ref}
          onRowClick={(o) => router.push(`/admin/orders/${o.ref}`)}
          loading={!ready}
          empty={tableEmpty(error, refresh, "No orders match.")}
          selectable
          selected={selected}
          onToggle={toggleSel}
          onToggleAll={toggleAllSel}
          pageSize={25}
        />
      ) : !ready ? (
        <div className="ocg">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="ocg-card"><Skeleton width="50%" height={16} /><Skeleton width="70%" height={14} /><Skeleton width="40%" height={14} /></div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        error
          ? <EmptyState title="Couldn't load" description="There was a problem loading orders." action={<Button variant="ghost" onClick={refresh}>Retry</Button>} />
          : <div className="empty light"><div className="ei" aria-hidden="true"><Search /></div><h3>No orders match</h3></div>
      ) : (
        <div className="ocg">
          {rows.map((o) => {
            const v = ov(o);
            return (
              <div key={o.ref} className="ocg-card" role="button" tabIndex={0} onClick={() => router.push(`/admin/orders/${o.ref}`)} onKeyDown={(e) => { if (e.key === "Enter") router.push(`/admin/orders/${o.ref}`); }}>
                <div className="ocg-top"><span className="ocg-ref">{o.ref}</span><Badge tone={statusTone(o.status)}>{o.status}</Badge></div>
                <div className="ocg-store">{o.store}</div>
                <div className="ocg-meta">{o.cases} cases · {timeAgo(o.placed)}</div>
                <div className="ocg-foot"><span className="ocg-total">{m(v.grand)}</span><Badge tone={payTone(v.paymentStatus)}>{v.paymentStatus}</Badge></div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
