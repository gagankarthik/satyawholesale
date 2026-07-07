import type { Metadata } from "next";

/* Distinct title + keep the sign-up flow out of search indexes. */
export const metadata: Metadata = {
  title: "Create your account",
  robots: { index: false, follow: false },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
