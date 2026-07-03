"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Sparkles } from "@/components/Icons";
import { Button, EmptyState, Spinner } from "@/components/ui";
import { usePortal } from "../PortalShell";
import ProductCard from "../ProductCard";
import PosterCarousel from "../PosterCarousel";

export default function PortalArrivals() {
  const { products, ready } = usePortal();

  const list = useMemo(() => {
    // products the admin flagged for New arrivals; fall back to the most recent SKUs
    const featured = products.filter((p) => p.onArrivals);
    const base = featured.length ? featured : products;
    return [...base].sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
  }, [products]);

  if (!ready) return <EmptyState icon={<Spinner />} title="Loading new arrivals…" />;

  return (
    <>
      <PosterCarousel big cta="/portal/arrivals" ctaLabel="See what's new →" ariaLabel="New arrivals" />
      <section className="catrow" style={{ marginTop: 24 }}>
        <div className="catrow-head">
          <h3><Sparkles /> Just landed <span className="cnt">{list.length} item{list.length !== 1 ? "s" : ""}</span></h3>
          <Link className="viewall" href="/portal/products">Browse all →</Link>
        </div>
        {list.length ? (
          <div className="pgrid">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        ) : (
          <EmptyState
            icon={<Sparkles />}
            title="Nothing new this week"
            description="New products land here as the warehouse receives them. Everything already in stock is in the catalog."
            action={<Button href="/portal/products" variant="primary">Browse all products</Button>}
          />
        )}
      </section>
    </>
  );
}
