"use client";

import { use } from "react";
import { CategoryForm } from "@/features/admin/catalog";
import { useAdmin } from "../../AdminShell";

export default function AdminCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { flash } = useAdmin();
  return <CategoryForm catKey={id} flash={flash} />;
}
