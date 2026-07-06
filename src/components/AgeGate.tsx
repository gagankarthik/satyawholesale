"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type S = "loading" | "ask" | "ok" | "deny";

export default function AgeGate() {
  const [state, setState] = useState<S>("loading");

  useEffect(() => {
    try {
      setState(window.localStorage.getItem("satya.age21") === "yes" ? "ok" : "ask");
    } catch {
      setState("ask");
    }
  }, []);

  if (state === "loading" || state === "ok") return null;

  const confirm = () => {
    try { window.localStorage.setItem("satya.age21", "yes"); } catch {}
    setState("ok");
  };

  return (
    <div className="agegate" role="dialog" aria-modal="true" aria-label="Age verification">
      <div className="agegate-card">
        <span className="agegate-logo">
          <Image src="/logo.webp" alt="Satya Wholesale" width={190} height={48} />
        </span>
        {state === "ask" ? (
          <>
            <div className="agegate-21">21+</div>
            <h2>Are you 21 or older?</h2>
            <p>
              Satya Wholesale distributes age-restricted tobacco and vapor products to licensed
              retailers. You must be of legal age to enter this site.
            </p>
            <div className="agegate-btns">
              <button className="btn btn-primary" onClick={confirm}>Yes, I&apos;m 21 or older</button>
              <button className="btn btn-ghost" onClick={() => setState("deny")}>No, I&apos;m under 21</button>
            </div>
            <p className="agegate-foot">Wholesale · 21+ · Sales comply with state &amp; federal law.</p>
          </>
        ) : (
          <>
            <div className="agegate-21 deny">!</div>
            <h2>You must be 21 or older</h2>
            <p>
              You must be of legal age (21 or older) to access this site. Please come back once
              you&apos;re eligible.
            </p>
            <div className="agegate-btns">
              <button className="btn btn-ghost" onClick={() => setState("ask")}>← Go back</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
