/* Sales feature barrel. Preserves the public surface of the former
   sales.tsx so every `@/features/admin/sales` import keeps working while each
   screen now lives in its own focused module. */
export { DashboardTab } from "./dashboard";
export { OrdersTab } from "./orders-list";
export { AdminOrderDetail } from "./order-detail";
export { AdminOrderCreate } from "./order-create";
export { CustomersTab } from "./customers";
export { ov } from "./_shared";
