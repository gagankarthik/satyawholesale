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
          <h2 className="sx">Built to be your<br />single source.</h2>
          <p style={{ marginTop: 16, color: "var(--slate)", fontSize: 17, lineHeight: 1.62 }}>
            Independent retailers do best with fewer, stronger supplier relationships. Satya is built
            to be the one that covers nearly the entire store.
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
            <div className="shotcap"><span><Pin /> Reading Road warehouse · {CONTACT.city}</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
