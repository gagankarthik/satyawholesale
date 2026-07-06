"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Arrow } from "@/components/Icons";
import { HERO_IMAGES, ush } from "./data";

export default function Hero() {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % HERO_IMAGES.length), 5500);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="hero">
      <div className="hero-carousel" aria-hidden data-parallax="0.12">
        {HERO_IMAGES.map((img, i) => (
          <div key={img.id} className={`hero-slide ${i === slide ? "on" : ""}`}>
            <Image src={ush(img.id, 1600)} alt="" fill priority={i === 0} sizes="100vw" style={{ objectFit: "cover" }} />
          </div>
        ))}
      </div>
      <div className="hero-grid" aria-hidden />
      <div className="wrap hero-in">
        <div className="hero-copy">
          <h1 className="headline" data-lines>
            <span className="lm"><span className="lm-in">Wholesale for the</span></span>
            <span className="lm"><span className="lm-in">independent <span className="or">c&#8209;store.</span></span></span>
          </h1>
          <p className="sub reveal">
            Satya Wholesale is a licensed wholesale distributor and cash-and-carry warehouse on Reading
            Road in Cincinnati, Ohio. Independent convenience stores across the Tri-State stock tobacco,
            vape, grocery, candy, health and beauty, and automotive supplies here on one customer account.
            Shop the floor yourself or get next-day delivery to your store.
          </p>
          <div className="hero-actions reveal">
            <Link className="btn btn-primary" href="/signup">Open a customer account <Arrow /></Link>
            <a className="btn btn-light" href="#contact">Contact sales</a>
          </div>
        </div>
      </div>
      <div className="hero-dots" role="tablist" aria-label="Warehouse photos">
        {HERO_IMAGES.map((img, i) => (
          <button
            key={img.id}
            role="tab"
            aria-selected={i === slide}
            aria-label={img.alt}
            className={i === slide ? "on" : ""}
            onClick={() => setSlide(i)}
          />
        ))}
      </div>
    </section>
  );
}
