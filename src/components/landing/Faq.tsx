"use client";

import { useState } from "react";

const FAQS = [
  { q: "Who can open a trade account?", a: "Satya is wholesale, trade-only. We supply licensed, registered convenience retailers — every account is verified and limited to buyers 21 and older." },
  { q: "How long does approval take?", a: "We review applications the same business day. Once you're approved, the full catalog and case pricing open up in the order portal." },
  { q: "Do you deliver, or is it pickup only?", a: "Both. Walk the Reading Road cash-and-carry floor and load your own cases, or order in the portal for next-day delivery across Greater Cincinnati and the Tri-State." },
  { q: "Is there an order minimum?", a: "There's no minimum for cash-and-carry pickup. Any delivery thresholds are confirmed with you when your account is set up." },
  { q: "What can I buy on one account?", a: "Most of your shelf — tobacco, vape, smoking accessories, health & beauty, grocery & candy, automotive, and phone accessories — on one account, one invoice and one delivery." },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="faq">
      <div className="wrap faq-split">
        <div className="shead reveal" style={{ marginBottom: 0 }}>
          <div className="tag">FAQ</div>
          <h2 className="sx">Questions,<br />answered.</h2>
          <p>What independent retailers ask most before opening an account. Anything else? Call the warehouse.</p>
        </div>
        <div className="faq-list reveal">
          {FAQS.map((f, i) => (
            <div className={`faq-item ${open === i ? "on" : ""}`} key={i}>
              <button className="faq-q" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                <span>{f.q}</span>
                <span className="faq-ic" aria-hidden="true" />
              </button>
              <div className="faq-a"><p>{f.a}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
