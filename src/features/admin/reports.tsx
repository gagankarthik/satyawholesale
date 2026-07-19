"use client";

import { useMemo, useState } from "react";
import { useInventory, useOrders, deptName, sku, LOW_STOCK, CONTACT, type DeptKey } from "@/lib/store";
import { useRouter } from "next/navigation";
import { KpiCard, Badge, Button, Tabs, Dropdown, cx } from "@/components/ui";
import { Calendar, Arrow, Printer, Download, Coin, Receipt, Truck, Card } from "@/components/Icons";
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
  const router = useRouter();
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

  /* Drill into a single day → its own page (/admin/reports/<YYYY-MM-DD>). */
  const openDay = (t: number) => router.push(`/admin/reports/${toInput(t)}`);

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
    if (!rows.length) { flash.error("Nothing to export for this filter."); return; }
    downloadCsv(name, headers, rows);
    flash(`Exported ${rows.length} rows`);
  };
  const exportActive = () => {
    if (tab === "daily") return exportCsv(`daily-sales_${fromLbl}_to_${toLbl}.csv`, ["Date", "Orders", "Cases", "Revenue"], daily.map((d) => [dayLabel(d.t), d.orders, d.cases, d.revenue.toFixed(2)]));
    if (tab === "products") return exportCsv(`products-sold_${fromLbl}_to_${toLbl}.csv`, ["SKU", "Product", "Department", "Qty sold", "Revenue"], productRows.map((r) => [r.sku, r.name, r.dep ? deptName(r.dep) : "", r.qty, r.revenue.toFixed(2)]));
    return exportCsv(`inventory_${toInput(today)}.csv`, ["SKU", "Product", "Department", "Stock", "Reorder point", "Unit cost", "Inventory value"], invRows.map((r) => [sku(r.p), r.p.name, deptName(r.p.dep), r.p.stock, r.p.reorderPoint ?? "", r.unitCost.toFixed(2), r.value.toFixed(2)]));
  };

  /* Open the active report as a clean, self-contained page in a new tab, with a
     Back and a Print control. The admin shell's global print CSS blanks anything
     that isn't a portaled receipt, so we render a standalone document instead. */
  const openReportPage = () => {
    const esc = (v: string | number) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
    const table: { caption: string; headers: string[]; align: ("l" | "r")[]; rows: (string | number)[][]; foot?: (string | number)[] } =
      tab === "daily"
        ? { caption: "Daily sales", headers: ["Date", "Orders", "Cases", "Revenue"], align: ["l", "r", "r", "r"], rows: daily.map((d) => [dayLabel(d.t), d.orders, d.cases, m(d.revenue)]), foot: ["Total", totals.orders, totals.cases, m(totals.revenue)] }
        : tab === "products"
          ? { caption: "Products sold", headers: ["SKU", "Product", "Department", "Qty sold", "Revenue"], align: ["l", "l", "l", "r", "r"], rows: productRows.map((r) => [r.sku, r.name, r.dep ? deptName(r.dep) : "—", r.qty, m(r.revenue)]) }
          : { caption: "Inventory", headers: ["SKU", "Product", "Department", "Stock", "Reorder", "Value", "Status"], align: ["l", "l", "l", "r", "r", "r", "l"], rows: invRows.map((r) => [sku(r.p), r.p.name, deptName(r.p.dep), r.p.stock, r.p.reorderPoint ?? "—", m(r.value), r.level === "out" ? "Out" : r.level === "low" ? "Low" : "In stock"]) };

    if (!table.rows.length) { flash.error("Nothing to show for this filter."); return; }

    const filters = [`${fromLbl} to ${toLbl}`, store === "all" ? "All customers" : `Customer: ${store}`, status === "all" ? "All statuses" : `Status: ${status}`].join("  ·  ");
    const kpis = tab === "inventory"
      ? [["SKUs", String(invRows.length)], ["Value at cost", m(invValue)]]
      : [["Revenue", m(totals.revenue)], ["Orders", String(totals.orders)], ["Cases", String(totals.cases)], ["Avg order", m(totals.aov)]];
    const cell = (v: string | number, a: "l" | "r", tag: "td" | "th") => `<${tag} class="${a === "r" ? "r" : ""}">${esc(v)}</${tag}>`;
    const thead = `<tr>${table.headers.map((h, i) => cell(h, table.align[i], "th")).join("")}</tr>`;
    const tbody = table.rows.map((r) => `<tr>${r.map((c, i) => cell(c, table.align[i], "td")).join("")}</tr>`).join("");
    const tfoot = table.foot ? `<tr class="ft">${table.foot.map((c, i) => cell(c, table.align[i], "td")).join("")}</tr>` : "";
    const generated = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

    const doc = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(table.caption)} · ${esc(CONTACT.legalName)}</title>
<style>
*{box-sizing:border-box;margin:0}
body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#1c2027;background:#eef0f2}
.bar{position:sticky;top:0;z-index:2;display:flex;gap:10px;justify-content:flex-end;align-items:center;padding:12px 20px;background:#fff;border-bottom:1px solid #e4e7ee}
.bar .sp{margin-right:auto;font-weight:700;font-size:14px}
.bar button{font:inherit;font-weight:600;font-size:14px;display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:9px;border:1.5px solid #e4e7ee;background:#fff;color:#1c2027;cursor:pointer}
.bar button:hover{border-color:#1c2027}
.bar button.pr{background:#b05a00;border-color:#b05a00;color:#fff}
.sheet{max-width:920px;margin:22px auto;background:#fff;padding:36px 40px 30px;box-shadow:0 10px 34px -14px rgba(14,19,64,.28)}
.lh{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:2px solid #1c2027;padding-bottom:16px}
.co{font-weight:800;font-size:20px;letter-spacing:-.4px}
.ad{font-size:12px;color:#5a6270;margin-top:5px;line-height:1.5}
.rt{text-align:right}
.rtt{font-weight:700;font-size:17px}
.rtf{font-size:12px;color:#5a6270;margin-top:5px}
.kpis{display:flex;gap:32px;flex-wrap:wrap;margin:22px 0 6px}
.kpis .k span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#5a6270}
.kpis .k b{font-size:22px;font-weight:800;letter-spacing:-.3px}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:14px}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid #e8ebf0}
th{font-size:10.5px;text-transform:uppercase;letter-spacing:.5px;color:#5a6270;border-bottom:2px solid #cfd5de}
td.r,th.r{text-align:right;font-variant-numeric:tabular-nums}
tr.ft td{font-weight:800;border-top:2px solid #cfd5de;border-bottom:none}
.fo{margin-top:22px;font-size:11px;color:#8a909c;text-align:center}
@media print{.bar{display:none}body{background:#fff}.sheet{box-shadow:none;margin:0;max-width:none;padding:0}@page{margin:14mm}}
</style></head>
<body>
<div class="bar">
  <span class="sp">${esc(table.caption)}</span>
  <button onclick="window.close()">&larr; Back</button>
  <button class="pr" onclick="window.print()">Print</button>
</div>
<div class="sheet">
  <div class="lh">
    <div>
      <div class="co">${esc(CONTACT.legalName)}</div>
      <div class="ad">${esc(CONTACT.address1)}, ${esc(CONTACT.address2)}<br>${esc(CONTACT.phone)} · ${esc(CONTACT.email)}</div>
    </div>
    <div class="rt">
      <div class="rtt">${esc(table.caption)}</div>
      <div class="rtf">${esc(filters)}</div>
    </div>
  </div>
  <div class="kpis">${kpis.map(([l, v]) => `<div class="k"><span>${esc(l)}</span><b>${esc(v)}</b></div>`).join("")}</div>
  <table><thead>${thead}</thead><tbody>${tbody}${tfoot}</tbody></table>
  <div class="fo">Generated ${esc(generated)} · ${esc(CONTACT.legalName)} reports</div>
</div>
</body></html>`;

    const w = window.open("", "_blank", "width=1000,height=820");
    if (!w) { flash.error("Allow pop-ups to open the printable report."); return; }
    w.document.open();
    w.document.write(doc);
    w.document.close();
    w.focus();
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
          <Button variant="primary" size="sm" onClick={openReportPage}><Printer /> Print report</Button>
        </div>
      </Head>

      {/* summary for the selected range */}
      <div className="kpis" style={{ marginBottom: 18 }}>
        <KpiCard tone="accent" label="Revenue" value={m(totals.revenue)} loading={!ready} icon={<Coin />} foot="in range" />
        <KpiCard label="Orders" value={totals.orders} loading={!ready} icon={<Receipt />} foot="in range" />
        <KpiCard label="Cases" value={totals.cases} loading={!ready} icon={<Truck />} foot="in range" />
        <KpiCard label="Avg order" value={m(totals.aov)} loading={!ready} icon={<Card />} foot="per order" />
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
          <Button variant="ghost" size="sm" onClick={exportActive}><Download /> Export CSV</Button>
        </div>
      </div>

      {tab === "daily" && (
        <div className="panel anim-in">
          <div className="panel-h"><h3>Daily sales</h3><span className="hint">{daily.length} days · tap a day for its orders</span></div>
          <div className="tablewrap">
            <table className="invtable flat reptable">
              <thead><tr><th>Date</th><th className="r">Orders</th><th className="r">Cases</th><th className="r">Revenue</th><th aria-label="View" /></tr></thead>
              <tbody>
                {daily.map((d) => {
                  const has = d.orders > 0;
                  return (
                    <tr
                      key={d.t}
                      className={cx(has && "clickrow")}
                      onClick={has ? () => openDay(d.t) : undefined}
                      tabIndex={has ? 0 : undefined}
                      role={has ? "button" : undefined}
                      aria-label={has ? `View ${d.orders} orders on ${dayLabel(d.t)}` : undefined}
                      onKeyDown={has ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDay(d.t); } } : undefined}
                    >
                      <td>{dayLabel(d.t)}</td>
                      <td className="r mono">{d.orders}</td>
                      <td className="r mono">{d.cases}</td>
                      <td className="r mono">{m(d.revenue)}</td>
                      <td className="r">{has && <Arrow className="daychev" />}</td>
                    </tr>
                  );
                })}
                <tr className="totalrow"><td><b>Total</b></td><td className="r mono"><b>{totals.orders}</b></td><td className="r mono"><b>{totals.cases}</b></td><td className="r mono"><b>{m(totals.revenue)}</b></td><td /></tr>
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
