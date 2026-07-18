"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MessageSquare } from "lucide-react";

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-grid" aria-hidden />
      <div className="hero-split">
        <div className="hero-copy">
          <h1 className="headline" data-lines>
            <span className="lm"><span className="lm-in">Wholesale for the</span></span>
            <span className="lm"><span className="lm-in">independent <span className="or">c&#8209;store.</span></span></span>
          </h1>
          <p className="sub reveal">
            Satya Wholesale is a licensed cash-and-carry distributor in Cincinnati, Ohio. Independent
            convenience stores, gas stations and smoke shops stock their shelves with us and manage it
            all from one customer account. Shop the warehouse floor on Reading Road, or order online and
            have it delivered.
          </p>
          <div className="hero-actions reveal">
            <Link className="btn btn-primary" href="/auth/signup">Open a customer account <ArrowRight /></Link>
            <a className="btn btn-ghost" href="#contact"><MessageSquare /> Contact sales</a>
          </div>
        </div>
        <div className="hero-figure reveal">
          <Image
            src="/warehosue-full.png"
            alt="Satya Wholesale cash-and-carry distribution warehouse in Cincinnati, Ohio"
            width={1500}
            height={1200}
            priority
            sizes="(max-width: 900px) 92vw, 46vw"
            className="hero-illus"
          />
        </div>
      </div>
    </section>
  );
}
