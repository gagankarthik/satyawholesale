"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePromotions } from "@/lib/wms";

/**
 * Full-width rotating poster carousel built from the admin's published
 * promotions. Shared by the dashboard, New arrivals and Offers pages.
 */
export default function PosterCarousel({
  cta = "/portal/products",
  ctaLabel = "Shop now →",
  ariaLabel = "Offers and new arrivals",
  big = false,
}: {
  cta?: string;
  ctaLabel?: string;
  ariaLabel?: string;
  /** Larger poster-sized hero used on the Offers and New arrivals pages. */
  big?: boolean;
}) {
  const { promos } = usePromotions();
  const ads = promos.filter((p) => p.active);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (ads.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % ads.length), 5000);
    return () => clearInterval(t);
  }, [ads.length]);

  if (!ads.length) return null;
  const active = slide % ads.length;

  return (
    <div className={`pcarousel ${big ? "pcarousel-lg" : ""}`} aria-label={ariaLabel} aria-roledescription="carousel">
      {ads.map((o, i) => (
        <div key={o.id} className={`pcslide ${i === active ? "on" : ""}`} aria-hidden={i !== active}>
          <Image src={o.image} alt="" fill sizes="100vw" style={{ objectFit: "cover" }} priority={i === 0} />
          <div className="pctext">
            <div className="pctag">{o.tag}</div>
            <h3>{o.title}</h3>
            <p>{o.subtitle}</p>
            <Link href={cta} className="pc-cta">{ctaLabel}</Link>
          </div>
        </div>
      ))}
      {ads.length > 1 && (
        <div className="pcdots">
          {ads.map((o, i) => (
            <button key={o.id} className={i === active ? "on" : ""} onClick={() => setSlide(i)} aria-label={`Show ${o.tag}`} />
          ))}
        </div>
      )}
    </div>
  );
}
