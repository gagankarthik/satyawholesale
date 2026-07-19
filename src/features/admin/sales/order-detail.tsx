"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { productImg, taxBreakdown, statusSlug, useInventory, useOrders, useSettings, type Order, type OrderLine, type OrderStatus, type PayStatus } from "@/lib/store";
import OrderTracker from "@/components/OrderTracker";
import PrintReceipt from "@/components/PrintReceipt";
import { Search, Close, Plus, Minus, ArrowLeft, Printer } from "@/components/Icons";
import { useConfirm } from "@/components/Confirm";
import { m, type Flash } from "../shared";
import { Badge, Button, Combobox, Menu } from "@/components/ui";
import { ov, statusTone, payTone, O_STATUSES, PAY_STATUSES } from "./_shared";

/* Editable money adjustments + manual tracking for an order. */
function OrderAdjust({ order, patchOrder, taxRate, taxLabel, flash }: { order: Order; patchOrder: (ref: string, p: Partial<Order>) => void; taxRate: number; taxLabel: string; flash: Flash }) {
  const [deliv, setDeliv] = useState(String(order.deliveryFee ?? 0));
  const [dkind, setDkind] = useState<"amount" | "percent">("amount");
  const [dval, setDval] = useState("");
  const [dreason, setDreason] = useState(order.discountReason ?? "");
  const [track, setTrack] = useState(order.tracking && order.tracking !== "PICKUP" ? order.tracking : "");

  const applyDeliv = () => {
    const f = Math.max(0, Number(deliv) || 0);
    patchOrder(order.ref, { deliveryFee: f });
    flash("Delivery fee updated");
  };
  const applyDisc = () => {
    const val = Number(dval) || 0;
    if (val <= 0) { flash.error("Enter a discount amount"); return; }
    const amount = dkind === "percent" ? Math.round(order.total * val) / 100 : val;
    patchOrder(order.ref, { discount: Math.max(0, amount), discountReason: dreason.trim() || (dkind === "percent" ? `${val}% off` : undefined) });
    flash("Discount applied");
  };
  const clearDisc = () => { patchOrder(order.ref, { discount: 0, discountReason: undefined }); setDval(""); setDreason(""); flash("Discount cleared"); };
  const applyTrack = () => { patchOrder(order.ref, { tracking: track.trim() || undefined }); flash("Tracking updated"); };

  return (
    <div className="panel anim-in">
      <div className="panel-h"><h3>Adjustments</h3></div>
      <div className="adjform">
        <div className="adjsec">
          <div className="adjsec-h"><span>Delivery fee</span>{order.deliveryFee ? <span className="adjval">{m(order.deliveryFee)}</span> : <span className="adjval none">None</span>}</div>
          <div className="inline-apply"><input type="number" min={0} step="0.01" value={deliv} onChange={(e) => setDeliv(e.target.value)} placeholder="0.00" aria-label="Delivery fee ($)" /><Button variant="ghost" size="sm" onClick={applyDeliv}>Apply</Button></div>
        </div>

        <div className="adjsec">
          <div className="adjsec-h"><span>Discount</span>{order.discount ? <span className="adjval cut">−{m(order.discount)}</span> : <span className="adjval none">None</span>}</div>
          <div className="discrow">
            <select value={dkind} onChange={(e) => setDkind(e.target.value as "amount" | "percent")} aria-label="Discount type"><option value="amount">$ amount</option><option value="percent">% percent</option></select>
            <input type="number" min={0} step="0.01" value={dval} onChange={(e) => setDval(e.target.value)} placeholder={dkind === "percent" ? "10" : "25.00"} aria-label={dkind === "percent" ? "Discount percent" : "Discount amount ($)"} />
          </div>
          <input value={dreason} onChange={(e) => setDreason(e.target.value)} placeholder="Reason: loyalty, damaged case, promo…" aria-label="Discount reason" />
          <div className="adjbtns">
            {order.discount ? <Button variant="ghost" size="sm" onClick={clearDisc}>Clear</Button> : null}
            <Button variant="primary" size="sm" onClick={applyDisc}>Apply discount</Button>
          </div>
        </div>

        {order.tracking !== "PICKUP" && order.status !== "Pending" && order.status !== "Cancelled" && (
          <div className="adjsec">
            <div className="adjsec-h"><span>Tracking number</span>{order.tracking ? <span className="adjval">{order.tracking}</span> : <span className="adjval none">Not shipped</span>}</div>
            <div className="inline-apply"><input value={track} onChange={(e) => setTrack(e.target.value)} placeholder="1Z…" aria-label="Tracking number" /><Button variant="ghost" size="sm" onClick={applyTrack}>Save</Button></div>
            <small className="muted" style={{ fontSize: 11.5 }}>Added by the warehouse. Shown to the customer once saved.</small>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminOrderDetail({ id, flash }: { id: string; flash: Flash }) {
  const { orders, setStatus, patchOrder, removeOrder } = useOrders();
  const { products } = useInventory();
  const { settings } = useSettings();
  const router = useRouter();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<OrderLine[]>([]);
  const cur = orders.find((o) => o.ref === id) || null;

  if (!cur) {
    return (
      <>
        <Link className="detail-back" href="/admin/orders"><ArrowLeft /> Back to orders</Link>
        <div className="empty"><div className="ei" aria-hidden="true"><Search /></div><h3>Order not found</h3><p>It may have been deleted.</p></div>
      </>
    );
  }

  const v = ov(cur);
  const exempt = cur.taxExempt === true;
  const txb = taxBreakdown(cur.total, cur.taxExempt, settings);
  const tax = txb.total;
  const grand = cur.total + (cur.deliveryFee ?? 0) + tax - (cur.discount ?? 0);

  const startEdit = () => { setDraft(cur.lines.map((l) => ({ ...l }))); setEditing(true); };
  const draftCases = draft.reduce((s, l) => s + l.qty, 0);
  const draftTotal = draft.reduce((s, l) => s + l.qty * l.price, 0);
  const setQty = (lid: number, d: number) => setDraft((ls) => ls.map((l) => (l.id === lid ? { ...l, qty: Math.max(1, l.qty + d) } : l)));
  const dropLine = (lid: number) => setDraft((ls) => ls.filter((l) => l.id !== lid));
  const addLine = (id: string) => {
    const p = products.find((x) => String(x.id) === id);
    if (!p) return;
    if (draft.some((l) => l.id === p.id)) { flash.error("Already on this order"); return; }
    setDraft((ls) => [...ls, { id: p.id, name: p.name, qty: 1, price: p.price }]);
  };
  const saveItems = () => {
    if (!draft.length) { flash.error("An order needs at least one item"); return; }
    const total = draft.reduce((s, l) => s + l.qty * l.price, 0);
    const cases = draft.reduce((s, l) => s + l.qty, 0);
    patchOrder(cur.ref, { lines: draft, total, cases, tax: taxBreakdown(total, cur.taxExempt, settings).total });
    setEditing(false);
    flash("Order items updated");
  };
  const toggleExempt = (next: boolean) => {
    patchOrder(cur.ref, { taxExempt: next, tax: taxBreakdown(cur.total, next, settings).total });
    flash(next ? "Marked resale tax-exempt" : `${settings.taxLabel} applied`);
  };

  return (
    <>
      <Link className="detail-back" href="/admin/orders"><ArrowLeft /> Back to orders</Link>
      <header className="adminbar">
        <div><h1>{cur.ref}</h1><p>{cur.store} · placed {new Date(cur.placed).toLocaleString()}</p></div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="ghost" size="sm" iconLeft={<Printer />} onClick={() => window.print()}>Print receipt</Button>
          {cur.status !== "Cancelled" && cur.status !== "Completed" && (
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<Close />}
              style={{ color: "var(--red)" }}
              onClick={async () => {
                if (await confirm({ title: "Cancel order?", message: `Order ${cur.ref} will be marked cancelled and removed from the active fulfilment queue.`, confirmLabel: "Cancel order", danger: true })) {
                  setStatus(cur.ref, "Cancelled"); flash("Order cancelled");
                }
              }}
            >
              Cancel order
            </Button>
          )}
          {/* permanent delete lives in the overflow so it isn't a same-weight
              red button next to the reversible Cancel (Von Restorff) */}
          <Menu
            label="More order actions"
            items={[
              {
                label: "Delete order",
                danger: true,
                onSelect: async () => {
                  if (await confirm({ title: "Delete order?", message: `Order ${cur.ref} will be permanently removed.`, confirmLabel: "Delete order", danger: true })) {
                    removeOrder(cur.ref); router.push("/admin/orders"); flash("Order deleted");
                  }
                },
              },
            ]}
          />
        </div>
      </header>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="panel anim-in">
            <div className="panel-h"><h3>Fulfilment status</h3></div>
            <OrderTracker status={cur.status} />
          </div>
          <div className="panel anim-in">
            <div className="panel-h">
              <h3>Products ordered</h3>
              {editing
                ? <span className="hint">{draftCases} cases · {draft.length} items</span>
                : <Button variant="ghost" size="sm" onClick={startEdit}>Edit items</Button>}
            </div>

            {editing ? (
              <>
                <div className="p-3 overflow-x-auto">
                <table className="invtable flat lineitems">
                  <thead><tr><th scope="col">Product</th><th className="r" scope="col">Qty</th><th className="r" scope="col">Unit</th><th className="r" scope="col">Line</th><th scope="col"></th></tr></thead>
                  <tbody>
                    {draft.map((l) => (
                      <tr key={l.id}>
                        <td className="pn"><div className="pn-cell"><span className="pn-thumb"><Image src={productImg(products.find((p) => p.id === l.id) ?? {})} alt="" fill sizes="30px" style={{ objectFit: "contain" }} /></span><div style={{ fontSize: 13.5 }}>{l.name}<div className="mono muted" style={{ fontSize: 11 }}>{products.find((p) => p.id === l.id)?.sku || "—"}</div></div></div></td>
                        <td className="r">
                          <div className="qstep">
                            <button type="button" onClick={() => setQty(l.id, -1)} aria-label="Decrease"><Minus /></button>
                            <span className="mono">{l.qty}</span>
                            <button type="button" onClick={() => setQty(l.id, 1)} aria-label="Increase"><Plus /></button>
                          </div>
                        </td>
                        <td className="r mono">{m(l.price)}</td>
                        <td className="r mono">{m(l.qty * l.price)}</td>
                        <td className="r"><button type="button" className="ia del" onClick={() => dropLine(l.id)} aria-label="Remove line"><Close /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                <div className="addline">
                  <Combobox
                    ariaLabel="Add a product to this order"
                    placeholder="Add a product: type a name or SKU"
                    value=""
                    onChange={addLine}
                    options={products.filter((p) => !draft.some((l) => l.id === p.id)).map((p) => ({ value: String(p.id), label: p.name, hint: m(p.price) }))}
                  />
                </div>
                <div className="totals">
                  <div className="tl"><span>Subtotal · {draftCases} cases</span><span className="mono">{m(draftTotal)}</span></div>
                </div>
                <div className="modalbtns" style={{ marginTop: 14 }}>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={saveItems}>Save items</Button>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 overflow-x-auto">
                <table className="invtable flat lineitems">
                  <thead><tr><th scope="col">Products</th><th scope="col">Code</th><th className="r" scope="col">Qty</th><th className="r" scope="col">Unit price</th><th className="r" scope="col">Line total</th></tr></thead>
                  <tbody>
                    {cur.lines.map((l) => (
                      <tr key={l.id}>
                        <td className="pn"><div className="pn-cell"><span className="pn-thumb"><Image src={productImg(products.find((p) => p.id === l.id) ?? {})} alt="" fill sizes="30px" style={{ objectFit: "contain" }} /></span><span style={{ fontSize: 13.5 }}>{l.name}</span></div></td>
                        <td className="mono muted">{products.find((p) => p.id === l.id)?.sku || "—"}</td>
                        <td className="r mono">{l.qty}</td>
                        <td className="r mono">{m(l.price)}</td>
                        <td className="r mono">{m(l.qty * l.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                <div className="totals">
                  <div className="tl"><span>Subtotal · {cur.cases} cases</span><span className="mono">{m(cur.total)}</span></div>
                  <div className="tl"><span>Discount{cur.discountReason ? ` · ${cur.discountReason}` : ""}</span><span className="mono">−{m(v.discount)}</span></div>
                  {exempt ? (
                    <div className="tl"><span>Tax (resale exempt)</span><span className="mono">{m(0)}</span></div>
                  ) : (
                    <>
                      <div className="tl"><span>{settings.taxLabel} ({settings.taxRate}%)</span><span className="mono">{m(txb.sales)}</span></div>
                      {(settings.countyTaxRate ?? 0) > 0 && <div className="tl"><span>{settings.countyTaxLabel} ({settings.countyTaxRate}%)</span><span className="mono">{m(txb.county)}</span></div>}
                    </>
                  )}
                  <div className="tl"><span>Delivery fee</span><span className="mono" style={{ color: v.deliveryFee ? "inherit" : "var(--green)" }}>{v.deliveryFee ? m(v.deliveryFee) : "Free"}</span></div>
                  <div className="tl grand"><span>Order total</span><b>{m(grand)}</b></div>
                </div>
              </>
            )}
          </div>
        </div>

        <aside className="detail-side">
          <div className="panel anim-in">
            <div className="panel-h"><h3>Fulfillment</h3><Badge tone={statusTone(cur.status)}>{cur.status}</Badge></div>
            <div className="kvs">
              <div className="kv2"><span>Order ID</span><b className="mono">{cur.ref}</b></div>
              <div className="kv2"><span>Tracking</span><b className="mono">{v.tracking}</b></div>
              <div className="kv2"><span>Method</span><b>{cur.fulfilment || "Delivery"}</b></div>
              <div className="kv2"><span>Update status</span>
                {cur.status === "Cancelled" ? (
                  <Button variant="ghost" size="sm" onClick={() => { setStatus(cur.ref, "Pending"); flash("Order reinstated"); }}>Reinstate order</Button>
                ) : (
                  <select aria-label="Order status" className={`statussel s-${statusSlug(cur.status)}`} value={cur.status} onChange={(e) => { setStatus(cur.ref, e.target.value as OrderStatus); flash(`${cur.ref} marked ${e.target.value}`); }}>
                    {O_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                )}
              </div>
              <div className="kv2 col"><span>Message to customer</span>
                <textarea className="msgbox" rows={3} placeholder="e.g. Out for delivery, arriving before 2 PM." defaultValue={cur.adminNote || ""} key={cur.ref} onBlur={(e) => { const t = e.target.value.trim(); if (t !== (cur.adminNote || "")) { patchOrder(cur.ref, { adminNote: t || undefined }); flash("Message saved"); } }} />
                <small className="muted" style={{ fontSize: 11.5 }}>Shown on the customer&apos;s order page &amp; receipt.</small>
              </div>
            </div>
          </div>
          <div className="panel anim-in">
            <div className="panel-h"><h3>Payment</h3><Badge tone={payTone(v.paymentStatus)}>{v.paymentStatus}</Badge></div>
            <div className="kvs">
              <div className="kv2"><span>Terms</span><b>{cur.payment || "Net 15"}</b></div>
              <div className="kv2"><span>Update payment</span>
                <select aria-label="Payment status" className={`paysel p-${v.paymentStatus.toLowerCase()}`} value={v.paymentStatus} onChange={(e) => { patchOrder(cur.ref, { paymentStatus: e.target.value as PayStatus }); flash("Payment updated"); }}>
                  {PAY_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <label className="taxtoggle">
                <input type="checkbox" checked={exempt} onChange={(e) => toggleExempt(e.target.checked)} />
                <span><b>Resale tax-exempt</b><small>{exempt ? "No sales tax on this order" : `${settings.taxLabel} ${settings.taxRate}% applied`}</small></span>
              </label>
            </div>
          </div>
          <OrderAdjust order={cur} patchOrder={patchOrder} taxRate={settings.taxRate} taxLabel={settings.taxLabel} flash={flash} />
          <div className="panel anim-in">
            <div className="panel-h"><h3>Addresses</h3></div>
            <div className="addrbox"><div className="al">Billing</div><p>{cur.store}<br />{v.billing}</p></div>
            <div className="addrbox"><div className="al">Shipping</div><p>{cur.store}<br />{v.shipping}</p></div>
            {cur.notes && <div className="addrbox"><div className="al">Notes</div><p>{cur.notes}</p></div>}
          </div>
        </aside>
      </div>
      <PrintReceipt order={cur} />
    </>
  );
}
