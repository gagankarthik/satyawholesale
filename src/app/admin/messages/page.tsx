"use client";

import { MessagesTab } from "@/features/admin/messages";
import { useAdmin } from "../AdminShell";

export default function AdminMessagesPage() {
  const { flash } = useAdmin();
  return <MessagesTab flash={flash} />;
}
