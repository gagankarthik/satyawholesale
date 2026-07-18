"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { STRENGTHS } from "./data";
import { Reveal, Stagger, Item, MaskText, Parallax } from "./motion";

export default function WhySatya() {
  return (
    <section id="why" className="rd-why">
      <div className="wrap why-split">
        <div>
          <MaskText
            as="h2"
            className="rd-title"
            lines={["One supplier for", <>most of your <span className="or">shelf.</span></>]}
          />
          <Reveal delay={0.12}>
            <p className="rd-lede">
              Independent convenience stores run better with fewer suppliers to manage. Satya Wholesale
              covers most of your shelf from a single account, so you spend less time placing orders and
              reconciling invoices, and more time serving customers.
            </p>
          </Reveal>

          <Stagger className="why-feats">
            {STRENGTHS.map((f) => (
              <Item className="why-feat" key={f.h}>
                <span className="ck">
                  <Check />
                </span>
                <div>
                  <h4>{f.h}</h4>
                  <p>{f.p}</p>
                </div>
              </Item>
            ))}
          </Stagger>
        </div>

        <Reveal delay={0.1}>
          <Parallax amount={28}>
            <figure className="why-fig">
              <Image
                src="/warehouse.webp"
                alt="Inside the Satya Wholesale distribution warehouse: pallet racking and cased goods"
                fill
                sizes="(max-width: 900px) 100vw, 50vw"
              />
            </figure>
          </Parallax>
        </Reveal>
      </div>
    </section>
  );
}
