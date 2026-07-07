"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePromotions } from "@/lib/wms";

/**
 * Rotating poster carousel built from the admin's published promotions.
 * - default / `big`: photographic hero with the promo title overlaid.
 * - `poster`: shows the FULL image uncropped (letterbox filled with a blurred
 *   copy of the same image) — for self-contained poster/banner artwork.
 */
export default function PosterCarousel({
  cta = "/portal/products",
  ctaLabel = "Shop now →",
  ariaLabel = "Offers and new arrivals",
  big = false,
  poster = false,
}: {
  cta?: string;
  ctaLabel?: string;
  ariaLabel?: string;
  /** Larger photographic hero used on the Offers and New arrivals pages. */
  big?: boolean;
  /** Show whole images uncropped (poster/banner artwork). */
  poster?: boolean;
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
  const step = (d: number) => setSlide((s) => (s + d + ads.length) % ads.length);

  /* ---- poster mode: full uncropped image with a blurred backdrop ---- */
  if (poster) {
    return (
      <div className="pcarousel poster" aria-label={ariaLabel} aria-roledescription="carousel">
        {ads.map((o, i) => (
          <Link
            key={o.id}
            href={cta}
            className={`pcslide ${i === active ? "on" : ""}`}
            aria-hidden={i !== active}
            tabIndex={i === active ? 0 : -1}
            aria-label={o.title || "View promotion"}
          >
            <Image src={o.image} alt="" fill sizes="100vw" className="pc-bg" style={{ objectFit: "cover" }} aria-hidden />
            <Image src={o.image} alt={o.title || "Promotion"} fill sizes="100vw" className="pc-img" style={{ objectFit: "contain" }} priority={i === 0} />
          </Link>
        ))}
        {ads.length > 1 && (
          <>
            <button type="button" className="pc-arrow prev" onClick={() => step(-1)} aria-label="Previous slide">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button type="button" className="pc-arrow next" onClick={() => step(1)} aria-label="Next slide">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="pcdots">
              {ads.map((o, i) => (
                <button key={o.id} type="button" className={i === active ? "on" : ""} onClick={() => setSlide(i)} aria-label={`Show slide ${i + 1}`} />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  /* ---- default: photographic hero with overlaid promo text ---- */
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
