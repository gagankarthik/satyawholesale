"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEPTS, deptName, useInventory, useOrders,
  type DeptKey, type Product, type Order,
} from "@/lib/store";
import { useSession } from "@/lib/auth";
import { Boxes, Gear, Bag, Search, Grid, Receipt, Card, Check } from "@/components/Icons";
import { Dropdown } from "@/components/ui";
import Brand from "@/components/Brand";

type Cart = Record<number, number>; // id -> cases

interface PortalCtx {
  products: Product[];
  ready: boolean;
  orders: Order[];
  myOrders: Order[];
  STORE: string;
  counts: Record<string, number>;
  dept: DeptKey | "all";
  setDept: (d: DeptKey | "all") => void;
  sub: string;
  setSub: (s: string) => void;
  query: string;
  setQuery: (s: string) => void;
  cart: Cart;
  add: (id: number) => void;
  changeQty: (id: number, d: number) => void;
  removeLine: (id: number) => void;
  clearCart: () => void;
  cases: number;
  flash: (m: string) => void;
}

const Ctx = createContext<PortalCtx | null>(null);
export function usePortal() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePortal must be used inside PortalShell");
  return v;
}

const STORE = "Jay's Stop & Shop";

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready: sessionReady, signedIn, signOut } = useSession();

  const { products, ready } = useInventory();
  const { orders } = useOrders();
  const myOrders = orders.filter((o) => o.store === STORE);

  const [dept, setDept] = useState<DeptKey | "all">("all");
  const [query, setQuery] = useState("");
  const [sub, setSub] = useState("");
  const [cart, setCart] = useState<Cart>({});
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  /* restore collapsed preference (after mount to avoid hydration mismatch) */
  useEffect(() => { setCollapsed(localStorage.getItem("satya.sidebar") === "1"); }, []);
  const toggleCollapse = () => setCollapsed((c) => { const n = !c; try { localStorage.setItem("satya.sidebar", n ? "1" : "0"); } catch {} return n; });

  /* redirect to login when the session is known and signed-out */
  useEffect(() => {
    if (sessionReady && !signedIn) router.replace("/auth/login");
  }, [sessionReady, signedIn, router]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: products.length };
    DEPTS.forEach((d) => (c[d.key] = products.filter((p) => p.dep === d.key).length));
    return c;
  }, [products]);

  const cases = useMemo(() => Object.values(cart).reduce((s, n) => s + n, 0), [cart]);

  const flash = (m: string) => {
    setToast(m);
    window.clearTimeout((flash as { t?: number }).t);
    (flash as { t?: number }).t = window.setTimeout(() => setToast(""), 2200);
  };
  const add = (id: number) => {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
    flash("Added to cart");
  };
  const changeQty = (id: number, d: number) =>
    setCart((c) => {
      const n = (c[id] || 0) + d;
      const next = { ...c };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });
  const removeLine = (id: number) =>
    setCart((c) => {
      const next = { ...c };
      delete next[id];
      return next;
    });
  const clearCart = () => setCart({});

  /* ---- route-derived chrome ---- */
  const seg = pathname.split("/")[2] || "dashboard";
  const onProducts = pathname === "/portal/products";
  const isDash = pathname === "/portal";
  const title =
    seg === "products" ? (dept === "all" ? "All products" : deptName(dept))
    : seg === "cart" ? "Cart"
    : seg === "orders" ? "My orders"
    : seg === "payments" ? "Payments"
    : seg === "profile" ? "Account"
    : "Dashboard";
  const subtitle =
    seg === "products" ? (dept === "all" ? "Showing the full catalog" : `${counts[dept]} SKUs in ${deptName(dept)}`)
    : seg === "cart" ? (cases ? `${cases} case${cases !== 1 ? "s" : ""} ready to order` : "Your cart is empty")
    : seg === "orders" ? `${myOrders.length} order${myOrders.length !== 1 ? "s" : ""} on record`
    : seg === "payments" ? "Invoices & account balance"
    : seg === "profile" ? "Your trade account"
    : STORE;

  const navItem = (href: string, active: boolean, icon: React.ReactNode, label: string, badge?: number) => (
    <Link href={href} className={`sitem ${active ? "on" : ""}`} title={collapsed ? label : undefined} onClick={() => setMobileNav(false)}>
      <span className="ic">{icon}</span> {label}
      {badge != null ? <span className="cb">{badge}</span> : null}
    </Link>
  );

  const value: PortalCtx = {
    products, ready, orders, myOrders, STORE, counts,
    dept, setDept, sub, setSub, query, setQuery,
    cart, add, changeQty, removeLine, clearCart, cases, flash,
  };

  if (sessionReady && !signedIn) return <div className="app" />;

  return (
    <Ctx.Provider value={value}>
      <div className={`app ${collapsed ? "collapsed" : ""}`}>
        <div className={`sideov ${mobileNav ? "show" : ""}`} onClick={() => setMobileNav(false)} />
        <aside className={`side ${mobileNav ? "open" : ""}`}>
          <div className="side-brand">
            <Link href="/" className="side-logo" aria-label="Satya Wholesale home"><Brand height={38} /></Link>
            <button className="side-collapse" onClick={toggleCollapse} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" strokeLinecap="round" /></svg>
            </button>
          </div>
          <div className="snav">
            {navItem("/portal", isDash, <Grid />, "Dashboard")}

            <Link href="/portal/products" className={`sitem ${seg === "products" ? "on" : ""}`} title={collapsed ? "Products" : undefined} onClick={() => { setDept("all"); setSub(""); setMobileNav(false); }}>
              <span className="ic"><Boxes /></span> Products <span className="cb">{counts.all}</span>
            </Link>
            {navItem("/portal/orders", seg === "orders", <Receipt />, "My orders", myOrders.length)}
            {navItem("/portal/payments", seg === "payments", <Card />, "Payments")}
          </div>
        </aside>

        <div className="appmain">
          <div className="topbar">
            <button className="navtoggle" onClick={() => setMobileNav(true)} aria-label="Open menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>
            </button>
            <div className="tt">{title}<small>{subtitle}</small></div>
            <form className="search" onSubmit={(e) => { e.preventDefault(); if (!onProducts) router.push("/portal/products"); }}>
              <Search />
              <input placeholder="Search products…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search products" />
            </form>
            <Link href="/portal/cart" className="cart-mini" aria-label={`Cart, ${cases} item${cases !== 1 ? "s" : ""}`}>
              <Bag />
              {cases > 0 && <span className="cart-count">{cases}</span>}
            </Link>
            <Dropdown ariaLabel="Account menu" triggerClassName="topavatar" trigger={() => <span className="av-sm">JS</span>}>
              <div className="menu-head"><div className="mh-nm">Jay&apos;s Stop &amp; Shop</div><div className="mh-em">buyer@yourstore.com</div></div>
              <Link href="/portal/profile" className="menu-item" role="menuitem"><Gear /> Account</Link>
              <Link href="/admin" className="menu-item" role="menuitem"><Grid /> Admin console</Link>
              <div className="menu-sep" />
              <button type="button" className="menu-item danger" role="menuitem" onClick={() => { signOut(); router.replace("/auth/login"); }}>Sign out</button>
            </Dropdown>
          </div>

          <div className="content">{children}</div>
        </div>

        {toast && <div className="toast show"><Check /> {toast}</div>}
      </div>
    </Ctx.Provider>
  );
}
