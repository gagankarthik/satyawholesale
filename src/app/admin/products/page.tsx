"use client";

import { ProductsTab } from "@/features/admin/catalog";
import { useAdmin } from "../AdminShell";

export default function AdminProductsPage() {
  const { flash, go } = useAdmin();
  return <ProductsTab flash={flash} go={go} />;
}
