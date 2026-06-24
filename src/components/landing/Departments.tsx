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
            The categories we carry for convenience retailers. Live catalog, case pricing and ordering
            are reserved for verified trade accounts in the order portal.
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
