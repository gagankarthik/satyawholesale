import type { Metadata } from "next";

/* Distinct title + keep onboarding out of search indexes. */
export const metadata: Metadata = {
  title: "Finish setting up your account",
  robots: { index: false, follow: false },
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
