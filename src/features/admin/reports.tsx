"use client";

import { useMemo, useState } from "react";
import { useInventory, useOrders, deptName, sku, LOW_STOCK, type DeptKey } from "@/lib/store";
import { KpiCard, Badge, Button, Tabs, Dropdown, cx } from "@/components/ui";
import { Chart, Calendar, Arrow } from "@/components/Icons";
import { Head, m, type Flash } from "./shared";

/* =======================================================================
   REPORTS — daily sales, product sales and inventory, with a compact
   filter bar and CSV export for whatever the business needs to pull.
   ======================================================================= */
const DAY = 86400000;
const RANGES = [
  { key: "7d", full: "Last 7 days", days: 7 },
  { key: "30d", full: "Last 30 days", days: 30 },
  { key: "90d", full: "Last 90 days", days: 90 },
  { key: "1y", full: "Last 12 months", days: 365 },
];

const startOfDay = (ts: number) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const toInput = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const dayLabel = (ts: number) => new Date(ts).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

/* Build a CSV and hand the browser a download — no server round-trip. */
function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const O_STATUS = ["Pending", "Processing", "At Local Facility", "Out for delivery", "Completed", "Cancelled"] as const;

export function ReportsView({ flash }: { flash: Flash }) {
  const { orders, ready: ordReady } = useOrders();
  const { products, ready: prodReady } = useInventory();

  const today = startOfDay(Date.now());
  const [tab, setTab] = useState<"daily" | "products" | "inventory">("daily");
  const [rangeKey, setRangeKey] = useState("30d");
  const [custom, setCustom] = useState({ from: toInput(today - 29 * DAY), to: toInput(today) });
  const [store, setStore] = useState("all");
  const [status, setStatus] = useState("all");
  const [invFilter, setInvFilter] = useState<"all" | "low" | "out">("all");
  const isCustom = rangeKey === "custom";

  const range = useMemo(() => {
    if (isCustom) {
      const f = startOfDay(new Date(custom.from).getTime());
      const t = startOfDay(new Date(custom.to).getTime()) + DAY;
      return { from: Number.isNaN(f) ? today : f, to: Number.isNaN(t) ? today + DAY : Math.max(t, f + DAY) };
    }
    const days = RANGES.find((r) => r.key === rangeKey)?.days ?? 30;
    return { from: today - (days - 1) * DAY, to: today + DAY };
  }, [rangeKey, isCustom, custom, today]);

  const stores = useMemo(() => [...new Set(orders.map((o) => o.store))].sort((a, b) => a.localeCompare(b)), [orders]);

  /* Orders matching every active filter — the basis for both sales reports. */
  const filtered = useMemo(() => orders.filter((o) =>
    o.placed >= range.from && o.placed < range.to &&
    (store === "all" || o.store === store) &&
    (status === "all" || o.status === status)
  ), [orders, range, store, status]);

  const totals = useMemo(() => ({
    revenue: filtered.reduce((s, o) => s + o.total, 0),
    orders: filtered.length,
    cases: filtered.reduce((s, o) => s + o.cases, 0),
    aov: filtered.length ? filtered.reduce((s, o) => s + o.total, 0) / filtered.length : 0,
  }), [filtered]);

  /* one row per calendar day in range, newest first */
  const daily = useMemo(() => {
    const rows: { t: number; orders: number; cases: number; revenue: number }[] = [];
    for (let t = range.from; t < range.to; t += DAY) {
      const day = filtered.filter((o) => o.placed >= t && o.placed < t + DAY);
      rows.push({ t, orders: day.length, cases: day.reduce((s, o) => s + o.cases, 0), revenue: day.reduce((s, o) => s + o.total, 0) });
    }
    return rows.reverse();
  }, [filtered, range]);

  /* product sales aggregated over the filtered orders */
  const productRows = useMemo(() => {
    const agg: Record<number, { id: number; name: string; qty: number; revenue: number }> = {};
    filtered.forEach((o) => o.lines.forEach((l) => {
      agg[l.id] ??= { id: l.id, name: l.name, qty: 0, revenue: 0 };
      agg[l.id].qty += l.qty;
      agg[l.id].revenue += l.qty * l.price;
    }));
    return Object.values(agg)
      .map((r) => { const p = products.find((x) => x.id === r.id); return { ...r, sku: p ? sku(p) : `SW-${r.id}`, dep: p?.dep as DeptKey | undefined }; })
      .sort((a, b) => b.revenue - a.revenue);
  }, [filtered, products]);

  /* current inventory snapshot (not date-filtered — stock is a live figure) */
  const invRows = useMemo(() => products.map((p) => {
    const unitCost = p.cost ?? p.price * 0.7;
    const level = p.stock <= 0 ? "out" : p.stock <= (p.reorderPoint ?? LOW_STOCK) ? "low" : "ok";
    return { p, unitCost, value: unitCost * p.stock, level };
  }).filter((r) => invFilter === "all" || r.level === invFilter)
    .sort((a, b) => b.value - a.value), [products, invFilter]);

  const invValue = invRows.reduce((s, r) => s + r.value, 0);
  const ready = ordReady && prodReady;

  const fromLbl = toInput(range.from);
  const toLbl = toInput(range.to - DAY);
  const exportCsv = (name: string, headers: string[], rows: (string | number)[][]) => {
    if (!rows.length) { flash("Nothing to export for this filter."); return; }
    downloadCsv(name, headers, rows);
    flash(`Exported ${rows.length} rows`);
  };
  const exportActive = () => {
    if (tab === "daily") return exportCsv(`daily-sales_${fromLbl}_to_${toLbl}.csv`, ["Date", "Orders", "Cases", "Revenue"], daily.map((d) => [dayLabel(d.t), d.orders, d.cases, d.revenue.toFixed(2)]));
    if (tab === "products") return exportCsv(`products-sold_${fromLbl}_to_${toLbl}.csv`, ["SKU", "Product", "Department", "Qty sold", "Revenue"], productRows.map((r) => [r.sku, r.name, r.dep ? deptName(r.dep) : "", r.qty, r.revenue.toFixed(2)]));
    return exportCsv(`inventory_${toInput(today)}.csv`, ["SKU", "Product", "Department", "Stock", "Reorder point", "Unit cost", "Inventory value"], invRows.map((r) => [sku(r.p), r.p.name, deptName(r.p.dep), r.p.stock, r.p.reorderPoint ?? "", r.unitCost.toFixed(2), r.value.toFixed(2)]));
  };

  return (
    <>
      <Head title="Reports">
        <div className="rangebar">
          <Dropdown
            align="end"
            ariaLabel="Date range"
            triggerClassName="rangedd-btn"
            trigger={(open) => (
              <>
                <Calendar />
                <span>{isCustom ? "Custom range" : (RANGES.find((r) => r.key === rangeKey)?.full ?? "Select range")}</span>
                <svg className={cx("rangedd-caret", open && "up")} width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </>
            )}
          >
            {RANGES.map((r) => (
              <button key={r.key} type="button" className={cx("menu-item", rangeKey === r.key && "on")} onClick={() => setRangeKey(r.key)}>{r.full}</button>
            ))}
            <button type="button" className={cx("menu-item", isCustom && "on")} onClick={() => setRangeKey("custom")}>Custom range…</button>
          </Dropdown>
          {isCustom && (
            <div className="customrange">
              <input type="date" value={custom.from} max={custom.to} onChange={(e) => setCustom({ ...custom, from: e.target.value })} aria-label="From date" />
              <span><Arrow /></span>
              <input type="date" value={custom.to} min={custom.from} onChange={(e) => setCustom({ ...custom, to: e.target.value })} aria-label="To date" />
            </div>
          )}
          <select className="repdd" aria-label="Store" value={store} onChange={(e) => setStore(e.target.value)}>
            <option value="all">All customers</option>
            {stores.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="repdd" aria-label="Order status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {O_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </Head>

      {/* summary for the selected range */}
      <div className="kpis" style={{ marginBottom: 18 }}>
        <KpiCard tone="accent" label="Revenue" value={m(totals.revenue)} loading={!ready} foot="in range" />
        <KpiCard label="Orders" value={totals.orders} loading={!ready} foot="in range" />
        <KpiCard label="Cases" value={totals.cases} loading={!ready} foot="in range" />
        <KpiCard label="Avg order" value={m(totals.aov)} loading={!ready} foot="per order" />
      </div>

      {/* tabs + export on one line */}
      <div className="reptabbar">
        <Tabs
          ariaLabel="Report type"
          value={tab}
          onChange={(key) => setTab(key as typeof tab)}
          tabs={[{ key: "daily", label: "Daily sales" }, { key: "products", label: "Products sold" }, { key: "inventory", label: "Inventory" }]}
        />
        <div className="reptabbar-actions">
          {tab === "inventory" && (
            <select className="repdd" aria-label="Stock filter" value={invFilter} onChange={(e) => setInvFilter(e.target.value as typeof invFilter)}>
              <option value="all">All stock</option>
              <option value="low">Low / reorder</option>
              <option value="out">Out of stock</option>
            </select>
          )}
          <Button variant="ghost" size="sm" onClick={exportActive}><Chart /> Export CSV</Button>
        </div>
      </div>

      {tab === "daily" && (
        <div className="panel anim-in">
          <div className="panel-h"><h3>Daily sales</h3><span className="hint">{daily.length} days</span></div>
          <div className="tablewrap">
            <table className="invtable flat reptable">
              <thead><tr><th>Date</th><th className="r">Orders</th><th className="r">Cases</th><th className="r">Revenue</th></tr></thead>
              <tbody>
                {daily.map((d) => (
                  <tr key={d.t}><td>{dayLabel(d.t)}</td><td className="r mono">{d.orders}</td><td className="r mono">{d.cases}</td><td className="r mono">{m(d.revenue)}</td></tr>
                ))}
                <tr className="totalrow"><td><b>Total</b></td><td className="r mono"><b>{totals.orders}</b></td><td className="r mono"><b>{totals.cases}</b></td><td className="r mono"><b>{m(totals.revenue)}</b></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "products" && (
        <div className="panel anim-in">
          <div className="panel-h"><h3>Products sold</h3><span className="hint">{productRows.length} SKUs · in range</span></div>
          {productRows.length ? (
            <div className="tablewrap">
              <table className="invtable flat reptable">
                <thead><tr><th>SKU</th><th>Product</th><th>Department</th><th className="r">Qty sold</th><th className="r">Revenue</th></tr></thead>
                <tbody>
                  {productRows.map((r) => (
                    <tr key={r.id}><td className="mono muted" style={{ fontSize: 12 }}>{r.sku}</td><td style={{ fontWeight: 600 }}>{r.name}</td><td className="muted" style={{ fontSize: 13 }}>{r.dep ? deptName(r.dep) : "—"}</td><td className="r mono">{r.qty}</td><td className="r mono">{m(r.revenue)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="muted" style={{ fontSize: 14, padding: "6px 0" }}>No products sold in this range.</p>}
        </div>
      )}

      {tab === "inventory" && (
        <div className="panel anim-in">
          <div className="panel-h"><h3>Inventory</h3><span className="hint">{invRows.length} SKUs · {m(invValue)} at cost</span></div>
          {invRows.length ? (
            <div className="tablewrap">
              <table className="invtable flat reptable">
                <thead><tr><th>SKU</th><th>Product</th><th>Department</th><th className="r">Stock</th><th className="r">Reorder</th><th className="r">Value</th><th className="r">Status</th></tr></thead>
                <tbody>
                  {invRows.map((r) => (
                    <tr key={r.p.id}>
                      <td className="mono muted" style={{ fontSize: 12 }}>{sku(r.p)}</td>
                      <td style={{ fontWeight: 600 }}>{r.p.name}</td>
                      <td className="muted" style={{ fontSize: 13 }}>{deptName(r.p.dep)}</td>
                      <td className="r mono">{r.p.stock}</td>
                      <td className="r mono muted">{r.p.reorderPoint ?? "—"}</td>
                      <td className="r mono">{m(r.value)}</td>
                      <td className="r"><Badge tone={r.level === "out" ? "danger" : r.level === "low" ? "warning" : "success"}>{r.level === "out" ? "Out" : r.level === "low" ? "Low" : "In stock"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="muted" style={{ fontSize: 14, padding: "6px 0" }}>No products match this stock filter.</p>}
        </div>
      )}
    </>
  );
}
