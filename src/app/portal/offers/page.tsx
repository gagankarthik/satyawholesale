"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { usePromotions } from "@/lib/wms";
import { Tag } from "@/components/Icons";
import { EmptyState } from "@/components/ui";
import { usePortal } from "../PortalShell";
import ProductCard from "../ProductCard";

export default function PortalOffers() {
  const { products } = usePortal();
  const { promos } = usePromotions();
  const ads = promos.filter((p) => p.active);

  const deals = useMemo(() => {
    const pop = products.filter((p) => p.tag === "pop");
    return (pop.length ? pop : products).slice(0, 12);
  }, [products]);

  return (
    <>
      {ads.length > 0 && (
        <div className="offergrid">
          {ads.map((o) => (
            <Link key={o.id} href="/portal/products" className="offercard">
              <span className="offercard-img"><Image src={o.image} alt="" fill sizes="(max-width: 880px) 100vw, 50vw" style={{ objectFit: "cover" }} /></span>
              <div className="offercard-t"><span className="ptag">{o.tag}</span><h3>{o.title}</h3><p>{o.subtitle}</p></div>
            </Link>
          ))}
        </div>
      )}

      <section className="catrow" style={{ marginTop: ads.length ? 30 : 0 }}>
        <div className="catrow-head"><h3>Featured this week <span className="cnt">deals by the case</span></h3><Link className="viewall" href="/portal/products">Browse all →</Link></div>
        {deals.length ? (
          <div className="pgrid">{deals.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        ) : (
          <EmptyState icon={<Tag />} title="No offers right now" description="Check back soon for new deals." />
        )}
      </section>
    </>
  );
}
