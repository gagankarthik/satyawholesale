import { ORDER_FLOW, type OrderStatus } from "@/lib/store";

/* =========================================================
   Five-step fulfilment tracker shared by the customer portal
   and the admin order detail. Steps before the current one
   read as done; the current one is highlighted.
   ========================================================= */
export default function OrderTracker({ status }: { status: OrderStatus }) {
  const idx = ORDER_FLOW.indexOf(status);
  return (
    <ol className="otrack" aria-label={`Order status: ${status}`}>
      {ORDER_FLOW.map((s, i) => {
        const state = i < idx ? "done" : i === idx ? "now" : "todo";
        return (
          <li key={s} className={`otstep ${state}`}>
            <span className="otdot">{i < idx ? "✓" : i + 1}</span>
            <span className="otlabel">Order {s}</span>
          </li>
        );
      })}
    </ol>
  );
}
