"use client";

import { useState } from "react";
import { CONTACT } from "@/lib/store";
import { fileApplication } from "@/lib/wms";
import { Arrow, Check, Phone, Mail, Pin, Clock } from "@/components/Icons";

export default function Contact() {
  const [sent, setSent] = useState(false);

  return (
    <section id="contact" className="contact">
      <div className="wrap">
        <div className="shead reveal" style={{ marginBottom: 36 }}>
          <div className="tag">Contact</div>
          <h2 className="sx">Talk to the warehouse.</h2>
          <p>Questions about trade accounts, delivery areas or the catalog? Reach the sales team directly.</p>
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
            <h3>Request a trade account</h3>
            <p>Send your details and the team will follow up the same business day.</p>
            {sent ? (
              <div style={{ marginTop: 24 }}>
                <div className="modal-check" style={{ margin: "0 0 14px" }}><Check /></div>
                <p style={{ marginTop: 0 }}>Thanks, we&apos;ve received your request and will follow up shortly. For anything urgent, call {CONTACT.phone}.</p>
              </div>
            ) : (
              <form
                className="contact-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  fileApplication({
                    store: String(f.get("store") || "New applicant"),
                    contact: String(f.get("name") || ""),
                    email: String(f.get("email") || ""),
                    phone: String(f.get("phone") || ""),
                    city: CONTACT.city,
                  });
                  setSent(true);
                }}
              >
                <div className="row2">
                  <label className="field"><span>Your name</span><input name="name" required placeholder="Full name" /></label>
                  <label className="field"><span>Store name</span><input name="store" required placeholder="Business name" /></label>
                </div>
                <div className="row2">
                  <label className="field"><span>Email</span><input name="email" type="email" required placeholder="you@store.com" /></label>
                  <label className="field"><span>Phone</span><input name="phone" placeholder="(   )   -    " /></label>
                </div>
                <label className="field"><span>How can we help?</span><textarea name="message" placeholder="Tell us about your store and what you'd like to stock." /></label>
                <button className="btn btn-primary" type="submit" style={{ justifyContent: "center" }}>Apply for trade access <Arrow /></button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
