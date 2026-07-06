"use client";

import { useState } from "react";
import { CONTACT } from "@/lib/store";
import { fileApplication } from "@/lib/wms";
import { Arrow, Check } from "@/components/Icons";
import { Button } from "@/components/ui";

/* Customer account application: a three-step onboarding wizard.
   Lives on /apply; the landing contact form stays a plain contact form. */
const STEPS = ["Your store", "Licenses", "Review"] as const;

export default function ApplyWizard() {
  const [sent, setSent] = useState(false);
  const [step, setStep] = useState(0);
  const [d, setD] = useState({ name: "", store: "", email: "", phone: "", businessLicense: "", tobaccoLicense: "" });
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement>) => setD({ ...d, [k]: e.target.value });

  const stepValid =
    step === 0 ? d.store.trim() !== "" && d.name.trim() !== ""
    : step === 1 ? /\S+@\S+\.\S+/.test(d.email)
    : true;

  const submit = () => {
    fileApplication({
      store: d.store.trim(),
      contact: d.name.trim(),
      email: d.email.trim(),
      phone: d.phone.trim(),
      city: CONTACT.city,
      businessLicense: d.businessLicense.trim() || undefined,
      tobaccoLicense: d.tobaccoLicense.trim() || undefined,
    });
    setSent(true);
  };

  if (sent) {
    return (
      <div className="apply-done" role="status">
        <div className="modal-check success-pop"><Check /></div>
        <b>Application received</b>
        <p>We review applications the same business day. Watch {d.email || "your inbox"} for the approval email. Anything urgent, call {CONTACT.phone}.</p>
        <div style={{ marginTop: 18 }}><Button href="/" variant="ghost">Back to the site</Button></div>
      </div>
    );
  }

  return (
    <>
      <ol className="wiz-steps" aria-label="Application steps">
        {STEPS.map((s, i) => (
          <li key={s} className={`wiz-step ${i === step ? "on" : i < step ? "done" : ""}`} aria-current={i === step ? "step" : undefined}>
            <span className="wiz-num">{i < step ? <Check /> : i + 1}</span> {s}
          </li>
        ))}
      </ol>
      <form
        className="contact-form"
        onSubmit={(e) => { e.preventDefault(); if (!stepValid) return; if (step < 2) setStep(step + 1); else submit(); }}
      >
        {step === 0 && (
          <div className="wizpane" key="s0">
            <div className="row2">
              <label className="field"><span>Store name</span><input value={d.store} onChange={set("store")} required placeholder="Jay's Stop & Shop" autoFocus /></label>
              <label className="field"><span>Your name</span><input value={d.name} onChange={set("name")} required placeholder="Full name" /></label>
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="wizpane" key="s1">
            <div className="row2">
              <label className="field"><span>Email</span><input type="email" value={d.email} onChange={set("email")} required placeholder="you@store.com" autoFocus /></label>
              <label className="field"><span>Phone</span><input value={d.phone} onChange={set("phone")} placeholder="(513) 555-0100" /></label>
            </div>
            <div className="row2">
              <label className="field"><span>Business license #</span><input value={d.businessLicense} onChange={set("businessLicense")} placeholder="Optional, speeds up review" /></label>
              <label className="field"><span>Tobacco license #</span><input value={d.tobaccoLicense} onChange={set("tobaccoLicense")} placeholder="Needed for tobacco & vape" /></label>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="wizpane" key="s2">
            <dl className="wiz-review">
              <div><dt>Store</dt><dd>{d.store}</dd></div>
              <div><dt>Contact</dt><dd>{d.name}</dd></div>
              <div><dt>Email</dt><dd>{d.email}</dd></div>
              {d.phone && <div><dt>Phone</dt><dd>{d.phone}</dd></div>}
              <div><dt>Business license</dt><dd>{d.businessLicense || "To be provided during review"}</dd></div>
              <div><dt>Tobacco license</dt><dd>{d.tobaccoLicense || "To be provided during review"}</dd></div>
            </dl>
            <p className="wiz-note">We verify licenses before opening the catalog. Buying is limited to 21 and older.</p>
          </div>
        )}
        <div className="wiz-actions">
          {step > 0 && <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>Back</button>}
          <button className="btn btn-primary" type="submit" disabled={!stepValid} style={{ justifyContent: "center", flex: 1 }}>
            {step < 2 ? <>Continue <Arrow /></> : <>Submit application <Arrow /></>}
          </button>
        </div>
      </form>
    </>
  );
}
