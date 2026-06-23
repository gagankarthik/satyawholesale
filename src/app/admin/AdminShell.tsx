"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useState } from "react";
import { useInventory, useOrders, CUSTOMERS } from "@/lib/store";
import { usePurchaseOrders, useCustomers } from "@/lib/wms";
import { Grid, Receipt, Boxes, Users, Truck, Store, Shield, Refresh } from "@/components/Icons";
import Brand from "@/components/Brand";
import { ConfirmProvider } from "@/components/Confirm";
import { type Tab, type Flash } from "@/features/admin/shared";

/* tab key -> route, so feature components can keep their `go(tab)` API */
export const TAB_PATH: Record<Tab, string> = {
  orders: "/admin/orders",
  dashboard: "/admin/dashboard",
  customers: "/admin/accounts",
  products: "/admin/products",
  import: "/admin/import",
  categories: "/admin/categories",
  suppliers: "/admin/suppliers",
  promos: "/admin/promotions",
  pos: "/admin/purchaseorder",
  inventory: "/admin/inventory",
  warehouse: "/admin/warehouse",
  users: "/admin/users",
  settings: "/admin/settings",
  possync: "/admin/possync",
};

interface AdminCtx {
  flash: Flash;
  go: (t: Tab) => void;
}
const Ctx = createContext<AdminCtx | null>(null);
export function useAdmin() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdmin must be used inside AdminShell");
  return v;
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  const flash: Flash = (msg) => {
    setToast(msg);
    window.clearTimeout((flash as unknown as { t?: number }).t);
    (flash as unknown as { t?: number }).t = window.setTimeout(() => setToast(""), 2000);
  };
  const go = (t: Tab) => router.push(TAB_PATH[t]);

  const { orders } = useOrders();
  const { products } = useInventory();
  const { customers } = useCustomers(CUSTOMERS);
  const { pos } = usePurchaseOrders();

  const pendingAccounts = customers.filter((c) => c.status === "Pending").length;
  const openPOs = pos.filter((p) => p.status !== "Closed" && p.status !== "Received").length;

  const GROUPS: { label: string; items: { path: string; label: string; Icon: typeof Grid; badge?: number; soon?: boolean }[] }[] = [
    { label: "Sales", items: [
      { path: "/admin/orders", label: "Orders", Icon: Receipt, badge: orders.length },
      { path: "/admin/dashboard", label: "Dashboard", Icon: Grid },
      { path: "/admin/accounts", label: "Accounts", Icon: Users, badge: pendingAccounts || undefined },
    ] },
    { label: "Catalog", items: [
      { path: "/admin/products", label: "Products", Icon: Boxes, badge: products.length },
      { path: "/admin/import", label: "Bulk import", Icon: Receipt },
      { path: "/admin/categories", label: "Categories", Icon: Grid },
      { path: "/admin/suppliers", label: "Suppliers", Icon: Truck },
      { path: "/admin/promotions", label: "Promotions", Icon: Store },
    ] },
    { label: "Inventory", items: [
      { path: "/admin/inventory", label: "Stock ledger", Icon: Refresh },
      { path: "/admin/purchaseorder", label: "Purchase orders", Icon: Receipt, badge: openPOs },
      { path: "/admin/warehouse", label: "Warehouse", Icon: Store },
    ] },
    { label: "Admin", items: [
      { path: "/admin/users", label: "Users & roles", Icon: Shield },
      { path: "/admin/settings", label: "Settings", Icon: Grid },
      { path: "/admin/possync", label: "POS sync", Icon: Store, soon: true },
    ] },
  ];

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  return (
    <ConfirmProvider>
      <Ctx.Provider value={{ flash, go }}>
        <div className="admin">
          <div className={`sideov ${mobileNav ? "show" : ""}`} onClick={() => setMobileNav(false)} />
          <aside className={`aside-dark ${mobileNav ? "open" : ""}`}>
            <Link href="/" className="side-brand"><Brand dark height={30} /></Link>
            <div className="adminrole mono">WAREHOUSE CONSOLE</div>
            <nav className="anav scroll">
              {GROUPS.map((g) => (
                <div key={g.label} className="anav-group">
                  <div className="anav-label">{g.label}</div>
                  {g.items.map(({ path, label, Icon, badge, soon }) => (
                    <Link key={path} href={path} className={isActive(path) ? "on" : ""} onClick={() => setMobileNav(false)}>
                      <Icon className="nicon" /> {label}
                      {badge ? <span className="cb">{badge}</span> : null}
                      {soon && <span className="soon">soon</span>}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
            <div className="aside-foot">
              <Link href="/portal" className="aside-link">→ Order portal</Link>
            </div>
          </aside>

          <div className="adminmain">
            <div className="admintopbar">
              <button className="navtoggle" onClick={() => setMobileNav(true)} aria-label="Open menu">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>
              </button>
              <Brand height={28} />
            </div>
            {children}
          </div>

          {toast && <div className="toast show">✓ {toast}</div>}
        </div>
      </Ctx.Provider>
    </ConfirmProvider>
  );
}
