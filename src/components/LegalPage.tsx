import Image from "next/image";
import Link from "next/link";
import { CONTACT } from "@/lib/store";
import { ArrowLeft } from "@/components/Icons";

export interface LegalSection {
  h: string;
  p: string[];
}

export default function LegalPage({
  title, updated, intro, sections,
}: { title: string; updated: string; intro: string; sections: LegalSection[] }) {
  return (
    <div className="legal">
      <header className="legal-nav">
        <div className="wrap legal-nav-in">
          <Link href="/" className="brand" aria-label="Satya Wholesale home">
            <Image src="/logo.webp" alt="Satya Wholesale" width={200} height={50} />
          </Link>
          <Link href="/" className="legal-back"><ArrowLeft /> Back to the site</Link>
        </div>
      </header>
      <main className="wrap legal-body" id="main">
        <p className="legal-eyebrow mono">Legal · {CONTACT.legalName}</p>
        <h1>{title}</h1>
        <p className="legal-updated">Last updated {updated}</p>
        <p className="legal-intro">{intro}</p>
        {sections.map((s, i) => (
          <section key={s.h} className="legal-section" aria-labelledby={`s-${i}`}>
            <h2 id={`s-${i}`}>{s.h}</h2>
            {s.p.map((para, j) => <p key={j}>{para}</p>)}
          </section>
        ))}
        <div className="legal-contact">
          <h2>Questions?</h2>
          <p>
            Contact {CONTACT.legalName} at <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> or{" "}
            <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>. Mailing address: {CONTACT.address1}, {CONTACT.address2}.
          </p>
        </div>
        <p className="legal-foot">© 2026 {CONTACT.legalName}. Wholesale · 21+. This summary is provided for convenience and is not legal advice.</p>
      </main>
    </div>
  );
}
