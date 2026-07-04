import Image from "next/image";
import { SERVICE, ush } from "./data";

export default function HowWeServe() {
  return (
    <section id="how" className="how">
      <div className="wrap">
        <div className="shead reveal">
          <div className="tag">How we serve</div>
          <h2 className="sx" data-lines>
            <span className="lm"><span className="lm-in">Pick it up, or have it</span></span>
            <span className="lm"><span className="lm-in">delivered to your door.</span></span>
          </h2>
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
  );
}
