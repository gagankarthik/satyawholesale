"use client";

import { POTab } from "@/features/admin/inventory";
import { useAdmin } from "../AdminShell";

export default function AdminPurchaseOrdersPage() {
  const { flash } = useAdmin();
  return <POTab flash={flash} />;
}
