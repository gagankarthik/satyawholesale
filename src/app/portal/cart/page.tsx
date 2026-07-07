"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fmt, productImg, offerActive, effPrice, useOrders, useSettings, taxBreakdown, orderRef,
  type Product, type OrderLine, type Order,
} from "@/lib/store";
import { Package, Check, Trash, Truck, Store, Calendar, Plus, Minus } from "@/components/Icons";
import { Button, EmptyState, Skeleton } from "@/components/ui";
import Image from "next/image";
import Link from "next/link";
import { usePortal } from "../PortalShell";
import { useAddresses } from "@/lib/addresses";
import Confetti from "@/components/Confetti";
import PrintReceipt from "@/components/PrintReceipt";

const FULFILMENTS = [
  { value: "Delivery", label: "Delivery", hint: "To your store", icon: <Truck /> },
  { value: "Pickup", label: "Pickup", hint: "At the warehouse", icon: <Store /> },
  { value: "Scheduled delivery", label: "Scheduled", hint: "Pick a date", icon: <Calendar /> },
];
const PAYMENTS = ["Net 15 terms", "Net 30 terms", "Card on delivery", "Cash on delivery"];
const STEPS = ["Cart", "Delivery", "Payment", "Review"];

/* format an ISO yyyy-mm-dd (from a <input type=date>) without a UTC shift */
const prettyDate = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

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
  const [fulfilment, setFulfilment] = useState(FULFILMENTS[0].value);
  const [schedDate, setSchedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<Order | null>(null);

  useEffect(() => { if (!shipId && addresses[0]) setShipId(addresses[0].id); }, [addresses, shipId]);
  useEffect(() => { if (!billId && addresses[0]) setBillId(addresses[0].id); }, [addresses, billId]);

  /* earliest schedulable date = tomorrow (local) */
  const minDate = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

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
  const isPickup = fulfilment === "Pickup";
  const isScheduled = fulfilment === "Scheduled delivery";
  const fulfilmentLabel = isScheduled && schedDate ? `Scheduled delivery · ${prettyDate(schedDate)}` : fulfilment;
  const taxes = useMemo(() => taxBreakdown(subtotal, false, settings), [subtotal, settings]);
  const tax = taxes.total;
  const deliveryFee = 0;
  const grand = subtotal + tax + deliveryFee;

  const shipAddr = useMemo(() => addresses.find((a) => a.id === shipId)?.addr ?? "", [addresses, shipId]);
  const billAddr = useMemo(
    () => (billSame ? shipAddr : addresses.find((a) => a.id === billId)?.addr ?? ""),
    [billSame, shipAddr, addresses, billId]
  );

  const hasAddress = addresses.length > 0;
  const schedOk = !isScheduled || !!schedDate;
  const canLeave = step === 0 ? cartLines.length > 0 : step === 1 ? !!shipAddr && !!billAddr && schedOk : true;

  const next = () => {
    if (!canLeave) {
      if (step === 1) flash(!schedOk ? "Choose a delivery date" : "Choose a delivery and billing address");
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const submit = () => {
    if (!cartLines.length || placing || !shipAddr || !billAddr) return;
    setPlacing(true);
    const lines: OrderLine[] = cartLines.map((l) => ({ id: l.p.id, name: l.p.name, qty: l.qty, price: effPrice(l.p) }));
    const order: Order = {
      ref: orderRef(),
      placed: Date.now(),
      store: STORE,
      lines, cases, total: subtotal, status: "Pending",
      payment, fulfilment: fulfilmentLabel, notes: notes.trim() || undefined,
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
      <div className="ln"><span>{settings.taxLabel} ({settings.taxRate}%)</span><span className="mono">${fmt(taxes.sales)}</span></div>
      {(settings.countyTaxRate ?? 0) > 0 && (
        <div className="ln"><span>{settings.countyTaxLabel} ({settings.countyTaxRate}%)</span><span className="mono">${fmt(taxes.county)}</span></div>
      )}
      <div className="ln"><span>{isPickup ? "Pickup" : isScheduled ? "Scheduled" : "Delivery"}</span><span className="mono" style={{ color: "var(--green)" }}>{isPickup ? "At warehouse" : isScheduled && schedDate ? prettyDate(schedDate) : "Free"}</span></div>
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
        <PrintReceipt order={placed} />
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
    <div className="checkoutpage rise-in">
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
              <div className="panel-h"><h3>Items</h3><span className="hint">{cases} {cases === 1 ? "case" : "cases"} · {cartLines.length} {cartLines.length === 1 ? "product" : "products"}</span></div>
              <table className="carttbl">
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col" className="r">Price</th>
                    <th scope="col" className="qty">Qty</th>
                    <th scope="col" className="r">Total</th>
                    <th scope="col"><span className="sr-only">Remove</span></th>
                  </tr>
                </thead>
                <tbody>
                  {cartLines.map(({ p, qty }) => (
                    <tr key={p.id}>
                      <td data-label="Product">
                        <div className="ct-prod">
                          <span className="th"><Image src={productImg(p)} alt="" fill sizes="76px" style={{ objectFit: "contain" }} /></span>
                          <div className="ct-info">
                            <div className="nm">{p.name}</div>
                            <div className="id mono">#{p.id} · {p.pack}</div>
                          </div>
                        </div>
                      </td>
                      <td className="r" data-label="Price">
                        <span className="ct-price-val">
                          <span className="mono">${fmt(effPrice(p))}</span><span className="ct-unit">/{p.unit}</span>
                          {offerActive(p) && <span className="ct-was mono">${fmt(p.price)}</span>}
                        </span>
                      </td>
                      <td className="qty" data-label="Qty">
                        <div className="ct-qty">
                          <button onClick={() => changeQty(p.id, -1)} aria-label="Remove one case"><Minus /></button>
                          <span className="mono">{qty}</span>
                          <button onClick={() => changeQty(p.id, 1)} disabled={qty >= p.stock} aria-label="Add one case"><Plus /></button>
                        </div>
                      </td>
                      <td className="r ct-total mono" data-label="Total">${fmt(qty * effPrice(p))}</td>
                      <td className="ct-del-cell r">
                        <button className="ct-del" onClick={() => removeLine(p.id)} aria-label={`Remove ${p.name} from cart`}><Trash /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* STEP 2 — delivery + addresses */}
          {step === 1 && (
            <div className="panel co">
              <div className="panel-h"><h3>Delivery</h3></div>
              <div className="cofield">
                <span className="colabel">How would you like it?</span>
                <div className="co-fulfil" role="radiogroup" aria-label="Fulfilment method">
                  {FULFILMENTS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      role="radio"
                      aria-checked={fulfilment === f.value}
                      className={`co-fopt ${fulfilment === f.value ? "on" : ""}`}
                      onClick={() => setFulfilment(f.value)}
                    >
                      <span className="co-fopt-ic">{f.icon}</span>
                      <span className="co-fopt-tx"><b>{f.label}</b><em>{f.hint}</em></span>
                    </button>
                  ))}
                </div>
                {isScheduled && (
                  <label className="field co-sched">
                    <span>Preferred delivery date</span>
                    <input type="date" min={minDate} value={schedDate} onChange={(e) => setSchedDate(e.target.value)} />
                  </label>
                )}
              </div>

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
                <div className="kv2"><span>Fulfilment</span><b>{fulfilmentLabel}</b></div>
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
