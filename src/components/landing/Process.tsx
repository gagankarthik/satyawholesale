import Link from "next/link";
import { Arrow } from "@/components/Icons";

const STEPS = [
  { n: "01", h: "Apply for trade access", p: "Submit your business and tobacco licenses online. It costs nothing and takes about five minutes." },
  { n: "02", h: "Get verified, same day", p: "We review your details the same business day and activate your trade account." },
  { n: "03", h: "Order in the portal", p: "Browse the live catalog with case pricing and build an order in minutes." },
  { n: "04", h: "Pick up or get it delivered", p: "Collect at the Reading Road warehouse, or take next-day delivery across the Tri-State." },
];

export default function Process() {
  return (
    <section id="process" className="process">
      <div className="wrap">
        <div className="shead reveal">
          <div className="tag">Getting started</div>
          <h2 className="sx">From application to<br />your shelf in four steps.</h2>
          <p>Opening a wholesale account is quick. Most stores go from application to their first case order within one business day.</p>
        </div>
        <div className="steps-grid">
          {STEPS.map((s) => (
            <div className="stepc reveal" key={s.n}>
              <div className="stepc-n">{s.n}</div>
              <h3>{s.h}</h3>
              <p>{s.p}</p>
            </div>
          ))}
        </div>
        <div className="process-cta reveal">
          <span>Ready when you are.</span>
          <Link className="btn btn-primary" href="/apply">Open a trade account <Arrow /></Link>
        </div>
      </div>
    </section>
  );
}
