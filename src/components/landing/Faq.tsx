"use client";

import { useState } from "react";
import { Reveal, Stagger, Item, MaskText } from "./motion";

const FAQS = [
  { q: "Who can open a wholesale customer account?", a: "Satya is wholesale only. We supply licensed, registered convenience retailers. Every account is verified before it opens and buying is limited to 21 and older." },
  { q: "How long does approval take?", a: "We review applications the same business day. Once you're approved, the full catalog and case pricing open up in the order portal." },
  { q: "Do you deliver, or is it pickup only?", a: "Both. Walk the Reading Road cash-and-carry floor and load your own cases, or order in the portal for delivery to your store." },
  { q: "What areas do you deliver to?", a: "We deliver across Greater Cincinnati, including Northern Kentucky and Southeast Indiana, usually the next business day." },
  { q: "Is there an order minimum?", a: "There's no minimum for cash-and-carry pickup. Any delivery thresholds are confirmed with you when your account is set up." },
  { q: "What can I buy on one account?", a: "Most of your shelf: tobacco, vape, smoking accessories, health and beauty, grocery and candy, automotive, and phone accessories. One account, one invoice, one delivery." },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="faq">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
      <div className="wrap faq-split">
        <div className="rd-head" style={{ marginBottom: 0 }}>
          <MaskText
            as="h2"
            className="rd-title"
            lines={["Wholesale questions,", <span className="or" key="a">answered.</span>]}
          />
          <Reveal delay={0.12}>
            <p className="rd-lede">
              What independent retailers ask most before opening a Satya Wholesale account. For anything
              else, call the Reading Road warehouse and a member of our team will help.
            </p>
          </Reveal>
        </div>
        <Stagger className="faq-list" amount={0.12}>
          {FAQS.map((f, i) => (
            <Item className={`faq-item ${open === i ? "on" : ""}`} key={i}>
              <button className="faq-q" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                <span>{f.q}</span>
                <span className="faq-ic" aria-hidden="true" />
              </button>
              <div className="faq-a"><p>{f.a}</p></div>
            </Item>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
