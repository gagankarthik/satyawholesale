import Image from "next/image";
import { CONTACT, fmt, orderGrand, type Order } from "@/lib/store";

/* =========================================================
   Printable order receipt. Hidden on screen (`.print-area`),
   revealed only by the print stylesheet — see app.css.
   Header carries the logo + company contacts; the body
   carries the order, line items, and amounts.
   ========================================================= */
export default function PrintReceipt({ order }: { order: Order }) {
  const deliveryFee = order.deliveryFee ?? 0;
  const tax = order.tax ?? 0;
  const discount = order.discount ?? 0;
  const grand = orderGrand(order);
  const billing = order.billing ?? order.store;
  const shipping = order.shipping ?? order.billing ?? order.store;
  const paid = order.paymentStatus ?? (order.payment?.includes("Net") ? "Unpaid" : "Paid");

  return (
    <div className="print-area" aria-hidden="true">
      <div className="pr-doc">
        <header className="pr-head">
          <Image className="pr-logo" src="/logo.webp" alt="Satya Wholesale" width={168} height={54} priority />
          <div className="pr-co">
            <div className="pr-co-name">{CONTACT.legalName}</div>
            <div>{CONTACT.address1}</div>
            <div>{CONTACT.address2}</div>
            <div>{CONTACT.phone}</div>
            <div>{CONTACT.email}</div>
          </div>
        </header>

        <div className="pr-title">
          <div>
            <h1>Order receipt</h1>
            <div className="pr-ref">{order.ref}</div>
          </div>
          <span className="pr-stamp">{order.status}</span>
        </div>

        <div className="pr-grid">
          <div><span className="pr-l">Billed to</span><p>{order.store}<br />{billing}</p></div>
          <div><span className="pr-l">Ship to</span><p>{order.store}<br />{shipping}</p></div>
          <div><span className="pr-l">Order date</span><p>{new Date(order.placed).toLocaleString()}</p></div>
          <div><span className="pr-l">Payment</span><p>{order.payment || "Net 15 terms"} · {paid}{order.tracking && order.tracking !== "PICKUP" ? <><br />Tracking {order.tracking}</> : null}</p></div>
        </div>

        <table className="pr-table">
          <thead>
            <tr><th>#</th><th>Product</th><th>Code</th><th className="r">Qty</th><th className="r">Unit price</th><th className="r">Amount</th></tr>
          </thead>
          <tbody>
            {order.lines.map((l, i) => (
              <tr key={l.id}>
                <td>{i + 1}</td>
                <td><span className="pr-item"><Image className="pr-thumb" src="/coming-soon.webp" alt="" width={26} height={26} /> {l.name}</span></td>
                <td>SW-{l.id}</td>
                <td className="r">{l.qty}</td>
                <td className="r">${fmt(l.price)}</td>
                <td className="r">${fmt(l.qty * l.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pr-tot">
          <div className="pr-tline"><span>Subtotal · {order.cases} cases</span><span>${fmt(order.total)}</span></div>
          {discount > 0 && <div className="pr-tline"><span>Discount</span><span>−${fmt(discount)}</span></div>}
          <div className="pr-tline"><span>{order.taxExempt === false ? "Sales tax" : "Tax (resale exempt)"}</span><span>${fmt(tax)}</span></div>
          <div className="pr-tline"><span>Delivery</span><span>{deliveryFee ? `$${fmt(deliveryFee)}` : "Free"}</span></div>
          <div className="pr-tline grand"><span>Total due</span><span>${fmt(grand)}</span></div>
        </div>

        {order.adminNote && (
          <div className="pr-msg"><b>Note from {CONTACT.name}:</b> {order.adminNote}</div>
        )}

        <footer className="pr-foot">
          Thank you for your order. Questions? Call {CONTACT.phone} or email {CONTACT.email}.<br />
          {CONTACT.legalName} · {CONTACT.address1}, {CONTACT.address2} · Licensed wholesale distributor.
        </footer>
      </div>
    </div>
  );
}
