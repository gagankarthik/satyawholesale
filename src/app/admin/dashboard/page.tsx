"use client";

import { DashboardTab } from "@/features/admin/sales";
import { useAdmin } from "../AdminShell";

export default function AdminDashboardPage() {
  const { go } = useAdmin();
  return <DashboardTab go={go} />;
}
