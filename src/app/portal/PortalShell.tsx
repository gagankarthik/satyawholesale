"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEPTS, deptName, fmt, CONTACT, useInventory, useOrders,
  type DeptKey, type Product, type Order,
} from "@/lib/store";
import { useSession } from "@/lib/auth";
import { Bag, Search, Grid, GridView, Receipt, Card, Check, User, LogOut, Shield, Pin, Sparkles, Tag, Phone, Mail, Clock } from "@/components/Icons";
import { Dropdown } from "@/components/ui";
import Brand from "@/components/Brand";
import { DEPT_SUBCATS } from "./meta";

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
  const [searchFocus, setSearchFocus] = useState(false);

  useEffect(() => { setCollapsed(localStorage.getItem("satya.psidebar") === "1"); }, []);
  const toggleCollapse = () => setCollapsed((c) => { const n = !c; try { localStorage.setItem("satya.psidebar", n ? "1" : "0"); } catch {} return n; });

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

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || String(p.id).includes(q))
      .slice(0, 7);
  }, [query, products]);

  const goSearch = () => { setDept("all"); setSub(""); setSearchFocus(false); router.push("/portal/products"); };

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
  const isDetail = pathname.split("/").filter(Boolean).length > 2; // e.g. /portal/orders/SW-123
  const title =
    seg === "products" ? (dept === "all" ? "All products" : deptName(dept))
    : seg === "arrivals" ? "New arrivals"
    : seg === "offers" ? "Offers & promotions"
    : seg === "cart" ? "Your cart"
    : seg === "orders" ? "My orders"
    : seg === "payments" ? "Payments"
    : seg === "addresses" ? "Manage addresses"
    : seg === "profile" ? "Profile"
    : "Dashboard";
  const subtitle =
    seg === "products" ? (dept === "all" ? "Browse the full catalog" : `${counts[dept]} SKUs in ${deptName(dept)}`)
    : seg === "arrivals" ? "The latest products, freshly landed"
    : seg === "offers" ? "Current deals and promotions"
    : seg === "cart" ? (cases ? `${cases} case${cases !== 1 ? "s" : ""} ready to order` : "Your cart is empty")
    : seg === "orders" ? `${myOrders.length} order${myOrders.length !== 1 ? "s" : ""} on record`
    : seg === "payments" ? "Invoices & account balance"
    : seg === "addresses" ? "Saved delivery addresses"
    : seg === "profile" ? "Your trade account"
    : `Welcome back, ${STORE}`;

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

  const goDept = (d: DeptKey | "all", q = "") => { setDept(d); setSub(q); router.push("/portal/products"); setMobileNav(false); };

  if (sessionReady && !signedIn) return <div className="papp" />;

  return (
    <Ctx.Provider value={value}>
      <div className={`papp ${collapsed ? "collapsed" : ""}`}>
        {/* full-width top bar */}
        <header className="ptopbar">
          <div className="ptop-left">
            <button className="navtoggle" onClick={() => setMobileNav(true)} aria-label="Open menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>
            </button>
            <Link href="/portal" className="ptop-logo" aria-label="Satya Wholesale — dashboard"><Brand height={34} /></Link>
          </div>
          <form className="search" onSubmit={(e) => { e.preventDefault(); goSearch(); }} role="search">
            <Search />
            <input
              placeholder="Search products…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => window.setTimeout(() => setSearchFocus(false), 120)}
              aria-label="Search products"
              aria-expanded={searchFocus && !!query.trim()}
            />
            {searchFocus && query.trim() && (
              <div className="searchsheet" role="listbox" aria-label="Search suggestions">
                {matches.length ? (
                  <>
                    {matches.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        className="ssrow"
                        role="option"
                        aria-selected="false"
                        onMouseDown={(e) => { e.preventDefault(); setSearchFocus(false); router.push(`/portal/products/${p.id}`); }}
                      >
                        <span className="ss-thumb"><Image src="/coming-soon.webp" alt="" fill sizes="44px" style={{ objectFit: "contain" }} /></span>
                        <span className="ss-info">
                          <span className="ss-nm">{p.name}</span>
                          <span className="ss-meta">{deptName(p.dep)} · #{p.id} · {p.stock} cs</span>
                        </span>
                        <span className="ss-price">${fmt(p.price)}</span>
                      </button>
                    ))}
                    <button type="button" className="ss-all" onMouseDown={(e) => { e.preventDefault(); goSearch(); }}>
                      See all results for &ldquo;{query.trim()}&rdquo; →
                    </button>
                  </>
                ) : (
                  <div className="ss-empty">No products match &ldquo;{query.trim()}&rdquo;</div>
                )}
              </div>
            )}
          </form>
          <div className="topbar-actions">
            <Link href="/portal/cart" className="cart-mini" aria-label={`Cart, ${cases} item${cases !== 1 ? "s" : ""}`}>
              <Bag />
              {cases > 0 && <span className="cart-count">{cases}</span>}
            </Link>
            <Dropdown ariaLabel="Account menu" triggerClassName="topavatar" trigger={() => <span className="av-sm">JS</span>}>
              <div className="menu-head"><div className="mh-nm">Jay&apos;s Stop &amp; Shop</div><div className="mh-em">buyer@yourstore.com</div></div>
              <Link href="/portal/profile" className="menu-item" role="menuitem"><User /> Profile</Link>
              <Link href="/portal/addresses" className="menu-item" role="menuitem"><Pin /> Addresses</Link>
              <Link href="/admin" className="menu-item" role="menuitem"><Shield /> Admin console</Link>
              <div className="menu-sep" />
              <button type="button" className="menu-item danger" role="menuitem" onClick={() => { signOut(); router.replace("/auth/login"); }}><LogOut /> Sign out</button>
            </Dropdown>
          </div>
        </header>

        {/* full-width browse line — every department inline, each a sub-category menu */}
        <nav className="pcatline" aria-label="Browse departments">
          <div className="pcatline-in">
            <Link href="/portal/products" className={`catnav ${onProducts && dept === "all" ? "on" : ""}`} onClick={() => goDept("all")}><GridView /> All products</Link>
            {DEPTS.map((d) => (
              <Dropdown
                key={d.key}
                align="start"
                ariaLabel={`${d.name} categories`}
                triggerClassName={`catnav catnav-menu ${onProducts && dept === d.key ? "on" : ""}`}
                trigger={(open) => (
                  <>{d.name} <svg className={`catnav-chev ${open ? "open" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg></>
                )}
              >
                <button type="button" className="menu-item" role="menuitem" onClick={() => goDept(d.key)}>All {d.name}</button>
                {(DEPT_SUBCATS[d.key] ?? []).map((sc) => (
                  <button key={sc.label} type="button" className="menu-item" role="menuitem" onClick={() => goDept(d.key, sc.q)}>{sc.label}</button>
                ))}
              </Dropdown>
            ))}
            <Link href="/portal/arrivals" className={`catnav ${seg === "arrivals" ? "on" : ""}`} onClick={() => setMobileNav(false)}><Sparkles /> New arrivals</Link>
            <Link href="/portal/offers" className={`catnav ${seg === "offers" ? "on" : ""}`} onClick={() => setMobileNav(false)}><Tag /> Offers</Link>
          </div>
        </nav>

        {/* sidebar + content */}
        <div className="pbody">
          <div className={`sideov ${mobileNav ? "show" : ""}`} onClick={() => setMobileNav(false)} />
          <aside className={`pside ${mobileNav ? "open" : ""}`}>
            <nav className="psnav" aria-label="Account navigation">
              {navItem("/portal", isDash, <Grid />, "Dashboard")}
              {navItem("/portal/orders", seg === "orders", <Receipt />, "Orders")}
              {navItem("/portal/profile", seg === "profile", <User />, "Profile")}
              {navItem("/portal/addresses", seg === "addresses", <Pin />, "Manage address")}
              {navItem("/portal/payments", seg === "payments", <Card />, "Payments")}
              <span className="sitem disabled" aria-disabled="true" title={collapsed ? "Rewards — coming soon" : undefined}><span className="ic"><Sparkles /></span> Rewards <span className="soon">soon</span></span>
              <span className="sitem disabled" aria-disabled="true" title={collapsed ? "Coupons — coming soon" : undefined}><span className="ic"><Tag /></span> Coupons <span className="soon">soon</span></span>
            </nav>
            <button className="pside-collapse" onClick={toggleCollapse} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" strokeLinecap="round" /></svg>
              <span className="pside-collapse-l">Collapse</span>
            </button>

            <div className="psupport">
              <span className="psup-h">Need help?</span>
              <a className="psup-row" href={CONTACT.phoneHref} title={`Call ${CONTACT.phone}`}><Phone /> <span>{CONTACT.phone}</span></a>
              <a className="psup-row" href={`mailto:${CONTACT.email}`} title={`Email ${CONTACT.email}`}><Mail /> <span>{CONTACT.email}</span></a>
              <span className="psup-row psup-hours" title="Mon–Fri 10–5:30 · Sat 10:30–5"><Clock /> <span>Mon–Fri 10–5:30</span></span>
            </div>
          </aside>

          <main className="pcontent">
            {!isDetail && <div className="pagehead"><h1>{title}</h1><p>{subtitle}</p></div>}
            {children}
          </main>
        </div>

        {toast && <div className="toast show"><Check /> {toast}</div>}
      </div>
    </Ctx.Provider>
  );
}
