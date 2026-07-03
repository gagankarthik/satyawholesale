"use client";

import { useState } from "react";
import { Receipt } from "@/components/Icons";
import { Button, EmptyState, Tabs } from "@/components/ui";
import { usePortal } from "../PortalShell";
import OrdersList from "../OrdersList";

type TabKey = "upcoming" | "previous" | "scheduled";
const TABS: { key: TabKey; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "previous", label: "Previous" },
  { key: "scheduled", label: "Scheduled" },
];

export default function PortalOrders() {
  const { myOrders } = usePortal();
  const [tab, setTab] = useState<TabKey>("upcoming");

  if (!myOrders.length) {
    return (
      <EmptyState
        variant="light"
        icon={<Receipt />}
        title="No orders yet"
        description="Place your first case order and it will show up here with live status and tracking."
        action={<Button href="/portal/products" variant="primary">Browse products</Button>}
      />
    );
  }

  const isClosed = (s: string) => s === "Completed" || s === "Cancelled";
  const scheduled = myOrders.filter((o) => o.fulfilment === "Scheduled delivery" && !isClosed(o.status));
  const previous = myOrders.filter((o) => isClosed(o.status));
  const upcoming = myOrders.filter((o) => !isClosed(o.status) && o.fulfilment !== "Scheduled delivery");

  const buckets: Record<TabKey, typeof myOrders> = { upcoming, previous, scheduled };
  const empties: Record<TabKey, { title: string; desc: string }> = {
    upcoming: { title: "No upcoming orders", desc: "Orders you place appear here until they're delivered or picked up." },
    previous: { title: "No past orders yet", desc: "Completed and cancelled orders move here once they close." },
    scheduled: { title: "No scheduled orders", desc: "Choose “Scheduled delivery” at checkout to see orders here." },
  };

  return (
    <>
      <Tabs
        ariaLabel="Order buckets"
        value={tab}
        onChange={(k) => setTab(k as TabKey)}
        tabs={TABS.map((t) => ({ key: t.key, label: t.label, count: buckets[t.key].length }))}
      />
      <OrdersList orders={buckets[tab]} emptyTitle={empties[tab].title} emptyDesc={empties[tab].desc} />
    </>
  );
}
