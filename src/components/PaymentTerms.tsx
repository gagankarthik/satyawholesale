"use client";

import { useState } from "react";
import { groupedPaymentTerms, paymentTermInfo, PAYMENT_TERMS } from "@/lib/paymentTerms";
import { Button, DialogFrame } from "@/components/ui";

/* Shared payment-terms UI: one grouped picker, one inline explanation, and one
   admin reference guide — so every place that touches payment terms looks and
   reads the same. Data lives in lib/paymentTerms. */

/** Grouped <select> for choosing a payment term. If `value` isn't one of the
    canonical terms (e.g. a legacy string on an old account), it's shown as a
    selected fallback option so nothing is silently changed. */
export function PaymentTermsSelect({
  value, onChange, ariaLabel, id,
}: { value: string; onChange: (v: string) => void; ariaLabel?: string; id?: string }) {
  const known = PAYMENT_TERMS.some((t) => t.label === value);
  return (
    <select id={id} aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)}>
      {!known && value ? <option value={value}>{value}</option> : null}
      {groupedPaymentTerms().map((g) => (
        <optgroup key={g.name} label={g.name}>
          {g.terms.map((t) => <option key={t.label} value={t.label}>{t.label}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

/** One-line plain-English explanation of the currently-selected term. */
export function PaymentTermHint({ term }: { term: string | null | undefined }) {
  const info = paymentTermInfo(term);
  if (!info) return null;
  return <small className="muted" style={{ fontSize: 12, display: "block", marginTop: 5 }}>{info}</small>;
}

/** Admin reference: a button that opens a guide explaining every payment term.
    Meant to sit at the top of pages where staff assign terms. */
export function PaymentTermsGuide() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>Payment terms guide</Button>
      {open && (
        <DialogFrame onClose={() => setOpen(false)} label="Payment terms guide">
          <div className="modal" style={{ maxWidth: 640 }}>
            <h3>Payment terms guide</h3>
            <p className="auth-sub" style={{ marginTop: 0 }}>What each term means. Set an account&apos;s term from its edit form or the actions menu.</p>
            <div style={{ maxHeight: "60vh", overflowY: "auto", margin: "4px -4px 0", padding: "0 4px" }}>
              {groupedPaymentTerms().map((g) => (
                <div key={g.name} style={{ marginTop: 14 }}>
                  <h4 style={{ margin: "0 0 4px", fontSize: 12, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--slate)" }}>{g.name}</h4>
                  {g.terms.map((t) => (
                    <div key={t.label} style={{ padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
                      <b style={{ fontSize: 14 }}>{t.label}</b>
                      <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--slate)", lineHeight: 1.5 }}>{t.info}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="modalbtns" style={{ marginTop: 16 }}><Button variant="primary" onClick={() => setOpen(false)}>Done</Button></div>
          </div>
        </DialogFrame>
      )}
    </>
  );
}
