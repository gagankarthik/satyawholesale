"use client";

import Link from "next/link";
import { CONTACT } from "@/lib/store";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { REQS } from "./data";
import { Reveal, Stagger, Item } from "./motion";

export default function AccountGate() {
  return (
    <section id="account" className="rd-gate">
      <div className="wrap">
        <Reveal className="gate3">
          <div className="gate3-glow" aria-hidden />
          <div className="gate3-main">
            <span className="gate3-eyebrow">
              <ShieldCheck /> Verified retailers only · 21+
            </span>
            <h2>
              Apply once,
              <br />
              order anytime.
            </h2>
            <p>
              The Satya Wholesale order portal is open to verified retailers only. Submit your business
              details once and we&apos;ll review them the same business day. Once you&apos;re approved, the
              full catalog and case pricing open up.
            </p>
            <div className="gate3-actions">
              <Link className="btn btn-primary" href="/auth/signup">
                Open a customer account <ArrowRight />
              </Link>
              <a className="gate3-call" href={CONTACT.phoneHref}>
                or call {CONTACT.phone}
              </a>
            </div>
          </div>

          <div className="gate3-panel">
            <div className="gate3-panel-h">What you&apos;ll need</div>
            <Stagger className="gate3-reqs" amount={0.3}>
              {REQS.map(({ Icon, h, p }, i) => (
                <Item className="gate3-req" key={h}>
                  <span className="gate3-req-n">{String(i + 1).padStart(2, "0")}</span>
                  <span className="gate3-req-ic">
                    <Icon />
                  </span>
                  <div className="gate3-req-tx">
                    <b>{h}</b>
                    <span>{p}</span>
                  </div>
                </Item>
              ))}
            </Stagger>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
