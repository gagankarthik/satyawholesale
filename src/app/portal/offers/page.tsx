"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Tag } from "@/components/Icons";
import { Button, EmptyState, Spinner } from "@/components/ui";
import { usePortal } from "../PortalShell";
import ProductCard from "../ProductCard";
import PosterCarousel from "../PosterCarousel";

export default function PortalOffers() {
  const { products, ready } = usePortal();

  const deals = useMemo(() => {
    // products the admin flagged for Offers; fall back to popular SKUs
    const featured = products.filter((p) => p.onOffers);
    if (featured.length) return featured;
    return products.filter((p) => p.tag === "pop");
  }, [products]);

  if (!ready) return <EmptyState icon={<Spinner />} title="Loading offers…" />;

  return (
    <>
      <PosterCarousel big cta="/portal/offers" ctaLabel="Shop the deals →" ariaLabel="Offers and promotions" />
      <section className="catrow" style={{ marginTop: 24 }}>
        <div className="catrow-head">
          <h3><Tag /> Featured deals <span className="cnt">by the case</span></h3>
          <Link className="viewall" href="/portal/products">Browse all →</Link>
        </div>
        {deals.length ? (
          <div className="pgrid">{deals.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        ) : (
          <EmptyState
            icon={<Tag />}
            title="No offers running right now"
            description="Deals show up here the moment the warehouse flags them. The full catalog is still at everyday case prices."
            action={<Button href="/portal/products" variant="primary">Browse all products</Button>}
          />
        )}
      </section>
    </>
  );
}
