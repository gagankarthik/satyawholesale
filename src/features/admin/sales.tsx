"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEPTS, DEPT_BG, deptName, fmt, sku, productImg, useInventory, useOrders, useSettings, computeTax,
  commitStockForOrder, LOW_STOCK,
  CONTACT, CUSTOMERS, orderGrand, ORDER_FLOW, statusSlug,
  type DeptKey, type Product, type Tag, type Order, type OrderLine, type OrderStatus, type PayStatus,
} from "@/lib/store";
import Image from "next/image";
import OrderTracker from "@/components/OrderTracker";
import PrintReceipt from "@/components/PrintReceipt";
import {
  useSuppliers, useCategories, useLocations, useStaff, useCustomers,
  usePurchaseOrders, useMovements, useReceipts, useInvoices, usePromotions,
  poTotal, PO_FLOW, PO_APPROVAL_THRESHOLD, RECEIVE_TOLERANCE, threeWayMatch,
  ROLES, csvTemplate, parseCsv, validateRows, rowToProduct,
  type ImportRow, type PurchaseOrder, type Role,
} from "@/lib/wms";
import { Grid, Receipt, Boxes, Users, Truck, Store, Shield, Pin, Refresh, Search, Close, Check, Paperclip } from "@/components/Icons";
import { useConfirm } from "@/components/Confirm";
import { Head, FlowGuide, CUSTOMER_FLOW, m, k, timeAgo, stockClass, fmtDate, type Tab, type Flash } from "./shared";
import { KpiCard, DataTable, Badge, Button, ListToolbar, Menu, ViewToggle, type Column, type BadgeTone, type ToolbarOption, type ViewMode } from "@/components/ui";

/** Map domain status → UI Badge tone (kept next to the data it describes). */
const statusTone = (s: OrderStatus): BadgeTone =>
  s === "Completed" ? "success" : s === "Cancelled" ? "danger" : s === "Out for delivery" || s === "At Local Facility" ? "info" : s === "Processing" ? "warning" : "brand";
const payTone = (p: PayStatus): BadgeTone =>
  p === "Paid" ? "success" : p === "Partial" ? "warning" : p === "Refunded" ? "neutral" : "danger";
const acctTone = (s: "Active" | "Pending" | "Hold"): BadgeTone =>
  s === "Active" ? "success" : s === "Pending" ? "brand" : "danger";

/* =======================================================================
   DASHBOARD — analytics with date ranges, deltas & comparison chart
   ======================================================================= */
const DAY = 86400000;
const RANGES = [
  { key: "1d", label: "1D", days: 1 },
  { key: "7d", label: "7D", days: 7 },
  { key: "30d", label: "30D", days: 30 },
  { key: "90d", label: "90D", days: 90 },
  { key: "1y", label: "1Y", days: 365 },
];

type Bucket = { label: string; revenue: number; orders: number };

const deltaPct = (cur: number, prev: number) =>
  prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0;

function DeltaFoot({ cur, prev }: { cur: number; prev: number }) {
  const d = deltaPct(cur, prev);
  const up = d >= 0;
  return <span className={up ? "up" : "down"}>{up ? "▲" : "▼"} {Math.abs(d).toFixed(0)}% <span className="muted">vs prev</span></span>;
}

/* Interactive revenue chart: current period (area + line) vs previous (dashed). */
function TrendChart({ cur, prev }: { cur: Bucket[]; prev: Bucket[] }) {
  const [hi, setHi] = useState<number | null>(null);
  const W = 720, H = 210, pad = 10, base = H - 22;
  const n = cur.length;
  const max = Math.max(1, ...cur.map((d) => d.revenue), ...prev.map((d) => d.revenue));
  const xAt = (i: number) => pad + (i / Math.max(1, n - 1)) * (W - 2 * pad);
  const yAt = (val: number) => 8 + (1 - val / max) * (base - 8);
  const line = (arr: Bucket[]) => arr.map((d, i) => `${xAt(i).toFixed(1)},${yAt(d.revenue).toFixed(1)}`).join(" ");
  const area = `${xAt(0)},${base} ${line(cur)} ${xAt(n - 1)},${base}`;

  return (
    <div className="trendwrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="trend" onMouseLeave={() => setHi(null)} role="img" aria-label="Revenue trend">
        <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--signal)" stopOpacity="0.22" /><stop offset="1" stopColor="var(--signal)" stopOpacity="0" /></linearGradient></defs>
        <polygon points={area} fill="url(#tg)" />
        <polyline points={line(prev)} fill="none" stroke="var(--slate-3)" strokeWidth="1.6" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
        <polyline points={line(cur)} fill="none" stroke="var(--signal)" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {hi !== null && <line x1={xAt(hi)} x2={xAt(hi)} y1={6} y2={base} stroke="var(--kraft-edge)" strokeWidth="1" />}
        {cur.map((d, i) => <circle key={i} cx={xAt(i)} cy={yAt(d.revenue)} r={hi === i ? 4.5 : 0} fill="var(--signal)" />)}
        {cur.map((_, i) => <rect key={"h" + i} x={xAt(i) - (W / n) / 2} y={0} width={W / n} height={H} fill="transparent" onMouseEnter={() => setHi(i)} />)}
      </svg>
      {hi !== null && (
        <div className="trendtip" style={{ left: `${(xAt(hi) / W) * 100}%` }}>
          <div className="tt-l">{cur[hi].label}</div>
          <div className="tt-v">{m(cur[hi].revenue)}</div>
          <div className="tt-s">{cur[hi].orders} orders · prev {m(prev[hi]?.revenue ?? 0)}</div>
        </div>
      )}
      <div className="trendx">{cur.map((d, i) => <span key={i}>{d.label}</span>)}</div>
    </div>
  );
}

export function DashboardTab({ go }: { go: (t: Tab) => void }) {
  const { products } = useInventory();
  const { orders } = useOrders();
  const { pos } = usePurchaseOrders();
  const { customers } = useCustomers(CUSTOMERS);
  const { suppliers } = useSuppliers();

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
      <Head title="Dashboard" sub={`Sales analytics · ${CONTACT.city}`}>
        <div className="rangebar">
          <div className="fchips">
            {RANGES.map((r) => <button key={r.key} className={rangeKey === r.key ? "on" : ""} onClick={() => setRangeKey(r.key)}>{r.label}</button>)}
            <button className={isCustom ? "on" : ""} onClick={() => setRangeKey("custom")}>Custom</button>
          </div>
          {isCustom && (
            <div className="customrange">
              <input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} aria-label="From date" />
              <span>→</span>
              <input type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} aria-label="To date" />
            </div>
          )}
        </div>
      </Head>

      <div className="kpis">
        <KpiCard tone="accent" label="Revenue" value={k(stats.rev)} foot={<DeltaFoot cur={stats.rev} prev={stats.revPrev} />} />
        <KpiCard label="Orders" value={stats.cur.length} foot={<DeltaFoot cur={stats.cur.length} prev={stats.prev.length} />} />
        <KpiCard label="Avg order" value={k(stats.aov)} foot={<DeltaFoot cur={stats.aov} prev={stats.aovPrev} />} />
        <KpiCard label="Cases shipped" value={stats.cases} foot={<DeltaFoot cur={stats.cases} prev={stats.casesPrev} />} />
      </div>

      <div className="panel anim-in" style={{ marginBottom: 18 }}>
        <div className="panel-h">
          <h3>Revenue · {isCustom ? "custom range" : `last ${days} days`}</h3>
          <div className="legend"><span className="lg cur">This period {k(stats.rev)}</span><span className="lg prev">Previous {k(stats.revPrev)}</span></div>
        </div>
        <TrendChart cur={curBuckets} prev={prevBuckets} />
      </div>

      <div className="panel anim-in" style={{ marginBottom: 18 }}>
        <div className="panel-h"><h3>Revenue by department</h3><span className="hint">in range</span></div>
        {deptRevenue.length ? (
          <div className="toplist">
            {deptRevenue.map((d) => (
              <div className="toprow" key={d.dep}>
                <div className="tp-name">{deptName(d.dep as DeptKey)}</div>
                <div className="tp-bar"><span style={{ width: `${(d.revenue / deptMax) * 100}%` }} /></div>
                <div className="tp-val mono">{m(d.revenue)}</div>
              </div>
            ))}
          </div>
        ) : <p className="muted" style={{ fontSize: 14 }}>No sales in this range.</p>}
      </div>

      <div className="dash">
        <div className="panel anim-in">
          <div className="panel-h"><h3>Orders by status</h3><span className="hint">{stats.cur.length} in range</span></div>
          {statusMix.length ? (
            <div className="statusmix">
              <div className="smbar">{statusMix.map((s) => <span key={s.status} className={`smseg s-${statusSlug(s.status)}`} style={{ width: `${(s.n / statusTotal) * 100}%` }} title={`${s.status}: ${s.n}`} />)}</div>
              <div className="smlegend">{statusMix.map((s) => <div key={s.status} className="smrow"><Badge tone={statusTone(s.status)}>{s.status}</Badge><span className="mono">{s.n} · {Math.round((s.n / statusTotal) * 100)}%</span></div>)}</div>
            </div>
          ) : <p className="muted" style={{ fontSize: 14 }}>No orders in this range.</p>}
        </div>
        <div className="panel anim-in">
          <div className="panel-h"><h3>Top products</h3><span className="hint">by revenue</span></div>
          {topProducts.length ? (
            <div className="toplist">
              {topProducts.map((p) => (
                <div className="toprow" key={p.name}>
                  <div className="tp-name">{p.name}<span className="muted"> · {p.qty} cs</span></div>
                  <div className="tp-bar"><span style={{ width: `${(p.revenue / topMax) * 100}%` }} /></div>
                  <div className="tp-val mono">{m(p.revenue)}</div>
                </div>
              ))}
            </div>
          ) : <p className="muted" style={{ fontSize: 14 }}>No sales in this range.</p>}
        </div>
      </div>

      <div className="kpis" style={{ marginTop: 18 }}>
        <KpiCard label="Inventory value" value={k(invValue)} foot={`${products.length} SKUs at cost`} />
        <KpiCard tone="warn" label="Reorder needed" value={low.length} foot="at/below reorder point" />
        <KpiCard label="Open POs" value={openPOs} foot="in fulfillment" />
        <KpiCard tone="danger" label="Pending accounts" value={pending} foot="awaiting approval" />
      </div>

      <div className="dash" style={{ marginTop: 18 }}>
        <div className="panel anim-in">
          <div className="panel-h"><h3>Reorder suggestions</h3><Button variant="ghost" size="sm" onClick={() => go("pos")}>Create POs</Button></div>
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

/* =======================================================================
   PRODUCTS  (master data + onboarding)
   ======================================================================= */
const O_STATUSES: OrderStatus[] = ORDER_FLOW;
const PAY_STATUSES: PayStatus[] = ["Unpaid", "Partial", "Paid", "Refunded"];
export function ov(o: Order) {
  const deliveryFee = o.deliveryFee ?? 0, tax = o.tax ?? 0, discount = o.discount ?? 0;
  return {
    deliveryFee, tax, discount, grand: orderGrand(o),
    tracking: o.tracking ?? "1Z" + o.ref.replace(/\D/g, "") + "OH",
    paymentStatus: o.paymentStatus ?? (o.payment?.includes("Net") ? "Unpaid" : "Paid") as PayStatus,
    shipping: o.shipping ?? `${o.store}, Cincinnati, OH`,
    billing: o.billing ?? o.shipping ?? `${o.store}, Cincinnati, OH`,
  };
}

/* Editable money adjustments + manual tracking for an order. */
function OrderAdjust({ order, patchOrder, taxRate, taxLabel, flash }: { order: Order; patchOrder: (ref: string, p: Partial<Order>) => void; taxRate: number; taxLabel: string; flash: Flash }) {
  const [deliv, setDeliv] = useState(String(order.deliveryFee ?? 0));
  const [dkind, setDkind] = useState<"amount" | "percent">("amount");
  const [dval, setDval] = useState("");
  const [dreason, setDreason] = useState(order.discountReason ?? "");
  const [track, setTrack] = useState(order.tracking && order.tracking !== "PICKUP" ? order.tracking : "");

  const applyDeliv = () => {
    const f = Math.max(0, Number(deliv) || 0);
    patchOrder(order.ref, { deliveryFee: f });
    flash("Delivery fee updated");
  };
  const applyDisc = () => {
    const val = Number(dval) || 0;
    if (val <= 0) { flash("Enter a discount amount"); return; }
    const amount = dkind === "percent" ? Math.round(order.total * val) / 100 : val;
    patchOrder(order.ref, { discount: Math.max(0, amount), discountReason: dreason.trim() || (dkind === "percent" ? `${val}% off` : undefined) });
    flash("Discount applied");
  };
  const clearDisc = () => { patchOrder(order.ref, { discount: 0, discountReason: undefined }); setDval(""); setDreason(""); flash("Discount cleared"); };
  const applyTrack = () => { patchOrder(order.ref, { tracking: track.trim() || undefined }); flash("Tracking updated"); };

  return (
    <div className="panel anim-in">
      <div className="panel-h"><h3>Adjustments</h3></div>
      <div className="adjform">
        <div className="adjsec">
          <div className="adjsec-h"><span>Delivery fee</span>{order.deliveryFee ? <span className="adjval">{m(order.deliveryFee)}</span> : <span className="adjval none">None</span>}</div>
          <div className="inline-apply"><input type="number" min={0} step="0.01" value={deliv} onChange={(e) => setDeliv(e.target.value)} placeholder="0.00" /><Button variant="ghost" size="sm" onClick={applyDeliv}>Apply</Button></div>
        </div>

        <div className="adjsec">
          <div className="adjsec-h"><span>Discount</span>{order.discount ? <span className="adjval cut">−{m(order.discount)}</span> : <span className="adjval none">None</span>}</div>
          <div className="discrow">
            <select value={dkind} onChange={(e) => setDkind(e.target.value as "amount" | "percent")}><option value="amount">$ amount</option><option value="percent">% percent</option></select>
            <input type="number" min={0} step="0.01" value={dval} onChange={(e) => setDval(e.target.value)} placeholder={dkind === "percent" ? "10" : "25.00"} />
          </div>
          <input value={dreason} onChange={(e) => setDreason(e.target.value)} placeholder="Reason — loyalty, damaged case, promo…" />
          <div className="adjbtns">
            {order.discount ? <Button variant="ghost" size="sm" onClick={clearDisc}>Clear</Button> : null}
            <Button variant="primary" size="sm" onClick={applyDisc}>Apply discount</Button>
          </div>
        </div>

        {order.tracking !== "PICKUP" && order.status !== "Pending" && order.status !== "Cancelled" && (
          <div className="adjsec">
            <div className="adjsec-h"><span>Tracking number</span>{order.tracking ? <span className="adjval">{order.tracking}</span> : <span className="adjval none">Not shipped</span>}</div>
            <div className="inline-apply"><input value={track} onChange={(e) => setTrack(e.target.value)} placeholder="1Z…" /><Button variant="ghost" size="sm" onClick={applyTrack}>Save</Button></div>
            <small className="muted" style={{ fontSize: 11.5 }}>Added by the warehouse — shown to the customer once saved.</small>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminOrderDetail({ id, flash }: { id: string; flash: Flash }) {
  const { orders, setStatus, patchOrder, removeOrder } = useOrders();
  const { products } = useInventory();
  const { settings } = useSettings();
  const router = useRouter();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<OrderLine[]>([]);
  const [addId, setAddId] = useState("");
  const cur = orders.find((o) => o.ref === id) || null;

  if (!cur) {
    return (
      <>
        <button className="detail-back" onClick={() => router.push("/admin/orders")}>← All orders</button>
        <div className="empty"><div className="ei" aria-hidden="true"><Search /></div><h3>Order not found</h3><p>It may have been deleted.</p></div>
      </>
    );
  }

  const v = ov(cur);
  const exempt = cur.taxExempt === true;
  const tax = computeTax(cur.total, cur.taxExempt, settings.taxRate);
  const grand = cur.total + (cur.deliveryFee ?? 0) + tax - (cur.discount ?? 0);

  const startEdit = () => { setDraft(cur.lines.map((l) => ({ ...l }))); setAddId(""); setEditing(true); };
  const draftCases = draft.reduce((s, l) => s + l.qty, 0);
  const draftTotal = draft.reduce((s, l) => s + l.qty * l.price, 0);
  const setQty = (lid: number, d: number) => setDraft((ls) => ls.map((l) => (l.id === lid ? { ...l, qty: Math.max(1, l.qty + d) } : l)));
  const dropLine = (lid: number) => setDraft((ls) => ls.filter((l) => l.id !== lid));
  const addLine = () => {
    const p = products.find((x) => String(x.id) === addId);
    if (!p) return;
    if (draft.some((l) => l.id === p.id)) { flash("Already on this order"); return; }
    setDraft((ls) => [...ls, { id: p.id, name: p.name, qty: 1, price: p.price }]);
    setAddId("");
  };
  const saveItems = () => {
    if (!draft.length) { flash("An order needs at least one item"); return; }
    const total = draft.reduce((s, l) => s + l.qty * l.price, 0);
    const cases = draft.reduce((s, l) => s + l.qty, 0);
    patchOrder(cur.ref, { lines: draft, total, cases, tax: computeTax(total, cur.taxExempt, settings.taxRate) });
    setEditing(false);
    flash("Order items updated");
  };
  const toggleExempt = (next: boolean) => {
    patchOrder(cur.ref, { taxExempt: next, tax: computeTax(cur.total, next, settings.taxRate) });
    flash(next ? "Marked resale tax-exempt" : `${settings.taxLabel} applied`);
  };

  return (
    <>
      <button className="detail-back" onClick={() => router.push("/admin/orders")}>← All orders</button>
      <header className="adminbar">
        <div><h1>{cur.ref}</h1><p>{cur.store} · placed {new Date(cur.placed).toLocaleString()}</p></div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="ghost" size="sm" onClick={() => window.print()}>Print receipt</Button>
          {cur.status !== "Cancelled" && cur.status !== "Completed" && (
            <Button
              variant="ghost"
              size="sm"
              style={{ color: "var(--red)" }}
              onClick={async () => {
                if (await confirm({ title: "Cancel order?", message: `Order ${cur.ref} will be marked cancelled and removed from the active fulfilment queue.`, confirmLabel: "Cancel order", danger: true })) {
                  setStatus(cur.ref, "Cancelled"); flash("Order cancelled");
                }
              }}
            >
              Cancel order
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            style={{ color: "var(--red)" }}
            onClick={async () => {
              if (await confirm({ title: "Delete order?", message: `Order ${cur.ref} will be permanently removed.`, confirmLabel: "Delete order", danger: true })) {
                removeOrder(cur.ref); router.push("/admin/orders"); flash("Order deleted");
              }
            }}
          >
            Delete
          </Button>
        </div>
      </header>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="panel anim-in">
            <div className="panel-h"><h3>Fulfilment status</h3><span className="hint">Drives what the customer sees</span></div>
            <OrderTracker status={cur.status} />
          </div>
          <div className="panel anim-in">
            <div className="panel-h">
              <h3>Products ordered</h3>
              {editing
                ? <span className="hint">{draftCases} cases · {draft.length} items</span>
                : <Button variant="ghost" size="sm" onClick={startEdit}>Edit items</Button>}
            </div>

            {editing ? (
              <>
                <table className="invtable flat">
                  <thead><tr><th scope="col">Product</th><th className="r" scope="col">Qty</th><th className="r" scope="col">Unit</th><th className="r" scope="col">Line</th><th scope="col"></th></tr></thead>
                  <tbody>
                    {draft.map((l) => (
                      <tr key={l.id}>
                        <td className="pn"><div className="pn-cell"><span className="pn-thumb"><Image src={productImg(products.find((p) => p.id === l.id) ?? {})} alt="" fill sizes="30px" style={{ objectFit: "contain" }} /></span><div style={{ fontSize: 13.5 }}>{l.name}<div className="mono muted" style={{ fontSize: 11 }}>SW-{l.id}</div></div></div></td>
                        <td className="r">
                          <div className="qstep">
                            <button type="button" onClick={() => setQty(l.id, -1)} aria-label="Decrease">−</button>
                            <span className="mono">{l.qty}</span>
                            <button type="button" onClick={() => setQty(l.id, 1)} aria-label="Increase">+</button>
                          </div>
                        </td>
                        <td className="r mono">{m(l.price)}</td>
                        <td className="r mono">{m(l.qty * l.price)}</td>
                        <td className="r"><button type="button" className="ia del" onClick={() => dropLine(l.id)} aria-label="Remove line"><Close /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="addline">
                  <select value={addId} onChange={(e) => setAddId(e.target.value)} aria-label="Add product">
                    <option value="">+ Add a product…</option>
                    {products.filter((p) => !draft.some((l) => l.id === p.id)).map((p) => <option key={p.id} value={p.id}>{p.name} · {m(p.price)}</option>)}
                  </select>
                  <Button variant="ghost" size="sm" onClick={addLine} disabled={!addId}>Add</Button>
                </div>
                <div className="totals">
                  <div className="tl"><span>Subtotal · {draftCases} cases</span><span className="mono">{m(draftTotal)}</span></div>
                </div>
                <div className="modalbtns" style={{ marginTop: 14 }}>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={saveItems}>Save items</Button>
                </div>
              </>
            ) : (
              <>
                <table className="invtable flat">
                  <thead><tr><th scope="col">Product</th><th scope="col">Code</th><th className="r" scope="col">Qty</th><th className="r" scope="col">Unit price</th><th className="r" scope="col">Line total</th></tr></thead>
                  <tbody>
                    {cur.lines.map((l) => (
                      <tr key={l.id}>
                        <td className="pn"><div className="pn-cell"><span className="pn-thumb"><Image src={productImg(products.find((p) => p.id === l.id) ?? {})} alt="" fill sizes="30px" style={{ objectFit: "contain" }} /></span><span style={{ fontSize: 13.5 }}>{l.name}</span></div></td>
                        <td className="mono muted">SW-{l.id}</td>
                        <td className="r mono">{l.qty}</td>
                        <td className="r mono">{m(l.price)}</td>
                        <td className="r mono">{m(l.qty * l.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="totals">
                  <div className="tl"><span>Subtotal · {cur.cases} cases</span><span className="mono">{m(cur.total)}</span></div>
                  <div className="tl"><span>Discount{cur.discountReason ? ` · ${cur.discountReason}` : ""}</span><span className="mono">−{m(v.discount)}</span></div>
                  <div className="tl"><span>{exempt ? "Tax (resale exempt)" : `${settings.taxLabel} (${settings.taxRate}%)`}</span><span className="mono">{m(tax)}</span></div>
                  <div className="tl"><span>Delivery fee</span><span className="mono" style={{ color: v.deliveryFee ? "inherit" : "var(--green)" }}>{v.deliveryFee ? m(v.deliveryFee) : "Free"}</span></div>
                  <div className="tl grand"><span>Order total</span><b>{m(grand)}</b></div>
                </div>
              </>
            )}
          </div>
        </div>

        <aside className="detail-side">
          <div className="panel anim-in">
            <div className="panel-h"><h3>Fulfillment</h3><Badge tone={statusTone(cur.status)}>{cur.status}</Badge></div>
            <div className="kvs">
              <div className="kv2"><span>Order ID</span><b className="mono">{cur.ref}</b></div>
              <div className="kv2"><span>Tracking</span><b className="mono">{v.tracking}</b></div>
              <div className="kv2"><span>Method</span><b>{cur.fulfilment || "Next-day delivery"}</b></div>
              <div className="kv2"><span>Update status</span>
                {cur.status === "Cancelled" ? (
                  <Button variant="ghost" size="sm" onClick={() => { setStatus(cur.ref, "Pending"); flash("Order reinstated"); }}>Reinstate order</Button>
                ) : (
                  <select aria-label="Order status" className={`statussel s-${statusSlug(cur.status)}`} value={cur.status} onChange={(e) => { setStatus(cur.ref, e.target.value as OrderStatus); flash("Status updated"); }}>
                    {O_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                )}
              </div>
              <div className="kv2 col"><span>Message to customer</span>
                <textarea className="msgbox" rows={3} placeholder="e.g. Out for delivery — arriving before 2 PM." defaultValue={cur.adminNote || ""} key={cur.ref} onBlur={(e) => { const t = e.target.value.trim(); if (t !== (cur.adminNote || "")) { patchOrder(cur.ref, { adminNote: t || undefined }); flash("Message saved"); } }} />
                <small className="muted" style={{ fontSize: 11.5 }}>Shown on the customer&apos;s order page &amp; receipt.</small>
              </div>
            </div>
          </div>
          <div className="panel anim-in">
            <div className="panel-h"><h3>Payment</h3><Badge tone={payTone(v.paymentStatus)}>{v.paymentStatus}</Badge></div>
            <div className="kvs">
              <div className="kv2"><span>Terms</span><b>{cur.payment || "Net 15 terms"}</b></div>
              <div className="kv2"><span>Update payment</span>
                <select aria-label="Payment status" className={`paysel p-${v.paymentStatus.toLowerCase()}`} value={v.paymentStatus} onChange={(e) => { patchOrder(cur.ref, { paymentStatus: e.target.value as PayStatus }); flash("Payment updated"); }}>
                  {PAY_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <label className="taxtoggle">
                <input type="checkbox" checked={exempt} onChange={(e) => toggleExempt(e.target.checked)} />
                <span><b>Resale tax-exempt</b><small>{exempt ? "No sales tax on this order" : `${settings.taxLabel} ${settings.taxRate}% applied`}</small></span>
              </label>
            </div>
          </div>
          <OrderAdjust order={cur} patchOrder={patchOrder} taxRate={settings.taxRate} taxLabel={settings.taxLabel} flash={flash} />
          <div className="panel anim-in">
            <div className="panel-h"><h3>Addresses</h3></div>
            <div className="addrbox"><div className="al">Billing</div><p>{cur.store}<br />{v.billing}</p></div>
            <div className="addrbox"><div className="al">Shipping</div><p>{cur.store}<br />{v.shipping}</p></div>
            {cur.notes && <div className="addrbox"><div className="al">Notes</div><p>{cur.notes}</p></div>}
          </div>
        </aside>
      </div>
      <PrintReceipt order={cur} />
    </>
  );
}

/* =======================================================================
   CREATE ORDER (admin, on behalf of a customer)
   ======================================================================= */
export function AdminOrderCreate({ flash }: { flash: Flash }) {
  const router = useRouter();
  const { placeOrder } = useOrders();
  const { products } = useInventory();
  const { customers } = useCustomers(CUSTOMERS);
  const { settings } = useSettings();

  const [custId, setCustId] = useState(customers[0]?.id ?? "");
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [addId, setAddId] = useState("");
  const [fulfilment, setFulfilment] = useState("Next-day delivery");
  const [payment, setPayment] = useState("Net 15 terms");
  const [taxExempt, setTaxExempt] = useState(false);
  const [deliv, setDeliv] = useState("");
  const [discKind, setDiscKind] = useState<"amount" | "percent">("amount");
  const [discVal, setDiscVal] = useState("");
  const [discReason, setDiscReason] = useState("");

  const cust = customers.find((c) => c.id === custId);
  const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const cases = lines.reduce((s, l) => s + l.qty, 0);
  const tax = computeTax(subtotal, taxExempt, settings.taxRate);
  const deliveryFee = Math.max(0, Number(deliv) || 0);
  const discVnum = Number(discVal) || 0;
  const discount = Math.max(0, discKind === "percent" ? Math.round(subtotal * discVnum) / 100 : discVnum);
  const grand = subtotal + tax + deliveryFee - discount;

  const addLine = () => {
    const p = products.find((x) => String(x.id) === addId);
    if (!p) return;
    if (lines.some((l) => l.id === p.id)) { flash("Already on this order"); return; }
    setLines((ls) => [...ls, { id: p.id, name: p.name, qty: 1, price: p.price }]);
    setAddId("");
  };
  const setQty = (id: number, d: number) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, qty: Math.max(1, l.qty + d) } : l)));
  const drop = (id: number) => setLines((ls) => ls.filter((l) => l.id !== id));

  const create = () => {
    if (!cust) { flash("Pick a customer"); return; }
    if (!lines.length) { flash("Add at least one product"); return; }
    const isPickup = fulfilment.includes("pickup");
    const order: Order = {
      ref: "SW-" + Math.floor(4000 + Math.random() * 5000),
      placed: Date.now(),
      store: cust.store,
      lines, cases, total: subtotal, status: "Pending",
      payment, fulfilment,
      tracking: isPickup ? "PICKUP" : "1Z" + Math.floor(100000000 + Math.random() * 899999999) + "OH",
      deliveryFee, tax, discount,
      discountReason: discount > 0 ? (discReason.trim() || (discKind === "percent" ? `${discVnum}% off` : undefined)) : undefined,
      paymentStatus: payment.includes("Net") ? "Unpaid" : "Paid",
      billing: cust.address ?? cust.store, shipping: cust.address ?? cust.store,
      taxExempt,
    };
    placeOrder(order);
    commitStockForOrder(lines);
    flash("Order created");
    router.push(`/admin/orders/${order.ref}`);
  };

  return (
    <>
      <button className="detail-back" onClick={() => router.push("/admin/orders")}>← All orders</button>
      <header className="adminbar">
        <div><h1>New order</h1><p>Create an order on behalf of a trade account</p></div>
      </header>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="panel anim-in">
            <div className="panel-h"><h3>Customer</h3></div>
            <label className="field"><span>Trade account</span>
              <select value={custId} onChange={(e) => setCustId(e.target.value)}>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.store} · {c.id}{c.status !== "Active" ? ` (${c.status})` : ""}</option>)}
              </select>
            </label>
            {cust && <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>{cust.contact} · {cust.email}{cust.address ? ` · ${cust.address}` : ""}</p>}
          </div>

          <div className="panel anim-in">
            <div className="panel-h"><h3>Products</h3><span className="hint">{cases} cases · {lines.length} items</span></div>
            {lines.length ? (
              <table className="invtable flat">
                <thead><tr><th>Product</th><th className="r">Qty</th><th className="r">Unit</th><th className="r">Line</th><th></th></tr></thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id}>
                      <td className="pn"><div className="pn-cell"><span className="pn-thumb"><Image src={productImg(products.find((p) => p.id === l.id) ?? {})} alt="" fill sizes="30px" style={{ objectFit: "contain" }} /></span><div style={{ fontSize: 13.5 }}>{l.name}<div className="mono muted" style={{ fontSize: 11 }}>SW-{l.id}</div></div></div></td>
                      <td className="r"><div className="qstep"><button type="button" onClick={() => setQty(l.id, -1)}>−</button><span className="mono">{l.qty}</span><button type="button" onClick={() => setQty(l.id, 1)}>+</button></div></td>
                      <td className="r mono">{m(l.price)}</td>
                      <td className="r mono">{m(l.qty * l.price)}</td>
                      <td className="r"><button type="button" className="ia del" onClick={() => drop(l.id)} aria-label="Remove line"><Close /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="muted" style={{ fontSize: 14, padding: "6px 0 14px" }}>No products yet — add some below.</p>}
            <div className="addline">
              <select value={addId} onChange={(e) => setAddId(e.target.value)} aria-label="Add product">
                <option value="">+ Add a product…</option>
                {products.filter((p) => !lines.some((l) => l.id === p.id)).map((p) => <option key={p.id} value={p.id}>{p.name} · {m(p.price)}</option>)}
              </select>
              <Button variant="ghost" size="sm" onClick={addLine} disabled={!addId}>Add</Button>
            </div>
          </div>
        </div>

        <aside className="detail-side">
          <div className="panel anim-in">
            <div className="panel-h"><h3>Order setup</h3></div>
            <div className="kvs">
              <div className="kv2 col"><span>Fulfilment</span>
                <select value={fulfilment} onChange={(e) => setFulfilment(e.target.value)}><option>Next-day delivery</option><option>Cash &amp; carry pickup</option><option>Scheduled delivery</option></select>
              </div>
              <div className="kv2 col"><span>Payment</span>
                <select value={payment} onChange={(e) => setPayment(e.target.value)}><option>Net 15 terms</option><option>Net 30 terms</option><option>Card on delivery</option><option>Cash on delivery</option></select>
              </div>
              <label className="taxtoggle">
                <input type="checkbox" checked={taxExempt} onChange={(e) => setTaxExempt(e.target.checked)} />
                <span><b>Resale tax-exempt</b><small>{taxExempt ? "No sales tax" : `${settings.taxLabel} ${settings.taxRate}%`}</small></span>
              </label>
              <div className="kv2 col"><span>Delivery fee ($)</span>
                <input type="number" min={0} step="0.01" value={deliv} onChange={(e) => setDeliv(e.target.value)} placeholder="0.00" />
              </div>
              <div className="kv2 col"><span>Discount</span>
                <div className="discrow">
                  <select value={discKind} onChange={(e) => setDiscKind(e.target.value as "amount" | "percent")}><option value="amount">$ amount</option><option value="percent">% percent</option></select>
                  <input type="number" min={0} step="0.01" value={discVal} onChange={(e) => setDiscVal(e.target.value)} placeholder={discKind === "percent" ? "10" : "25.00"} />
                </div>
              </div>
              <div className="kv2 col"><span>Discount reason</span>
                <input value={discReason} onChange={(e) => setDiscReason(e.target.value)} placeholder="Loyalty, promo…" />
              </div>
            </div>
          </div>
          <div className="panel anim-in">
            <div className="panel-h"><h3>Summary</h3></div>
            <div className="totals">
              <div className="tl"><span>Subtotal · {cases} cases</span><span className="mono">{m(subtotal)}</span></div>
              {discount > 0 && <div className="tl"><span>Discount{discReason.trim() ? ` · ${discReason.trim()}` : discKind === "percent" ? ` · ${discVnum}%` : ""}</span><span className="mono">−{m(discount)}</span></div>}
              <div className="tl"><span>{taxExempt ? "Tax (resale exempt)" : `${settings.taxLabel} (${settings.taxRate}%)`}</span><span className="mono">{m(tax)}</span></div>
              <div className="tl"><span>Delivery fee</span><span className="mono" style={{ color: deliveryFee ? "inherit" : "var(--green)" }}>{deliveryFee ? m(deliveryFee) : "Free"}</span></div>
              <div className="tl grand"><span>Order total</span><b>{m(grand)}</b></div>
            </div>
            <div className="modalbtns" style={{ marginTop: 14 }}>
              <Button variant="ghost" size="sm" onClick={() => router.push("/admin/orders")}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={create}>Create order</Button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

export function OrdersTab() {
  const { orders, setStatus } = useOrders();
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
      <Head title="Orders" sub="Orders from the trade portal — open any order for the full receipt">
        <Button variant="primary" size="sm" onClick={() => router.push("/admin/orders/new")}>+ New order</Button>
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
          empty="No orders match."
          selectable
          selected={selected}
          onToggle={toggleSel}
          onToggleAll={toggleAllSel}
        />
      ) : rows.length === 0 ? (
        <div className="empty light"><div className="ei" aria-hidden="true"><Search /></div><h3>No orders match</h3></div>
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

/* =======================================================================
   CUSTOMERS / ACCOUNTS  (approval)
   ======================================================================= */
const EMPTY_INVITE = { store: "", contact: "", email: "", phone: "", city: "Cincinnati, OH", terms: "Net 15" };
export function CustomersTab({ flash }: { flash: Flash }) {
  const { customers, setStatus, update, add, remove } = useCustomers(CUSTOMERS);
  const { orders } = useOrders();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "Pending" | "Active" | "Hold">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");
  const [openId, setOpenId] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [inviting, setInviting] = useState(false);
  const [inv, setInv] = useState(EMPTY_INVITE);
  const [docEdit, setDocEdit] = useState(false);
  const [docDraft, setDocDraft] = useState({ business: "", tobacco: "" });
  const confirm = useConfirm();

  const sendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inv.store.trim() || !inv.email.trim()) { flash("Store name and email are required"); return; }
    add({
      id: "C-" + Math.floor(1300 + Math.random() * 700),
      store: inv.store.trim(), contact: inv.contact.trim(), email: inv.email.trim(),
      phone: inv.phone.trim(), city: inv.city, since: String(new Date().getFullYear()),
      status: "Pending", terms: inv.terms, applied: Date.now(),
    });
    setInv(EMPTY_INVITE); setInviting(false);
    flash("Invite sent — account pending");
  };

  const stats = customers.map((c) => {
    const theirs = orders.filter((o) => o.store === c.store);
    return { ...c, orders: theirs.length, spend: theirs.reduce((s, o) => s + o.total, 0), history: theirs };
  });
  const pending = stats.filter((c) => c.status === "Pending");
  const rows = (() => {
    const q = query.trim().toLowerCase();
    const list = stats.filter(
      (c) =>
        (filter === "all" || c.status === filter) &&
        (q === "" || c.store.toLowerCase().includes(q) || c.contact.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
    );
    return [...list].sort((a, b) => {
      switch (sort) {
        case "orders-desc": return b.orders - a.orders;
        case "spend-desc": return b.spend - a.spend;
        default: return a.store.localeCompare(b.store);
      }
    });
  })();
  const ACCT_STATUS_OPTS: ToolbarOption[] = [
    { value: "all", label: "All statuses" },
    { value: "Pending", label: "Pending" },
    { value: "Active", label: "Active" },
    { value: "Hold", label: "Hold" },
  ];
  const ACCT_SORT_OPTS: ToolbarOption[] = [
    { value: "name", label: "Store A–Z" },
    { value: "orders-desc", label: "Most orders" },
    { value: "spend-desc", label: "Highest spend" },
  ];
  const cur = stats.find((s) => s.id === openId) || null;

  const startEdit = () => { if (cur) { setDraft({ store: cur.store, contact: cur.contact, email: cur.email, phone: cur.phone || "", address: cur.address || "", terms: cur.terms || "Net 15" }); setEdit(true); } };
  const saveEdit = () => { if (cur) { update(cur.id, draft); setEdit(false); flash("Account updated"); } };

  /* ---------- full-page account detail ---------- */
  if (cur) {
    return (
      <>
        <button className="detail-back" onClick={() => { setOpenId(null); setEdit(false); }}>← All accounts</button>
        <header className="adminbar">
          <div><h1>{cur.store}</h1><p>{cur.id} · {cur.contact} · account since {cur.since}</p></div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Badge tone={acctTone(cur.status)}>{cur.status}</Badge>
            {!edit && <Button variant="ghost" size="sm" onClick={startEdit}>Edit</Button>}
            <Button variant="ghost" size="sm" style={{ color: "var(--red)" }} onClick={async () => { if (await confirm({ title: "Delete account?", message: `${cur.store} and its access will be removed.`, confirmLabel: "Delete account", danger: true })) { remove(cur.id); setOpenId(null); flash("Account deleted"); } }}>Delete</Button>
          </div>
        </header>

        <div className="detail-grid">
          <div className="detail-main">
            <div className="panel">
              <div className="panel-h"><h3>Store details</h3>{edit && <span className="hint">editing</span>}</div>
              {edit ? (
                <div className="formgrid" style={{ margin: 0 }}>
                  <label className="field full"><span>Store name</span><input value={draft.store} onChange={(e) => setDraft({ ...draft, store: e.target.value })} /></label>
                  <label className="field"><span>Contact</span><input value={draft.contact} onChange={(e) => setDraft({ ...draft, contact: e.target.value })} /></label>
                  <label className="field"><span>Email</span><input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></label>
                  <label className="field"><span>Phone</span><input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></label>
                  <label className="field"><span>Payment terms</span><input value={draft.terms} onChange={(e) => setDraft({ ...draft, terms: e.target.value })} /></label>
                  <label className="field full"><span>Address</span><input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></label>
                  <div className="full modalactions"><Button variant="ghost" onClick={() => setEdit(false)}>Cancel</Button><Button variant="primary" onClick={saveEdit}>Save changes</Button></div>
                </div>
              ) : (
                <div className="kvs two">
                  <div className="kv2"><span>Primary contact</span><b>{cur.contact}</b></div>
                  <div className="kv2"><span>Email</span><b>{cur.email}</b></div>
                  <div className="kv2"><span>Phone</span><b>{cur.phone || "—"}</b></div>
                  <div className="kv2"><span>Payment terms</span><b>{cur.terms || "Net 15"}</b></div>
                  <div className="kv2 full"><span>Address</span><b>{cur.address || cur.city}</b></div>
                </div>
              )}
            </div>

            <div className="panel">
              <div className="panel-h"><h3>Order history</h3><span className="hint">{cur.orders} orders · {m(cur.spend)}</span></div>
              {cur.history.length ? (
                <table className="invtable flat">
                  <thead><tr><th>Order</th><th>Date</th><th className="r">Cases</th><th className="r">Total</th><th>Status</th></tr></thead>
                  <tbody>
                    {cur.history.map((o) => (
                      <tr key={o.ref} className="clickrow" style={{ cursor: "pointer" }} onClick={() => router.push(`/admin/orders/${o.ref}`)}><td className="mono" style={{ fontWeight: 600 }}>{o.ref}</td><td className="muted" style={{ fontSize: 13 }}>{timeAgo(o.placed)}</td><td className="r mono">{o.cases}</td><td className="r mono">{m(o.total)}</td><td><Badge tone={statusTone(o.status)}>{o.status}</Badge></td></tr>
                    ))}
                  </tbody>
                </table>
              ) : <p style={{ color: "var(--slate)", fontSize: 14 }}>No orders on record yet.</p>}
            </div>
          </div>

          <aside className="detail-side">
            <div className="panel">
              <div className="panel-h"><h3>Approval</h3></div>
              <div className="modalactions" style={{ flexDirection: "column" }}>
                {cur.status !== "Active" && <Button fullWidth onClick={() => { setStatus(cur.id, "Active"); flash("Account approved"); }}>Approve account</Button>}
                {cur.status !== "Hold" && <Button variant="ghost" fullWidth onClick={() => { setStatus(cur.id, "Hold"); flash("Account on hold"); }}>Place on hold</Button>}
                {cur.status !== "Pending" && <Button variant="ghost" fullWidth onClick={() => { setStatus(cur.id, "Pending"); flash("Marked pending"); }}>Mark pending</Button>}
              </div>
            </div>
            <div className="panel">
              <div className="panel-h"><h3>Verification documents</h3>
                {docEdit
                  ? <span className="hint">editing</span>
                  : <Button variant="ghost" size="sm" onClick={() => { setDocDraft({ business: cur.businessLicense || "", tobacco: cur.tobaccoLicense || "" }); setDocEdit(true); }}>Edit</Button>}
              </div>
              {docEdit ? (
                <div className="formgrid" style={{ margin: 0 }}>
                  <label className="field full"><span>Business license #</span><input value={docDraft.business} onChange={(e) => setDocDraft({ ...docDraft, business: e.target.value })} /></label>
                  <label className="field full"><span>Tobacco license #</span><input value={docDraft.tobacco} onChange={(e) => setDocDraft({ ...docDraft, tobacco: e.target.value })} /></label>
                  <div className="full modalactions"><Button variant="ghost" onClick={() => setDocEdit(false)}>Cancel</Button><Button variant="primary" onClick={() => { update(cur.id, { businessLicense: docDraft.business.trim() || undefined, tobaccoLicense: docDraft.tobacco.trim() || undefined }); setDocEdit(false); flash("Documents updated"); }}>Save</Button></div>
                </div>
              ) : (
                <div className="doclist">
                  <div className="docchip"><span className="di" aria-hidden="true"><Check /></span><div><div className="dn">Business license</div><div className="ds mono">{cur.businessLicense || "—"}</div></div></div>
                  <div className="docchip"><span className="di" aria-hidden="true"><Check /></span><div><div className="dn">Tobacco license</div><div className="ds mono">{cur.tobaccoLicense || "—"}</div></div></div>
                  <div className="docchip"><span className="di" aria-hidden="true"><Check /></span><div><div className="dn">Age verification</div><div className="ds">21+ confirmed</div></div></div>
                  {(cur.docs || []).map((d, i) => (
                    <div className="docchip" key={i}><span className="di" aria-hidden="true"><Paperclip /></span><div><div className="dn">{d.label}</div><div className="ds">uploaded {timeAgo(d.uploaded)}</div></div></div>
                  ))}
                </div>
              )}
              <label className="btn btn-ghost btn-sm uploadbtn" style={{ marginTop: 14 }}>
                <Paperclip /> Upload document
                <input type="file" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { update(cur.id, { docs: [...(cur.docs || []), { label: f.name, name: f.name, uploaded: Date.now() }] }); flash("Document uploaded"); } e.target.value = ""; }} />
              </label>
            </div>
          </aside>
        </div>
      </>
    );
  }

  /* ---------- list ---------- */
  const acctColumns: Column<(typeof stats)[number]>[] = [
    { key: "store", header: "Store", render: (c) => (
      <div className="prodcell">
        <span className="avatar">{c.store.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</span>
        <div><div className="pn">{c.store}</div><div className="mono muted" style={{ fontSize: 11 }}>{c.id} · {c.email}</div></div>
      </div>
    ) },
    { key: "contact", header: "Contact", render: (c) => <span style={{ fontSize: 13 }}>{c.contact}</span> },
    { key: "city", header: "Location", render: (c) => <span style={{ fontSize: 13 }}>{c.city}</span> },
    { key: "orders", header: "Orders", align: "right", render: (c) => <span className="mono">{c.orders}</span> },
    { key: "spend", header: "Spend", align: "right", render: (c) => <span className="mono">{m(c.spend)}</span> },
    { key: "status", header: "Status", align: "right", render: (c) => <Badge tone={acctTone(c.status)}>{c.status}</Badge> },
    { key: "action", header: "", align: "right", render: (c) => (
      <Menu
        label={`Actions for ${c.store}`}
        items={[
          { label: "Open account", onSelect: () => setOpenId(c.id) },
          ...(c.status !== "Active" ? [{ label: "Approve account", onSelect: () => { setStatus(c.id, "Active"); flash("Account approved"); } }] : []),
          ...(c.status !== "Hold" ? [{ label: "Place on hold", onSelect: () => { setStatus(c.id, "Hold"); flash("Account on hold"); } }] : []),
        ]}
      />
    ) },
  ];

  return (
    <>
      <Head title="Trade accounts" sub="Review applications, approve stores, then they order in the portal">
        <Button variant="primary" size="sm" onClick={() => setInviting(true)}>+ Invite account</Button>
      </Head>
      <FlowGuide steps={CUSTOMER_FLOW} active="review" title="Customer onboarding" />
      <div className="kpis">
        <KpiCard label="Total accounts" value={customers.length} foot="on file" />
        <KpiCard label="Active" value={stats.filter((c) => c.status === "Active").length} foot="cleared to order" />
        <KpiCard tone="danger" label="Pending approval" value={pending.length} foot="submitted from the site" />
        <KpiCard label="Lifetime sales" value={k(stats.reduce((s, c) => s + c.spend, 0))} foot="across accounts" />
      </div>
      <ListToolbar
        search={{ value: query, onChange: setQuery, placeholder: "Search store, contact or email…" }}
        filters={[{ label: "Status", value: filter, onChange: (v) => setFilter(v as "all" | "Pending" | "Active" | "Hold"), options: ACCT_STATUS_OPTS }]}
        sort={{ value: sort, onChange: setSort, options: ACCT_SORT_OPTS }}
      />
      <DataTable
        columns={acctColumns}
        rows={rows}
        rowKey={(c) => c.id}
        onRowClick={(c) => setOpenId(c.id)}
        rowClassName={(c) => (c.status === "Pending" ? "rowflag" : undefined)}
        empty="No accounts match."
      />

      {inviting && (
        <div className="modal-overlay" onClick={() => setInviting(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={sendInvite}>
            <h3>Invite a trade account</h3>
            <p className="auth-sub" style={{ marginTop: 0 }}>They&apos;ll be created as Pending until verified and approved.</p>
            <div className="formgrid">
              <label className="field full"><span>Store name *</span><input value={inv.store} onChange={(e) => setInv({ ...inv, store: e.target.value })} required placeholder="Jay's Stop & Shop" /></label>
              <label className="field"><span>Contact</span><input value={inv.contact} onChange={(e) => setInv({ ...inv, contact: e.target.value })} placeholder="Full name" /></label>
              <label className="field"><span>Email *</span><input type="email" value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} required placeholder="buyer@store.com" /></label>
              <label className="field"><span>Phone</span><input value={inv.phone} onChange={(e) => setInv({ ...inv, phone: e.target.value })} placeholder="(513) 555-0000" /></label>
              <label className="field"><span>City</span><input value={inv.city} onChange={(e) => setInv({ ...inv, city: e.target.value })} /></label>
              <label className="field"><span>Payment terms</span><select value={inv.terms} onChange={(e) => setInv({ ...inv, terms: e.target.value })}><option>Net 15</option><option>Net 30</option><option>COD</option></select></label>
            </div>
            <div className="modalbtns"><Button variant="ghost" type="button" onClick={() => setInviting(false)}>Cancel</Button><Button variant="primary" type="submit">Send invite</Button></div>
          </form>
        </div>
      )}
    </>
  );
}

/* =======================================================================
   USERS & ROLES
   ======================================================================= */
