"use client";

import Link from "next/link";
import { use, useState } from "react";
import {
  CONTACT, fmt, productImg, orderGrand, useOrders, useSettings, computeTax, canCancelOrder, canEditOrder,
  type OrderLine,
} from "@/lib/store";
import Image from "next/image";
import OrderTracker from "@/components/OrderTracker";
import PrintReceipt from "@/components/PrintReceipt";
import { EmptyState } from "@/components/ui";
import { Search, Chat, Close } from "@/components/Icons";
import { usePortal } from "../../PortalShell";

const FULFILMENTS = ["Next-day delivery", "Cash & carry pickup", "Scheduled delivery"];

export default function PortalOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { orders, patchOrder, setStatus } = useOrders();
  const { flash, products } = usePortal();
  const { settings } = useSettings();
  const o = orders.find((x) => x.ref === id);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<OrderLine[]>([]);
  const [fulfil, setFulfil] = useState("");
  const [ship, setShip] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (!o) {
    return (
      <div className="odetail">
        <Link className="detail-back" href="/portal/orders">← Back to orders</Link>
        <EmptyState variant="light" icon={<Search />} title="Order not found" description="This order may belong to another account." />
      </div>
    );
  }

  const startEdit = () => {
    setDraft(o.lines.map((l) => ({ ...l })));
    setFulfil(o.fulfilment || FULFILMENTS[0]);
    setShip(o.shipping || o.store);
    setNotes(o.notes || "");
    setConfirmCancel(false);
    setEditing(true);
  };
  const setQty = (lid: number, d: number) =>
    setDraft((ls) => ls.map((l) => (l.id === lid ? { ...l, qty: Math.max(1, l.qty + d) } : l)));
  const dropLine = (lid: number) => setDraft((ls) => (ls.length > 1 ? ls.filter((l) => l.id !== lid) : ls));

  const draftCases = draft.reduce((s, l) => s + l.qty, 0);
  const draftTotal = draft.reduce((s, l) => s + l.qty * l.price, 0);

  const saveEdit = () => {
    patchOrder(o.ref, {
      lines: draft,
      total: draftTotal,
      cases: draftCases,
      // keep sales tax in step with the new subtotal (resale-exempt orders stay at $0)
      tax: computeTax(draftTotal, o.taxExempt, settings.taxRate),
      fulfilment: fulfil,
      shipping: ship.trim() || o.store,
      notes: notes.trim() || undefined,
    });
    setEditing(false);
    flash(`Changes to ${o.ref} saved`);
  };

  const cancelOrder = () => {
    setStatus(o.ref, "Cancelled");
    setConfirmCancel(false);
    flash(`Order ${o.ref} cancelled`);
  };

  const lines = editing ? draft : o.lines;
  const cases = editing ? draftCases : o.cases;
  const editable = canEditOrder(o.status);
  const cancellable = canCancelOrder(o.status);

  /* charge breakdown — tax/delivery/discount applied by admin (or the default rate) */
  const subtotal = editing ? draftTotal : o.total;
  const exempt = o.taxExempt === true;
  const tax = editing ? computeTax(draftTotal, o.taxExempt, settings.taxRate) : (o.tax ?? 0);
  const deliveryFee = o.deliveryFee ?? 0;
  const discount = o.discount ?? 0;
  const grand = editing ? subtotal + tax + deliveryFee - discount : orderGrand(o);
  const imgFor = (lid: number) => productImg(products.find((p) => p.id === lid) ?? {});

  return (
    <div className="odetail rise-in">
      <Link className="detail-back" href="/portal/orders">← Back to orders</Link>
      <div className="od-head">
        <div>
          <div className="od-ref mono">{o.ref}</div>
          <p className="od-sub">{o.store} · placed {new Date(o.placed).toLocaleString()}</p>
        </div>
        <div className="od-actions">
          {editing ? (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Discard</button>
              <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save changes</button>
            </>
          ) : (
            <>
              {editable && <button className="btn btn-ghost btn-sm" onClick={startEdit}>Edit order</button>}
              {cancellable && <button className="btn btn-ghost btn-sm od-cancel" onClick={() => setConfirmCancel(true)}>Cancel order</button>}
              <button className="btn btn-primary btn-sm" onClick={() => window.print()}>Print receipt</button>
            </>
          )}
        </div>
      </div>

      {confirmCancel && (
        <div className="od-confirm" role="alertdialog" aria-label="Confirm cancellation">
          <div>
            <b>Cancel order {o.ref}?</b>
            <p>This can&apos;t be undone. You can always place a new order afterwards.</p>
          </div>
          <div className="od-confirm-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmCancel(false)}>Keep order</button>
            <button className="btn btn-danger btn-sm" onClick={cancelOrder}>Yes, cancel</button>
          </div>
        </div>
      )}

      <div className="panel od-trackwrap"><OrderTracker status={o.status} /></div>
      {o.adminNote && (
        <div className="od-msg">
          <span className="od-msg-ic" aria-hidden="true"><Chat /></span>
          <div><b>Update from {CONTACT.name}</b><p>{o.adminNote}</p></div>
        </div>
      )}
      <div className="od-cols">
        <div className="panel">
          <div className="panel-h"><h3>Items</h3><span className="hint">{cases} cases · {lines.length} items{editing ? " · editing" : ""}</span></div>
          <div className="receipt-lines">
            {lines.map((l) =>
              editing ? (
                <div className="rl rl-edit" key={l.id}>
                  <span className="rl-nm">{l.name}</span>
                  <div className="rl-stepper">
                    <button onClick={() => setQty(l.id, -1)} disabled={l.qty <= 1} aria-label="Remove one case">−</button>
                    <span className="mono">{l.qty}</span>
                    <button onClick={() => setQty(l.id, 1)} aria-label="Add one case">+</button>
                  </div>
                  <span className="a mono">${fmt(l.qty * l.price)}</span>
                  <button className="rl-rm" onClick={() => dropLine(l.id)} disabled={lines.length <= 1} aria-label={`Remove ${l.name}`}><Close /></button>
                </div>
              ) : (
                <div className="rl" key={l.id}>
                  <span className="rl-item">
                    <span className="rl-thumb"><Image src={imgFor(l.id)} alt="" fill sizes="40px" style={{ objectFit: "contain" }} /></span>
                    {l.name}
                  </span>
                  <span className="q">×{l.qty} @ ${fmt(l.price)}</span>
                  <span className="a">${fmt(l.qty * l.price)}</span>
                </div>
              )
            )}
          </div>
          <div className="totals">
            <div className="tl"><span>Subtotal · {cases} cases</span><span className="mono">${fmt(subtotal)}</span></div>
            {discount > 0 && <div className="tl"><span>Discount{o.discountReason ? ` · ${o.discountReason}` : ""}</span><span className="mono">−${fmt(discount)}</span></div>}
            <div className="tl"><span>{exempt ? "Tax · resale exempt" : `${settings.taxLabel} (${settings.taxRate}%)`}</span><span className="mono">${fmt(tax)}</span></div>
            <div className="tl"><span>Delivery fee</span><span className="mono" style={{ color: deliveryFee ? "inherit" : "var(--green)" }}>{deliveryFee ? `$${fmt(deliveryFee)}` : "Free"}</span></div>
            <div className="tl grand"><span>Order total</span><b>${fmt(grand)}</b></div>
          </div>
        </div>
        <aside className="od-side">
          <div className="panel">
            <div className="panel-h"><h3>Delivery</h3></div>
            {editing ? (
              <div className="od-editfields">
                <label className="field"><span>Method</span>
                  <select value={fulfil} onChange={(e) => setFulfil(e.target.value)}>
                    {FULFILMENTS.map((f) => <option key={f}>{f}</option>)}
                  </select>
                </label>
                <label className="field"><span>Ship to</span>
                  <input value={ship} onChange={(e) => setShip(e.target.value)} placeholder="Delivery address" />
                </label>
                <label className="field"><span>Notes</span>
                  <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Dock hours, PO number, etc." />
                </label>
              </div>
            ) : (
              <div className="kvs">
                <div className="kv2"><span>Method</span><b>{o.fulfilment || "Next-day delivery"}</b></div>
                {o.tracking && o.tracking !== "PICKUP" && <div className="kv2"><span>Tracking</span><b className="mono">{o.tracking}</b></div>}
                <div className="kv2"><span>Ship to</span><b>{o.shipping || o.store}</b></div>
                {o.notes && <div className="kv2"><span>Notes</span><b>{o.notes}</b></div>}
              </div>
            )}
          </div>
          <div className="panel">
            <div className="panel-h"><h3>Payment</h3></div>
            <div className="kvs">
              <div className="kv2"><span>Terms</span><b>{o.payment || "Net 15 terms"}</b></div>
              <div className="kv2"><span>Status</span><b>{o.paymentStatus || "Unpaid"}</b></div>
            </div>
          </div>
        </aside>
      </div>
      <PrintReceipt order={o} />
    </div>
  );
}
