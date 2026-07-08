"use client";

import { groupedPaymentTerms, paymentTermInfo, PAYMENT_TERMS } from "@/lib/paymentTerms";

/* Shared payment-terms UI: one grouped picker and one inline explanation, so
   every place that touches payment terms looks and reads the same. Data lives
   in lib/paymentTerms. */

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
