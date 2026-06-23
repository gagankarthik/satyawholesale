"use client";

import { ImportTab } from "@/features/admin/catalog";
import { useAdmin } from "../AdminShell";

export default function AdminImportPage() {
  const { flash } = useAdmin();
  return <ImportTab flash={flash} />;
}
