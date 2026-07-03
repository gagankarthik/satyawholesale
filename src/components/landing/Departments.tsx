import Image from "next/image";
import { DEPARTMENTS, ush } from "./data";

export default function Departments() {
  return (
    <section id="departments" className="cats">
      <div className="wrap">
        <div className="shead reveal">
          <div className="tag">What we distribute</div>
          <h2 className="sx">What we keep<br />in stock.</h2>
          <p>
            Seven wholesale categories for convenience stores, gas stations and smoke shops, stocked
            deep and restocked weekly. The live catalog with case pricing opens after your trade
            account is verified.
          </p>
        </div>
        <div className="capi-grid">
          {DEPARTMENTS.map(({ Icon, name, img, desc }) => (
            <article className="capi reveal" key={name}>
              <div className="capi-img">
                <Image src={ush(img, 640)} alt={name} fill sizes="(max-width: 860px) 80vw, 360px" style={{ objectFit: "cover" }} />
                <span className="capi-ic"><Icon /></span>
              </div>
              <div className="capi-tx">
                <h3>{name}</h3>
                <p>{desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
