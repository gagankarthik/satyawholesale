"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Grid, Receipt, Boxes, Users, Truck, Store, Shield, Refresh, Search, Inbox, Tag, Sparkles, Package, Gear, Card, LogOut, Mail, Help, Chart } from "@/components/Icons";
import { Dropdown } from "@/components/ui";
import { AdminSearchResults } from "./AdminSearchResults";
import Brand from "@/components/Brand";
import { ConfirmProvider } from "@/components/Confirm";
import { useSession } from "@/lib/auth";
import { useMessages } from "@/lib/wms";
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
  const { ready: sessionReady, signedIn, isAdmin, email, signOut } = useSession();
  const [mobileNav, setMobileNav] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  /* Console is admin-only: bounce signed-out visitors to login and
     signed-in non-admins (buyers) to their order portal. */
  useEffect(() => {
    if (!sessionReady) return;
    if (!signedIn) router.replace("/auth/login");
    else if (!isAdmin) router.replace("/portal");
  }, [sessionReady, signedIn, isAdmin, router]);

  useEffect(() => { setCollapsed(localStorage.getItem("satya.sidebar") === "1"); }, []);
  const toggleCollapse = () => setCollapsed((c) => { const n = !c; try { localStorage.setItem("satya.sidebar", n ? "1" : "0"); } catch {} return n; });

  const flash: Flash = (msg) => toast(msg);
  const go = (t: Tab) => router.push(TAB_PATH[t]);

  const { messages } = useMessages();
  const unreadMsgs = messages.filter((m) => !m.read).length;

  const GROUPS: { label: string; items: { path: string; label: string; Icon: typeof Grid; soon?: boolean; hidden?: boolean }[] }[] = [
    { label: "Sales", items: [
      { path: "/admin/dashboard", label: "Dashboard", Icon: Grid },
      { path: "/admin/orders", label: "Orders", Icon: Receipt },
      { path: "/admin/accounts", label: "Accounts", Icon: Users },
      { path: "/admin/messages", label: "Messages", Icon: Mail },
    ] },
    { label: "Catalog", items: [
      { path: "/admin/products", label: "Products", Icon: Boxes },
      { path: "/admin/import", label: "Bulk import", Icon: Inbox, hidden: true },
      { path: "/admin/categories", label: "Categories", Icon: Tag },
      { path: "/admin/suppliers", label: "Suppliers", Icon: Truck },
      { path: "/admin/promotions", label: "Promotions", Icon: Sparkles },
    ] },
    { label: "Inventory", items: [
      { path: "/admin/inventory", label: "Inventory", Icon: Refresh },
      { path: "/admin/purchaseorder", label: "Purchase orders", Icon: Package },
      { path: "/admin/warehouse", label: "Warehouse", Icon: Store },
    ] },
    { label: "Admin", items: [
      { path: "/admin/users", label: "Users", Icon: Shield },
      { path: "/admin/reports", label: "Reports", Icon: Chart },
      { path: "/admin/settings", label: "Settings", Icon: Gear },
      { path: "/admin/possync", label: "POS sync", Icon: Card, soon: true },
    ] },
  ];

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const destinations = GROUPS.flatMap((g) => g.items.filter((it) => !it.soon).map((it) => ({ path: it.path, label: it.label, group: g.label })));

  // Hold the frame until the session is confirmed admin (the effect above redirects otherwise).
  if (!sessionReady || !signedIn || !isAdmin) return <div className="admin" />;

  return (
    <ConfirmProvider>
      <Ctx.Provider value={{ flash, go }}>
        <div className={`admin ${collapsed ? "collapsed" : ""}`}>
          <div className={`sideov ${mobileNav ? "show" : ""}`} onClick={() => setMobileNav(false)} />
          <aside className={`aside-dark ${mobileNav ? "open" : ""}`}>
            <div className="side-brand">
              <Link href="/" className="side-logo" aria-label="Satya Wholesale home"><Brand height={40} /></Link>
              {/* compact mark shown only when the rail is collapsed */}
              <Link href="/" className="side-mark" aria-label="Satya Wholesale home"><span>SW</span></Link>
            </div>
            <nav className="anav scroll">
              {GROUPS.map((g) => (
                <div key={g.label} className="anav-group">
                  <div className="anav-label">{g.label}</div>
                  {g.items.filter((it) => !it.hidden).map(({ path, label, Icon, soon }) => (
                    <Link key={path} href={path} className={isActive(path) ? "on" : ""} aria-current={isActive(path) ? "page" : undefined} title={collapsed ? label : undefined} onClick={() => setMobileNav(false)}>
                      <Icon className="nicon" /> {label}
                      {soon && <span className="soon">soon</span>}
                      {path === "/admin/messages" && unreadMsgs > 0 && <span className="navbadge">{unreadMsgs}</span>}
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
                {searchOpen && (
                  <AdminSearchResults
                    query={q}
                    destinations={destinations}
                    onGo={(path) => { router.push(path); setQ(""); setSearchOpen(false); }}
                  />
                )}
              </div>
              <div className="atb-actions">
                <Link href="/admin/help" className="atb-help" title="Help & guides">
                  <Help /> <span>Help</span>
                </Link>
                <Dropdown ariaLabel="Account menu" triggerClassName="topavatar" trigger={() => <span className="av-sm">SW</span>}>
                  <div className="menu-head"><div className="mh-nm">Warehouse console</div><div className="mh-em">{email || "Satya Wholesale"}</div></div>
                  <Link href="/admin/reports" className="menu-item" role="menuitem"><Chart /> Reports</Link>
                  <Link href="/portal" className="menu-item" role="menuitem"><Store /> Order portal</Link>
                  <div className="menu-sep" />
                  <button type="button" className="menu-item danger" role="menuitem" onClick={() => { signOut(); router.replace("/auth/login"); }}><LogOut /> Sign out</button>
                </Dropdown>
              </div>
            </div>
            <main id="main" className="admincontent">{children}</main>
          </div>
        </div>
      </Ctx.Provider>
    </ConfirmProvider>
  );
}
