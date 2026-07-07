import type { Metadata } from "next";
import PortalShell from "./PortalShell";

/* Gated customer surface — keep it out of search indexes. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
