"use client";

import { SettingsTab } from "@/features/admin/settings";
import { useAdmin } from "../AdminShell";

export default function AdminSettingsPage() {
  const { flash } = useAdmin();
  return <SettingsTab flash={flash} />;
}
