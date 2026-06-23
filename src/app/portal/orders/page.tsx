"use client";

import { useState } from "react";
import { Receipt } from "@/components/Icons";
import { EmptyState } from "@/components/ui";
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
        description="Your submitted orders will appear here, with live status and tracking."
      />
    );
  }

  const isClosed = (s: string) => s === "Completed" || s === "Cancelled";
  const scheduled = myOrders.filter((o) => o.fulfilment === "Scheduled delivery" && !isClosed(o.status));
  const previous = myOrders.filter((o) => isClosed(o.status));
  const upcoming = myOrders.filter((o) => !isClosed(o.status) && o.fulfilment !== "Scheduled delivery");

  const buckets: Record<TabKey, typeof myOrders> = { upcoming, previous, scheduled };
  const empties: Record<TabKey, string> = {
    upcoming: "No upcoming orders",
    previous: "No past orders yet",
    scheduled: "No scheduled orders",
  };

  return (
    <>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`tab ${tab === t.key ? "on" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label} <span className="tabc">{buckets[t.key].length}</span>
          </button>
        ))}
      </div>
      <OrdersList orders={buckets[tab]} emptyTitle={empties[tab]} />
    </>
  );
}
