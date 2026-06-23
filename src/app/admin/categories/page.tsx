"use client";

import { CategoriesTab } from "@/features/admin/catalog";
import { useAdmin } from "../AdminShell";

export default function AdminCategoriesPage() {
  const { flash } = useAdmin();
  return <CategoriesTab flash={flash} />;
}
