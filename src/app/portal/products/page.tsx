"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Arrow, Sparkles, Tag } from "@/components/Icons";
import { Button, EmptyState, ListToolbar, Skeleton, type ToolbarOption } from "@/components/ui";
import { usePortal } from "../PortalShell";
import ProductCard from "../ProductCard";

const SORTS: ToolbarOption[] = [
  { value: "name", label: "Name A–Z" },
  { value: "price-asc", label: "Lowest price" },
  { value: "price-desc", label: "Highest price" },
  { value: "newest", label: "Newest" },
];
const STOCK_FILTERS: ToolbarOption[] = [
  { value: "all", label: "All items" },
  { value: "in", label: "In stock" },
];

export default function PortalProducts() {
  const { products, ready, error, reload, dept, setDept, sub, setSub, query, setQuery, depts, subsFor, catName, matchDept } = usePortal();
  const searchParams = useSearchParams();
  const [sort, setSort] = useState("name");
  const [stock, setStock] = useState("all");
  // "New" / "On offer" are merchandising lenses (was separate pages) — now filters.
  // Pre-selected when arriving from /portal/arrivals or /portal/offers (?view=…).
  const [promo, setPromo] = useState<"all" | "new" | "offer">(() => {
    const v = searchParams.get("view");
    return v === "new" ? "new" : v === "offer" ? "offer" : "all";
  });

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = products.filter(
      (p) =>
        (dept === "all" || matchDept(p.dep, dept)) &&
        (sub === "" || p.dep === sub) &&
        (stock === "all" || p.stock > 0) &&
        (promo === "all" || (promo === "new" ? p.onArrivals : p.onOffers)) &&
        (q === "" || p.name.toLowerCase().includes(q) || String(p.id).includes(q))
    );
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "price-asc": return a.price - b.price;
        case "price-desc": return b.price - a.price;
        case "newest": return (b.created ?? 0) - (a.created ?? 0);
        default: return a.name.localeCompare(b.name);
      }
    });
  }, [products, dept, sub, query, stock, sort, promo, matchDept]);

  const latest = useMemo(
    () => [...products].sort((a, b) => (b.created ?? 0) - (a.created ?? 0)).slice(0, 12),
    [products]
  );

  // any active search/filter/sort/lens flips the shelves view into a filtered grid
  const filtering = !!query.trim() || stock !== "all" || sort !== "name" || promo !== "all";
  const browse = dept === "all" && !filtering;
  const activeDept = dept === "all" ? null : dept;
  const subs = activeDept ? subsFor(activeDept) : [];

  return (
    <div className="catpage">
      {activeDept && subs.length > 0 && (
        <div className="catsubbar" aria-label={`${catName(activeDept)} sub-categories`}>
          <button className={`catsub ${!sub ? "on" : ""}`} onClick={() => setSub("")}>All {catName(activeDept)}</button>
          {subs.map((sc) => {
            const n = products.filter((p) => p.dep === sc.key).length;
            return (
              <button key={sc.key} className={`catsub ${sub === sc.key ? "on" : ""}`} onClick={() => setSub(sc.key)}>
                {sc.name} <span className="cc">{n}</span>
              </button>
            );
          })}
        </div>
      )}

      {ready && (
        <ListToolbar
          left={
            <div className="promochips" role="group" aria-label="Product collections">
              <button type="button" className={`promochip ${promo === "all" ? "on" : ""}`} aria-pressed={promo === "all"} onClick={() => setPromo("all")}>All</button>
              <button type="button" className={`promochip ${promo === "new" ? "on" : ""}`} aria-pressed={promo === "new"} onClick={() => setPromo("new")}><Sparkles /> New</button>
              <button type="button" className={`promochip ${promo === "offer" ? "on" : ""}`} aria-pressed={promo === "offer"} onClick={() => setPromo("offer")}><Tag /> On offer</button>
            </div>
          }
          search={{ value: query, onChange: setQuery, placeholder: "Search products by name or item #" }}
          filters={[{ label: "Stock", value: stock, onChange: setStock, options: STOCK_FILTERS }]}
          sort={{ value: sort, onChange: setSort, options: SORTS }}
        />
      )}
      {!ready ? (
        <div className="pgrid">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={220} />)}</div>
      ) : error && !products.length ? (
        <EmptyState
          title="Couldn't load"
          description="There was a problem loading your data."
          action={<Button variant="ghost" onClick={reload}>Retry</Button>}
        />
      ) : browse ? (
        <>
          <section className="catrow">
            <div className="catrow-head"><h3>Latest arrivals <span className="cnt">just landed</span></h3></div>
            <div className="catrow-scroll">{latest.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          </section>
          {depts.map((d) => {
            const items = products.filter((p) => matchDept(p.dep, d.key));
            if (!items.length) return null;
            return (
              <section className="catrow" key={d.key}>
                <div className="catrow-head"><h3>{d.name} <span className="cnt">{items.length} SKUs</span></h3><button className="viewall" onClick={() => setDept(d.key)}>View all <Arrow /></button></div>
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
