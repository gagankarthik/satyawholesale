"use client";

import { useMemo, useState } from "react";
import { deptName, sku, useInventory, useOrders, LOW_STOCK, CONTACT, type DeptKey, type Order } from "@/lib/store";
import { useSuppliers, useCustomers, usePurchaseOrders } from "@/lib/wms";
import { Plus, Arrow, Calendar, Coin, Receipt, Card, Truck, Boxes, Package, Inventory, Users } from "@/components/Icons";
import { Head, m, k, timeAgo, type Tab } from "../shared";
import { KpiCard, Badge, Button, Dropdown, Skeleton, cx } from "@/components/ui";
import { AreaTrend } from "@/components/ui/AreaTrend";
import { PieBreakdown, BarBreakdown } from "@/components/ui";
import { O_STATUSES } from "./_shared";

/* =======================================================================
   DASHBOARD — analytics with date ranges, deltas & comparison chart
   ======================================================================= */
const DAY = 86400000;
const RANGES = [
  { key: "1d", label: "1D", full: "Today", days: 1 },
  { key: "7d", label: "7D", full: "Last 7 days", days: 7 },
  { key: "30d", label: "30D", full: "Last 30 days", days: 30 },
  { key: "90d", label: "90D", full: "Last 90 days", days: 90 },
  { key: "1y", label: "1Y", full: "Last 12 months", days: 365 },
];

type Bucket = { label: string; revenue: number; orders: number };

const deltaPct = (cur: number, prev: number) =>
  prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0;

/* Keep pie slices within the categorical palette (never cycle a hue): show the
   top (max-1) categories and merge the tail into a single "Other" slice. */
function foldSlices(rows: { name: string; value: number }[], max = 6) {
  if (rows.length <= max) return rows;
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const other = sorted.slice(max - 1).reduce((s, r) => s + r.value, 0);
  return other > 0 ? [...sorted.slice(0, max - 1), { name: "Other", value: other }] : sorted.slice(0, max - 1);
}

function DeltaFoot({ cur, prev }: { cur: number; prev: number }) {
  const d = deltaPct(cur, prev);
  const up = d >= 0;
  return <span className={up ? "up" : "down"}>{up ? "▲" : "▼"} {Math.abs(d).toFixed(0)}% <span className="muted">vs prev</span></span>;
}

/* Interactive revenue chart: current period (area + line) vs previous (dashed). */
/* Revenue trend now renders with the shadcn/ui area chart — see AreaTrend. */

export function DashboardTab({ go }: { go: (t: Tab) => void }) {
  const { products, ready: prodReady } = useInventory();
  const { orders, ready: ordReady } = useOrders();
  const { pos, ready: poReady } = usePurchaseOrders();
  const { customers, ready: custReady } = useCustomers();
  const { suppliers } = useSuppliers();
  const ready = prodReady && ordReady && poReady && custReady;

  const [rangeKey, setRangeKey] = useState("7d");
  const [custom, setCustom] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const isCustom = rangeKey === "custom";

  const { from, to, days } = useMemo(() => {
    if (isCustom && custom.from && custom.to) {
      const f = new Date(custom.from).getTime();
      const t = new Date(custom.to).getTime() + DAY;
      return { from: f, to: t, days: Math.max(1, Math.round((t - f) / DAY)) };
    }
    const d = RANGES.find((r) => r.key === rangeKey)?.days ?? 7;
    return { from: Date.now() - d * DAY, to: Date.now(), days: d };
  }, [rangeKey, isCustom, custom]);

  const span = to - from;
  const stats = useMemo(() => {
    const inRange = (a: number, b: number) => orders.filter((o) => o.placed >= a && o.placed < b);
    const cur = inRange(from, to);
    const prev = inRange(from - span, from);
    const sum = (os: Order[]) => os.reduce((s, o) => s + o.total, 0);
    const caseSum = (os: Order[]) => os.reduce((s, o) => s + o.cases, 0);
    return {
      cur, prev,
      rev: sum(cur), revPrev: sum(prev),
      cases: caseSum(cur), casesPrev: caseSum(prev),
      aov: cur.length ? sum(cur) / cur.length : 0,
      aovPrev: prev.length ? sum(prev) / prev.length : 0,
    };
  }, [orders, from, to, span]);

  const nB = days <= 1 ? 8 : days <= 7 ? 7 : days <= 31 ? 10 : 12;
  const labelFor = (start: number) => {
    const d = new Date(start);
    if (days <= 1) return d.toLocaleTimeString("en-US", { hour: "numeric" }).replace(" ", "").toLowerCase();
    if (days <= 31) return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
    return d.toLocaleDateString("en-US", { month: "short" });
  };
  const bucketize = (a: number, b: number): Bucket[] => {
    const step = (b - a) / nB;
    return Array.from({ length: nB }).map((_, i) => {
      const s = a + i * step, e = s + step;
      const os = orders.filter((o) => o.placed >= s && o.placed < e);
      return { label: labelFor(s), revenue: os.reduce((x, o) => x + o.total, 0), orders: os.length };
    });
  };
  const curBuckets = useMemo(() => bucketize(from, to), [orders, from, to, nB]);
  const prevBuckets = useMemo(() => bucketize(from - span, from), [orders, from, span, nB]);

  /* status mix + top products for the current range */
  const statusMix = O_STATUSES.map((s) => ({ status: s, n: stats.cur.filter((o) => o.status === s).length })).filter((x) => x.n > 0);
  const statusTotal = Math.max(1, stats.cur.length);
  const topProducts = useMemo(() => {
    const agg: Record<number, { name: string; revenue: number; qty: number }> = {};
    stats.cur.forEach((o) => o.lines.forEach((l) => {
      agg[l.id] ??= { name: l.name, revenue: 0, qty: 0 };
      agg[l.id].revenue += l.qty * l.price; agg[l.id].qty += l.qty;
    }));
    return Object.values(agg).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [stats.cur]);
  const topMax = Math.max(1, ...topProducts.map((p) => p.revenue));

  const deptRevenue = useMemo(() => {
    const agg: Record<string, number> = {};
    stats.cur.forEach((o) => o.lines.forEach((l) => {
      const dep = products.find((x) => x.id === l.id)?.dep ?? "grocery";
      agg[dep] = (agg[dep] || 0) + l.qty * l.price;
    }));
    return Object.entries(agg).map(([dep, revenue]) => ({ dep, revenue })).sort((a, b) => b.revenue - a.revenue);
  }, [stats.cur, products]);
  const deptMax = Math.max(1, ...deptRevenue.map((d) => d.revenue));

  const invValue = products.reduce((s, p) => s + (p.cost ?? p.price * 0.7) * p.stock, 0);
  const low = products.filter((p) => p.stock <= (p.reorderPoint ?? LOW_STOCK));
  const pending = customers.filter((c) => c.status === "Pending").length;
  const openPOs = pos.filter((p) => p.status !== "Received" && p.status !== "Closed").length;

  return (
    <>
      <Head title="Dashboard">
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
              <input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} aria-label="From date" />
              <span><Arrow /></span>
              <input type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} aria-label="To date" />
            </div>
          )}
        </div>
      </Head>

      <div className="kpis">
        <KpiCard tone="accent" label="Revenue" value={k(stats.rev)} loading={!ready} icon={<Coin />} foot={<DeltaFoot cur={stats.rev} prev={stats.revPrev} />} />
        <KpiCard label="Orders" value={stats.cur.length} loading={!ready} icon={<Receipt />} foot={<DeltaFoot cur={stats.cur.length} prev={stats.prev.length} />} />
        <KpiCard label="Avg order" value={k(stats.aov)} loading={!ready} icon={<Card />} foot={<DeltaFoot cur={stats.aov} prev={stats.aovPrev} />} />
        <KpiCard label="Cases shipped" value={stats.cases} loading={!ready} icon={<Truck />} foot={<DeltaFoot cur={stats.cases} prev={stats.casesPrev} />} />
      </div>

      <div className="panel anim-in" style={{ marginBottom: 18 }}>
        <div className="panel-h">
          <h3>Revenue · {isCustom ? "custom range" : `last ${days} days`}</h3>
          <div className="legend"><span className="lg cur">This period {k(stats.rev)}</span><span className="lg prev">Previous {k(stats.revPrev)}</span></div>
        </div>
        {ready ? (
          <AreaTrend
            data={curBuckets.map((b, i) => ({ label: b.label, current: b.revenue, previous: prevBuckets[i]?.revenue ?? 0 }))}
            xKey="label"
            series={[{ key: "current", label: "This period", color: "var(--chart-1)" }, { key: "previous", label: "Previous", color: "var(--chart-prev)" }]}
            stacked={false}
            height={240}
            yFormatter={(v) => k(v)}
            valueFormatter={(v) => "$" + Math.round(v).toLocaleString()}
          />
        ) : <Skeleton height={240} radius={12} />}
      </div>

      <div className="dash">
        <div className="panel anim-in">
          <div className="panel-h"><h3>Orders by status</h3><span className="hint">{stats.cur.length} in range</span></div>
          {!ready ? <Skeleton height={300} radius={12} /> : statusMix.length ? (
            <PieBreakdown
              donut
              centerLabel="orders"
              data={statusMix.map((s) => ({ name: s.status, value: s.n }))}
              valueFormatter={(v) => String(v)}
              height={300}
            />
          ) : <p className="muted" style={{ fontSize: 14 }}>No orders in this range.</p>}
        </div>
        <div className="panel anim-in">
          <div className="panel-h"><h3>Revenue by department</h3><span className="hint">in range</span></div>
          {!ready ? <Skeleton height={300} radius={12} /> : deptRevenue.length ? (
            <PieBreakdown
              data={foldSlices(deptRevenue.map((d) => ({ name: deptName(d.dep as DeptKey), value: d.revenue })))}
              valueFormatter={(v) => m(v)}
              height={300}
            />
          ) : <p className="muted" style={{ fontSize: 14 }}>No sales in this range.</p>}
        </div>
      </div>

      <div className="panel anim-in" style={{ marginTop: 18 }}>
        <div className="panel-h"><h3>Top products</h3><span className="hint">by revenue</span></div>
        {!ready ? <Skeleton height={320} radius={12} /> : topProducts.length ? (
          <BarBreakdown
            data={topProducts.map((p) => ({ name: p.name, value: p.revenue }))}
            valueFormatter={(v) => m(v)}
            color="var(--chart-1)"
            height={320}
          />
        ) : <p className="muted" style={{ fontSize: 14 }}>No sales in this range.</p>}
      </div>

      <div className="kpis" style={{ marginTop: 18 }}>
        <KpiCard label="Inventory value" value={k(invValue)} loading={!ready} icon={<Boxes />} foot={`${products.length} SKUs at cost`} />
        <KpiCard tone="warn" label="Reorder needed" value={low.length} loading={!ready} icon={<Package />} foot="at/below reorder point" />
        <KpiCard label="Open POs" value={openPOs} loading={!ready} icon={<Inventory />} foot="in fulfillment" />
        <KpiCard tone="danger" label="Pending accounts" value={pending} loading={!ready} icon={<Users />} foot="awaiting approval" />
      </div>

      <div className="dash" style={{ marginTop: 18 }}>
        <div className="panel anim-in">
          <div className="panel-h"><h3>Reorder suggestions</h3><Button variant="ghost" size="sm" onClick={() => go("pos")}><Plus /> Create POs</Button></div>
          <div className="minirows">
            {low.length ? low.slice(0, 6).map((p) => {
              const sup = suppliers.find((s) => s.id === p.supplierId);
              return (
                <div className="minirow" key={p.id}>
                  <div><div className="ref" style={{ fontFamily: "var(--font-body-f)", fontWeight: 600 }}>{p.name}</div><div className="st2">{sku(p)} · {sup ? sup.name : "no supplier"}</div></div>
                  <Badge tone={p.stock <= 0 ? "danger" : p.stock <= LOW_STOCK ? "warning" : "success"}>{p.stock} cs</Badge>
                </div>
              );
            }) : <p style={{ color: "var(--slate)", fontSize: 14 }}>All SKUs above reorder point.</p>}
          </div>
        </div>
        <div className="panel anim-in">
          <div className="panel-h"><h3>Recent orders</h3><Button variant="ghost" size="sm" onClick={() => go("orders")}>View all</Button></div>
          <div className="minirows">
            {orders.slice(0, 6).map((o) => (
              <div className="minirow" key={o.ref}>
                <div><div className="ref">{o.ref}</div><div className="st2">{o.store} · {timeAgo(o.placed)}</div></div>
                <span className="amt">{m(o.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
