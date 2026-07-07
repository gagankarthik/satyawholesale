"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { productImg, taxBreakdown, orderRef, useInventory, useOrders, useSettings, type Order, type OrderLine } from "@/lib/store";
import { useCustomers } from "@/lib/wms";
import { Plus, Minus, Close } from "@/components/Icons";
import { m, type Flash } from "../shared";
import { Breadcrumb, Button, Combobox } from "@/components/ui";
import { PaymentTermsSelect, PaymentTermHint } from "@/components/PaymentTerms";
import { DEFAULT_PAYMENT_TERM } from "@/lib/paymentTerms";

/* =======================================================================
   CREATE ORDER (admin, on behalf of a customer)
   ======================================================================= */
export function AdminOrderCreate({ flash }: { flash: Flash }) {
  const router = useRouter();
  const { placeOrder } = useOrders();
  const { products } = useInventory();
  const { customers } = useCustomers();
  const { settings } = useSettings();

  const [custId, setCustId] = useState(customers[0]?.id ?? "");
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [fulfilment, setFulfilment] = useState("Delivery");
  const [payment, setPayment] = useState(DEFAULT_PAYMENT_TERM);
  const [taxExempt, setTaxExempt] = useState(false);
  const [deliv, setDeliv] = useState("");
  const [discKind, setDiscKind] = useState<"amount" | "percent">("amount");
  const [discVal, setDiscVal] = useState("");
  const [discReason, setDiscReason] = useState("");

  const cust = customers.find((c) => c.id === custId);
  const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const cases = lines.reduce((s, l) => s + l.qty, 0);
  const ntx = taxBreakdown(subtotal, taxExempt, settings);
  const tax = ntx.total;
  const deliveryFee = Math.max(0, Number(deliv) || 0);
  const discVnum = Number(discVal) || 0;
  const discount = Math.max(0, discKind === "percent" ? Math.round(subtotal * discVnum) / 100 : discVnum);
  const grand = subtotal + tax + deliveryFee - discount;

  const addLine = (id: string) => {
    const p = products.find((x) => String(x.id) === id);
    if (!p) return;
    if (lines.some((l) => l.id === p.id)) { flash("Already on this order"); return; }
    setLines((ls) => [...ls, { id: p.id, name: p.name, qty: 1, price: p.price }]);
  };
  const setQty = (id: number, d: number) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, qty: Math.max(1, l.qty + d) } : l)));
  const drop = (id: number) => setLines((ls) => ls.filter((l) => l.id !== id));

  const create = () => {
    if (!cust) { flash("Pick a customer"); return; }
    if (!lines.length) { flash("Add at least one product"); return; }
    const isPickup = fulfilment.includes("pickup");
    const order: Order = {
      ref: orderRef(),
      placed: Date.now(),
      store: cust.store,
      lines, cases, total: subtotal, status: "Pending",
      payment, fulfilment,
      tracking: isPickup ? "PICKUP" : "1Z" + Math.floor(100000000 + Math.random() * 899999999) + "OH",
      deliveryFee, tax, discount,
      discountReason: discount > 0 ? (discReason.trim() || (discKind === "percent" ? `${discVnum}% off` : undefined)) : undefined,
      paymentStatus: payment.includes("Net") ? "Unpaid" : "Paid",
      billing: cust.address ?? cust.store, shipping: cust.address ?? cust.store,
      taxExempt,
    };
    placeOrder(order); // stock is decremented server-side on create
    flash("Order created");
    router.push(`/admin/orders/${order.ref}`);
  };

  return (
    <>
      <Breadcrumb items={[{ label: "Orders", href: "/admin/orders" }, { label: "New order" }]} />
      <header className="adminbar">
        <div><h1>New order</h1><p>Create an order on behalf of a customer account</p></div>
      </header>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="panel anim-in">
            <div className="panel-h"><h3>Customer</h3></div>
            <label className="field"><span>Customer account</span>
              <select value={custId} onChange={(e) => setCustId(e.target.value)}>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.store} · {c.id}{c.status !== "Active" ? ` (${c.status})` : ""}</option>)}
              </select>
            </label>
            {cust && <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>{cust.contact} · {cust.email}{cust.address ? ` · ${cust.address}` : ""}</p>}
          </div>

          <div className="panel anim-in">
            <div className="panel-h"><h3>Products</h3><span className="hint">{cases} cases · {lines.length} items</span></div>
            {lines.length ? (
              <div className="tablewrap">
              <table className="invtable flat">
                <thead><tr><th>Product</th><th className="r">Qty</th><th className="r">Unit</th><th className="r">Line</th><th></th></tr></thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id}>
                      <td className="pn"><div className="pn-cell"><span className="pn-thumb"><Image src={productImg(products.find((p) => p.id === l.id) ?? {})} alt="" fill sizes="30px" style={{ objectFit: "contain" }} /></span><div style={{ fontSize: 13.5 }}>{l.name}<div className="mono muted" style={{ fontSize: 11 }}>{products.find((p) => p.id === l.id)?.sku || "—"}</div></div></div></td>
                      <td className="r"><div className="qstep"><button type="button" onClick={() => setQty(l.id, -1)}><Minus /></button><span className="mono">{l.qty}</span><button type="button" onClick={() => setQty(l.id, 1)}><Plus /></button></div></td>
                      <td className="r mono">{m(l.price)}</td>
                      <td className="r mono">{m(l.qty * l.price)}</td>
                      <td className="r"><button type="button" className="ia del" onClick={() => drop(l.id)} aria-label="Remove line"><Close /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            ) : <p className="muted" style={{ fontSize: 14, padding: "6px 0 14px" }}>No products yet. Pick one from the list below to start the order.</p>}
            <div className="addline">
              <Combobox
                ariaLabel="Add a product to this order"
                placeholder="Add a product: type a name or SKU"
                value=""
                onChange={addLine}
                options={products.filter((p) => !lines.some((l) => l.id === p.id)).map((p) => ({ value: String(p.id), label: p.name, hint: m(p.price) }))}
              />
            </div>
          </div>
        </div>

        <aside className="detail-side">
          <div className="panel anim-in">
            <div className="panel-h"><h3>Order setup</h3></div>
            <div className="kvs">
              <div className="kv2 col"><span>Fulfilment</span>
                <select value={fulfilment} onChange={(e) => setFulfilment(e.target.value)}><option>Delivery</option><option>Pickup</option><option>Scheduled delivery</option></select>
              </div>
              <div className="kv2 col"><span>Payment</span>
                <PaymentTermsSelect ariaLabel="Payment terms" value={payment} onChange={setPayment} />
                <PaymentTermHint term={payment} />
              </div>
              <label className="taxtoggle">
                <input type="checkbox" checked={taxExempt} onChange={(e) => setTaxExempt(e.target.checked)} />
                <span><b>Resale tax-exempt</b><small>{taxExempt ? "No sales tax" : `${settings.taxLabel} ${settings.taxRate}%`}</small></span>
              </label>
              <div className="kv2 col"><span>Delivery fee ($)</span>
                <input type="number" min={0} step="0.01" value={deliv} onChange={(e) => setDeliv(e.target.value)} placeholder="0.00" />
              </div>
              <div className="kv2 col"><span>Discount</span>
                <div className="discrow">
                  <select value={discKind} onChange={(e) => setDiscKind(e.target.value as "amount" | "percent")}><option value="amount">$ amount</option><option value="percent">% percent</option></select>
                  <input type="number" min={0} step="0.01" value={discVal} onChange={(e) => setDiscVal(e.target.value)} placeholder={discKind === "percent" ? "10" : "25.00"} />
                </div>
              </div>
              <div className="kv2 col"><span>Discount reason</span>
                <input value={discReason} onChange={(e) => setDiscReason(e.target.value)} placeholder="Loyalty, promo…" />
              </div>
            </div>
          </div>
          <div className="panel anim-in">
            <div className="panel-h"><h3>Summary</h3></div>
            <div className="totals">
              <div className="tl"><span>Subtotal · {cases} cases</span><span className="mono">{m(subtotal)}</span></div>
              {discount > 0 && <div className="tl"><span>Discount{discReason.trim() ? ` · ${discReason.trim()}` : discKind === "percent" ? ` · ${discVnum}%` : ""}</span><span className="mono">−{m(discount)}</span></div>}
              {taxExempt ? (
                <div className="tl"><span>Tax (resale exempt)</span><span className="mono">{m(0)}</span></div>
              ) : (
                <>
                  <div className="tl"><span>{settings.taxLabel} ({settings.taxRate}%)</span><span className="mono">{m(ntx.sales)}</span></div>
                  {(settings.countyTaxRate ?? 0) > 0 && <div className="tl"><span>{settings.countyTaxLabel} ({settings.countyTaxRate}%)</span><span className="mono">{m(ntx.county)}</span></div>}
                </>
              )}
              <div className="tl"><span>Delivery fee</span><span className="mono" style={{ color: deliveryFee ? "inherit" : "var(--green)" }}>{deliveryFee ? m(deliveryFee) : "Free"}</span></div>
              <div className="tl grand"><span>Order total</span><b>{m(grand)}</b></div>
            </div>
            <div className="modalbtns" style={{ marginTop: 14 }}>
              <Button variant="ghost" size="sm" onClick={() => router.push("/admin/orders")}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={create}>Create order</Button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
