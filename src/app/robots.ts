import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // app surfaces are gated and should not be indexed
      disallow: ["/admin", "/portal"],
    },
    sitemap: "https://satyawholesalers.com/sitemap.xml",
  };
}
