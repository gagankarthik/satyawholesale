"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal, Stagger, Item, MaskText, DrawLine } from "./motion";

const STEPS = [
  { n: "01", h: "Apply for customer access", p: "Submit your business and tobacco licenses online. It costs nothing and takes about five minutes." },
  { n: "02", h: "Get verified, same day", p: "We review your details the same business day and activate your customer account." },
  { n: "03", h: "Order in the portal", p: "Browse the live catalog with case pricing and build an order in minutes." },
  { n: "04", h: "Pick up or get it delivered", p: "Collect at the Reading Road warehouse, or have your order delivered across Greater Cincinnati." },
];

export default function Process() {
  return (
    <section id="process" className="rd-proc">
      <div className="wrap">
        <div className="rd-head">
          <MaskText
            as="h2"
            className="rd-title"
            lines={["Open a wholesale account", <>in <span className="or">four steps.</span></>]}
          />
          <Reveal delay={0.12}>
            <p className="rd-lede">
              Opening a Satya Wholesale account is free and takes minutes. Most convenience stores go
              from application to their first case order within one business day.
            </p>
          </Reveal>
        </div>

        <div className="ptime">
          <div className="ptrack">
            <DrawLine className="ptrack-fill" delay={0.2} />
          </div>
          <Stagger className="psteps">
            {STEPS.map((s) => (
              <Item className="pstep" key={s.n}>
                <span className="pnode" aria-hidden />
                <span className="pnum">{s.n}</span>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </Item>
            ))}
          </Stagger>
        </div>

        <Reveal className="proc-foot" delay={0.1}>
          <span>Get started today.</span>
          <Link className="btn btn-primary" href="/auth/signup">
            Open a customer account <ArrowRight />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
