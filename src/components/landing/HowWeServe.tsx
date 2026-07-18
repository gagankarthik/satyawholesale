"use client";

import Image from "next/image";
import { SERVICE, ush } from "./data";
import { Reveal, MaskText } from "./motion";

export default function HowWeServe() {
  return (
    <section id="how" className="rd-how">
      <div className="wrap">
        <div className="rd-head">
          <MaskText
            as="h2"
            className="rd-title"
            lines={["Pick it up, or have it", <>delivered to your <span className="or">door.</span></>]}
          />
          <Reveal delay={0.12}>
            <p className="rd-lede">
              Buy the way that suits your store. Shop our Reading Road cash-and-carry floor in person, or
              order from the portal and we&apos;ll deliver across Greater Cincinnati.
            </p>
          </Reveal>
        </div>

        <div className="serverows">
          {SERVICE.map(({ Icon, n, h, p, img }, i) => (
            <div className={`serverow ${i % 2 ? "rev" : ""}`} key={h}>
              <Reveal className="serverow-media">
                <Image
                  src={ush(img, 900)}
                  alt=""
                  fill
                  sizes="(max-width: 820px) 100vw, 50vw"
                  style={{ objectFit: "cover" }}
                />
              </Reveal>
              <Reveal className="serverow-body" delay={0.1}>
                <div className="scard-n">{n}</div>
                <div className="scard-ic">
                  <Icon />
                </div>
                <h3>{h}</h3>
                <p>{p}</p>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
