import type { Metadata } from "next";

/* Distinct title + keep the sign-in page out of search indexes. */
export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
