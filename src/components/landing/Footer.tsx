"use client";

import Link from "next/link";
import { CONTACT } from "@/lib/store";
import Brand from "@/components/Brand";
import { Phone, Mail, Pin, Clock } from "@/components/Icons";

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-top">
          <div className="foot-brand">
            <a href="#main" className="brand"><Brand height={40} /></a>
            <p className="ab">
              A licensed wholesale &amp; cash-and-carry distributor serving independent convenience
              retailers across Greater Cincinnati.
            </p>
            <ul className="foot-cinfo">
              <li><a href={CONTACT.phoneHref}><Phone /> {CONTACT.phone}</a></li>
              <li><a href={`mailto:${CONTACT.email}`}><Mail /> {CONTACT.email}</a></li>
              <li><span><Pin /> {CONTACT.address1}, {CONTACT.address2}</span></li>
              <li><span><Clock /> {CONTACT.hours}</span></li>
            </ul>
          </div>
          <div className="foot-cols">
            <div className="fcol">
              <h5>Company</h5>
              <a href="#departments">What we carry</a>
              <a href="#how">How we serve</a>
              <a href="#why">Why Satya</a>
              <a href="#account">Customer accounts</a>
            </div>
            <div className="fcol">
              <h5>Account</h5>
              <Link href="/portal">Customer login</Link>
              <Link href="/portal">Order portal</Link>
              <Link href="/admin">Admin console</Link>
              <a href="#contact">Support</a>
            </div>
          </div>
        </div>
        <div className="foot-bot">
          <span>© 2026 {CONTACT.legalName} · All rights reserved.</span>
          <div className="foot-legal">
            <Link href="/privacy">Privacy</Link>
            <Link href="/returns">Returns</Link>
            <Link href="/terms">Terms</Link>
            <span className="sep">·</span>
            <span>21+ · Sales comply with state and federal law</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
