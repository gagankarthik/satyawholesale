"use client";

import { useMemo, useState } from "react";
import { DEPTS } from "@/lib/store";
import { Search } from "@/components/Icons";
import { EmptyState, Spinner } from "@/components/ui";
import { usePortal } from "../PortalShell";
import ProductCard from "../ProductCard";
import { DEPT_SUBCATS } from "../meta";

export default function PortalProducts() {
  const { products, ready, dept, setDept, sub, setSub, query, counts } = usePortal();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

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

  return (
    <div className="catlayout">
      <aside className="catrail" aria-label="Product categories">
        <button className={`crail-item ${dept === "all" ? "on" : ""}`} onClick={() => { setDept("all"); setSub(""); }}>
          <span>All products</span><span className="crail-c">{counts.all}</span>
        </button>
        {DEPTS.map((d) => {
          const subs = DEPT_SUBCATS[d.key] || [];
          const deptActive = dept === d.key;
          const open = openGroups[d.key] ?? deptActive;
          return (
            <div key={d.key} className="crail-group">
              <button
                className={`crail-item ${deptActive && !sub ? "on" : ""}`}
                onClick={() => { setDept(d.key); setSub(""); setOpenGroups((s) => ({ ...s, [d.key]: !(s[d.key] ?? deptActive) })); }}
              >
                <span>{d.name}</span><span className="crail-c">{counts[d.key]}</span>
                {subs.length > 0 && (
                  <svg className={`crail-chev ${open ? "" : "closed"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
              </button>
              {subs.length > 0 && open && (
                <div className="crail-subs">
                  {subs.map((sc) => {
                    const n = products.filter((p) => p.dep === d.key && p.name.toLowerCase().includes(sc.q)).length;
                    return (
                      <button key={sc.label} className={`crail-sub ${deptActive && sub === sc.q ? "on" : ""}`} onClick={() => { setDept(d.key); setSub(sc.q); }}>
                        <span>{sc.label}</span><span className="crail-c">{n}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </aside>

      <div className="catmain">
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
    </div>
  );
}
