"use client";

import { useState } from "react";
import Link from "next/link";
import { CONTACT } from "@/lib/store";
import { ArrowRight, Check, Phone, Mail, MapPin, Clock } from "lucide-react";
import { Reveal, MaskText } from "./motion";

/* Formal contact form. Account applications live on /apply. */
export default function Contact() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    setError("");
    setSending(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"), store: fd.get("store"), email: fd.get("email"),
          phone: fd.get("phone"), message: fd.get("message"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Couldn't send your message. Please try again.");
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="contact" className="contact">
      <div className="wrap">
        <div className="rd-head" style={{ marginBottom: 40 }}>
          <MaskText
            as="h2"
            className="rd-title"
            lines={[<>Talk to the <span className="or" key="a">warehouse.</span></>]}
          />
          <Reveal delay={0.12}>
            <p className="rd-lede">
              Questions about wholesale pricing, delivery areas or the catalog? Call, email or visit our
              Cincinnati warehouse on Reading Road. A person answers, not a call center.
            </p>
          </Reveal>
        </div>
        <div className="contact-grid">
          <div className="contact-card dark reveal">
            <h3>Satya Wholesale</h3>
            <p>Licensed cash-and-carry distributor serving independent convenience retailers across Greater Cincinnati.</p>
            <ul className="cinfo">
              <li><span className="ic"><MapPin /></span><div><div className="k">Warehouse</div><div className="v">{CONTACT.address1}<br />{CONTACT.address2}</div></div></li>
              <li><span className="ic"><Phone /></span><div><div className="k">Phone</div><a className="v" href={CONTACT.phoneHref}>{CONTACT.phone}</a></div></li>
              <li><span className="ic"><Mail /></span><div><div className="k">Email</div><a className="v" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></div></li>
              <li><span className="ic"><Clock /></span><div><div className="k">Hours</div><div className="v">{CONTACT.hours}</div></div></li>
            </ul>
          </div>
          <div className="contact-card reveal">
            <h3>Send us a message</h3>
            <p>We reply the same business day. Looking to open an account instead? <Link href="/auth/signup" style={{ fontWeight: 600, color: "var(--signal-text)" }}>Create your account</Link>.</p>
            {sent ? (
              <div className="apply-done" role="status">
                <div className="modal-check success-pop"><Check /></div>
                <b>Message sent</b>
                <p>Thanks, we&apos;ll get back to you today. For anything urgent, call {CONTACT.phone}.</p>
              </div>
            ) : (
              <form className="contact-form" onSubmit={submit}>
                <div className="row2">
                  <label className="field"><span>Your name</span><input name="name" required placeholder="Full name" /></label>
                  <label className="field"><span>Store name</span><input name="store" placeholder="Business name" /></label>
                </div>
                <div className="row2">
                  <label className="field"><span>Email</span><input name="email" type="email" required placeholder="you@store.com" autoComplete="email" /></label>
                  <label className="field"><span>Phone</span><input name="phone" type="tel" placeholder="(513) 555-0100" autoComplete="tel" /></label>
                </div>
                <label className="field"><span>How can we help?</span><textarea name="message" required placeholder="Which delivery areas do you serve? Do you carry a specific brand we need?" /></label>
                {error && <p className="form-err" role="alert" style={{ color: "var(--red)", fontSize: 13 }}>{error}</p>}
                <button className="btn btn-primary" type="submit" style={{ justifyContent: "center" }} disabled={sending}>{sending ? "Sending…" : <>Send message <ArrowRight /></>}</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
