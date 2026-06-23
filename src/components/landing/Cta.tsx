"use client";

import { CONTACT } from "@/lib/store";

export default function Cta() {
  return (
    <section className="cta">
      <div className="wrap">
        <h2 className="reveal">Put the whole<br />counter on one account.</h2>
        <p className="reveal">Open a trade account, or call the warehouse and we&apos;ll get you set up.</p>
        <div className="ca reveal">
          <a className="btn btn-ink" href="#account">Open a trade account</a>
          <a className="btn btn-light" href={CONTACT.phoneHref}>Call {CONTACT.phone}</a>
        </div>
      </div>
    </section>
  );
}
