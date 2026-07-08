"use client";

import { ReportsView } from "@/features/admin/reports";
import { useAdmin } from "../AdminShell";

export default function AdminReportsPage() {
  const { flash } = useAdmin();
  return <ReportsView flash={flash} />;
}
