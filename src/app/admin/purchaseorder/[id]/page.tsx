"use client";

import { use } from "react";
import { AdminPODetail } from "@/features/admin/inventory";
import { useAdmin } from "../../AdminShell";

export default function AdminPurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { flash } = useAdmin();
  return <AdminPODetail id={id} flash={flash} />;
}
