"use client";

import Image from "next/image";
import { DEPARTMENTS, ush } from "./data";
import { Reveal, MaskText } from "./motion";

/* varied tile widths (px) so some images read bigger than others */
const WIDTHS = [380, 500, 340, 460, 380, 520, 360];

function Tile({ name, img, i, hidden }: { name: string; img: string; i: number; hidden?: boolean }) {
  return (
    <article className="dtile" style={{ width: WIDTHS[i] }} aria-hidden={hidden || undefined}>
      <div className="dtile-img">
        <Image src={ush(img, 720)} alt={hidden ? "" : name} fill sizes="520px" style={{ objectFit: "cover" }} />
        <h3 className="dtile-name">{name}</h3>
      </div>
    </article>
  );
}

export default function Departments() {
  return (
    <section id="departments" className="rd-cats">
      <div className="wrap">
        <div className="rd-head">
          <MaskText
            as="h2"
            className="rd-title"
            lines={["Everything your store sells,", <>stocked by the <span className="or">case.</span></>]}
          />
          <Reveal delay={0.12}>
            <p className="rd-lede">
              Satya Wholesale distributes seven categories to convenience stores, gas stations and
              smoke shops across Greater Cincinnati. Every department is stocked deep and restocked
              weekly, and the live catalog with case pricing opens once your customer account is verified.
            </p>
          </Reveal>
        </div>
      </div>

      {/* full-bleed, gapless, looping row */}
      <div className="deptmarquee" role="group" aria-label="What we distribute">
        <div className="deptmarquee-track">
          {DEPARTMENTS.map((d, i) => (
            <Tile key={d.name} name={d.name} img={d.img} i={i} />
          ))}
          {DEPARTMENTS.map((d, i) => (
            <Tile key={d.name + "-dup"} name={d.name} img={d.img} i={i} hidden />
          ))}
        </div>
      </div>
    </section>
  );
}
