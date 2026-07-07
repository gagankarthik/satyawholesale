/* =========================================================
   Canonical payment terms.
   One list, used everywhere a payment term is chosen or shown
   (customer accounts, admin order creation, receipts) so the
   vocabulary is identical across the app. Each term carries a
   plain-English `info` string that powers the admin guide and the
   inline hints next to every term picker.
   The stored value IS the `label` — keep labels stable, since
   existing accounts and orders reference them by string.
   ========================================================= */

export interface PaymentTerm {
  /** The exact string stored on the account/order and shown to users. */
  label: string;
  /** Grouping for the picker's optgroups and the admin guide. */
  group: string;
  /** Plain-English explanation for the guide and inline hints. */
  info: string;
}

export const PAYMENT_TERMS: PaymentTerm[] = [
  // Prepaid — money before the goods move
  { label: "Cash in advance (CIA)", group: "Prepaid", info: "Full payment before the order is prepared or shipped. Lowest risk to us; typical for new or high-risk accounts." },
  { label: "Payment in advance (PIA)", group: "Prepaid", info: "Same as cash in advance: the buyer pays in full before we ship anything." },
  { label: "Cash with order (CWO)", group: "Prepaid", info: "Payment is submitted together with the purchase order, before fulfilment begins." },
  { label: "Cash before shipment (CBS)", group: "Prepaid", info: "Goods are prepared but only released once payment has cleared, before they leave the warehouse." },
  { label: "Cash against documents (CAD)", group: "Prepaid", info: "The documents needed to collect the goods are handed over only after payment, usually through the bank." },

  // Paid at / around delivery
  { label: "Cash on delivery (COD)", group: "On delivery", info: "Payment is collected at the moment of delivery. No credit is extended." },
  { label: "Cash next delivery (CND)", group: "On delivery", info: "This delivery is paid for when the next one arrives, a rolling one-cycle credit." },

  // Due immediately
  { label: "Due upon receipt", group: "Due now", info: "Payment is expected as soon as the invoice is received, with no credit period." },

  // Net credit
  { label: "Net 7", group: "Net credit", info: "Full payment due within 7 days of the invoice date." },
  { label: "Net 10", group: "Net credit", info: "Full payment due within 10 days of the invoice date." },
  { label: "Net 15", group: "Net credit", info: "Full payment due within 15 days of the invoice date." },
  { label: "Net 30", group: "Net credit", info: "Full payment due within 30 days of the invoice date. The most common trade term." },
  { label: "Net 60", group: "Net credit", info: "Full payment due within 60 days of the invoice date." },
  { label: "Net 90", group: "Net credit", info: "Full payment due within 90 days of the invoice date." },

  // Early-payment discount
  { label: "2/10 Net 30", group: "Early-payment discount", info: "Take 2% off if paid within 10 days; otherwise the full amount is due in 30 days." },

  // Calendar-based
  { label: "End of month (EOM)", group: "Calendar-based", info: "Payment is due at the end of the month in which the invoice was issued." },
  { label: "Month following invoice (MFI)", group: "Calendar-based", info: "Payment is due in the month after the invoice month, often on a set day (e.g. the 10th MFI)." },
  { label: "1MD", group: "Calendar-based", info: "One month after delivery: payment due a month from the delivery date." },
  { label: "2MD", group: "Calendar-based", info: "Two months after delivery: payment due two months from the delivery date." },

  // Standing arrangements
  { label: "Installment agreement", group: "Arrangements", info: "The balance is split into scheduled part-payments agreed up front." },
  { label: "Line of credit", group: "Arrangements", info: "A standing credit limit the account draws against and pays down over time." },
  { label: "Partial payment", group: "Arrangements", info: "A portion is paid now, with the remainder due later under an agreed schedule." },
  { label: "Subscriptions and retainers", group: "Arrangements", info: "A recurring fixed charge on a set cycle rather than per-order billing." },
  { label: "Contra", group: "Arrangements", info: "What the account owes is offset against what we owe them, settling only the difference." },
];

/** Just the labels, in list order. */
export const PAYMENT_TERM_LABELS = PAYMENT_TERMS.map((t) => t.label);

/** The default term for a new account/order when none is set. */
export const DEFAULT_PAYMENT_TERM = "Net 15";

/** Terms grouped in list order, for optgroups and the admin guide. */
export function groupedPaymentTerms(): { name: string; terms: PaymentTerm[] }[] {
  const out: { name: string; terms: PaymentTerm[] }[] = [];
  for (const t of PAYMENT_TERMS) {
    let g = out.find((x) => x.name === t.group);
    if (!g) { g = { name: t.group, terms: [] }; out.push(g); }
    g.terms.push(t);
  }
  return out;
}

/** The explanation for a term label, or "" if it isn't a known term. */
export const paymentTermInfo = (label: string | null | undefined): string =>
  PAYMENT_TERMS.find((t) => t.label === label)?.info ?? "";
