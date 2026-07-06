"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fmt, productImg, offerActive, effPrice, useOrders, useSettings, computeTax,
  type Product, type OrderLine, type Order,
} from "@/lib/store";
import { Package, Check } from "@/components/Icons";
import { Button, EmptyState, Skeleton } from "@/components/ui";
import Image from "next/image";
import Link from "next/link";
import { usePortal } from "../PortalShell";
import { useAddresses } from "@/lib/addresses";
import Confetti from "@/components/Confetti";

const FULFILMENTS = ["Next-day delivery", "Cash & carry pickup", "Scheduled delivery"];
const PAYMENTS = ["Net 15 terms", "Net 30 terms", "Card on delivery", "Cash on delivery"];
const STEPS = ["Cart", "Delivery", "Payment", "Review"];

export default function CartPage() {
  const { products, ready, cart, changeQty, removeLine, clearCart, STORE, flash } = usePortal();
  const { placeOrder } = useOrders();
  const { settings } = useSettings();
  const { addresses } = useAddresses(STORE);

  const [step, setStep] = useState(0);
  const [shipId, setShipId] = useState("");
  const [billSame, setBillSame] = useState(true);
  const [billId, setBillId] = useState("");
  const [payment, setPayment] = useState(PAYMENTS[0]);
  const [fulfilment, setFulfilment] = useState(FULFILMENTS[0]);
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<Order | null>(null);

  useEffect(() => { if (!shipId && addresses[0]) setShipId(addresses[0].id); }, [addresses, shipId]);
  useEffect(() => { if (!billId && addresses[0]) setBillId(addresses[0].id); }, [addresses, billId]);

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
  const subtotal = cartLines.reduce((s, l) => s + l.qty * effPrice(l.p), 0);
  const isPickup = fulfilment.includes("pickup");
  const tax = useMemo(() => computeTax(subtotal, false, settings.taxRate), [subtotal, settings.taxRate]);
  const deliveryFee = 0;
  const grand = subtotal + tax + deliveryFee;

  const shipAddr = useMemo(() => addresses.find((a) => a.id === shipId)?.addr ?? "", [addresses, shipId]);
  const billAddr = useMemo(
    () => (billSame ? shipAddr : addresses.find((a) => a.id === billId)?.addr ?? ""),
    [billSame, shipAddr, addresses, billId]
  );

  const hasAddress = addresses.length > 0;
  const canLeave = step === 0 ? cartLines.length > 0 : step === 1 ? !!shipAddr && !!billAddr : true;

  const next = () => {
    if (!canLeave) { if (step === 1) flash("Choose a delivery and billing address"); return; }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const submit = () => {
    if (!cartLines.length || placing || !shipAddr || !billAddr) return;
    setPlacing(true);
    const lines: OrderLine[] = cartLines.map((l) => ({ id: l.p.id, name: l.p.name, qty: l.qty, price: effPrice(l.p) }));
    const order: Order = {
      ref: "SW-" + Math.floor(4000 + Math.random() * 5000),
      placed: Date.now(),
      store: STORE,
      lines, cases, total: subtotal, status: "Pending",
      payment, fulfilment, notes: notes.trim() || undefined,
      tracking: isPickup ? "PICKUP" : undefined,
      deliveryFee, tax, discount: 0,
      taxExempt: false,
      paymentStatus: payment.includes("Net") ? "Unpaid" : "Paid",
      billing: billAddr, shipping: shipAddr,
    };
    placeOrder(order); // stock is decremented server-side on create
    clearCart();
    setPlaced(order);
    setPlacing(false);
  };

  const Totals = () => (
    <div className="ordersum">
      <div className="ln"><span>Subtotal · {cases} {cases === 1 ? "case" : "cases"}</span><span className="mono">${fmt(subtotal)}</span></div>
      <div className="ln"><span>{settings.taxLabel} ({settings.taxRate}%)</span><span className="mono">${fmt(tax)}</span></div>
      <div className="ln"><span>{isPickup ? "Pickup" : "Delivery"}</span><span className="mono" style={{ color: "var(--green)" }}>{isPickup ? "At warehouse" : "Next-day · Free"}</span></div>
      <div className="ln tot"><span>Order total</span><b>${fmt(grand)}</b></div>
    </div>
  );

  if (!ready) {
    return (
      <div className="cartpage od-cols">
        <div className="panel">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={72} radius={12} />)}</div>
        <aside className="od-side"><div className="panel"><Skeleton height={220} radius={12} /></div></aside>
      </div>
    );
  }

  /* ---------- order placed: confirmation + confetti ---------- */
  if (placed) {
    return (
      <div className="co-done rise-in">
        <Confetti />
        <div className="co-done-card">
          <span className="co-done-ic" aria-hidden="true"><Check /></span>
          <span className="co-done-eyebrow mono">Order {placed.ref}</span>
          <h1>Congratulations!</h1>
          <p>Your order is in. We&apos;ll review and ship it shortly, and you can track it from your orders anytime.</p>

          <div className="co-done-sum">
            <div className="ordersum">
              <div className="ln"><span>Items</span><span className="mono">{placed.lines.length} · {placed.cases} {placed.cases === 1 ? "case" : "cases"}</span></div>
              <div className="ln"><span>Ship to</span><span className="co-done-addr">{placed.shipping}</span></div>
              <div className="ln"><span>Payment</span><span className="mono">{placed.payment}</span></div>
              <div className="ln tot"><span>Order total</span><b>${fmt((placed.total ?? 0) + (placed.tax ?? 0) + (placed.deliveryFee ?? 0))}</b></div>
            </div>
          </div>

          <div className="co-done-actions">
            <Button href={`/portal/orders/${placed.ref}`} variant="primary">View order →</Button>
            <Button variant="ghost" onClick={() => window.print()}>Print</Button>
            <Button href="/portal/products" variant="ghost">Continue shopping</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!cartLines.length) {
    return (
      <EmptyState
        variant="light"
        icon={<Package />}
        title="Your cart is empty"
        description="Add products by the case and they'll stack up here for your next order."
        action={<Button href="/portal/products" variant="primary">Browse products</Button>}
      />
    );
  }

  return (
    <div className="checkout rise-in">
      {/* step indicator */}
      <ol className="steps" aria-label="Checkout steps">
        {STEPS.map((label, i) => (
          <li key={label} className={`step ${i === step ? "on" : ""} ${i < step ? "done" : ""}`}>
            <button type="button" onClick={() => i <= step && setStep(i)} disabled={i > step}>
              <span className="step-n">{i < step ? <Check /> : i + 1}</span>
              <span className="step-l">{label}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="od-cols">
        <div className="co-main">
          {/* STEP 1 — cart */}
          {step === 0 && (
            <div className="panel">
              <div className="panel-h"><h3>Your cart</h3><span className="hint">{cases} {cases === 1 ? "case" : "cases"} · {cartLines.length} items</span></div>
              <div className="cartitems">
                {cartLines.map(({ p, qty }) => (
                  <div className="citem" key={p.id}>
                    <span className="th"><Image src={productImg(p)} alt="" fill sizes="44px" style={{ objectFit: "contain" }} /></span>
                    <div className="cmid">
                      <div className="nm">{p.name}</div>
                      <div className="id mono">#{p.id} · {p.pack} · ${fmt(effPrice(p))}/{p.unit}{offerActive(p) ? ` (was $${fmt(p.price)})` : ""}</div>
                      <div className="ctl">
                        <button onClick={() => changeQty(p.id, -1)} aria-label="Remove one case">−</button>
                        <span className="mono">{qty}</span>
                        <button onClick={() => changeQty(p.id, 1)} disabled={qty >= p.stock} aria-label="Add one case">+</button>
                      </div>
                    </div>
                    <div className="crt">
                      <div className="lp mono">${fmt(qty * effPrice(p))}</div>
                      <button className="rm" onClick={() => removeLine(p.id)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2 — delivery + addresses */}
          {step === 1 && (
            <div className="panel co">
              <div className="panel-h"><h3>Delivery</h3></div>
              <label className="field"><span>Fulfilment</span>
                <select value={fulfilment} onChange={(e) => setFulfilment(e.target.value)}>
                  {FULFILMENTS.map((f) => <option key={f}>{f}</option>)}
                </select>
              </label>

              <div className="cofield">
                <div className="colabel-row">
                  <span className="colabel">Shipping address</span>
                  <Link href="/portal/addresses" className="linklike">Manage addresses</Link>
                </div>
                {hasAddress ? (
                  <label className="field">
                    <span className="sr-only">Shipping address</span>
                    <select value={shipId} onChange={(e) => setShipId(e.target.value)} aria-label="Shipping address">
                      {addresses.map((a) => <option key={a.id} value={a.id}>{a.label} — {a.addr}</option>)}
                    </select>
                  </label>
                ) : (
                  <div className="co-noaddr">
                    <p>No saved addresses yet. Add one to check out.</p>
                    <Button href="/portal/addresses" variant="ghost" size="sm">Add an address</Button>
                  </div>
                )}
              </div>

              <div className="cofield">
                <span className="colabel">Billing address</span>
                <label className="co-check">
                  <input type="checkbox" checked={billSame} onChange={(e) => setBillSame(e.target.checked)} />
                  <span>Same as delivery address</span>
                </label>
                {!billSame && hasAddress && (
                  <label className="field">
                    <span className="sr-only">Billing address</span>
                    <select value={billId} onChange={(e) => setBillId(e.target.value)} aria-label="Billing address">
                      {addresses.map((a) => <option key={a.id} value={a.id}>{a.label} — {a.addr}</option>)}
                    </select>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* STEP 3 — payment */}
          {step === 2 && (
            <div className="panel co">
              <div className="panel-h"><h3>Payment</h3></div>
              <label className="field"><span>Payment terms</span>
                <select value={payment} onChange={(e) => setPayment(e.target.value)}>
                  {PAYMENTS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </label>
              <label className="field"><span>Delivery notes <em className="opt">optional</em></span>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Dock hours, PO number, etc." />
              </label>
            </div>
          )}

          {/* STEP 4 — review */}
          {step === 3 && (
            <div className="panel co">
              <div className="panel-h"><h3>Review your order</h3><span className="hint">{cartLines.length} items</span></div>
              <div className="co-review-lines">
                {cartLines.map(({ p, qty }) => (
                  <div className="co-rline" key={p.id}>
                    <span className="th"><Image src={productImg(p)} alt="" fill sizes="40px" style={{ objectFit: "contain" }} /></span>
                    <div className="co-rl-mid"><div className="nm">{p.name}</div><div className="id mono">#{p.id} · {qty} × ${fmt(effPrice(p))}</div></div>
                    <div className="mono co-rl-amt">${fmt(qty * effPrice(p))}</div>
                  </div>
                ))}
              </div>
              <div className="co-review-meta">
                <div className="kv2"><span>Fulfilment</span><b>{fulfilment}</b></div>
                <div className="kv2"><span>Payment</span><b>{payment}</b></div>
                <div className="kv2"><span>Ship to</span><b>{shipAddr}</b></div>
                <div className="kv2"><span>Bill to</span><b>{billAddr}</b></div>
                {notes.trim() && <div className="kv2 full"><span>Notes</span><b>{notes.trim()}</b></div>}
              </div>
            </div>
          )}
        </div>

        {/* persistent summary + step navigation */}
        <aside className="od-side">
          <div className="panel">
            <Totals />
            <div className="co-nav">
              {step > 0 && <Button variant="ghost" fullWidth onClick={back}>← Back</Button>}
              {step < STEPS.length - 1 ? (
                <Button variant="primary" fullWidth onClick={next} disabled={!canLeave}>
                  {step === 0 ? "Continue to delivery →" : step === 1 ? "Continue to payment →" : "Review order →"}
                </Button>
              ) : (
                <Button variant="primary" fullWidth onClick={submit} loading={placing} disabled={placing || !shipAddr || !billAddr}>
                  {placing ? "Placing order…" : "Place order →"}
                </Button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
