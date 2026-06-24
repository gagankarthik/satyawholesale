"use client";

import { use } from "react";
import { PromotionForm } from "@/features/admin/catalog";
import { useAdmin } from "../../AdminShell";

export default function AdminPromotionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { flash } = useAdmin();
  return <PromotionForm promoId={id} flash={flash} />;
}
