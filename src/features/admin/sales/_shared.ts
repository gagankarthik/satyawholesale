/* Sales feature — shared kernel: domain→UI Badge tone maps, order/pay status
   option lists, and the order view-model (ov). Imported by the sales/* tabs so
   each stays focused on one screen. */
import { ORDER_FLOW, orderGrand, type Order, type OrderStatus, type PayStatus } from "@/lib/store";
import { type BadgeTone } from "@/components/ui";

/** Map domain status → UI Badge tone (kept next to the data it describes). */
export const statusTone = (s: OrderStatus): BadgeTone =>
  s === "Completed" ? "success" : s === "Cancelled" ? "danger" : s === "Out for delivery" || s === "At Local Facility" ? "info" : s === "Processing" ? "warning" : "brand";
export const payTone = (p: PayStatus): BadgeTone =>
  p === "Paid" ? "success" : p === "Partial" ? "warning" : p === "Refunded" ? "neutral" : "danger";
export const acctTone = (s: string): BadgeTone =>
  s === "Active" ? "success" : s === "Pending" ? "brand" : s === "Frozen" ? "warning" : "danger";

export const O_STATUSES: OrderStatus[] = ORDER_FLOW;
export const PAY_STATUSES: PayStatus[] = ["Unpaid", "Partial", "Paid", "Refunded"];
export function ov(o: Order) {
  const deliveryFee = o.deliveryFee ?? 0, tax = o.tax ?? 0, discount = o.discount ?? 0;
  return {
    deliveryFee, tax, discount, grand: orderGrand(o),
    tracking: o.tracking ?? "1Z" + o.ref.replace(/\D/g, "") + "OH",
    paymentStatus: o.paymentStatus ?? (o.payment?.includes("Net") ? "Unpaid" : "Paid") as PayStatus,
    shipping: o.shipping ?? `${o.store}, Cincinnati, OH`,
    billing: o.billing ?? o.shipping ?? `${o.store}, Cincinnati, OH`,
  };
}
