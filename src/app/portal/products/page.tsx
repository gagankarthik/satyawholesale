"use client";

import { useMemo } from "react";
import { DEPTS, DEPT_BG, fmt, type Product } from "@/lib/store";
import { Search, Bag } from "@/components/Icons";
import { Button, EmptyState, Spinner } from "@/components/ui";
import { usePortal } from "../PortalShell";
import ProductCard from "../ProductCard";
import { DEPT_COLOR, DEPT_ICON } from "../meta";

export default function PortalProducts() {
  const { products, ready, dept, setDept, sub, query, cart, changeQty, cases } = usePortal();

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const s = sub.toLowerCase();
    return products.filter(
      (p) =>
        (dept === "all" || p.dep === dept) &&
        (s === "" || p.name.toLowerCase().includes(s)) &&
        (q === "" || p.name.toLowerCase().includes(q) || String(p.id).includes(q))
    );
  }, [products, dept, sub, query]);

  const latest = useMemo(
    () => [...products].sort((a, b) => (b.created ?? 0) - (a.created ?? 0)).slice(0, 12),
    [products]
  );

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const p = products.find((x) => x.id === Number(id));
          return p ? { p, qty } : null;
        })
        .filter(Boolean) as { p: Product; qty: number }[],
    [cart, products]
  );
  const subtotal = cartLines.reduce((s, l) => s + l.qty * l.p.price, 0);

  const browse = dept === "all" && !query.trim();

  return (
    <>
      {cartLines.length > 0 && (
        <div className="ordertray fade-in" role="region" aria-label="Your order so far">
          <div className="ot-head">
            <div className="ot-title">
              <Bag />
              <b>Your order</b>
              <span className="ot-sub">{cases} case{cases !== 1 ? "s" : ""} · {cartLines.length} item{cartLines.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="ot-total mono">${fmt(subtotal)}</div>
            <Button href="/portal/cart" variant="primary" size="sm">Review &amp; checkout →</Button>
          </div>
          <div className="ot-items">
            {cartLines.map(({ p, qty }) => {
              const Ic = DEPT_ICON[p.dep];
              return (
                <div className="ot-chip" key={p.id}>
                  <span className="ot-th" style={{ background: DEPT_BG[p.dep], color: DEPT_COLOR[p.dep] }}><Ic /></span>
                  <div className="ot-meta">
                    <span className="ot-nm">{p.name}</span>
                    <span className="ot-px mono">${fmt(qty * p.price)}</span>
                  </div>
                  <div className="ot-ctl">
                    <button onClick={() => changeQty(p.id, -1)} aria-label={qty > 1 ? "Remove one case" : `Remove ${p.name}`}>−</button>
                    <span className="mono">{qty}</span>
                    <button onClick={() => changeQty(p.id, 1)} disabled={qty >= p.stock} aria-label="Add one case">+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!ready ? (
        <EmptyState icon={<Spinner />} title="Loading catalog…" />
      ) : browse ? (
        <>
          <section className="catrow">
            <div className="catrow-head"><h3>Latest arrivals <span className="cnt">just landed</span></h3></div>
            <div className="catrow-scroll">{latest.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          </section>
          {DEPTS.map((d) => {
            const items = products.filter((p) => p.dep === d.key);
            if (!items.length) return null;
            return (
              <section className="catrow" key={d.key}>
                <div className="catrow-head"><h3>{d.name} <span className="cnt">{items.length} SKUs</span></h3><button className="viewall" onClick={() => setDept(d.key)}>View all →</button></div>
                <div className="catrow-scroll">{items.slice(0, 10).map((p) => <ProductCard key={p.id} p={p} />)}</div>
              </section>
            );
          })}
        </>
      ) : !list.length ? (
        <EmptyState icon={<Search />} title="No items match that search" description="Try a different term or clear the filter." />
      ) : (
        <div className="pgrid">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      )}
    </>
  );
}
