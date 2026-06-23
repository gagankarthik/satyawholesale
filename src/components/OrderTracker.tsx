import { ORDER_FLOW, type OrderStatus } from "@/lib/store";
import { Check, Close } from "@/components/Icons";

/* =========================================================
   Five-step fulfilment tracker shared by the customer portal
   and the admin order detail. Steps before the current one
   read as done; the current one is highlighted. A cancelled
   order replaces the steps with a terminal notice.
   ========================================================= */
export default function OrderTracker({ status }: { status: OrderStatus }) {
  if (status === "Cancelled") {
    return (
      <div className="otrack-cancelled" role="status">
        <span className="otc-ic" aria-hidden="true"><Close /></span>
        <div><b>Order cancelled</b><p>This order was cancelled and won&apos;t be fulfilled.</p></div>
      </div>
    );
  }

  const idx = ORDER_FLOW.indexOf(status);
  return (
    <ol className="otrack" aria-label={`Order status: ${status}`}>
      {ORDER_FLOW.map((s, i) => {
        const state = i < idx ? "done" : i === idx ? "now" : "todo";
        return (
          <li key={s} className={`otstep ${state}`}>
            <span className="otdot">{i < idx ? <Check /> : i + 1}</span>
            <span className="otlabel">Order {s}</span>
          </li>
        );
      })}
    </ol>
  );
}
