"use client";

import { use } from "react";
import { AdminOrderDetail } from "@/features/admin/sales";
import { useAdmin } from "../../AdminShell";

export default function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { flash } = useAdmin();
  return <AdminOrderDetail id={id} flash={flash} />;
}
