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
  const { ready: sessionReady, signedIn } = useSession();

  const { products, ready } = useInventory();
  const { orders } = useOrders();
  const myOrders = orders.filter((o) => o.store === STORE);

  const [dept, setDept] = useState<DeptKey | "all">("all");
  const [query, setQuery] = useState("");
  const [sub, setSub] = useState("");
  const [cart, setCart] = useState<Cart>({});
  const [toast, setToast] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [productsOpen, setProductsOpen] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);

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
    <Link href={href} className={`sitem ${active ? "on" : ""}`} onClick={() => setMobileNav(false)}>
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
      <div className="app">
        <div className={`sideov ${mobileNav ? "show" : ""}`} onClick={() => setMobileNav(false)} />
        <aside className={`side ${mobileNav ? "open" : ""}`}>
          <Link href="/" className="side-brand"><Brand dark height={30} /></Link>
          <div className="snav">
            {navItem("/portal", isDash, <Grid />, "Dashboard")}

            <button className={`sitem ${seg === "products" ? "section-on" : ""}`} onClick={() => { setDept("all"); setSub(""); router.push("/portal/products"); setProductsOpen((o) => !o); setMobileNav(false); }}>
              <span className="ic"><Boxes /></span> Products <span className="cb">{counts.all}</span>
              <svg className={`chev ${productsOpen ? "" : "closed"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            {productsOpen && (
              <div className="sgroup-items">
                <button className={`sitem subitem ${seg === "products" && dept === "all" ? "on" : ""}`} onClick={() => { setDept("all"); setSub(""); router.push("/portal/products"); setMobileNav(false); }}>
                  All products <span className="cb">{counts.all}</span>
                </button>
                {DEPTS.map((d) => {
                  const open = openGroups[d.key];
                  const subs = DEPT_SUBCATS[d.key] || [];
                  return (
                    <div key={d.key}>
                      <button className={`sitem subitem ${seg === "products" && dept === d.key && !sub ? "on" : ""}`} onClick={() => { setDept(d.key); setSub(""); router.push("/portal/products"); setOpenGroups((s) => ({ ...s, [d.key]: !s[d.key] })); setMobileNav(false); }}>
                        {d.name} <span className="cb">{counts[d.key]}</span>
                        {subs.length > 0 && <svg className={`chev ${open ? "" : "closed"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </button>
                      {subs.length > 0 && (
                        <div className={`sgroup-items ${open ? "" : "closed"}`}>
                          {subs.map((sc) => {
                            const n = products.filter((p) => p.dep === d.key && p.name.toLowerCase().includes(sc.q)).length;
                            return (
                              <button key={sc.label} className={`sitem subitem deep ${seg === "products" && dept === d.key && sub === sc.q ? "on" : ""}`} onClick={() => { setDept(d.key); setSub(sc.q); router.push("/portal/products"); setMobileNav(false); }}>
                                {sc.label} <span className="cb">{n}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {navItem("/portal/cart", seg === "cart", <Bag />, "Cart", cases || undefined)}
            {navItem("/portal/orders", seg === "orders", <Receipt />, "My orders", myOrders.length)}
            {navItem("/portal/payments", seg === "payments", <Card />, "Payments")}
          </div>
          <div className="acct">
            <Link href="/portal/profile" className="who-link" onClick={() => setMobileNav(false)}>
              <span className="av">JS</span>
              <div className="who">
                <div className="nm">Jay&apos;s Stop &amp; Shop</div>
                <div className="em">buyer@yourstore.com</div>
              </div>
            </Link>
            <Link href="/admin" className="adminlink" title="Admin console" aria-label="Admin console"><Gear /></Link>
          </div>
        </aside>

        <div className="appmain">
          <div className="topbar">
            <button className="navtoggle" onClick={() => setMobileNav(true)} aria-label="Open menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>
            </button>
            <div className="tt">{title}<small>{subtitle}</small></div>
            {onProducts && (
              <div className="search">
                <Search />
                <input placeholder="Search by name or item number…" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
            )}
            <Link href="/portal/cart" className="cart-btn" aria-label={`Open cart, ${cases} cases`}>
              <Bag /> Cart <span className="badge">{cases}</span>
            </Link>
          </div>

          <div className="content">{children}</div>
        </div>

        {toast && <div className="toast show"><Check /> {toast}</div>}
      </div>
    </Ctx.Provider>
  );
}
