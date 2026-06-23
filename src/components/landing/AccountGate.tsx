import Image from "next/image";
import { Arrow, Shield } from "@/components/Icons";
import { REQS, ush } from "./data";

export default function AccountGate() {
  return (
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
            <h2>Apply once,<br />order anytime.</h2>
            <p>
              The order portal is open to verified retailers only. Submit your details once and we&apos;ll
              review the same business day. Once you&apos;re approved, the full catalog and case pricing open up.
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
  );
}
