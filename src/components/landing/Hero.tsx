"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Arrow, Boxes, Store, Truck, Shield } from "@/components/Icons";
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
      <div className="hero-carousel" aria-hidden>
        {HERO_IMAGES.map((img, i) => (
          <div key={img.id} className={`hero-slide ${i === slide ? "on" : ""}`}>
            <Image src={ush(img.id, 1600)} alt="" fill priority={i === 0} sizes="100vw" style={{ objectFit: "cover" }} />
          </div>
        ))}
      </div>
      <div className="hero-grid" aria-hidden />
      <div className="wrap hero-in">
        <div className="hero-copy">
          <h1 className="headline reveal">
            Wholesale for the<br />
            independent <span className="or">c-store.</span>
          </h1>
          <p className="sub reveal">
            Satya Wholesale is a licensed cash-and-carry distributor on Reading Road in Cincinnati.
            We supply independent convenience stores across the Tri-State with tobacco, vape, grocery,
            candy, health and beauty, and automotive. Pick up at the warehouse or have it delivered to
            your store.
          </p>
          <div className="hero-actions reveal">
            <a className="btn btn-primary" href="#account">Open a trade account <Arrow /></a>
            <a className="btn btn-light" href="#contact">Contact sales</a>
          </div>
        </div>

        {/* signature: distributor profile dossier (no products/prices) */}
        <div className="dossier reveal" aria-label="Distributor profile">
          <span className="tab">Trade-only</span>
          <div className="dossier-in">
            <div className="dossier-top">
              <div>
                <div className="lbl">Distributor profile</div>
                <div className="co">Satya Wholesale</div>
              </div>
              <div className="dossier-stamp">Licensed<br />21+ Verified</div>
            </div>
            <div className="dossier-rows">
              <div className="drow2">
                <span className="ic"><Boxes /></span>
                <div className="tx"><b>Every department</b><span>Tobacco through automotive</span></div>
                <span className="val">In stock</span>
              </div>
              <div className="drow2">
                <span className="ic"><Store /></span>
                <div className="tx"><b>Cash &amp; carry + delivery</b><span>Pick up or we deliver</span></div>
                <span className="val">Both</span>
              </div>
              <div className="drow2">
                <span className="ic"><Truck /></span>
                <div className="tx"><b>Regional delivery</b><span>Greater Cincinnati</span></div>
                <span className="val">Next-day</span>
              </div>
              <div className="drow2">
                <span className="ic"><Shield /></span>
                <div className="tx"><b>Licensed &amp; compliant</b><span>Trade-only, age-verified</span></div>
                <span className="val">21+</span>
              </div>
            </div>
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
