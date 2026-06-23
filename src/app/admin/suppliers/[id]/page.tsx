"use client";

import { use } from "react";
import { SupplierForm } from "@/features/admin/catalog";
import { useAdmin } from "../../AdminShell";

export default function AdminSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { flash } = useAdmin();
  return <SupplierForm supId={id} flash={flash} />;
}
