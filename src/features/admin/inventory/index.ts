/* Inventory feature barrel. Preserves the public surface of the former
   inventory.tsx so every `@/features/admin/inventory` import keeps working
   while each screen now lives in its own focused module. */
export { POTab } from "./po-list";
export { AdminPODetail } from "./po-detail";
export { AdminPOCreate } from "./po-create";
export { InventoryTab } from "./stock";
export { WarehouseTab } from "./warehouse";
