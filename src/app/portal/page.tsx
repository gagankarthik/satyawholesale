"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DEPTS, DEPT_BG, deptName, fmt, useInventory, useOrders,
  commitStockForOrder, LOW_STOCK, CONTACT,
  type DeptKey, type Product, type OrderLine, type Order,
} from "@/lib/store";
import {
  DeptLeaf, DeptDrop, DeptFlame, DeptPlus, DeptCart, DeptCar, DeptPhone,
  Boxes, Gear, Bag, Search, Check, Grid, Receipt,
} from "@/components/Icons";

type PView = "dashboard" | "products" | "orders" | "receipts";
import Brand from "@/components/Brand";
import { usePromotions } from "@/lib/wms";

/* sub-categories per department; `q` filters products by name keyword */
const DEPT_SUBCATS: Record<DeptKey, { label: string; q: string }[]> = {
  tobacco: [
    { label: "Cigarettes", q: "carton" },
    { label: "Cigarillos", q: "cigarillo" },
    { label: "Chewing", q: "beech" },
    { label: "Hookah", q: "hookah" },
  ],
  vape: [
    { label: "Disposables", q: "breeze" },
    { label: "Pods", q: "juul" },
    { label: "E-liquids", q: "liquid" },
    { label: "Pouches", q: "zyn" },
  ],
  smoke: [
    { label: "Charcoal", q: "charcoal" },
    { label: "Lighters", q: "lighter" },
    { label: "Pipes & glass", q: "pipe" },
    { label: "Tubes", q: "tube" },
  ],
  hba: [
    { label: "Energy", q: "energy" },
    { label: "Pain relief", q: "pain" },
    { label: "Supplements", q: "357" },
  ],
  grocery: [
    { label: "Candy", q: "candy" },
    { label: "Chocolate", q: "twix" },
    { label: "Drinks", q: "water" },
    { label: "Household", q: "household" },
  ],
  auto: [
    { label: "Fresheners", q: "fresh" },
    { label: "Windshield", q: "rain" },
    { label: "Cables", q: "cable" },
  ],
  acc: [
    { label: "Phone", q: "phone" },
    { label: "Fashion", q: "sunglasses" },
    { label: "Utility", q: "jar" },
  ],
};

const DEPT_ICON: Record<DeptKey, (p: { className?: string }) => React.ReactElement> = {
  tobacco: DeptLeaf, vape: DeptDrop, smoke: DeptFlame, hba: DeptPlus,
  grocery: DeptCart, auto: DeptCar, acc: DeptPhone,
};
const DEPT_COLOR: Record<DeptKey, string> = {
  tobacco: "#a85a2c", vape: "#2f6fd8", smoke: "#d6560f", hba: "#6b4ed8",
  grocery: "#b07d00", auto: "#2f6fd8", acc: "#2f9e44",
};
type Cart = Record<number, number>; // id -> cases

export default function Portal() {
  const { products, ready } = useInventory();
  const { orders, placeOrder } = useOrders();
  const { promos } = usePromotions();
  const ads = promos.filter((p) => p.active);
  const STORE = "Jay's Stop & Shop";
  const myOrders = orders.filter((o) => o.store === STORE);
  const ago = (ms: number) => { const s = Math.floor((Date.now() - ms) / 1000); if (s < 3600) return Math.max(1, Math.floor(s / 60)) + "m ago"; if (s < 86400) return Math.floor(s / 3600) + "h ago"; return Math.floor(s / 86400) + "d ago"; };
  const newArrivals = [...products].sort((a, b) => (b.created ?? 0) - (a.created ?? 0)).slice(0, 10);

  const [signedIn, setSignedIn] = useState(false);
  const [dept, setDept] = useState<DeptKey | "all">("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Cart>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [confirmation, setConfirmation] = useState<Order | null>(null);
  const [payment, setPayment] = useState("Net 15 terms");
  const [fulfilment, setFulfilment] = useState("Next-day delivery");
  const [notes, setNotes] = useState("");
  const [forgot, setForgot] = useState(false);
  const [slide, setSlide] = useState(0);
  const [view, setView] = useState<PView>("dashboard");
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [sub, setSub] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    if (!signedIn || ads.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % ads.length), 5000);
    return () => clearInterval(t);
  }, [signedIn, ads.length]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: products.length };
    DEPTS.forEach((d) => (c[d.key] = products.filter((p) => p.dep === d.key).length));
    return c;
  }, [products]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const s = sub.toLowerCase();
    return products.filter(
      (p) =>
        (dept === "all" || p.dep === dept) &&
        (s === "" || p.name.toLowerCase().includes(s)) &&
        (q === "" || p.name.toLowerCase().includes(q) || String(p.id).includes(q))
    );
  }, [products, dept, query, sub]);

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

  const card = (p: Product) => {
    const inCart = cart[p.id] || 0;
    const out = p.stock <= 0;
    const Thumb = DEPT_ICON[p.dep];
    return (
      <div className="pcard" key={p.id}>
        <div className="ph" style={{ background: DEPT_BG[p.dep] }}>
          {p.tag === "new" && <span className="pb new">New</span>}
          {p.tag === "pop" && <span className="pb pop">Popular</span>}
          {(p.tag === "low" || (p.stock <= LOW_STOCK && p.stock > 0)) && <span className="pb low">Low stock</span>}
          {out && <span className="pb oos">Out</span>}
          <span className="stk"><i style={{ background: out ? "#d8401f" : "#2f9e44" }} />{p.stock} cs</span>
          <span className="thumb" style={{ color: DEPT_COLOR[p.dep] }}><Thumb /></span>
        </div>
        <div className="info">
          <span className="cat">{deptName(p.dep)}</span>
          <div className="nm">{p.name}</div>
          <div className="meta">
            <span className="mono">#{p.id}</span>
            <span className="mono">{p.pack}</span>
          </div>
          <div className="pricerow">
            <span className="pr">${fmt(p.price)}</span>
            <span className="un">/ {p.unit}</span>
          </div>
          {inCart ? (
            <div className="stepper">
              <button onClick={() => changeQty(p.id, -1)} aria-label="Remove one case">−</button>
              <span className="qv">{inCart}<small>cases</small></span>
              <button onClick={() => changeQty(p.id, 1)} disabled={inCart >= p.stock} aria-label="Add one case">+</button>
            </div>
          ) : (
            <button className="addbtn" onClick={() => add(p.id)} disabled={out}>
              {out ? "Out of stock" : "+ Add to order"}
            </button>
          )}
        </div>
      </div>
    );
  };

  const submit = () => {
    if (!cartLines.length) return;
    const lines: OrderLine[] = cartLines.map((l) => ({
      id: l.p.id, name: l.p.name, qty: l.qty, price: l.p.price,
    }));
    const isPickup = fulfilment.includes("pickup");
    const order: Order = {
      ref: "SW-" + Math.floor(4000 + Math.random() * 5000),
      placed: Date.now(),
      store: "Jay's Stop & Shop",
      lines, cases, total: subtotal, status: "Submitted",
      payment, fulfilment, notes: notes.trim() || undefined,
      tracking: isPickup ? "PICKUP" : "1Z" + Math.floor(100000000 + Math.random() * 899999999) + "OH",
      deliveryFee: 0,
      tax: 0,
      discount: 0,
      paymentStatus: payment.includes("Net") ? "Unpaid" : "Paid",
      billing: "412 Vine St, Cincinnati, OH 45202",
      shipping: "412 Vine St, Cincinnati, OH 45202",
    };
    placeOrder(order);
    commitStockForOrder(lines);
    setCart({});
    setCartOpen(false);
    setConfirmation(order);
  };

  /* ---------- sign-in gate ---------- */
  if (!signedIn) {
    return (
      <div className="auth">
        <Link href="/" className="auth-back">← Back to site</Link>
        <div className="auth-card">
          <aside className="auth-aside">
            <div className="auth-top">
              <Brand dark height={40} />
              <span className="auth-eyebrow mono">Trade order portal</span>
            </div>
            <div>
              <h2>The whole counter,<br />one trade login.</h2>
              <p>Browse the full catalog, build orders by the case, and reorder in two taps.</p>
            </div>
            <ul className="auth-trust">
              <li><span className="ac"><Check /></span> Live case-pack pricing</li>
              <li><span className="ac"><Check /></span> Saved orders &amp; templates</li>
              <li><span className="ac"><Check /></span> Next-day regional delivery</li>
            </ul>
          </aside>
          <form
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              setSignedIn(true);
            }}
          >
            <div className="auth-h">Sign in</div>
            <p className="auth-sub">Demo mode — any details will sign you in.</p>
            <label className="field">
              <span>Trade account email</span>
              <input type="email" defaultValue="buyer@yourstore.com" required />
            </label>
            <label className="field">
              <span className="field-row">
                Password
                <button type="button" className="linklike" onClick={() => setForgot((v) => !v)}>Forgot password?</button>
              </span>
              <input type="password" defaultValue="demopass" required />
            </label>
            {forgot && (
              <div className="auth-note">
                Enter your trade email and we&apos;ll send a reset link. For urgent help call{" "}
                <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>.
              </div>
            )}
            <label className="auth-check">
              <input type="checkbox" defaultChecked /> Keep me signed in on this device
            </label>
            <button className="btn btn-primary" type="submit" style={{ width: "100%", justifyContent: "center" }}>
              Enter order portal →
            </button>
            <div className="auth-alt">
              No account yet? <Link href="/#account">Request trade access →</Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* ---------- portal app ---------- */
  return (
    <div className="app">
      <div className={`sideov ${mobileNav ? "show" : ""}`} onClick={() => setMobileNav(false)} />
      <aside className={`side ${mobileNav ? "open" : ""}`}>
        <Link href="/" className="side-brand"><Brand dark height={30} /></Link>
        <div className="snav">
          <button className={`sitem ${view === "dashboard" ? "on" : ""}`} onClick={() => { setView("dashboard"); setMobileNav(false); }}>
            <span className="ic"><Grid /></span> Dashboard
          </button>
          <button className={`sitem ${view === "products" ? "on" : ""}`} onClick={() => { setView("products"); setMobileNav(false); }}>
            <span className="ic"><Boxes /></span> Products <span className="cb">{counts.all}</span>
          </button>
          <button className={`sitem ${view === "orders" ? "on" : ""}`} onClick={() => { setView("orders"); setMobileNav(false); }}>
            <span className="ic"><Receipt /></span> My orders <span className="cb">{myOrders.length}</span>
          </button>
          <button className={`sitem ${view === "receipts" ? "on" : ""}`} onClick={() => { setView("receipts"); setMobileNav(false); }}>
            <span className="ic"><Receipt /></span> Receipts
          </button>
          {view === "products" && (
            <>
              <div className="sgroup">Departments</div>
              <button className={`sitem ${dept === "all" ? "on" : ""}`} onClick={() => { setDept("all"); setSub(""); }}>
                <span className="ic"><Boxes /></span> All products <span className="cb">{counts.all}</span>
              </button>
              {DEPTS.map((d) => {
                const open = openGroups[d.key];
                const Ic = DEPT_ICON[d.key];
                const subs = DEPT_SUBCATS[d.key] || [];
                return (
                  <div key={d.key}>
                    <button className={`sitem ${dept === d.key && !sub ? "on" : ""}`} onClick={() => { setDept(d.key); setSub(""); setOpenGroups((s) => ({ ...s, [d.key]: !s[d.key] })); }}>
                      <span className="ic"><Ic /></span> {d.name} <span className="cb">{counts[d.key]}</span>
                      {subs.length > 0 && <svg className={`chev ${open ? "" : "closed"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </button>
                    {subs.length > 0 && (
                      <div className={`sgroup-items ${open ? "" : "closed"}`}>
                        {subs.map((sc) => (
                          <button key={sc.label} className={`sitem subitem ${dept === d.key && sub === sc.q ? "on" : ""}`} onClick={() => { setDept(d.key); setSub(sc.q); setMobileNav(false); }}>
                            {sc.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
        <div className="acct">
          <span className="av">JS</span>
          <div className="who">
            <div className="nm">Jay&apos;s Stop &amp; Shop</div>
            <div className="em">buyer@yourstore.com</div>
          </div>
          <Link href="/admin" className="adminlink" title="Admin console" aria-label="Admin console"><Gear /></Link>
        </div>
      </aside>

      <div className="appmain">
        <div className="topbar">
          <button className="navtoggle" onClick={() => setMobileNav(true)} aria-label="Open menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>
          </button>
          <div className="tt">
            {view === "dashboard" ? "Dashboard" : view === "orders" ? "My orders" : view === "receipts" ? "Receipts" : dept === "all" ? "All products" : deptName(dept)}
            <small>
              {view === "dashboard" ? STORE
                : view === "orders" ? `${myOrders.length} order${myOrders.length !== 1 ? "s" : ""} on record`
                : view === "receipts" ? "Printable order receipts"
                : dept === "all" ? "Showing the full catalog" : `${counts[dept]} SKUs in ${deptName(dept)}`}
            </small>
          </div>
          {view === "products" && (
            <div className="search">
              <Search />
              <input placeholder="Search by name or item number…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          )}
          <button className="cart-btn" onClick={() => setCartOpen(true)} aria-label={`Open order, ${cases} cases`}>
            <Bag /> Order <span className="badge">{cases}</span>
          </button>
        </div>

        <div className="content">
          {/* ---------- DASHBOARD ---------- */}
          {view === "dashboard" && (
            <>
              {ads.length > 0 && (
                <div className="pcarousel" aria-label="Offers and new arrivals">
                  {ads.map((o, i) => (
                    <div key={o.id} className={`pcslide ${i === (slide % ads.length) ? "on" : ""}`}>
                      <Image src={o.image} alt="" fill sizes="100vw" style={{ objectFit: "cover" }} priority={i === 0} />
                      <div className="pctext"><div className="pctag">{o.tag}</div><h3>{o.title}</h3><p>{o.subtitle}</p></div>
                    </div>
                  ))}
                  <div className="pcdots">{ads.map((o, i) => <button key={o.id} className={i === (slide % ads.length) ? "on" : ""} onClick={() => setSlide(i)} aria-label={o.tag} />)}</div>
                </div>
              )}
              <div className="kpis">
                <div className="kpi accent"><div className="kl">Open orders</div><div className="kv">{myOrders.filter((o) => o.status !== "Delivered").length}</div><div className="kf">in fulfillment</div></div>
                <div className="kpi"><div className="kl">Orders placed</div><div className="kv">{myOrders.length}</div><div className="kf">all time</div></div>
                <div className="kpi"><div className="kl">Lifetime spend</div><div className="kv">${fmt(myOrders.reduce((s, o) => s + o.total, 0))}</div><div className="kf">across orders</div></div>
                <div className="kpi"><div className="kl">Cases ordered</div><div className="kv">{myOrders.reduce((s, o) => s + o.cases, 0)}</div><div className="kf">all time</div></div>
              </div>
              <section className="catrow">
                <div className="catrow-head"><h3>New arrivals <span className="cnt">just landed</span></h3><button className="viewall" onClick={() => setView("products")}>Browse all →</button></div>
                <div className="catrow-scroll">{newArrivals.map(card)}</div>
              </section>
              <section className="catrow">
                <div className="catrow-head"><h3>Recent orders</h3><button className="viewall" onClick={() => setView("orders")}>View all →</button></div>
                <div className="panel" style={{ padding: 4 }}>
                  {myOrders.length ? myOrders.slice(0, 5).map((o) => (
                    <button key={o.ref} className="orow" onClick={() => setReceiptOrder(o)}>
                      <div><div className="oref mono">{o.ref}</div><div className="osub">{o.cases} cases · {ago(o.placed)}</div></div>
                      <span className={`pobadge s-${o.status.replace(/\s+/g, "").toLowerCase()}`}>{o.status}</span>
                      <span className="oamt mono">${fmt(o.total)}</span>
                    </button>
                  )) : <div className="empty"><div className="ei">📦</div><h3>No orders yet</h3><p>Build your first order from Products.</p></div>}
                </div>
              </section>
            </>
          )}

          {/* ---------- PRODUCTS ---------- */}
          {view === "products" && (
            <>
              <div className="chips">
                <button className={`chip ${dept === "all" ? "on" : ""}`} onClick={() => setDept("all")}>All <span className="c">{counts.all}</span></button>
                {DEPTS.map((d) => (
                  <button key={d.key} className={`chip ${dept === d.key ? "on" : ""}`} onClick={() => setDept(d.key)}>{d.name} <span className="c">{counts[d.key]}</span></button>
                ))}
              </div>
              {!ready ? (
                <div className="empty"><div className="ei">⏳</div><h3>Loading catalog…</h3></div>
              ) : dept === "all" && !query.trim() ? (
                DEPTS.map((d) => {
                  const items = products.filter((p) => p.dep === d.key);
                  if (!items.length) return null;
                  return (
                    <section className="catrow" key={d.key}>
                      <div className="catrow-head"><h3>{d.name} <span className="cnt">{items.length} SKUs</span></h3><button className="viewall" onClick={() => setDept(d.key)}>View all →</button></div>
                      <div className="catrow-scroll">{items.slice(0, 10).map(card)}</div>
                    </section>
                  );
                })
              ) : !list.length ? (
                <div className="empty"><div className="ei">🔍</div><h3>No items match that search</h3><p>Try a different term or clear the filter.</p></div>
              ) : (
                <div className="pgrid">{list.map(card)}</div>
              )}
            </>
          )}

          {/* ---------- ORDERS / RECEIPTS ---------- */}
          {(view === "orders" || view === "receipts") && (
            !myOrders.length ? (
              <div className="empty light"><div className="ei">🧾</div><h3>No orders yet</h3><p>Your submitted orders and receipts will appear here.</p></div>
            ) : (
              <div className="orders">
                {myOrders.map((o) => (
                    <div className="ordercard clickrow" key={o.ref} onClick={() => setReceiptOrder(o)}>
                      <div className="oc-head">
                        <div>
                          <div className="oc-ref mono">{o.ref}</div>
                          <div className="oc-meta">{o.cases} cases · {o.fulfilment || "Next-day delivery"} · {ago(o.placed)}{o.tracking && o.tracking !== "PICKUP" ? ` · tracking ${o.tracking}` : ""}</div>
                        </div>
                        <div className="oc-right">
                          <span className="oc-total mono">${fmt(o.total)}</span>
                          <span className={`pobadge s-${o.status.replace(/\s+/g, "").toLowerCase()}`}>{o.status}</span>
                          <button className="ia" onClick={(e) => { e.stopPropagation(); setReceiptOrder(o); }}>{view === "receipts" ? "Receipt" : "View"}</button>
                        </div>
                      </div>
                      <div className="oc-lines">{o.lines.slice(0, 6).map((l) => <span key={l.id} className="oc-line"><b className="mono">×{l.qty}</b> {l.name}</span>)}{o.lines.length > 6 && <span className="oc-line">+{o.lines.length - 6} more</span>}</div>
                    </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* cart drawer */}
      <div className={`overlay ${cartOpen ? "show" : ""}`} onClick={() => setCartOpen(false)} />
      <aside className={`drawer ${cartOpen ? "show" : ""}`} aria-hidden={!cartOpen}>
        <div className="dh">
          <h3>Your order<small>{cases ? `${cases} case${cases > 1 ? "s" : ""} · ${cartLines.length} item${cartLines.length > 1 ? "s" : ""}` : "0 cases · build it up"}</small></h3>
          <button className="x" onClick={() => setCartOpen(false)} aria-label="Close">✕</button>
        </div>
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
            <div className="checkout">
              <label className="field"><span>Fulfilment</span>
                <select value={fulfilment} onChange={(e) => setFulfilment(e.target.value)}>
                  <option>Next-day delivery</option>
                  <option>Cash &amp; carry pickup</option>
                  <option>Scheduled delivery</option>
                </select>
              </label>
              <label className="field"><span>Payment</span>
                <select value={payment} onChange={(e) => setPayment(e.target.value)}>
                  <option>Net 15 terms</option>
                  <option>Net 30 terms</option>
                  <option>Card on delivery</option>
                  <option>Cash on delivery</option>
                </select>
              </label>
            </div>
            <label className="field" style={{ marginBottom: 12 }}><span>Delivery notes</span>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Dock hours, PO number, etc." />
            </label>
            <div className="ln"><span>Subtotal · {cases} cases</span><span className="mono">${fmt(subtotal)}</span></div>
            <div className="ln"><span>{fulfilment.includes("pickup") ? "Pickup" : "Delivery"}</span><span className="mono" style={{ color: "var(--green)" }}>{fulfilment.includes("pickup") ? "At warehouse" : "Next-day · Free"}</span></div>
            <div className="ln tot"><span>Order total</span><b>${fmt(subtotal)}</b></div>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={submit}>
              Submit order →
            </button>
            <div className="note">{payment} · saved as a reorder template</div>
          </div>
        )}
      </aside>

      {/* confirmation modal */}
      {confirmation && (
        <div className="modal-overlay" onClick={() => setConfirmation(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-check">✓</div>
            <h3>Order {confirmation.ref} submitted</h3>
            <p>{confirmation.cases} cases · ${fmt(confirmation.total)} · next-day regional delivery. We&apos;ve saved it as a reorder template.</p>
            <div className="modal-lines">
              {confirmation.lines.map((l) => (
                <div key={l.id} className="ml">
                  <span>{l.name}</span>
                  <span className="mono">×{l.qty} · ${fmt(l.qty * l.price)}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => setConfirmation(null)}>
              Keep shopping
            </button>
          </div>
        </div>
      )}

      {/* receipt modal */}
      {receiptOrder && (
        <div className="modal-overlay" onClick={() => setReceiptOrder(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-head">
              <div><div className="rstore">{receiptOrder.store}</div><div className="rref">ORDER {receiptOrder.ref} · {new Date(receiptOrder.placed).toLocaleString()}</div></div>
              <span className={`pobadge s-${receiptOrder.status.replace(/\s+/g, "").toLowerCase()}`}>{receiptOrder.status}</span>
            </div>
            <div className="receipt-meta">
              <span>{receiptOrder.cases} cases</span>
              <span>{receiptOrder.fulfilment || "Next-day delivery"}</span>
              <span>{receiptOrder.payment || "Net 15 terms"}</span>
              {receiptOrder.tracking && receiptOrder.tracking !== "PICKUP" && <span>Tracking {receiptOrder.tracking}</span>}
            </div>
            <div className="receipt-lines">
              {receiptOrder.lines.map((l) => (
                <div className="rl" key={l.id}><span>{l.name}</span><span className="q">×{l.qty} @ ${fmt(l.price)}</span><span className="a">${fmt(l.qty * l.price)}</span></div>
              ))}
            </div>
            <div className="receipt-tot"><span>Order total · {receiptOrder.cases} cases</span><b>${fmt(receiptOrder.total)}</b></div>
            <div className="modalbtns" style={{ marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setReceiptOrder(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => window.print()}>Print receipt</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast show">✓ {toast}</div>}
    </div>
  );
}
