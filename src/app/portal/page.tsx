"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fmt, statusSlug } from "@/lib/store";
import { usePromotions } from "@/lib/wms";
import { Package } from "@/components/Icons";
import { EmptyState, KpiCard } from "@/components/ui";
import { usePortal } from "./PortalShell";
import ProductCard from "./ProductCard";
import { ago } from "./meta";

export default function PortalDashboard() {
  const { products, myOrders, STORE } = usePortal();
  const { promos } = usePromotions();
  const ads = promos.filter((p) => p.active);
  const [slide, setSlide] = useState(0);
  const newArrivals = [...products].sort((a, b) => (b.created ?? 0) - (a.created ?? 0)).slice(0, 10);

  useEffect(() => {
    if (ads.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % ads.length), 5000);
    return () => clearInterval(t);
  }, [ads.length]);

  return (
    <>
      {ads.length > 0 && (
        <div className="pcarousel" aria-label="Offers and new arrivals">
          {ads.map((o, i) => (
            <div key={o.id} className={`pcslide ${i === slide % ads.length ? "on" : ""}`}>
              <Image src={o.image} alt="" fill sizes="100vw" style={{ objectFit: "cover" }} priority={i === 0} />
              <div className="pctext"><div className="pctag">{o.tag}</div><h3>{o.title}</h3><p>{o.subtitle}</p></div>
            </div>
          ))}
          <div className="pcdots">{ads.map((o, i) => <button key={o.id} className={i === slide % ads.length ? "on" : ""} onClick={() => setSlide(i)} aria-label={o.tag} />)}</div>
        </div>
      )}

      <div className="kpis rise-in">
        <KpiCard tone="accent" label="Open orders" value={myOrders.filter((o) => o.status !== "Completed").length} foot="in fulfillment" />
        <KpiCard label="Orders placed" value={myOrders.length} foot="all time" />
        <KpiCard label="Lifetime spend" value={`$${fmt(myOrders.reduce((s, o) => s + o.total, 0))}`} foot="across orders" />
        <KpiCard label="Cases ordered" value={myOrders.reduce((s, o) => s + o.cases, 0)} foot="all time" />
      </div>

      <section className="catrow">
        <div className="catrow-head"><h3>New arrivals <span className="cnt">just landed</span></h3><Link className="viewall" href="/portal/products">Browse all →</Link></div>
        <div className="catrow-scroll">{newArrivals.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      </section>

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
