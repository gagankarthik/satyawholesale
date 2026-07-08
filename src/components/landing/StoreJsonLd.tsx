"use client";

import { CONTACT } from "@/lib/store";

export default function StoreJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Store",
          name: "Satya Wholesale",
          legalName: CONTACT.legalName,
          description:
            "Licensed wholesale and cash-and-carry distributor for independent convenience retailers across Greater Cincinnati.",
          url: "https://satyawholesalers.com",
          logo: "https://satyawholesalers.com/logo.webp",
          image: "https://satyawholesalers.com/warehouse.webp",
          // Derive from the single source of truth so it can't drift.
          telephone: CONTACT.phoneHref.replace("tel:", ""),
          email: CONTACT.email,
          priceRange: "$$",
          address: {
            "@type": "PostalAddress",
            streetAddress: "8100 Reading Rd",
            addressLocality: "Cincinnati",
            addressRegion: "OH",
            postalCode: "45237",
            addressCountry: "US",
          },
          areaServed: "Greater Cincinnati",
          openingHours: ["Mo-Fr 10:00-17:30", "Sa 10:30-17:00"],
        }),
      }}
    />
  );
}
