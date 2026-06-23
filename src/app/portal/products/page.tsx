"use client";

import { useMemo } from "react";
import { DEPTS } from "@/lib/store";
import { usePortal } from "../PortalShell";
import ProductCard from "../ProductCard";

export default function PortalProducts() {
  const { products, ready, dept, setDept, sub, setSub, query, counts } = usePortal();

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

  return (
    <>
      <div className="chips">
        <button className={`chip ${dept === "all" ? "on" : ""}`} onClick={() => { setDept("all"); setSub(""); }}>All <span className="c">{counts.all}</span></button>
        {DEPTS.map((d) => (
          <button key={d.key} className={`chip ${dept === d.key ? "on" : ""}`} onClick={() => { setDept(d.key); setSub(""); }}>{d.name} <span className="c">{counts[d.key]}</span></button>
        ))}
      </div>

      {!ready ? (
        <div className="empty"><div className="ei">⏳</div><h3>Loading catalog…</h3></div>
      ) : dept === "all" && !query.trim() ? (
        DEPTS.map((d) => {
          const items = products.filter((p) => p.dep === d.key);
          if (!items.length) return null;
          return (
            <section className="catrow" key={d.key}>
              <div className="catrow-head"><h3>{d.name} <span className="cnt">{items.length} SKUs</span></h3><button className="viewall" onClick={() => { setDept(d.key); setSub(""); }}>View all →</button></div>
              <div className="catrow-scroll">{items.slice(0, 10).map((p) => <ProductCard key={p.id} p={p} />)}</div>
            </section>
          );
        })
      ) : !list.length ? (
        <div className="empty"><div className="ei">🔍</div><h3>No items match that search</h3><p>Try a different term or clear the filter.</p></div>
      ) : (
        <div className="pgrid">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      )}
    </>
  );
}
