"use client";

import Link from "next/link";
import { CONTACT } from "@/lib/store";

export default function Cta() {
  return (
    <section className="cta">
      <div className="wrap">
        <h2 className="reveal">Set up your<br />trade account.</h2>
        <p className="reveal">Apply online in a few minutes, or call the warehouse and we&apos;ll set you up.</p>
        <div className="ca reveal">
          <Link className="btn btn-ink" href="/apply">Open a trade account</Link>
          <a className="btn btn-light" href={CONTACT.phoneHref}>Call {CONTACT.phone}</a>
        </div>
      </div>
    </section>
  );
}
