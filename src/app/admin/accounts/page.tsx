"use client";

import { CustomersTab } from "@/features/admin/sales";
import { useAdmin } from "../AdminShell";

export default function AdminAccountsPage() {
  const { flash } = useAdmin();
  return <CustomersTab flash={flash} />;
}
