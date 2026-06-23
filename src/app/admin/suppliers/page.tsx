"use client";

import { SuppliersTab } from "@/features/admin/catalog";
import { useAdmin } from "../AdminShell";

export default function AdminSuppliersPage() {
  const { flash } = useAdmin();
  return <SuppliersTab flash={flash} />;
}
