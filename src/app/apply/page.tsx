import type { Metadata } from "next";
import Link from "next/link";
import Brand from "@/components/Brand";
import ApplyWizard from "@/components/landing/ApplyWizard";
import { REQS } from "@/components/landing/data";

export const metadata: Metadata = {
  title: "Apply for a wholesale customer account",
  description:
    "Open a wholesale customer account with Satya Wholesale, Cincinnati's cash-and-carry distributor for convenience stores. Apply online in three short steps; most stores are approved the same business day.",
  alternates: { canonical: "/apply" },
};

export default function ApplyPage() {
  return (
    <div className="applypage">
      <header className="apply-head">
        <Link href="/" aria-label="Satya Wholesale home"><Brand height={38} /></Link>
        <Link className="btn btn-ghost btn-sm" href="/">Back to the site</Link>
      </header>
      <main className="apply-main">
        <div className="apply-intro">
          <h1>Open your customer account</h1>
          <p>Three short steps. We review the same business day, and most stores place their first case order within a day.</p>
        </div>
        <div className="apply-grid">
          <div className="panel apply-card">
            <ApplyWizard />
          </div>
          <aside className="apply-side">
            <div className="reqlabel mono">What you&apos;ll need</div>
            {REQS.map(({ Icon, h, p }) => (
              <div className="reqitem" key={h}>
                <span className="ri"><Icon /></span>
                <div><b>{h}</b><span>{p}</span></div>
              </div>
            ))}
          </aside>
        </div>
      </main>
    </div>
  );
}
