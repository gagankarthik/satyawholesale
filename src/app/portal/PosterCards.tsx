"use client";

import { usePromotions } from "@/lib/wms";
import Carousel from "@/components/ui/carousel";

/**
 * Poster carousel built from the admin's published promotions. Each poster
 * shows at its exact aspect; the "Shop now" button appears only when the
 * promotion has a link.
 */
export default function PosterCards() {
  const { promos } = usePromotions();
  const ads = promos.filter((p) => p.active);
  if (!ads.length) return null;

  const slides = ads.map((p) => ({
    title: p.title?.trim() || undefined,
    button: "Shop now",
    src: p.image,
    href: p.link?.trim() || undefined,
  }));

  return (
    <section className="postercards" aria-label="Featured promotions">
      <Carousel slides={slides} />
    </section>
  );
}
