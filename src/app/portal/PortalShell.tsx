"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEPTS, DEPT_BG, deptName, fmt, useInventory, useOrders,
  commitStockForOrder, CONTACT,
  type DeptKey, type Product, type OrderLine, type Order,
} from "@/lib/store";
import { useSession } from "@/lib/auth";
import { Boxes, Gear, Bag, Search, Grid, Receipt } from "@/components/Icons";
import Brand from "@/components/Brand";
import { ADDRESSES, DEPT_SUBCATS } from "./meta";

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
  cases: number;
  openCart: () => void;
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
  const { orders, placeOrder } = useOrders();
  const myOrders = orders.filter((o) => o.store === STORE);

  const [dept, setDept] = useState<DeptKey | "all">("all");
  const [query, setQuery] = useState("");
  const [sub, setSub] = useState("");
  const [cart, setCart] = useState<Cart>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const [address, setAddress] = useState(ADDRESSES[0].addr);
  const [payment, setPayment] = useState("Net 15 terms");
  const [fulfilment, setFulfilment] = useState("Next-day delivery");
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState("");
  const [confirmation, setConfirmation] = useState<Order | null>(null);
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

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const p = products.find((x) => x.id === Number(id));
          return p ? { p, qty } : null;
        })
        .filter(Boolean) as { p: Product; qty: number }[],
    [cart, products]
  );
  const cases = cartLines.reduce((s, l) => s + l.qty, 0);
  const subtotal = cartLines.reduce((s, l) => s + l.qty * l.p.price, 0);

  const flash = (m: string) => {
    setToast(m);
    window.clearTimeout((flash as { t?: number }).t);
    (flash as { t?: number }).t = window.setTimeout(() => setToast(""), 2200);
  };
  const add = (id: number) => {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
    flash("Added to order");
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

  const submit = () => {
    if (!cartLines.length) return;
    const lines: OrderLine[] = cartLines.map((l) => ({ id: l.p.id, name: l.p.name, qty: l.qty, price: l.p.price }));
    const isPickup = fulfilment.includes("pickup");
    const order: Order = {
      ref: "SW-" + Math.floor(4000 + Math.random() * 5000),
      placed: Date.now(),
      store: STORE,
      lines, cases, total: subtotal, status: "Pending",
      payment, fulfilment, notes: notes.trim() || undefined,
      tracking: isPickup ? "PICKUP" : "1Z" + Math.floor(100000000 + Math.random() * 899999999) + "OH",
      deliveryFee: 0, tax: 0, discount: 0,
      paymentStatus: payment.includes("Net") ? "Unpaid" : "Paid",
      billing: address, shipping: address,
    };
    placeOrder(order);
    commitStockForOrder(lines);
    setCart({});
    setCartOpen(false);
    setStep("cart");
    setConfirmation(order);
  };

  /* ---- route-derived chrome ---- */
  const seg = pathname.split("/")[2] || "dashboard";
  const onProducts = pathname === "/portal/products";
  const isDash = pathname === "/portal";
  const title =
    seg === "products" ? (dept === "all" ? "All products" : deptName(dept))
    : seg === "orders" ? "My orders"
    : seg === "receipts" ? "Receipts"
    : seg === "profile" ? "Account"
    : "Dashboard";
  const subtitle =
    seg === "products" ? (dept === "all" ? "Showing the full catalog" : `${counts[dept]} SKUs in ${deptName(dept)}`)
    : seg === "orders" ? `${myOrders.length} order${myOrders.length !== 1 ? "s" : ""} on record`
    : seg === "receipts" ? "Printable order receipts"
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
    cart, add, changeQty, removeLine, cases,
    openCart: () => setCartOpen(true), flash,
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

            <button className={`sitem ${seg === "products" ? "on" : ""}`} onClick={() => { setDept("all"); setSub(""); router.push("/portal/products"); setProductsOpen((o) => !o); setMobileNav(false); }}>
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

            {navItem("/portal/orders", seg === "orders", <Receipt />, "My orders", myOrders.length)}
            {navItem("/portal/receipts", seg === "receipts", <Receipt />, "Receipts")}
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
            <button className="cart-btn" onClick={() => setCartOpen(true)} aria-label={`Open order, ${cases} cases`}>
              <Bag /> Order <span className="badge">{cases}</span>
            </button>
          </div>

          <div className="content">{children}</div>
        </div>

        {/* cart drawer */}
        <div className={`overlay ${cartOpen ? "show" : ""}`} onClick={() => setCartOpen(false)} />
        <aside className={`drawer ${cartOpen ? "show" : ""}`} aria-hidden={!cartOpen}>
          <div className="dh">
            <h3>{step === "checkout" ? "Checkout" : "Your order"}<small>{cases ? `${cases} case${cases > 1 ? "s" : ""} · ${cartLines.length} item${cartLines.length > 1 ? "s" : ""}` : "0 cases · build it up"}</small></h3>
            <button className="x" onClick={() => { setCartOpen(false); setStep("cart"); }} aria-label="Close">✕</button>
          </div>

          {step === "checkout" && (
            <div className="costeps" aria-hidden="true"><span className="done">1 · Cart</span><span className="on">2 · Checkout</span></div>
          )}

          {step === "cart" ? (
            <>
              <div className="ditems">
                {!cartLines.length ? (
                  <div className="cart-empty">
                    <div className="ei">📦</div>
                    <h4>Your order is empty</h4>
                    <p>Add products by the case and they&apos;ll stack up here with a running total.</p>
                  </div>
                ) : (
                  cartLines.map(({ p, qty }) => (
                    <div className="citem" key={p.id}>
                      <span className="th" style={{ background: DEPT_BG[p.dep] }}>{p.emoji}</span>
                      <div className="cmid">
                        <div className="nm">{p.name}</div>
                        <div className="id mono">#{p.id} · {p.pack} · ${fmt(p.price)}/{p.unit}</div>
                        <div className="ctl">
                          <button onClick={() => changeQty(p.id, -1)}>−</button>
                          <span className="mono">{qty}</span>
                          <button onClick={() => changeQty(p.id, 1)} disabled={qty >= p.stock}>+</button>
                        </div>
                      </div>
                      <div className="crt">
                        <div className="lp mono">${fmt(qty * p.price)}</div>
                        <button className="rm" onClick={() => removeLine(p.id)}>Remove</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {cartLines.length > 0 && (
                <div className="dfoot">
                  <div className="ln"><span>Subtotal · {cases} cases</span><span className="mono">${fmt(subtotal)}</span></div>
                  <div className="ln tot"><span>Order total</span><b>${fmt(subtotal)}</b></div>
                  <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => setStep("checkout")}>
                    Continue to checkout →
                  </button>
                  <div className="note">Pick an address &amp; payment next</div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="ditems checkout-body">
                <div className="cofield">
                  <span className="colabel">Delivery address</span>
                  <div className="addrlist">
                    {ADDRESSES.map((a) => (
                      <label key={a.id} className={`addropt ${address === a.addr ? "on" : ""}`}>
                        <input type="radio" name="ship" checked={address === a.addr} onChange={() => setAddress(a.addr)} />
                        <span className="addrtext"><b>{a.label}</b><small>{a.addr}</small></span>
                        <span className="addrtick" aria-hidden="true">✓</span>
                      </label>
                    ))}
                  </div>
                </div>
                <label className="field"><span>Fulfilment</span>
                  <select value={fulfilment} onChange={(e) => setFulfilment(e.target.value)}>
                    <option>Next-day delivery</option>
                    <option>Cash &amp; carry pickup</option>
                    <option>Scheduled delivery</option>
                  </select>
                </label>
                <label className="field"><span>Payment method</span>
                  <select value={payment} onChange={(e) => setPayment(e.target.value)}>
                    <option>Net 15 terms</option>
                    <option>Net 30 terms</option>
                    <option>Card on delivery</option>
                    <option>Cash on delivery</option>
                  </select>
                </label>
                <label className="field"><span>Delivery notes</span>
                  <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Dock hours, PO number, etc." />
                </label>
                <div className="cosummary">
                  <div className="cosum-h">Order summary</div>
                  {cartLines.map(({ p, qty }) => (
                    <div className="ln small" key={p.id}><span>×{qty} {p.name}</span><span className="mono">${fmt(qty * p.price)}</span></div>
                  ))}
                </div>
              </div>
              <div className="dfoot">
                <div className="ln"><span>Subtotal · {cases} cases</span><span className="mono">${fmt(subtotal)}</span></div>
                <div className="ln"><span>{fulfilment.includes("pickup") ? "Pickup" : "Delivery"}</span><span className="mono" style={{ color: "var(--green)" }}>{fulfilment.includes("pickup") ? "At warehouse" : "Next-day · Free"}</span></div>
                <div className="ln tot"><span>Order total</span><b>${fmt(subtotal)}</b></div>
                <div className="cobtns">
                  <button className="btn btn-ghost" onClick={() => setStep("cart")}>← Back</button>
                  <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={submit}>
                    Submit order →
                  </button>
                </div>
                <div className="note">{payment} · ships to {address.split(",")[0]}</div>
              </div>
            </>
          )}
        </aside>

        {/* confirmation modal */}
        {confirmation && (
          <div className="modal-overlay" onClick={() => setConfirmation(null)}>
            <div className="modal modal-success" onClick={(e) => e.stopPropagation()}>
              <div className="success-anim" aria-hidden="true">
                <span className="sc-burst" />
                <svg viewBox="0 0 52 52">
                  <circle className="sc-circle" cx="26" cy="26" r="24" fill="none" />
                  <path className="sc-check" fill="none" d="M14 27l8 8 16-16" />
                </svg>
              </div>
              <h3>Order {confirmation.ref} placed 🎉</h3>
              <p>{confirmation.cases} cases · ${fmt(confirmation.total)} · next-day regional delivery. We&apos;ve saved it as a reorder template.</p>
              <div className="modal-lines">
                {confirmation.lines.map((l) => (
                  <div key={l.id} className="ml"><span>{l.name}</span><span className="mono">×{l.qty} · ${fmt(l.qty * l.price)}</span></div>
                ))}
              </div>
              <div className="cobtns" style={{ marginTop: 6 }}>
                <button className="btn btn-ghost" onClick={() => setConfirmation(null)}>Keep shopping</button>
                <Link href={`/portal/orders/${confirmation.ref}`} className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setConfirmation(null)}>
                  Track order →
                </Link>
              </div>
            </div>
          </div>
        )}

        {toast && <div className="toast show">✓ {toast}</div>}
      </div>
    </Ctx.Provider>
  );
}
