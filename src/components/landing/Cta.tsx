"use client";

import Link from "next/link";
import { CONTACT } from "@/lib/store";
import { ArrowRight, Phone } from "lucide-react";
import { Reveal, MaskText } from "./motion";

export default function Cta() {
  return (
    <section className="cta">
      <div className="wrap">
        <MaskText
          as="h2"
          delay={0.05}
          lines={["Set up your", "customer account."]}
        />
        <Reveal delay={0.1}>
          <p>Apply online in a few minutes, or call the warehouse and we&apos;ll set you up.</p>
        </Reveal>
        <Reveal className="ca" delay={0.18}>
          <Link className="btn btn-ink" href="/auth/signup">Open a customer account <ArrowRight /></Link>
          <a className="btn btn-light" href={CONTACT.phoneHref}><Phone /> Call {CONTACT.phone}</a>
        </Reveal>
      </div>
    </section>
  );
}
