"use client";

import Link from "next/link";
import { use } from "react";
import { CONTACT, fmt, orderGrand, useOrders } from "@/lib/store";
import OrderTracker from "@/components/OrderTracker";
import PrintReceipt from "@/components/PrintReceipt";

export default function PortalOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { orders } = useOrders();
  const o = orders.find((x) => x.ref === id);

  if (!o) {
    return (
      <div className="odetail">
        <Link className="detail-back" href="/portal/orders">← Back to orders</Link>
        <div className="empty light"><div className="ei">🔍</div><h3>Order not found</h3><p>This order may belong to another account.</p></div>
      </div>
    );
  }

  return (
    <div className="odetail">
      <Link className="detail-back" href="/portal/orders">← Back to orders</Link>
      <div className="od-head">
        <div>
          <div className="od-ref mono">{o.ref}</div>
          <p className="od-sub">{o.store} · placed {new Date(o.placed).toLocaleString()}</p>
        </div>
        <button className="btn btn-primary" onClick={() => window.print()}>Print receipt</button>
      </div>
      <div className="panel od-trackwrap"><OrderTracker status={o.status} /></div>
      {o.adminNote && (
        <div className="od-msg">
          <span className="od-msg-ic">💬</span>
          <div><b>Update from {CONTACT.name}</b><p>{o.adminNote}</p></div>
        </div>
      )}
      <div className="od-cols">
        <div className="panel">
          <div className="panel-h"><h3>Items</h3><span className="hint">{o.cases} cases · {o.lines.length} items</span></div>
          <div className="receipt-lines">
            {o.lines.map((l) => (
              <div className="rl" key={l.id}><span>{l.name}</span><span className="q">×{l.qty} @ ${fmt(l.price)}</span><span className="a">${fmt(l.qty * l.price)}</span></div>
            ))}
          </div>
          <div className="receipt-tot"><span>Order total · {o.cases} cases</span><b>${fmt(orderGrand(o))}</b></div>
        </div>
        <aside className="od-side">
          <div className="panel">
            <div className="panel-h"><h3>Delivery</h3></div>
            <div className="kvs">
              <div className="kv2"><span>Status</span><b>{o.status}</b></div>
              <div className="kv2"><span>Method</span><b>{o.fulfilment || "Next-day delivery"}</b></div>
              {o.tracking && o.tracking !== "PICKUP" && <div className="kv2"><span>Tracking</span><b className="mono">{o.tracking}</b></div>}
              <div className="kv2"><span>Ship to</span><b>{o.shipping || o.store}</b></div>
            </div>
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
