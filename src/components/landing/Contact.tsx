"use client";

import { useState } from "react";
import Link from "next/link";
import { CONTACT } from "@/lib/store";
import { Arrow, Check, Phone, Mail, Pin, Clock } from "@/components/Icons";

/* Formal contact form. Account applications live on /apply. */
export default function Contact() {
  const [sent, setSent] = useState(false);

  return (
    <section id="contact" className="contact">
      <div className="wrap">
        <div className="shead reveal" style={{ marginBottom: 36 }}>
          <div className="tag">Contact</div>
          <h2 className="sx">Talk to the warehouse.</h2>
          <p>Questions about wholesale pricing, delivery areas or the catalog? Call, email or visit the Reading Road warehouse. A person answers, not a call center.</p>
        </div>
        <div className="contact-grid">
          <div className="contact-card dark reveal">
            <h3>Satya Wholesale</h3>
            <p>Licensed cash-and-carry distributor serving independent convenience retailers across Greater Cincinnati.</p>
            <ul className="cinfo">
              <li><span className="ic"><Pin /></span><div><div className="k">Warehouse</div><div className="v">{CONTACT.address1}<br />{CONTACT.address2}</div></div></li>
              <li><span className="ic"><Phone /></span><div><div className="k">Phone</div><a className="v" href={CONTACT.phoneHref}>{CONTACT.phone}</a></div></li>
              <li><span className="ic"><Mail /></span><div><div className="k">Email</div><a className="v" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></div></li>
              <li><span className="ic"><Clock /></span><div><div className="k">Hours</div><div className="v">{CONTACT.hours}</div></div></li>
            </ul>
          </div>
          <div className="contact-card reveal">
            <h3>Send us a message</h3>
            <p>We reply the same business day. Looking to open an account instead? <Link href="/apply" style={{ fontWeight: 600, color: "var(--signal-text)" }}>Start an application</Link>.</p>
            {sent ? (
              <div className="apply-done" role="status">
                <div className="modal-check success-pop"><Check /></div>
                <b>Message sent</b>
                <p>Thanks, we&apos;ll get back to you today. For anything urgent, call {CONTACT.phone}.</p>
              </div>
            ) : (
              <form className="contact-form" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
                <div className="row2">
                  <label className="field"><span>Your name</span><input name="name" required placeholder="Full name" /></label>
                  <label className="field"><span>Store name</span><input name="store" placeholder="Business name" /></label>
                </div>
                <div className="row2">
                  <label className="field"><span>Email</span><input name="email" type="email" required placeholder="you@store.com" /></label>
                  <label className="field"><span>Phone</span><input name="phone" placeholder="(513) 555-0100" /></label>
                </div>
                <label className="field"><span>How can we help?</span><textarea name="message" required placeholder="Which delivery areas do you serve? Do you carry a specific brand we need?" /></label>
                <button className="btn btn-primary" type="submit" style={{ justifyContent: "center" }}>Send message <Arrow /></button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
