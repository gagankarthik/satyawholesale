"use client";

import { InventoryTab } from "@/features/admin/inventory";
import { useAdmin } from "../AdminShell";

export default function AdminInventoryPage() {
  const { flash } = useAdmin();
  return <InventoryTab flash={flash} />;
}
