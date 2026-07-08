"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  deptName, fmt, productImg, effPrice, useInventory, useOrders,
  type DeptKey, type Product, type Order,
} from "@/lib/store";
import { useCategories, type Category } from "@/lib/wms";
import { useSession } from "@/lib/auth";
import { flash, type Flash } from "@/lib/flash";
import { Bag, Search, Grid, GridView, Receipt, Card, User, LogOut, Shield, Pin, Sparkles, Tag, Coin, Arrow } from "@/components/Icons";
import { Dropdown } from "@/components/ui";
import Brand from "@/components/Brand";
import { ConfirmProvider } from "@/components/Confirm";
import HelpFlyout from "./HelpFlyout";

type Cart = Record<number, number>; // id -> cases

interface PortalCtx {
  products: Product[];
  ready: boolean;
  error: string | null;
  reload: () => void;
  orders: Order[];
  myOrders: Order[];
  STORE: string;
  counts: Record<string, number>;
  /** Active top-level categories (admin-managed). */
  depts: Category[];
  /** Active sub-categories whose parent is the given department key. */
  subsFor: (deptKey: string) => Category[];
  /** Display name for any category/sub-category key. */
  catName: (key: string) => string;
  /** True when a product's category belongs to the given department (directly or via a sub-category). */
  matchDept: (productDep: string, deptKey: string) => boolean;
  dept: string | "all";
  setDept: (d: string) => void;
  sub: string;
  setSub: (s: string) => void;
  query: string;
  setQuery: (s: string) => void;
  cart: Cart;
  add: (id: number) => void;
  changeQty: (id: number, d: number) => void;
  removeLine: (id: number) => void;
  clearCart: () => void;
  reorder: (lines: { id: number; qty: number }[]) => void;
  cases: number;
  flash: Flash;
}

const Ctx = createContext<PortalCtx | null>(null);
export function usePortal() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePortal must be used inside PortalShell");
  return v;
}

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready: sessionReady, signedIn, isAdmin, needsOnboarding, store, email, signOut } = useSession();

  /* The signed-in customer account. Orders come back already scoped to this
     store by the API, so no client-side store filter is needed. */
  const STORE = store ?? email ?? "";
  const initials = (STORE || email || "SW").split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "SW";

  const { products, ready, error: productsError, refresh: refreshProducts } = useInventory();
  const { orders, error: ordersError, refresh: refreshOrders } = useOrders();
  const { categories, refresh: refreshCategories } = useCategories();
  const myOrders = orders;

  const error = productsError ?? ordersError;
  const reload = useCallback(() => {
    refreshProducts();
    refreshOrders();
    refreshCategories();
  }, [refreshProducts, refreshOrders, refreshCategories]);

  /* ---- admin-managed catalog taxonomy (departments + sub-categories) ---- */
  const depts = useMemo(() => categories.filter((c) => c.parent === null && c.active), [categories]);
  const subKeysByParent = useMemo(() => {
    const m: Record<string, string[]> = {};
    categories.forEach((c) => { if (c.parent && c.active) (m[c.parent] ||= []).push(c.key); });
    return m;
  }, [categories]);
  const subsFor = useCallback(
    (deptKey: string) => categories.filter((c) => c.parent === deptKey && c.active),
    [categories]
  );
  const catName = useCallback(
    (key: string) => categories.find((c) => c.key === key)?.name ?? deptName(key as DeptKey),
    [categories]
  );
  /* a product belongs to a department if assigned to it directly or to one of its sub-categories */
  const matchDept = useCallback(
    (productDep: string, deptKey: string) => productDep === deptKey || (subKeysByParent[deptKey] ?? []).includes(productDep),
    [subKeysByParent]
  );

  const [dept, setDept] = useState<string | "all">("all");
  const [query, setQuery] = useState("");
  const [sub, setSub] = useState("");
  const [cart, setCart] = useState<Cart>({});
  const [mobileNav, setMobileNav] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchFocus, setSearchFocus] = useState(false);

  useEffect(() => { setCollapsed(localStorage.getItem("satya.psidebar") === "1"); }, []);
  const toggleCollapse = () => setCollapsed((c) => { const n = !c; try { localStorage.setItem("satya.psidebar", n ? "1" : "0"); } catch {} return n; });

  /* redirect to login when signed out; to onboarding when signed in but not
     yet activated as a buyer (finished sign-up, hasn't completed onboarding) */
  useEffect(() => {
    if (!sessionReady) return;
    if (!signedIn) router.replace("/auth/login");
    else if (needsOnboarding) router.replace("/onboarding");
  }, [sessionReady, signedIn, needsOnboarding, router]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: products.length };
    depts.forEach((d) => (c[d.key] = products.filter((p) => matchDept(p.dep, d.key)).length));
    return c;
  }, [products, depts, matchDept]);

  const cases = useMemo(() => Object.values(cart).reduce((s, n) => s + n, 0), [cart]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || String(p.id).includes(q))
      .slice(0, 7);
  }, [query, products]);

  const goSearch = () => { setDept("all"); setSub(""); setSearchFocus(false); router.push("/portal/products"); };

  const add = (id: number) => {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
    const p = products.find((x) => x.id === id);
    flash(p ? `${p.name} added to cart` : "Added to cart");
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
  /* Re-add a past order's lines to the cart. Skips products that left the
     catalog or are out of stock, and caps each line at what's on hand. */
  const reorder = (lines: { id: number; qty: number }[]) => {
    const avail = lines
      .map((l) => ({ l, p: products.find((x) => x.id === l.id) }))
      .filter((x): x is { l: { id: number; qty: number }; p: NonNullable<typeof x.p> } => !!x.p && x.p.stock > 0);
    const missing = lines.length - avail.length;
    if (!avail.length) { flash.error("Those items are no longer available"); return; }
    setCart((c) => {
      const next = { ...c };
      for (const { l, p } of avail) next[l.id] = Math.min((next[l.id] || 0) + l.qty, p.stock);
      return next;
    });
    flash.info(`${avail.length} item${avail.length !== 1 ? "s" : ""} added to cart${missing ? `, ${missing} unavailable` : ""}`);
    router.push("/portal/cart");
  };

  /* ---- route-derived chrome ---- */
  const seg = pathname.split("/")[2] || "dashboard";
  const onProducts = pathname === "/portal/products";
  const isDash = pathname === "/portal";
  const isDetail = pathname.split("/").filter(Boolean).length > 2; // e.g. /portal/orders/SW-123
  const title =
    seg === "products" ? (dept === "all" ? "All products" : catName(dept))
    : seg === "arrivals" ? "New arrivals"
    : seg === "offers" ? "Offers & promotions"
    : seg === "cart" ? "Your cart"
    : seg === "orders" ? "My orders"
    : seg === "payments" ? "Payments"
    : seg === "addresses" ? "Manage addresses"
    : seg === "profile" ? "Profile"
    : "Dashboard";
  const subtitle =
    isDash ? `Welcome back, ${STORE || "customer"}`
    : seg === "products" ? (dept === "all" ? "" : `${counts[dept] ?? 0} SKUs in ${catName(dept)}`)
    : seg === "cart" ? (cases ? `${cases} case${cases !== 1 ? "s" : ""} ready to order` : "Your cart is empty")
    : seg === "orders" ? `${myOrders.length} order${myOrders.length !== 1 ? "s" : ""} on record`
    : "";

  const navItem = (href: string, active: boolean, icon: React.ReactNode, label: string, badge?: number) => (
    <Link href={href} className={`sitem ${active ? "on" : ""}`} aria-current={active ? "page" : undefined} title={collapsed ? label : undefined} onClick={() => setMobileNav(false)}>
      <span className="ic">{icon}</span> {label}
      {badge != null ? <span className="cb">{badge}</span> : null}
    </Link>
  );

  const value: PortalCtx = {
    products, ready, error, reload, orders, myOrders, STORE, counts,
    depts, subsFor, catName, matchDept,
    dept, setDept, sub, setSub, query, setQuery,
    cart, add, changeQty, removeLine, clearCart, reorder, cases, flash,
  };

  const goDept = (d: string, sk = "") => { setDept(d); setSub(sk); router.push("/portal/products"); setMobileNav(false); };

  if (sessionReady && (!signedIn || needsOnboarding)) return <div className="papp" />;

  return (
    <ConfirmProvider>
    <Ctx.Provider value={value}>
      <div className={`papp ${collapsed ? "collapsed" : ""}`}>
        {/* full-width top bar */}
        <header className="ptopbar">
          <div className="ptop-left">
            <button className="navtoggle" onClick={() => setMobileNav(true)} aria-label="Open menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>
            </button>
            <Link href="/portal" className="ptop-logo" aria-label="Satya Wholesale dashboard"><Brand height={34} /></Link>
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
                        <span className="ss-thumb"><Image src={productImg(p)} alt="" fill sizes="44px" style={{ objectFit: "contain" }} /></span>
                        <span className="ss-info">
                          <span className="ss-nm">{p.name}</span>
                          <span className="ss-meta">{catName(p.dep)} · #{p.id} · {p.stock} cs</span>
                        </span>
                        <span className="ss-price">${fmt(effPrice(p))}</span>
                      </button>
                    ))}
                    <button type="button" className="ss-all" onMouseDown={(e) => { e.preventDefault(); goSearch(); }}>
                      See all results for &ldquo;{query.trim()}&rdquo; <Arrow />
                    </button>
                  </>
                ) : (
                  <div className="ss-empty">No products match &ldquo;{query.trim()}&rdquo;</div>
                )}
              </div>
            )}
          </form>
          <div className="topbar-actions" style={{ gap: 16 }}>
            <Link href="/portal/cart" className="cart-mini" aria-label={`Cart, ${cases} item${cases !== 1 ? "s" : ""}`}>
              <Bag />
              {cases > 0 && <span className="cart-count" key={cases}>{cases}</span>}
            </Link>
            <span
              className="points-mini"
              aria-label="Reward points: 0"
              title="Reward points"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 13, padding: "5px 11px", borderRadius: 999, background: "var(--paper-2)", border: "1px solid var(--line)", color: "var(--ink)", whiteSpace: "nowrap" }}
            >
              <Coin /> 0 pts
            </span>
            <Dropdown ariaLabel="Account menu" triggerClassName="topavatar" trigger={() => <span className="av-sm">{initials}</span>}>
              <div className="menu-head"><div className="mh-nm">{STORE || "Customer account"}</div><div className="mh-em">{email}</div></div>
              <Link href="/portal/profile" className="menu-item" role="menuitem"><User /> Profile</Link>
              <Link href="/portal/addresses" className="menu-item" role="menuitem"><Pin /> Addresses</Link>
              {isAdmin && <Link href="/admin" className="menu-item" role="menuitem"><Shield /> Admin console</Link>}
              <div className="menu-sep" />
              <button type="button" className="menu-item danger" role="menuitem" onClick={() => { signOut(); router.replace("/auth/login"); }}><LogOut /> Sign out</button>
            </Dropdown>
          </div>
        </header>

        {/* full-width browse line — every department inline, each a sub-category menu */}
        <nav className="pcatline" aria-label="Browse departments">
          <div className="pcatline-in">
            <Link href="/portal/arrivals" className={`catnav ${seg === "arrivals" ? "on" : ""}`} onClick={() => setMobileNav(false)}><Sparkles /> New arrivals</Link>
            <Link href="/portal/offers" className={`catnav ${seg === "offers" ? "on" : ""}`} onClick={() => setMobileNav(false)}><Tag /> Offers</Link>
            <Link href="/portal/products" className={`catnav ${onProducts && dept === "all" ? "on" : ""}`} onClick={() => goDept("all")}><GridView /> All products</Link>
            {depts.map((d) => {
              const subs = subsFor(d.key);
              if (!subs.length) {
                return (
                  <button key={d.key} type="button" className={`catnav ${onProducts && dept === d.key ? "on" : ""}`} onClick={() => goDept(d.key)}>{d.name}</button>
                );
              }
              return (
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
                  {subs.map((sc) => (
                    <button key={sc.key} type="button" className="menu-item" role="menuitem" onClick={() => goDept(d.key, sc.key)}>{sc.name}</button>
                  ))}
                </Dropdown>
              );
            })}
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
              <span className="sitem disabled" aria-disabled="true" title={collapsed ? "Rewards, coming soon" : undefined}><span className="ic"><Sparkles /></span> Rewards <span className="soon">soon</span></span>
              <span className="sitem disabled" aria-disabled="true" title={collapsed ? "Coupons, coming soon" : undefined}><span className="ic"><Tag /></span> Coupons <span className="soon">soon</span></span>
            </nav>
            <button className="pside-collapse" onClick={toggleCollapse} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" strokeLinecap="round" /></svg>
              <span className="pside-collapse-l">Collapse</span>
            </button>

            <HelpFlyout />
          </aside>

          <main id="main" className="pcontent">
            {!isDetail && <div className="pagehead"><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>}
            {children}
          </main>
        </div>
      </div>
    </Ctx.Provider>
    </ConfirmProvider>
  );
}
