"use client";

import { useMemo } from "react";
import { DEPTS, deptName } from "@/lib/store";
import { Search } from "@/components/Icons";
import { EmptyState, Spinner } from "@/components/ui";
import { usePortal } from "../PortalShell";
import ProductCard from "../ProductCard";
import { DEPT_SUBCATS } from "../meta";

export default function PortalProducts() {
  const { products, ready, dept, setDept, sub, setSub, query } = usePortal();

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

  const browse = dept === "all" && !query.trim();
  const activeDept = dept === "all" ? null : dept;
  const subs = activeDept ? DEPT_SUBCATS[activeDept] ?? [] : [];

  return (
    <div className="catpage">
      {activeDept && subs.length > 0 && (
        <div className="catsubbar" aria-label={`${deptName(activeDept)} sub-categories`}>
          <button className={`catsub ${!sub ? "on" : ""}`} onClick={() => setSub("")}>All {deptName(activeDept)}</button>
          {subs.map((sc) => {
            const n = products.filter((p) => p.dep === activeDept && p.name.toLowerCase().includes(sc.q)).length;
            return (
              <button key={sc.label} className={`catsub ${sub === sc.q ? "on" : ""}`} onClick={() => setSub(sc.q)}>
                {sc.label} <span className="cc">{n}</span>
              </button>
            );
          })}
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
    </div>
  );
}
