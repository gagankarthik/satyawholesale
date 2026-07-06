import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/* Content-Security-Policy, tuned to exactly what the app loads:
   - self-hosted next/font + bundled JS/CSS  → 'self'
   - React inline style props & Tailwind      → style-src 'unsafe-inline'
   - product/promo photos on S3 + Unsplash    → img-src those hosts
   - Cognito auth + S3 uploads (browser SDK)  → connect-src *.amazonaws.com
   - tesseract.js OCR (WASM + worker + lang)  → wasm-unsafe-eval, worker blob:, jsDelivr
   - camera barcode scanner                   → governed by Permissions-Policy, not CSP
   A nonce/'strict-dynamic' policy was deliberately NOT used: tesseract loads
   its worker/core from a CDN, which strict-dynamic would break. Framing,
   plugins, base-uri and form-action are still locked down below. */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https://images.unsplash.com https://*.amazonaws.com",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net${isDev ? " 'unsafe-eval'" : ""}`,
  "worker-src 'self' blob:",
  "connect-src 'self' https://*.amazonaws.com https://cdn.jsdelivr.net https://unpkg.com https://tessdata.projectnaptha.com" + (isDev ? " ws:" : ""),
  "media-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera stays enabled for same-origin (the product barcode scanner); the rest off.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), browsing-topics=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false, // don't advertise the framework/version
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      // Product & promo photos uploaded to the S3 media bucket
      // (virtual-hosted style: <bucket>.s3.<region>.amazonaws.com).
      { protocol: "https", hostname: "**.amazonaws.com" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
