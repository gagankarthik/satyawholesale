"use client";

import { use } from "react";
import { ProductForm } from "@/features/admin/catalog";
import { useAdmin } from "../../../AdminShell";

export default function AdminEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { flash } = useAdmin();
  return <ProductForm productId={id} flash={flash} />;
}
