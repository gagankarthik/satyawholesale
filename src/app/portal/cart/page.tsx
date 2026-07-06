"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fmt, productImg, offerActive, effPrice, useOrders, useSettings, computeTax,
  type Product, type OrderLine, type Order,
} from "@/lib/store";
import { Package } from "@/components/Icons";
import { Button, EmptyState, Skeleton } from "@/components/ui";
import Image from "next/image";
import Link from "next/link";
import { usePortal } from "../PortalShell";
import { useAddresses } from "@/lib/addresses";

const FULFILMENTS = ["Next-day delivery", "Cash & carry pickup", "Scheduled delivery"];
const PAYMENTS = ["Net 15 terms", "Net 30 terms", "Card on delivery", "Cash on delivery"];

export default function CartPage() {
  const { products, ready, cart, changeQty, removeLine, clearCart, STORE, flash } = usePortal();
  const { placeOrder } = useOrders();
  const { settings } = useSettings();
  const { addresses } = useAddresses(STORE);
  const router = useRouter();

  const [addressId, setAddressId] = useState("");
  const [payment, setPayment] = useState(PAYMENTS[0]);
  const [fulfilment, setFulfilment] = useState(FULFILMENTS[0]);
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);

  // Default to the first saved address once the account's list loads.
  useEffect(() => {
    if (!addressId && addresses[0]) setAddressId(addresses[0].id);
  }, [addresses, addressId]);

  // Addresses are managed on the Addresses page; checkout only selects one.
  const address = useMemo(() => addresses.find((a) => a.id === addressId)?.addr ?? "", [addresses, addressId]);

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
  // Sales tax defaults to the admin-configured rate; admin can still mark an order resale-exempt later.
  const tax = useMemo(() => computeTax(subtotal, false, settings.taxRate), [subtotal, settings.taxRate]);
  const deliveryFee = 0; // next-day delivery is free by default; admin may add a fee later
  const grand = subtotal + tax + deliveryFee;

  const submit = () => {
    if (!cartLines.length || placing || !address.trim()) return;
    setPlacing(true);
    const lines: OrderLine[] = cartLines.map((l) => ({ id: l.p.id, name: l.p.name, qty: l.qty, price: effPrice(l.p) }));
    const order: Order = {
      ref: "SW-" + Math.floor(4000 + Math.random() * 5000),
      placed: Date.now(),
      store: STORE,
      lines, cases, total: subtotal, status: "Pending",
      payment, fulfilment, notes: notes.trim() || undefined,
      // No tracking at placement — the warehouse assigns it when the order ships.
      tracking: isPickup ? "PICKUP" : undefined,
      deliveryFee, tax, discount: 0,
      taxExempt: false, // sales tax applies unless admin marks resale-exempt
      paymentStatus: payment.includes("Net") ? "Unpaid" : "Paid",
      billing: address, shipping: address,
    };
    placeOrder(order); // stock is decremented server-side on create
    clearCart();
    flash(`Order ${order.ref} placed`);
    router.push(`/portal/orders/${order.ref}`);
  };

  // While the catalog loads, cart lines can't resolve yet — show a skeleton
  // instead of flashing the empty-cart state.
  if (!ready) {
    return (
      <div className="cartpage od-cols">
        <div className="panel">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={72} radius={12} />)}</div>
        <aside className="od-side"><div className="panel"><Skeleton height={220} radius={12} /></div></aside>
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
    <div className="cartpage od-cols rise-in">
      <div className="panel">
        <div className="panel-h"><h3>Your cart</h3><span className="hint">{cases} cases · {cartLines.length} items</span></div>
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

      <aside className="od-side">
        <div className="panel co">
          <div className="panel-h"><h3>Checkout</h3></div>
          <div className="cofield">
            <div className="colabel-row">
              <span className="colabel">Delivery address</span>
              <Link href="/portal/addresses" className="linklike">Manage addresses</Link>
            </div>
            {addresses.length > 0 ? (
              <label className="field">
                <span className="sr-only">Choose a delivery address</span>
                <select value={addressId} onChange={(e) => setAddressId(e.target.value)} aria-label="Delivery address">
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>{a.label} — {a.addr}</option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="co-noaddr">
                <p>No saved addresses yet. Add one to check out.</p>
                <Button href="/portal/addresses" variant="ghost" size="sm">Add an address</Button>
              </div>
            )}
          </div>
          <label className="field"><span>Fulfilment</span>
            <select value={fulfilment} onChange={(e) => setFulfilment(e.target.value)}>
              {FULFILMENTS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          <label className="field"><span>Payment method</span>
            <select value={payment} onChange={(e) => setPayment(e.target.value)}>
              {PAYMENTS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label className="field"><span>Delivery notes</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Dock hours, PO number, etc." />
          </label>
        </div>

        <div className="panel">
          <div className="ordersum">
            <div className="ln"><span>Subtotal · {cases} cases</span><span className="mono">${fmt(subtotal)}</span></div>
            <div className="ln"><span>{settings.taxLabel} ({settings.taxRate}%)</span><span className="mono">${fmt(tax)}</span></div>
            <div className="ln"><span>{isPickup ? "Pickup" : "Delivery"}</span><span className="mono" style={{ color: "var(--green)" }}>{isPickup ? "At warehouse" : "Next-day · Free"}</span></div>
            <div className="ln tot"><span>Order total</span><b>${fmt(grand)}</b></div>
          </div>
          <Button variant="primary" fullWidth onClick={submit} loading={placing} disabled={placing || !address.trim()}>
            {placing ? "Placing order…" : "Place order →"}
          </Button>
          <p className="ordersum-note">{payment}{address.trim() ? ` · ships to ${address.split(",")[0]}` : ""}. A tracking number is added once the warehouse ships your order.</p>
        </div>
      </aside>
    </div>
  );
}
