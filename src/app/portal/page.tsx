"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { fmt } from "@/lib/store";
import { Package, GridView, Arrow } from "@/components/Icons";
import { Button, EmptyState, KpiCard, Skeleton } from "@/components/ui";
import { AreaTrend } from "@/components/ui/AreaTrend";
import { usePortal } from "./PortalShell";
import PosterCards from "./PosterCards";

const WEEK = 7 * 24 * 60 * 60 * 1000;

export default function PortalDashboard() {
  const { products, myOrders, ready, error, reload, setDept, depts, counts } = usePortal();

  const freshCount = useMemo(
    () => products.filter((p) => Date.now() - (p.created ?? 0) < WEEK).length,
    [products]
  );

  /* customer spend over the last 6 months for the area chart */
  const spendData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }).map((_, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      const spend = myOrders
        .filter((o) => { const od = new Date(o.placed); return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth(); })
        .reduce((s, o) => s + o.total, 0);
      return { label: d.toLocaleDateString("en-US", { month: "short" }), spend };
    });
  }, [myOrders]);

  const openOrders = myOrders.filter((o) => o.status !== "Completed" && o.status !== "Cancelled").length;
  const lifetime = myOrders.reduce((s, o) => s + o.total, 0);
  const casesOrdered = myOrders.reduce((s, o) => s + o.cases, 0);

  if (!ready) {
    return (
      <div className="pdash">
        <div style={{ marginBottom: 26 }}><Skeleton height={360} radius={18} /></div>
        <div className="kpis rise-in">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={104} radius={16} />)}</div>
        <div className="catgrid">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={150} radius={14} />)}</div>
      </div>
    );
  }

  if (error && !products.length && !myOrders.length) {
    return (
      <EmptyState
        title="Couldn't load"
        description="There was a problem loading your data."
        action={<Button variant="ghost" onClick={reload}>Retry</Button>}
      />
    );
  }

  return (
    <div className="pdash rise-in">
      {/* full-image promotional posters */}
      <PosterCards />

      {/* customer stats */}
      <div className="kpis">
        <KpiCard tone="accent" label="Open orders" value={openOrders} foot={openOrders ? "in fulfillment" : "all caught up"} />
        <KpiCard label="Lifetime spend" value={`$${fmt(lifetime)}`} foot={`${myOrders.length} order${myOrders.length !== 1 ? "s" : ""} placed`} />
        <KpiCard label="Cases ordered" value={casesOrdered} foot="all time" />
        <KpiCard label="New this week" value={freshCount} foot="fresh arrivals" />
      </div>

      {/* spending trend — shadcn area chart */}
      {myOrders.length > 0 && (
        <section className="dash-sec">
          <div className="dash-sec-h"><h3>Your spending</h3><span className="dash-sec-note">Last 6 months</span></div>
          <div className="panel">
            <AreaTrend
              data={spendData}
              xKey="label"
              series={[{ key: "spend", label: "Spend", color: "var(--chart-1)" }]}
              height={220}
              yFormatter={(v) => `$${fmt(v)}`}
            />
          </div>
        </section>
      )}

      {/* shop by category — clean grid, no horizontal scrolling */}
      {depts.length > 0 && (
        <section className="dash-sec">
          <div className="dash-sec-h"><h3><GridView /> Shop by category</h3><Link className="viewall" href="/portal/products" onClick={() => setDept("all")}>Browse all products <Arrow /></Link></div>
          <div className="catgrid">
            {depts.map((d) => (
              <Link key={d.key} href="/portal/products" onClick={() => setDept(d.key)} className="cattile">
                {d.image
                  ? <Image src={d.image} alt="" fill sizes="(max-width: 620px) 50vw, 240px" style={{ objectFit: "cover" }} />
                  : <span className="cattile-ph" aria-hidden="true"><Package /></span>}
                <span className="cattile-t">{d.name}<em>{counts[d.key] ?? 0} SKUs</em></span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
