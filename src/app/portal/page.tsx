"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DEPTS, fmt, statusSlug } from "@/lib/store";
import { usePromotions } from "@/lib/wms";
import { Package, Sparkles } from "@/components/Icons";
import { EmptyState, KpiCard } from "@/components/ui";
import { usePortal } from "./PortalShell";
import ProductCard from "./ProductCard";
import { ago } from "./meta";

const WEEK = 7 * 24 * 60 * 60 * 1000;

export default function PortalDashboard() {
  const { products, myOrders, STORE, setDept } = usePortal();
  const { promos } = usePromotions();
  const ads = promos.filter((p) => p.active);
  const [slide, setSlide] = useState(0);

  const newArrivals = useMemo(
    () => [...products].sort((a, b) => (b.created ?? 0) - (a.created ?? 0)).slice(0, 12),
    [products]
  );
  const freshCount = useMemo(
    () => products.filter((p) => Date.now() - (p.created ?? 0) < WEEK).length,
    [products]
  );
  const deptRows = useMemo(
    () => DEPTS.map((d) => ({ d, items: products.filter((p) => p.dep === d.key) })).filter((r) => r.items.length).slice(0, 4),
    [products]
  );

  const openOrders = myOrders.filter((o) => o.status !== "Completed" && o.status !== "Cancelled").length;
  const lifetime = myOrders.reduce((s, o) => s + o.total, 0);
  const casesOrdered = myOrders.reduce((s, o) => s + o.cases, 0);

  useEffect(() => {
    if (ads.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % ads.length), 5000);
    return () => clearInterval(t);
  }, [ads.length]);

  return (
    <>
      {/* hero — promotions & new-arrival posters */}
      {ads.length > 0 && (
        <div className="pcarousel" aria-label="Offers and new arrivals" aria-roledescription="carousel">
          {ads.map((o, i) => (
            <div key={o.id} className={`pcslide ${i === slide % ads.length ? "on" : ""}`} aria-hidden={i !== slide % ads.length}>
              <Image src={o.image} alt="" fill sizes="100vw" style={{ objectFit: "cover" }} priority={i === 0} />
              <div className="pctext">
                <div className="pctag">{o.tag}</div>
                <h3>{o.title}</h3>
                <p>{o.subtitle}</p>
                <Link href="/portal/products" className="pc-cta">Shop now →</Link>
              </div>
            </div>
          ))}
          <div className="pcdots">{ads.map((o, i) => <button key={o.id} className={i === slide % ads.length ? "on" : ""} onClick={() => setSlide(i)} aria-label={`Show ${o.tag}`} />)}</div>
        </div>
      )}

      {/* customer stats */}
      <div className="kpis rise-in">
        <KpiCard tone="accent" label="Open orders" value={openOrders} foot={openOrders ? "in fulfillment" : "all caught up"} />
        <KpiCard label="Lifetime spend" value={`$${fmt(lifetime)}`} foot={`${myOrders.length} order${myOrders.length !== 1 ? "s" : ""} placed`} />
        <KpiCard label="Cases ordered" value={casesOrdered} foot="all time" />
        <KpiCard label="New this week" value={freshCount} foot="fresh arrivals" />
      </div>

      {/* new arrivals — front and centre */}
      <section className="catrow">
        <div className="catrow-head"><h3><Sparkles /> New arrivals <span className="cnt">just landed</span></h3><Link className="viewall" href="/portal/products">Browse all →</Link></div>
        <div className="catrow-scroll">{newArrivals.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      </section>

      {/* promotions / offers */}
      {ads.length > 0 && (
        <section className="catrow">
          <div className="catrow-head"><h3>Offers &amp; promotions</h3></div>
          <div className="promorow">
            {ads.map((o) => (
              <Link key={o.id} href="/portal/products" className="promotile">
                <Image src={o.image} alt="" fill sizes="(max-width: 880px) 100vw, 33vw" style={{ objectFit: "cover" }} />
                <div className="promotile-t"><span className="ptag">{o.tag}</span><h4>{o.title}</h4></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* shop by department */}
      {deptRows.map(({ d, items }) => (
        <section className="catrow" key={d.key}>
          <div className="catrow-head"><h3>{d.name} <span className="cnt">{items.length} SKUs</span></h3><Link className="viewall" href="/portal/products" onClick={() => setDept(d.key)}>View all →</Link></div>
          <div className="catrow-scroll">{items.slice(0, 10).map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      ))}

      {/* recent orders */}
      <section className="catrow">
        <div className="catrow-head"><h3>Recent orders</h3><Link className="viewall" href="/portal/orders">View all →</Link></div>
        <div className="panel" style={{ padding: 4 }}>
          {myOrders.length ? myOrders.slice(0, 5).map((o) => (
            <Link key={o.ref} className="orow" href={`/portal/orders/${o.ref}`}>
              <div><div className="oref mono">{o.ref}</div><div className="osub">{o.cases} cases · {ago(o.placed)}</div></div>
              <span className={`pobadge s-${statusSlug(o.status)}`}>{o.status}</span>
              <span className="oamt mono">${fmt(o.total)}</span>
            </Link>
          )) : <EmptyState icon={<Package />} title="No orders yet" description="Build your first order from Products." />}
        </div>
      </section>
    </>
  );
}
