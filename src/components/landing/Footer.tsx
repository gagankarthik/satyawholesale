"use client";

import Link from "next/link";
import { CONTACT } from "@/lib/store";
import Brand from "@/components/Brand";
import { Phone, Mail, MapPin, Clock } from "lucide-react";

export default function Footer() {
  return (
    <footer>
      <div className="wrap foot-wrap">
        <div className="foot-top">
          <div className="foot-brand">
            <a href="#main" className="brand" aria-label="Satya Wholesale home"><Brand height={40} /></a>
            <p className="ab">
              A licensed wholesale &amp; cash-and-carry distributor supplying independent convenience
              stores, gas stations and smoke shops across Greater Cincinnati.
            </p>
            <ul className="foot-cinfo">
              <li><a href={CONTACT.phoneHref}><Phone strokeWidth={2} /> {CONTACT.phone}</a></li>
              <li><a href={`mailto:${CONTACT.email}`}><Mail strokeWidth={2} /> {CONTACT.email}</a></li>
              <li><span><MapPin strokeWidth={2} /> {CONTACT.address1}, {CONTACT.address2}</span></li>
              <li><span><Clock strokeWidth={2} /> {CONTACT.hours}</span></li>
            </ul>
          </div>
          <div className="foot-cols">
            <div className="fcol">
              <h5>Explore</h5>
              <a href="#departments">Products</a>
              <a href="#how">How it works</a>
              <a href="#process">Get started</a>
              <a href="#why">Why us</a>
              <a href="#faq">FAQ</a>
            </div>
            <div className="fcol">
              <h5>Account</h5>
              <Link href="/auth/signup">Open an account</Link>
              <Link href="/auth/login">Customer login</Link>
              <Link href="/apply">Apply for access</Link>
              <a href="#account">Customer accounts</a>
            </div>
            <div className="fcol">
              <h5>Support</h5>
              <a href="#contact">Contact sales</a>
              <Link href="/privacy">Privacy</Link>
              <Link href="/returns">Returns</Link>
              <Link href="/terms">Terms</Link>
            </div>
          </div>
        </div>
        <div className="foot-bot">
          <span>© 2026 {CONTACT.legalName}. All rights reserved.</span>
          <div className="foot-legal">
            <span>Cincinnati, Ohio</span>
            <span className="sep">·</span>
            <span>21+ · Wholesale only · Sales comply with state and federal law</span>
          </div>
        </div>

        <svg className="foot-stamp" viewBox="0 0 124 124" role="img" aria-label="Verified 21-plus wholesale only">
          <defs>
            <path id="footStampArc" d="M62 62 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0" fill="none" />
          </defs>
          <circle cx="62" cy="62" r="60" className="fs-ring bold" />
          <circle cx="62" cy="62" r="55" className="fs-ring thin" />
          <circle cx="62" cy="62" r="33" className="fs-ring thin" />
          <text className="fs-arc">
            <textPath href="#footStampArc" startOffset="0">
              VERIFIED RETAILERS ★ 21+ WHOLESALE ONLY ★&nbsp;
            </textPath>
          </text>
          <text x="62" y="58" textAnchor="middle" className="fs-num">21+</text>
          <text x="62" y="76" textAnchor="middle" className="fs-sub">★ VERIFIED ★</text>
        </svg>
      </div>
    </footer>
  );
}
