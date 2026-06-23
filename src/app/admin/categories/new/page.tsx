"use client";

import { CategoryForm } from "@/features/admin/catalog";
import { useAdmin } from "../../AdminShell";

export default function AdminNewCategoryPage() {
  const { flash } = useAdmin();
  return <CategoryForm flash={flash} />;
}
