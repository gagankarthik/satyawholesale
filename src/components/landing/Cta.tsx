"use client";

import { CONTACT } from "@/lib/store";

export default function Cta() {
  return (
    <section className="cta">
      <div className="wrap">
        <h2 className="reveal">Set up your<br />trade account.</h2>
        <p className="reveal">Apply online in a few minutes, or call the warehouse and we&apos;ll set you up.</p>
        <div className="ca reveal">
          <a className="btn btn-ink" href="#account">Open a trade account</a>
          <a className="btn btn-light" href={CONTACT.phoneHref}>Call {CONTACT.phone}</a>
        </div>
      </div>
    </section>
  );
}
