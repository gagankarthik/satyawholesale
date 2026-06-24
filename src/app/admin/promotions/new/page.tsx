"use client";

import { PromotionForm } from "@/features/admin/catalog";
import { useAdmin } from "../../AdminShell";

export default function AdminNewPromotionPage() {
  const { flash } = useAdmin();
  return <PromotionForm flash={flash} />;
}
