"use client";

import Image from "next/image";
import { CONTACT } from "@/lib/store";
import { Check, Shield, Refresh, Pin } from "@/components/Icons";
import { STRENGTHS, ush } from "./data";

export default function WhySatya() {
  return (
    <section id="why" className="cats">
      <div className="wrap split">
        <div className="reveal">
          <div className="tag">Why partner with Satya</div>
          <h2 className="sx">One account for<br />most of your shelf.</h2>
          <p style={{ marginTop: 16, color: "var(--slate)", fontSize: 17, lineHeight: 1.62 }}>
            Independent stores run better with fewer suppliers to manage. Satya covers most of your
            shelf from a single account, so you spend less time placing orders and reconciling invoices.
          </p>
          <div className="feat-list">
            {STRENGTHS.map((f) => (
              <div className="fitem" key={f.h}>
                <span className="ck"><Check /></span>
                <div><h4>{f.h}</h4><p>{f.p}</p></div>
              </div>
            ))}
          </div>
          <div className="creds">
            <span className="cred"><Shield /> Licensed distributor</span>
            <span className="cred"><Refresh /> Weekly restock</span>
            <span className="cred"><Pin /> Cincinnati, OH</span>
          </div>
        </div>
        <div className="reveal">
          <div className="shotcard">
            <Image
              src={ush("1578575437130-527eed3abbec", 1100)}
              alt="Inside the Satya Wholesale distribution warehouse"
              fill
              sizes="(max-width:1000px) 100vw, 50vw"
              style={{ objectFit: "cover" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
