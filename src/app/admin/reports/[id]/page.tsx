"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useMemo } from "react";
import { useOrders, CONTACT } from "@/lib/store";
import { KpiCard, Badge, Skeleton } from "@/components/ui";
import { ArrowLeft, Search, Printer, Coin, Receipt, Truck, Card } from "@/components/Icons";
import { m } from "@/features/admin/shared";
import { statusTone } from "@/features/admin/sales/_shared";

const DAY = 86400000;
const startOfDay = (ts: number) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const longDay = (ts: number) => new Date(ts).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const clock = (ts: number) => new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/* A single day's sales — every order placed that day, reachable at
   /admin/reports/<YYYY-MM-DD> (the Daily sales rows link here). */
export default function AdminReportDayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { orders, ready } = useOrders();

  const dayStart = useMemo(() => {
    // id is the local calendar date (YYYY-MM-DD) that Daily sales linked with.
    const t = new Date(`${id}T00:00:00`).getTime();
    return Number.isNaN(t) ? NaN : startOfDay(t);
  }, [id]);

  const dayOrders = useMemo(() =>
    Number.isNaN(dayStart) ? [] : orders
      .filter((o) => o.placed >= dayStart && o.placed < dayStart + DAY)
      .sort((a, b) => b.placed - a.placed),
  [orders, dayStart]);

  const totals = useMemo(() => ({
    revenue: dayOrders.reduce((s, o) => s + o.total, 0),
    cases: dayOrders.reduce((s, o) => s + o.cases, 0),
    aov: dayOrders.length ? dayOrders.reduce((s, o) => s + o.total, 0) / dayOrders.length : 0,
  }), [dayOrders]);

  const printDay = () => {
    if (!dayOrders.length) return;
    const esc = (v: string | number) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
    const rows = dayOrders.map((o) => `<tr><td>${esc(clock(o.placed))}</td><td>${esc(o.ref)}</td><td>${esc(o.store)}</td><td>${esc(o.status)}</td><td class="r">${esc(o.cases)}</td><td class="r">${esc(m(o.total))}</td></tr>`).join("");
    const doc = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Sales ${esc(id)} · ${esc(CONTACT.legalName)}</title>
<style>*{box-sizing:border-box;margin:0}body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1c2027;background:#eef0f2}
.bar{position:sticky;top:0;display:flex;gap:10px;justify-content:flex-end;align-items:center;padding:12px 20px;background:#fff;border-bottom:1px solid #e4e7ee}
.bar .sp{margin-right:auto;font-weight:700}.bar button{font:inherit;font-weight:600;padding:9px 16px;border-radius:9px;border:1.5px solid #e4e7ee;background:#fff;cursor:pointer}
.bar button.pr{background:#b05a00;border-color:#b05a00;color:#fff}
.sheet{max-width:900px;margin:22px auto;background:#fff;padding:36px 40px 30px;box-shadow:0 10px 34px -14px rgba(14,19,64,.28)}
.lh{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:2px solid #1c2027;padding-bottom:16px}
.co{font-weight:800;font-size:20px}.ad{font-size:12px;color:#5a6270;margin-top:5px;line-height:1.5}.rt{text-align:right}.rtt{font-weight:700;font-size:16px}.rtf{font-size:12px;color:#5a6270;margin-top:5px}
.kpis{display:flex;gap:32px;flex-wrap:wrap;margin:22px 0 6px}.kpis .k span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#5a6270}.kpis .k b{font-size:22px;font-weight:800}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:14px}th,td{text-align:left;padding:9px 10px;border-bottom:1px solid #e8ebf0}th{font-size:10.5px;text-transform:uppercase;letter-spacing:.5px;color:#5a6270;border-bottom:2px solid #cfd5de}td.r,th.r{text-align:right;font-variant-numeric:tabular-nums}
.fo{margin-top:22px;font-size:11px;color:#8a909c;text-align:center}
@media print{.bar{display:none}body{background:#fff}.sheet{box-shadow:none;margin:0;max-width:none;padding:0}@page{margin:14mm}}</style></head>
<body><div class="bar"><span class="sp">Sales · ${esc(longDay(dayStart))}</span><button onclick="window.close()">&larr; Back</button><button class="pr" onclick="window.print()">Print</button></div>
<div class="sheet"><div class="lh"><div><div class="co">${esc(CONTACT.legalName)}</div><div class="ad">${esc(CONTACT.address1)}, ${esc(CONTACT.address2)}<br>${esc(CONTACT.phone)} · ${esc(CONTACT.email)}</div></div>
<div class="rt"><div class="rtt">Daily sales</div><div class="rtf">${esc(longDay(dayStart))}</div></div></div>
<div class="kpis"><div class="k"><span>Orders</span><b>${dayOrders.length}</b></div><div class="k"><span>Cases</span><b>${totals.cases}</b></div><div class="k"><span>Revenue</span><b>${esc(m(totals.revenue))}</b></div><div class="k"><span>Avg order</span><b>${esc(m(totals.aov))}</b></div></div>
<table><thead><tr><th>Time</th><th>Order</th><th>Customer</th><th>Status</th><th class="r">Cases</th><th class="r">Total</th></tr></thead><tbody>${rows}<tr style="font-weight:800;border-top:2px solid #cfd5de"><td colspan="4">Total</td><td class="r">${totals.cases}</td><td class="r">${esc(m(totals.revenue))}</td></tr></tbody></table>
<div class="fo">${esc(CONTACT.legalName)} · daily sales report</div></div></body></html>`;
    const w = window.open("", "_blank", "width=1000,height=820");
    if (!w) return;
    w.document.open(); w.document.write(doc); w.document.close(); w.focus();
  };

  // Bad date in the URL — nothing to show.
  if (Number.isNaN(dayStart)) {
    return (
      <>
        <Link className="detail-back" href="/admin/reports"><ArrowLeft /> All reports</Link>
        <div className="empty"><div className="ei" aria-hidden="true"><Search /></div><h3>That day isn&apos;t valid</h3><p>Open a day from the Daily sales report to see its orders.</p></div>
      </>
    );
  }

  if (!ready) {
    return (
      <>
        <Link className="detail-back" href="/admin/reports"><ArrowLeft /> All reports</Link>
        <header className="adminbar"><div><Skeleton width={280} height={26} /><Skeleton width={180} height={14} /></div></header>
        <div className="kpis"><Skeleton width="100%" height={92} /><Skeleton width="100%" height={92} /><Skeleton width="100%" height={92} /></div>
        <div className="panel" style={{ marginTop: 18 }}><Skeleton width="100%" height={200} /></div>
      </>
    );
  }

  return (
    <>
      <Link className="detail-back" href="/admin/reports"><ArrowLeft /> All reports</Link>
      <header className="adminbar">
        <div>
          <h1>{longDay(dayStart)}</h1>
          <p>{dayOrders.length} order{dayOrders.length === 1 ? "" : "s"} placed this day</p>
        </div>
        {dayOrders.length > 0 && (
          <button className="btn btn-primary btn-sm" onClick={printDay}><Printer /> Print day</button>
        )}
      </header>

      <div className="kpis">
        <KpiCard tone="accent" label="Revenue" value={m(totals.revenue)} icon={<Coin />} foot="this day" />
        <KpiCard label="Orders" value={dayOrders.length} icon={<Receipt />} foot="this day" />
        <KpiCard label="Cases" value={totals.cases} icon={<Truck />} foot="this day" />
        <KpiCard label="Avg order" value={m(totals.aov)} icon={<Card />} foot="per order" />
      </div>

      <div className="panel anim-in" style={{ marginTop: 18 }}>
        <div className="panel-h"><h3>Orders</h3><span className="hint">{dayOrders.length} on {longDay(dayStart)}</span></div>
        {dayOrders.length ? (
          <div className="tablewrap">
            <table className="invtable flat reptable">
              <thead><tr><th>Time</th><th>Order</th><th>Customer</th><th>Status</th><th className="r">Cases</th><th className="r">Total</th></tr></thead>
              <tbody>
                {dayOrders.map((o) => (
                  <tr key={o.ref} className="clickrow" onClick={() => router.push(`/admin/orders/${o.ref}`)} tabIndex={0} role="button" aria-label={`Open order ${o.ref}`} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(`/admin/orders/${o.ref}`); } }}>
                    <td className="muted mono" style={{ fontSize: 12 }}>{clock(o.placed)}</td>
                    <td className="mono" style={{ fontWeight: 600 }}>{o.ref}</td>
                    <td style={{ fontWeight: 600 }}>{o.store}</td>
                    <td><Badge tone={statusTone(o.status)}>{o.status}</Badge></td>
                    <td className="r mono">{o.cases}</td>
                    <td className="r mono">{m(o.total)}</td>
                  </tr>
                ))}
                <tr className="totalrow"><td colSpan={4}><b>Total</b></td><td className="r mono"><b>{totals.cases}</b></td><td className="r mono"><b>{m(totals.revenue)}</b></td></tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty"><div className="ei" aria-hidden="true"><Search /></div><h3>No orders this day</h3><p>Nothing was placed on {longDay(dayStart)}.</p></div>
        )}
      </div>
    </>
  );
}
