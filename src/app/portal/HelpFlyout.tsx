"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CONTACT } from "@/lib/store";
import { Phone, Mail, Clock } from "@/components/Icons";

/**
 * Sidebar "Need help?" control.
 * Hovering shows a quick tooltip; clicking opens a flyout to the right of the
 * sidebar with the full contact card (phone, email and opening hours).
 */
export default function HelpFlyout() {
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const close = useCallback(() => setPos(null), []);

  /* keep the (tall) flyout inside the viewport — the trigger sits near the bottom
     of the sidebar, so anchoring its top to the trigger would overflow off-screen */
  useLayoutEffect(() => {
    if (!pos || !popRef.current) return;
    const h = popRef.current.offsetHeight;
    const clamped = Math.max(8, Math.min(pos.top, window.innerHeight - h - 8));
    if (Math.abs(clamped - pos.top) > 0.5) setPos((p) => (p ? { ...p, top: clamped } : p));
  }, [pos]);

  useEffect(() => {
    if (!pos) return;
    const onDoc = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [pos, close]);

  const toggle = () => {
    if (pos) { close(); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.top, left: r.right + 10 });
  };

  return (
    <div className="psupport">
      <button
        ref={btnRef}
        type="button"
        className="psup-trigger"
        title="Need help? Contact us"
        aria-haspopup="dialog"
        aria-expanded={!!pos}
        onClick={toggle}
      >
        <span className="psup-trigger-ic"><Phone /></span>
        <span className="psup-trigger-l">Need help?</span>
      </button>

      {pos && createPortal(
        <div ref={popRef} className="help-pop" role="dialog" aria-label="Contact Satya Wholesale" style={{ top: pos.top, left: pos.left }}>
          <div className="help-pop-h">
            <span className="hp-title">Need help?</span>
            <span className="hp-sub">We&apos;re here during business hours.</span>
          </div>
          <a className="help-row" href={CONTACT.phoneHref}>
            <span className="help-ic"><Phone /></span>
            <span className="help-info"><span className="hr-l">Call us</span><span className="hr-v">{CONTACT.phone}</span></span>
          </a>
          <a className="help-row" href={`mailto:${CONTACT.email}`}>
            <span className="help-ic"><Mail /></span>
            <span className="help-info"><span className="hr-l">Email</span><span className="hr-v">{CONTACT.email}</span></span>
          </a>
          <div className="help-row help-row-static">
            <span className="help-ic"><Clock /></span>
            <span className="help-info">
              <span className="hr-l">Hours</span>
              {CONTACT.hoursList.map((h) => (
                <span key={h.d} className="hr-hours"><span>{h.d}</span><span>{h.t}</span></span>
              ))}
            </span>
          </div>
          <div className="help-addr">{CONTACT.address1}<br />{CONTACT.address2}</div>
        </div>,
        document.body
      )}
    </div>
  );
}
