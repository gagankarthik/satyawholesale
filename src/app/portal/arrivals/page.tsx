"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* New arrivals folded into the Products page as a filter — deep-link redirects. */
export default function PortalArrivals() {
  const router = useRouter();
  useEffect(() => { router.replace("/portal/products?view=new"); }, [router]);
  return null;
}
