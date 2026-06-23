"use client";

import { AdminOrderCreate } from "@/features/admin/sales";
import { useAdmin } from "../../AdminShell";

export default function AdminNewOrderPage() {
  const { flash } = useAdmin();
  return <AdminOrderCreate flash={flash} />;
}
