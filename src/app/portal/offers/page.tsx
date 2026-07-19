"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* Offers folded into the Products page as a filter — deep-link redirects. */
export default function PortalOffers() {
  const router = useRouter();
  useEffect(() => { router.replace("/portal/products?view=offer"); }, [router]);
  return null;
}
