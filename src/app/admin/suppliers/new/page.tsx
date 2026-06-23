"use client";

import { SupplierForm } from "@/features/admin/catalog";
import { useAdmin } from "../../AdminShell";

export default function AdminNewSupplierPage() {
  const { flash } = useAdmin();
  return <SupplierForm flash={flash} />;
}
