"use client";

import { useMemo } from "react";
import { useInventory, useOrders, sku, fmt } from "@/lib/store";
import { useCustomers, useSuppliers, usePurchaseOrders, useStaff, poTotal } from "@/lib/wms";

export interface SearchDest {
  path: string;
  label: string;
  group: string;
}

interface Hit extends SearchDest {
  /** Secondary line — the record's own data (SKU/UPC, member #, status, total…). */
  sub?: string;
}

const money = (n: number) => "$" + fmt(n);

/**
 * Global admin search. Mounted only while the console search is open, so the
 * catalogs are fetched on first use rather than on every admin page load.
 * Searches pages plus every core record — products, orders, customer accounts,
 * suppliers, purchase orders and staff — and shows each hit's own data.
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
  const { suppliers } = useSuppliers();
  const { pos } = usePurchaseOrders();
  const { staff } = useStaff();
  const q = query.trim().toLowerCase();

  const results = useMemo<Hit[]>(() => {
    if (!q) return [];
    const has = (...vals: (string | number | undefined | null)[]) =>
      vals.some((v) => v != null && String(v).toLowerCase().includes(q));
    const out: Hit[] = [];

    destinations
      .filter((d) => d.label.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((d) => out.push(d));

    customers
      .filter((c) => has(c.store, c.contact, c.email, c.memberNo))
      .slice(0, 5)
      .forEach((c) => out.push({
        path: "/admin/accounts",
        label: c.store || c.contact || "Account",
        sub: `#${c.memberNo ?? "—"} · ${c.status}${c.contact ? ` · ${c.contact}` : ""}`,
        group: "Account",
      }));

    products
      .filter((p) => has(p.name, p.sku, p.gtin) || String(p.id).includes(q))
      .slice(0, 5)
      .forEach((p) => out.push({
        path: `/admin/products/${p.id}`,
        label: p.name,
        sub: `SKU ${sku(p)} · ${p.gtin ? `UPC ${p.gtin}` : "no UPC"} · ${p.stock} in stock`,
        group: "Product",
      }));

    orders
      .filter((o) => has(o.ref, o.store))
      .slice(0, 5)
      .forEach((o) => out.push({
        path: `/admin/orders/${o.ref}`,
        label: `Order ${o.ref}`,
        sub: `${o.store || "—"} · ${money(o.total)} · ${o.status}`,
        group: "Order",
      }));

    suppliers
      .filter((s) => has(s.name, s.contact, s.email, s.accountNo))
      .slice(0, 4)
      .forEach((s) => out.push({
        path: "/admin/suppliers",
        label: s.name,
        sub: `${s.contact || "—"} · ${s.terms}${s.leadDays ? ` · ${s.leadDays}d lead` : ""}`,
        group: "Supplier",
      }));

    pos
      .filter((p) => has(p.id, p.supplierRef) || p.lines.some((l) => has(l.name, l.sku)))
      .slice(0, 4)
      .forEach((p) => {
        const sup = suppliers.find((s) => s.id === p.supplierId);
        out.push({
          path: "/admin/purchaseorder",
          label: `PO ${p.id}`,
          sub: `${sup?.name ?? "—"} · ${p.status} · ${money(poTotal(p))}`,
          group: "Purchase order",
        });
      });

    staff
      .filter((u) => has(u.name, u.email, u.role))
      .slice(0, 4)
      .forEach((u) => out.push({
        path: "/admin/users",
        label: u.name,
        sub: `${u.role} · ${u.email}`,
        group: "Staff",
      }));

    return out.slice(0, 18);
  }, [q, products, orders, customers, suppliers, pos, staff, destinations]);

  if (!q) return null;

  return (
    <div className="atb-results" role="listbox">
      {results.length === 0 ? (
        <div className="atb-empty">No matches for &ldquo;{query.trim()}&rdquo;</div>
      ) : (
        results.map((r, i) => (
          <button key={`${r.path}-${i}`} type="button" role="option" className="atb-result" onMouseDown={() => onGo(r.path)}>
            <span className="atb-r-main">
              <span className="atb-r-label">{r.label}</span>
              {r.sub && <span className="atb-r-sub">{r.sub}</span>}
            </span>
            <span className="atb-r-grp">{r.group}</span>
          </button>
        ))
      )}
    </div>
  );
}
