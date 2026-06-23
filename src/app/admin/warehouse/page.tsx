"use client";

import { WarehouseTab } from "@/features/admin/inventory";
import { useAdmin } from "../AdminShell";

export default function AdminWarehousePage() {
  const { flash } = useAdmin();
  return <WarehouseTab flash={flash} />;
}
