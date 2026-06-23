"use client";

import { AdminPOCreate } from "@/features/admin/inventory";
import { useAdmin } from "../../AdminShell";

export default function AdminNewPOPage() {
  const { flash } = useAdmin();
  return <AdminPOCreate flash={flash} />;
}
