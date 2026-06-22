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
  Boxes, Gear, Bag, Search, Check,
} from "@/components/Icons";
import Brand from "@/components/Brand";

const SIDE_GROUPS: { label: string; keys: DeptKey[] }[] = [
  { label: "Tobacco & vapor", keys: ["tobacco", "vape", "smoke"] },
  { label: "Center store", keys: ["hba", "grocery"] },
  { label: "General merch", keys: ["auto", "acc"] },
];

const DEPT_ICON: Record<DeptKey, (p: { className?: string }) => React.ReactElement> = {
  tobacco: DeptLeaf, vape: DeptDrop, smoke: DeptFlame, hba: DeptPlus,
  grocery: DeptCart, auto: DeptCar, acc: DeptPhone,
};
const DEPT_COLOR: Record<DeptKey, string> = {
  tobacco: "#a85a2c", vape: "#2f6fd8", smoke: "#d6560f", hba: "#6b4ed8",
  grocery: "#b07d00", auto: "#2f6fd8", acc: "#2f9e44",
};
const ush = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;
const OFFERS = [
  { id: "1586528116311-ad8dd3c8310d", tag: "New arrivals", h: "Fresh vapor & disposables", p: "The latest Mr Fog, Breeze and EB Design — just landed by the case." },
  { id: "1604719312566-8912e9227c6a", tag: "This week's deal", h: "Stock up & save by the case", p: "Volume pricing across candy, snacks and beverages." },
  { id: "1601584115197-04ecc0da31d7", tag: "Free next-day delivery", h: "Order by 2 PM, we deliver tomorrow", p: "Across Greater Cincinnati and the Tri-State." },
];

type Cart = Record<number, number>; // id -> cases

export default function Portal() {
  const { products, ready } = useInventory();
  const { placeOrder } = useOrders();

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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ "Tobacco & vapor": true, "Center store": true, "General merch": true });

  useEffect(() => {
    if (!signedIn) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % OFFERS.length), 5000);
    return () => clearInterval(t);
  }, [signedIn]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: products.length };
    DEPTS.forEach((d) => (c[d.key] = products.filter((p) => p.dep === d.key).length));
    return c;
  }, [products]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        (dept === "all" || p.dep === dept) &&
        (q === "" || p.name.toLowerCase().includes(q) || String(p.id).includes(q))
    );
  }, [products, dept, query]);

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
              <p>Browse 5,100+ SKUs, build orders by the case, and reorder in two taps.</p>
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
      <aside className="side">
        <Link href="/" className="side-brand"><Brand dark height={30} /></Link>
        <div className="snav">
          <button className={`sitem ${dept === "all" ? "on" : ""}`} onClick={() => setDept("all")}>
            <span className="ic"><Boxes /></span> All products <span className="cb">{counts.all}</span>
          </button>
          {SIDE_GROUPS.map((g) => {
            const open = openGroups[g.label];
            return (
              <div key={g.label}>
                <button className={`sgrouphead ${open ? "" : "closed"}`} onClick={() => setOpenGroups((s) => ({ ...s, [g.label]: !s[g.label] }))} aria-expanded={open}>
                  {g.label}
                  <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <div className={`sgroup-items ${open ? "" : "closed"}`}>
                  {g.keys.map((key) => {
                    const d = DEPTS.find((x) => x.key === key)!;
                    const Ic = DEPT_ICON[key];
                    return (
                      <button key={key} className={`sitem ${dept === key ? "on" : ""}`} onClick={() => setDept(key)}>
                        <span className="ic"><Ic /></span> {d.name} <span className="cb">{counts[key]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
          <div className="tt">
            {dept === "all" ? "All products" : deptName(dept)}
            <small>{dept === "all" ? "Showing the full catalog" : `${counts[dept]} SKUs in ${deptName(dept)}`}</small>
          </div>
          <div className="search">
            <Search />
            <input
              placeholder="Search by name or item number…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="cart-btn" onClick={() => setCartOpen(true)} aria-label={`Open order, ${cases} cases`}>
            <Bag /> Order <span className="badge">{cases}</span>
          </button>
        </div>

        <div className="content">
          <div className="chips">
            <button className={`chip ${dept === "all" ? "on" : ""}`} onClick={() => setDept("all")}>
              All <span className="c">{counts.all}</span>
            </button>
            {DEPTS.map((d) => (
              <button key={d.key} className={`chip ${dept === d.key ? "on" : ""}`} onClick={() => setDept(d.key)}>
                {d.name} <span className="c">{counts[d.key]}</span>
              </button>
            ))}
          </div>

          {!ready ? (
            <div className="empty"><div className="ei">⏳</div><h3>Loading catalog…</h3></div>
          ) : dept === "all" && !query.trim() ? (
            <>
              <div className="pcarousel" aria-label="Offers and new arrivals">
                {OFFERS.map((o, i) => (
                  <div key={o.id} className={`pcslide ${i === slide ? "on" : ""}`}>
                    <Image src={ush(o.id)} alt="" fill sizes="100vw" style={{ objectFit: "cover" }} priority={i === 0} />
                    <div className="pctext">
                      <div className="pctag">{o.tag}</div>
                      <h3>{o.h}</h3>
                      <p>{o.p}</p>
                    </div>
                  </div>
                ))}
                <div className="pcdots">
                  {OFFERS.map((o, i) => (
                    <button key={o.id} className={i === slide ? "on" : ""} onClick={() => setSlide(i)} aria-label={o.tag} />
                  ))}
                </div>
              </div>
              {DEPTS.map((d) => {
                const items = products.filter((p) => p.dep === d.key);
                if (!items.length) return null;
                return (
                  <section className="catrow" key={d.key}>
                    <div className="catrow-head">
                      <h3>{d.name} <span className="cnt">{items.length} SKUs</span></h3>
                      <button className="viewall" onClick={() => setDept(d.key)}>View all →</button>
                    </div>
                    <div className="catrow-scroll">{items.slice(0, 10).map(card)}</div>
                  </section>
                );
              })}
            </>
          ) : !list.length ? (
            <div className="empty">
              <div className="ei">🔍</div>
              <h3>No items match that search</h3>
              <p>Try a different term or clear the filter.</p>
            </div>
          ) : (
            <div className="pgrid">{list.map(card)}</div>
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

      {toast && <div className="toast show">✓ {toast}</div>}
    </div>
  );
}
