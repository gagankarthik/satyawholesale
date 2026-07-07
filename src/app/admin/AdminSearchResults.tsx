"use client";

import { useMemo } from "react";
import { useInventory, useOrders } from "@/lib/store";
import { useCustomers } from "@/lib/wms";

export interface SearchDest {
  path: string;
  label: string;
  group: string;
}

/**
 * Global admin search results. Mounted only while the console search is open,
 * so product/order/customer data is fetched on first use rather than on every
 * admin page load. Matches against pages, products, orders and customers.
 */
export function AdminSearchResults({
  query,
  destinations,
  onGo,
}: {
  query: string;
  destinations: SearchDest[];
  onGo: (path: string) => void;
}) {
  const { products } = useInventory();
  const { orders } = useOrders();
  const { customers } = useCustomers();
  const q = query.trim().toLowerCase();

  const results = useMemo<SearchDest[]>(() => {
    if (!q) return [];
    const out: SearchDest[] = [];
    destinations
      .filter((d) => d.label.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((d) => out.push(d));
    products
      .filter((p) => p.name.toLowerCase().includes(q) || String(p.id).includes(q) || (p.sku || "").toLowerCase().includes(q) || (p.gtin || "").includes(q))
      .slice(0, 5)
      .forEach((p) => out.push({ path: `/admin/products/${p.id}`, label: p.name, group: "Product" }));
    orders
      .filter((o) => o.ref.toLowerCase().includes(q) || (o.store || "").toLowerCase().includes(q))
      .slice(0, 5)
      .forEach((o) => out.push({ path: `/admin/orders/${o.ref}`, label: `Order ${o.ref}`, group: o.store || "Order" }));
    customers
      .filter((c) => (c.store || "").toLowerCase().includes(q) || (c.contact || "").toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach((c) => out.push({ path: "/admin/accounts", label: c.store || c.contact, group: "Customer" }));
    return out.slice(0, 14);
  }, [q, products, orders, customers, destinations]);

  if (!q) return null;

  return (
    <div className="atb-results" role="listbox">
      {results.length === 0 ? (
        <div className="atb-empty">No matches for &ldquo;{query.trim()}&rdquo;</div>
      ) : (
        results.map((r, i) => (
          <button key={`${r.path}-${i}`} type="button" role="option" className="atb-result" onMouseDown={() => onGo(r.path)}>
            <span className="atb-r-label">{r.label}</span>
            <span className="atb-r-grp">{r.group}</span>
          </button>
        ))
      )}
    </div>
  );
}
