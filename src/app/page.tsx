"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CONTACT } from "@/lib/store";
import { fileApplication } from "@/lib/wms";
import Brand from "@/components/Brand";
import {
  Arrow, Check, Phone, Mail, Pin, Clock, Store, Truck, Receipt, Refresh,
  Shield, Boxes, DeptLeaf, DeptDrop, DeptFlame, DeptPlus, DeptCart, DeptCar, DeptPhone,
} from "@/components/Icons";

const DEPARTMENTS = [
  { Icon: DeptLeaf, name: "Tobacco", desc: "Cigarettes, cigars, cigarillos, chewing, hookah and pipe — the cornerstone of the counter, kept deep and in stock." },
  { Icon: DeptDrop, name: "Vape", desc: "A full wall of disposables, pods and e-liquids from the categories your regulars ask for, restocked weekly." },
  { Icon: DeptFlame, name: "Smoking Accessories", desc: "Lighters, glass, rolling supplies, butane, charcoal and the impulse buys that ring up beside them." },
  { Icon: DeptPlus, name: "Health & Beauty", desc: "Everyday medicine, energy shots, supplements and personal care for the aisle that turns over fast." },
  { Icon: DeptCart, name: "Grocery & Candy", desc: "Candy, snacks, beverages and household staples — the center-store breadth a c-store needs in one stop." },
  { Icon: DeptCar, name: "Automotive", desc: "Air fresheners, fluids, windshield care and the road essentials drivers reach for at the register." },
  { Icon: DeptPhone, name: "Phone & Accessories", desc: "Charging cables, fashion accessories and general merchandise to round out the front counter." },
];

const ush = (id: string, w = 1000) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

const HERO_IMAGES = [
  { id: "1553413077-190dd305871c", alt: "Pallet racking inside a wholesale distribution warehouse" },
  { id: "1586528116311-ad8dd3c8310d", alt: "Cases of stocked goods on warehouse shelving" },
  { id: "1565891741441-64926e441838", alt: "Loaded distribution yard ready for dispatch" },
];

const SERVICE = [
  { Icon: Store, n: "At the warehouse", h: "Cash & carry", img: "1494412519320-aa613dfb7738", p: "Walk our Reading Road floor, load your own cases and check out the same day. No appointment, no minimum." },
  { Icon: Truck, n: "Across the Tri-State", h: "Regional delivery", img: "1601584115197-04ecc0da31d7", p: "Place an order from the trade portal and we deliver across Greater Cincinnati and the Tri-State — typically next day." },
  { Icon: Receipt, n: "One invoice", h: "A single account", img: "1605902711622-cfb43c4437b5", p: "Tobacco, grocery, HBA and automotive on one bill and one drop-off, instead of chasing five separate suppliers." },
];

const STRENGTHS = [
  { h: "Licensed & compliant", p: "A fully licensed wholesale and tobacco distributor — every account is verified and age-restricted to 21+." },
  { h: "Consistent, deep stock", p: "A deep, well-kept range across every department, so a full restock rarely comes back short." },
  { h: "One invoice, one delivery", p: "Consolidate the whole counter onto a single order, a single bill and a single drop-off each week." },
  { h: "Local Cincinnati partner", p: "Based on Reading Road and serving the Tri-State directly — not a distant warehouse or a marketplace." },
];

const REQS = [
  { Icon: Receipt, h: "Business license", p: "Proof your store is a registered business." },
  { Icon: Shield, h: "Tobacco license", p: "Required for the regulated tobacco categories." },
  { Icon: Phone, h: "Store contact details", p: "Address, phone and delivery instructions." },
  { Icon: Check, h: "Age verification (21+)", p: "Confirming every buyer is 21 or older." },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % HERO_IMAGES.length), 5500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const nav = document.getElementById("nav");
    const onScroll = () => nav?.classList.toggle("solid", window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      }),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    return () => { window.removeEventListener("scroll", onScroll); io.disconnect(); };
  }, []);

  const close = () => setMenuOpen(false);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Store",
            name: "Satya Wholesale",
            description:
              "Licensed wholesale and cash-and-carry distributor for independent convenience retailers across Greater Cincinnati and the Tri-State.",
            url: "https://satyawholesalers.com",
            telephone: "+15132666175",
            email: CONTACT.email,
            priceRange: "$$",
            address: {
              "@type": "PostalAddress",
              streetAddress: "8100 Reading Rd",
              addressLocality: "Cincinnati",
              addressRegion: "OH",
              postalCode: "45237",
              addressCountry: "US",
            },
            areaServed: "Greater Cincinnati & the Tri-State",
            openingHours: ["Mo-Fr 10:00-17:30", "Sa 10:30-17:00"],
          }),
        }}
      />
      {/* contact bar */}
      <div className="contactbar">
        <div className="wrap contactbar-in">
          <a href={CONTACT.phoneHref}><Phone /> {CONTACT.phone}</a>
          <a href={`mailto:${CONTACT.email}`} className="hideSm"><Mail /> {CONTACT.email}</a>
          <span className="hideSm"><Clock /> {CONTACT.hours}</span>
          <span className="right"><i /> 21+ only · Sales comply with state &amp; federal law</span>
        </div>
      </div>

      {/* nav */}
      <header className="nav" id="nav">
        <div className="wrap nav-in">
          <a href="#main" className="brand" aria-label="Satya Wholesale home">
            <Image src="/logo.webp" alt="Satya Wholesale — Cash & Carry" width={232} height={58} priority />
          </a>
          <nav className="nav-links" aria-label="Primary">
            <a href="#departments">What we carry</a>
            <a href="#how">How we serve</a>
            <a href="#why">Why Satya</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className="nav-cta">
            <Link className="btn btn-ghost btn-sm" href="/portal">Trade login</Link>
            <a className="btn btn-primary btn-sm" href="#account">Open an account <Arrow /></a>
            <button className="burger" aria-label="Toggle menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d={menuOpen ? "M6 6l12 12M18 6 6 18" : "M4 7h16M4 12h16M4 17h16"} strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="mobmenu">
            <a href="#departments" onClick={close}>What we carry</a>
            <a href="#how" onClick={close}>How we serve</a>
            <a href="#why" onClick={close}>Why Satya</a>
            <a href="#contact" onClick={close}>Contact</a>
            <Link href="/portal" onClick={close}>Trade login →</Link>
            <a className="btn btn-primary" href="#account" onClick={close}>Open an account <Arrow /></a>
          </div>
        )}
      </header>

      <main id="main">
        {/* hero */}
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
                One distributor<br />
                for the <span className="or">whole</span><br />
                convenience store.
              </h1>
              <p className="sub reveal">
                Satya Wholesale is a licensed cash-and-carry distributor in Cincinnati, supplying
                independent convenience retailers across the Tri-State — the whole front counter on
                one account, with consistent stock, one invoice and one delivery.
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
                    <div className="tx"><b>Regional delivery</b><span>Greater Cincinnati &amp; Tri-State</span></div>
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

        {/* trust band */}
        <div className="trust">
          <div className="wrap trust-in">
            <div className="ti reveal"><b>Licensed</b><span>Wholesale &amp; tobacco distributor</span></div>
            <div className="ti reveal"><b>One<span className="u">·account</span></b><span>The whole front counter</span></div>
            <div className="ti reveal"><b>Next<span className="u">·day</span></b><span>Delivery across the Tri-State</span></div>
            <div className="ti reveal"><b>21<span className="u">+</span></b><span>Trade-only, verified accounts</span></div>
          </div>
        </div>

        {/* what we carry */}
        <section id="departments" className="cats">
          <div className="wrap">
            <div className="shead reveal">
              <div className="tag">What we distribute</div>
              <h2 className="sx">Everything behind<br />the counter.</h2>
              <p>
                A brief look at the categories Satya supplies. Live catalog, case pricing and ordering
                are reserved for verified trade accounts inside the order portal.
              </p>
            </div>
            <div className="capi-grid">
              {DEPARTMENTS.map(({ Icon, name, desc }) => (
                <div className="capi reveal" key={name}>
                  <div className="ic"><Icon /></div>
                  <h3>{name}</h3>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* how we serve */}
        <section id="how" className="how">
          <div className="wrap">
            <div className="shead reveal">
              <div className="tag">How we serve</div>
              <h2 className="sx">Pick it up, or have it<br />delivered to your door.</h2>
            </div>
            <div className="serve-grid">
              {SERVICE.map(({ Icon, n, h, p, img }) => (
                <div className="serve reveal" key={h}>
                  <div className="shot">
                    <Image src={ush(img, 800)} alt="" fill sizes="(max-width:1000px) 100vw, 33vw" style={{ objectFit: "cover" }} />
                  </div>
                  <div className="serve-body">
                    <div className="ic"><Icon /></div>
                    <div className="n">{n}</div>
                    <h3>{h}</h3>
                    <p>{p}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* why satya */}
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

        {/* trade account gate */}
        <section id="account" className="gate">
          <div className="wrap">
            <div className="gate-card reveal">
              <div className="gate-shot">
                <Image
                  src={ush("1604719312566-8912e9227c6a", 1000)}
                  alt="A convenience-store aisle stocked from Satya Wholesale"
                  fill
                  sizes="(max-width:900px) 100vw, 42vw"
                  style={{ objectFit: "cover" }}
                />
                <div className="gate-badge"><Shield /> Verified retailers only · 21+</div>
              </div>
              <div className="gate-body">
                <div className="tag">Trade accounts</div>
                <h2>Apply once.<br />Order forever.</h2>
                <p>
                  The order portal is for verified retailers only. Submit your details once — approval is
                  typically same business day, then the full catalog and pricing open up.
                </p>
                <div className="reqlist">
                  <div className="reqlabel mono">What you&apos;ll need</div>
                  {REQS.map(({ Icon, h, p }) => (
                    <div className="reqitem" key={h}>
                      <span className="ri"><Icon /></span>
                      <div><b>{h}</b><span>{p}</span></div>
                    </div>
                  ))}
                </div>
                <a className="btn btn-primary" href="#contact">Start an application <Arrow /></a>
              </div>
            </div>
          </div>
        </section>

        {/* contact */}
        <section id="contact" className="contact">
          <div className="wrap">
            <div className="shead reveal" style={{ marginBottom: 36 }}>
              <div className="tag">Contact</div>
              <h2 className="sx">Talk to the warehouse.</h2>
              <p>Questions about trade accounts, delivery areas or the catalog? Reach the sales team directly.</p>
            </div>
            <div className="contact-grid">
              <div className="contact-card dark reveal">
                <h3>Satya Wholesale</h3>
                <p>Licensed cash-and-carry distributor serving independent convenience retailers across the Tri-State.</p>
                <ul className="cinfo">
                  <li><span className="ic"><Pin /></span><div><div className="k">Warehouse</div><div className="v">{CONTACT.address1}<br />{CONTACT.address2}</div></div></li>
                  <li><span className="ic"><Phone /></span><div><div className="k">Phone</div><a className="v" href={CONTACT.phoneHref}>{CONTACT.phone}</a></div></li>
                  <li><span className="ic"><Mail /></span><div><div className="k">Email</div><a className="v" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></div></li>
                  <li><span className="ic"><Clock /></span><div><div className="k">Hours</div><div className="v">{CONTACT.hours}</div></div></li>
                </ul>
              </div>
              <div className="contact-card reveal">
                <h3>Request a trade account</h3>
                <p>Send your details and the team will follow up the same business day.</p>
                {sent ? (
                  <div style={{ marginTop: 24 }}>
                    <div className="modal-check" style={{ margin: "0 0 14px" }}><Check /></div>
                    <p style={{ marginTop: 0 }}>Thanks — we&apos;ve received your request and will reach out shortly. For anything urgent, call {CONTACT.phone}.</p>
                  </div>
                ) : (
                  <form
                    className="contact-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      fileApplication({
                        store: String(f.get("store") || "New applicant"),
                        contact: String(f.get("name") || ""),
                        email: String(f.get("email") || ""),
                        phone: String(f.get("phone") || ""),
                        city: CONTACT.city,
                      });
                      setSent(true);
                    }}
                  >
                    <div className="row2">
                      <label className="field"><span>Your name</span><input name="name" required placeholder="Full name" /></label>
                      <label className="field"><span>Store name</span><input name="store" required placeholder="Business name" /></label>
                    </div>
                    <div className="row2">
                      <label className="field"><span>Email</span><input name="email" type="email" required placeholder="you@store.com" /></label>
                      <label className="field"><span>Phone</span><input name="phone" placeholder="(   )   -    " /></label>
                    </div>
                    <label className="field"><span>How can we help?</span><textarea name="message" placeholder="Tell us about your store and what you'd like to stock." /></label>
                    <button className="btn btn-primary" type="submit" style={{ justifyContent: "center" }}>Apply for trade access <Arrow /></button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* final cta */}
        <section className="cta">
          <div className="wrap">
            <h2 className="reveal">Put the whole<br />counter on one account.</h2>
            <p className="reveal">Open a trade account, or call the warehouse and we&apos;ll get you set up.</p>
            <div className="ca reveal">
              <a className="btn btn-ink" href="#account">Open a trade account</a>
              <a className="btn btn-light" href={CONTACT.phoneHref}>Call {CONTACT.phone}</a>
            </div>
          </div>
        </section>
      </main>

      {/* footer */}
      <footer>
        <div className="wrap">
          <div className="foot-top">
            <div className="foot-brand">
              <a href="#main" className="brand"><Brand dark height={40} /></a>
              <p className="ab">
                A licensed wholesale &amp; cash-and-carry distributor serving independent convenience
                retailers across Greater Cincinnati and the Tri-State.
              </p>
              <div className="foot-badges">
                <span><Shield /> Licensed distributor</span>
                <span><Check /> 21+ trade-only</span>
              </div>
            </div>
            <div className="foot-cols">
              <div className="fcol">
                <h5>Company</h5>
                <a href="#departments">What we carry</a>
                <a href="#how">How we serve</a>
                <a href="#why">Why Satya</a>
                <a href="#account">Trade accounts</a>
              </div>
              <div className="fcol">
                <h5>Account</h5>
                <Link href="/portal">Trade login</Link>
                <Link href="/portal">Order portal</Link>
                <Link href="/admin">Admin console</Link>
                <a href="#contact">Support</a>
              </div>
              <div className="fcol">
                <h5>Contact</h5>
                <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>
                <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
                <span className="faddr">{CONTACT.address1}<br />{CONTACT.address2}</span>
              </div>
              <div className="fcol">
                <h5>Warehouse hours</h5>
                <ul className="fhours">
                  {CONTACT.hoursList.map((h) => (
                    <li key={h.d}><span>{h.d.slice(0, 3)}</span><span className={h.t === "Closed" ? "closed" : ""}>{h.t}</span></li>
                  ))}
                </ul>
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
              <span>21+ · Verified to state &amp; federal law</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
