"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Grid, Receipt, Boxes, Users, Truck, Store, Shield, Refresh, Check, Search, Inbox, Tag, Sparkles, Package, Gear, Card } from "@/components/Icons";
import { Dropdown, Kbd } from "@/components/ui";
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
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => { setCollapsed(localStorage.getItem("satya.sidebar") === "1"); }, []);
  const toggleCollapse = () => setCollapsed((c) => { const n = !c; try { localStorage.setItem("satya.sidebar", n ? "1" : "0"); } catch {} return n; });

  const flash: Flash = (msg) => {
    setToast(msg);
    window.clearTimeout((flash as unknown as { t?: number }).t);
    (flash as unknown as { t?: number }).t = window.setTimeout(() => setToast(""), 2000);
  };
  const go = (t: Tab) => router.push(TAB_PATH[t]);

  const GROUPS: { label: string; items: { path: string; label: string; Icon: typeof Grid; soon?: boolean; hidden?: boolean }[] }[] = [
    { label: "Sales", items: [
      { path: "/admin/dashboard", label: "Dashboard", Icon: Grid },
      { path: "/admin/orders", label: "Orders", Icon: Receipt },
      { path: "/admin/accounts", label: "Accounts", Icon: Users },
    ] },
    { label: "Catalog", items: [
      { path: "/admin/products", label: "Products", Icon: Boxes },
      { path: "/admin/import", label: "Bulk import", Icon: Inbox, hidden: true },
      { path: "/admin/categories", label: "Categories", Icon: Tag },
      { path: "/admin/suppliers", label: "Suppliers", Icon: Truck },
      { path: "/admin/promotions", label: "Promotions", Icon: Sparkles },
    ] },
    { label: "Inventory", items: [
      { path: "/admin/inventory", label: "Stock ledger", Icon: Refresh },
      { path: "/admin/purchaseorder", label: "Purchase orders", Icon: Package },
      { path: "/admin/warehouse", label: "Warehouse", Icon: Store },
    ] },
    { label: "Admin", items: [
      { path: "/admin/users", label: "Users & roles", Icon: Shield },
      { path: "/admin/settings", label: "Settings", Icon: Gear },
      { path: "/admin/possync", label: "POS sync", Icon: Card, soon: true },
    ] },
  ];

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Ctrl/Cmd+K focuses the console search from anywhere in the admin
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const destinations = GROUPS.flatMap((g) => g.items.filter((it) => !it.soon).map((it) => ({ path: it.path, label: it.label, group: g.label })));
  const results = q.trim() ? destinations.filter((d) => d.label.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6) : [];

  return (
    <ConfirmProvider>
      <Ctx.Provider value={{ flash, go }}>
        <div className={`admin ${collapsed ? "collapsed" : ""}`}>
          <div className={`sideov ${mobileNav ? "show" : ""}`} onClick={() => setMobileNav(false)} />
          <aside className={`aside-dark ${mobileNav ? "open" : ""}`}>
            <div className="side-brand">
              <Link href="/" className="side-logo" aria-label="Satya Wholesale home"><Brand height={40} /></Link>
            </div>
            <nav className="anav scroll">
              {GROUPS.map((g) => (
                <div key={g.label} className="anav-group">
                  <div className="anav-label">{g.label}</div>
                  {g.items.filter((it) => !it.hidden).map(({ path, label, Icon, soon }) => (
                    <Link key={path} href={path} className={isActive(path) ? "on" : ""} title={collapsed ? label : undefined} onClick={() => setMobileNav(false)}>
                      <Icon className="nicon" /> {label}
                      {soon && <span className="soon">soon</span>}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
          </aside>

          <div className="adminmain">
            <div className="admintopbar">
              <div className="atb-left">
                <button className="navtoggle" onClick={() => setMobileNav(true)} aria-label="Open menu">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>
                </button>
                <button className="atb-collapse" onClick={toggleCollapse} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" strokeLinecap="round" /></svg>
                </button>
                <span className="atb-brand"><Brand height={26} /></span>
              </div>
              <div className="atb-search">
                <Search />
                <input
                  ref={searchRef}
                  placeholder="Search console"
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setSearchOpen(true); }}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                  aria-label="Search console"
                />
                <span className="atb-kbd" aria-hidden="true"><Kbd>Ctrl</Kbd><Kbd>K</Kbd></span>
                {searchOpen && results.length > 0 && (
                  <div className="atb-results" role="listbox">
                    {results.map((r) => (
                      <button key={r.path} type="button" role="option" className="atb-result" onMouseDown={() => { router.push(r.path); setQ(""); setSearchOpen(false); }}>
                        <span className="atb-r-label">{r.label}</span><span className="atb-r-grp">{r.group}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="atb-actions">
                <Dropdown ariaLabel="Account menu" triggerClassName="topavatar" trigger={() => <span className="av-sm">SW</span>}>
                  <div className="menu-head"><div className="mh-nm">Warehouse console</div><div className="mh-em">Satya Wholesale</div></div>
                  <Link href="/admin/settings" className="menu-item" role="menuitem"><Gear /> Settings</Link>
                  <Link href="/portal" className="menu-item" role="menuitem"><Store /> Order portal</Link>
                </Dropdown>
              </div>
            </div>
            <div className="admincontent">{children}</div>
          </div>

          {toast && <div className="toast show" key={toast}><Check /> {toast}</div>}
        </div>
      </Ctx.Provider>
    </ConfirmProvider>
  );
}
