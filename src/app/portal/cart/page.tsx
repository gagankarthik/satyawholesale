"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fmt, useOrders, commitStockForOrder,
  type Product, type OrderLine, type Order,
} from "@/lib/store";
import { Package, Check } from "@/components/Icons";
import { Button, EmptyState } from "@/components/ui";
import Image from "next/image";
import { usePortal } from "../PortalShell";
import { ADDRESSES } from "../meta";

const FULFILMENTS = ["Next-day delivery", "Cash & carry pickup", "Scheduled delivery"];
const PAYMENTS = ["Net 15 terms", "Net 30 terms", "Card on delivery", "Cash on delivery"];

export default function CartPage() {
  const { products, cart, changeQty, removeLine, clearCart, STORE, flash } = usePortal();
  const { placeOrder } = useOrders();
  const router = useRouter();

  const [address, setAddress] = useState(ADDRESSES[0].addr);
  const [payment, setPayment] = useState(PAYMENTS[0]);
  const [fulfilment, setFulfilment] = useState(FULFILMENTS[0]);
  const [notes, setNotes] = useState("");

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
  const isPickup = fulfilment.includes("pickup");

  const submit = () => {
    if (!cartLines.length) return;
    const lines: OrderLine[] = cartLines.map((l) => ({ id: l.p.id, name: l.p.name, qty: l.qty, price: l.p.price }));
    const order: Order = {
      ref: "SW-" + Math.floor(4000 + Math.random() * 5000),
      placed: Date.now(),
      store: STORE,
      lines, cases, total: subtotal, status: "Pending",
      payment, fulfilment, notes: notes.trim() || undefined,
      // No tracking at placement — the warehouse assigns it when the order ships.
      tracking: isPickup ? "PICKUP" : undefined,
      deliveryFee: 0, tax: 0, discount: 0,
      taxExempt: false, // sales tax applies unless admin marks resale-exempt
      paymentStatus: payment.includes("Net") ? "Unpaid" : "Paid",
      billing: address, shipping: address,
    };
    placeOrder(order);
    commitStockForOrder(lines);
    clearCart();
    flash("Order placed");
    router.push(`/portal/orders/${order.ref}`);
  };

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
              <span className="th"><Image src="/coming-soon.webp" alt="" fill sizes="44px" style={{ objectFit: "contain" }} /></span>
              <div className="cmid">
                <div className="nm">{p.name}</div>
                <div className="id mono">#{p.id} · {p.pack} · ${fmt(p.price)}/{p.unit}</div>
                <div className="ctl">
                  <button onClick={() => changeQty(p.id, -1)} aria-label="Remove one case">−</button>
                  <span className="mono">{qty}</span>
                  <button onClick={() => changeQty(p.id, 1)} disabled={qty >= p.stock} aria-label="Add one case">+</button>
                </div>
              </div>
              <div className="crt">
                <div className="lp mono">${fmt(qty * p.price)}</div>
                <button className="rm" onClick={() => removeLine(p.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="od-side">
        <div className="panel">
          <div className="panel-h"><h3>Checkout</h3></div>
          <div className="cofield">
            <span className="colabel">Delivery address</span>
            <div className="addrlist">
              {ADDRESSES.map((a) => (
                <label key={a.id} className={`addropt ${address === a.addr ? "on" : ""}`}>
                  <input type="radio" name="ship" checked={address === a.addr} onChange={() => setAddress(a.addr)} />
                  <span className="addrtext"><b>{a.label}</b><small>{a.addr}</small></span>
                  <span className="addrtick" aria-hidden="true"><Check /></span>
                </label>
              ))}
            </div>
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
            <div className="ln"><span>{isPickup ? "Pickup" : "Delivery"}</span><span className="mono" style={{ color: "var(--green)" }}>{isPickup ? "At warehouse" : "Next-day · Free"}</span></div>
            <div className="ln tot"><span>Order total</span><b>${fmt(subtotal)}</b></div>
          </div>
          <Button variant="primary" fullWidth onClick={submit}>Place order →</Button>
          <p className="ordersum-note">{payment} · ships to {address.split(",")[0]}. A tracking number is added once the warehouse ships your order.</p>
        </div>
      </aside>
    </div>
  );
}
