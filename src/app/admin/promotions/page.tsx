"use client";

import { PromotionsTab } from "@/features/admin/catalog";
import { useAdmin } from "../AdminShell";

export default function AdminPromotionsPage() {
  const { flash } = useAdmin();
  return <PromotionsTab flash={flash} />;
}
