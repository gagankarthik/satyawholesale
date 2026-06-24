"use client";

import { useMemo } from "react";
import { Sparkles } from "@/components/Icons";
import { EmptyState, Spinner } from "@/components/ui";
import { usePortal } from "../PortalShell";
import ProductCard from "../ProductCard";

export default function PortalArrivals() {
  const { products, ready } = usePortal();
  const list = useMemo(
    () => [...products].sort((a, b) => (b.created ?? 0) - (a.created ?? 0)),
    [products]
  );

  if (!ready) return <EmptyState icon={<Spinner />} title="Loading new arrivals…" />;
  if (!list.length) return <EmptyState icon={<Sparkles />} title="No products yet" description="Check back soon for fresh stock." />;

  return <div className="pgrid">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>;
}
