"use client";

import { UsersTab } from "@/features/admin/settings";
import { useAdmin } from "../AdminShell";

export default function AdminUsersPage() {
  const { flash } = useAdmin();
  return <UsersTab flash={flash} />;
}
