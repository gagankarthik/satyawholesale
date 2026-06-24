"use client";

import { ProductForm } from "@/features/admin/catalog";
import { useAdmin } from "../../AdminShell";

export default function AdminNewProductPage() {
  const { flash } = useAdmin();
  return <ProductForm flash={flash} />;
}
