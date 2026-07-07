"use client";

import Link from "next/link";
import { CONTACT } from "@/lib/store";

export default function Cta() {
  return (
    <section className="cta">
      <div className="wrap">
        <h2 data-lines>
          <span className="lm"><span className="lm-in">Set up your</span></span>
          <span className="lm"><span className="lm-in">customer account.</span></span>
        </h2>
        <p className="reveal">Apply online in a few minutes, or call the warehouse and we&apos;ll set you up.</p>
        <div className="ca reveal">
          <Link className="btn btn-ink" href="/auth/signup">Open a customer account</Link>
          <a className="btn btn-light" href={CONTACT.phoneHref}>Call {CONTACT.phone}</a>
        </div>
      </div>
    </section>
  );
}
