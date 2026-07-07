"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

/* Infinite-loop poster carousel. Cloned slides on both sides give a seamless
   wrap; a transform-based track animates smoothly and centres the active card.
   Each card is the image's exact aspect (nothing cropped). Navigate by
   dragging/swiping, the arrows, the dots, or let it autoplay. */

interface SlideData {
  title?: string;
  button: string;
  src: string;
  href?: string;
}

const ArrowRight = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 18l6-6-6-6" />
  </svg>
);

const EASE = "transform .6s cubic-bezier(.22,.61,.36,1)";

export default function Carousel({ slides }: { slides: SlideData[] }) {
  const n = slides.length;
  const looped = n > 1;
  const copies = looped ? 3 : 1;
  const start = looped ? n : 0;

  const contRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const idxRef = useRef(start);
  const posRef = useRef(0);
  const drag = useRef({ on: false, startX: 0, base: 0, moved: false });
  const resume = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [idx, setIdx] = useState(start);
  const [paused, setPaused] = useState(false);

  const loop = Array.from({ length: copies * n }, (_, k) => slides[k % n]);
  const activeLogical = ((idx % n) + n) % n;

  const centerOn = useCallback((index: number, animate: boolean) => {
    const cont = contRef.current;
    const track = trackRef.current;
    const card = cardsRef.current[index];
    if (!cont || !track || !card) return;
    const x = Math.round(cont.clientWidth / 2 - (card.offsetLeft + card.offsetWidth / 2));
    posRef.current = x;
    track.style.transition = animate ? EASE : "none";
    track.style.transform = `translate3d(${x}px,0,0)`;
  }, []);

  const goTo = useCallback((index: number) => {
    idxRef.current = index;
    setIdx(index);
    centerOn(index, true);
  }, [centerOn]);

  const goRel = useCallback((dir: number) => goTo(idxRef.current + dir), [goTo]);

  // seamless wrap: once a transition into a clone copy settles, jump (no anim)
  // back to the matching card in the middle copy
  const onSettle = useCallback((e: React.TransitionEvent) => {
    // ignore transitions bubbling up from the cards' own scale animation
    if (!looped || e.target !== trackRef.current || e.propertyName !== "transform") return;
    let ni = idxRef.current;
    if (ni >= 2 * n) ni -= n;
    else if (ni < n) ni += n;
    else return;
    idxRef.current = ni;
    setIdx(ni);
    centerOn(ni, false);
  }, [looped, n, centerOn]);

  // centre on mount, re-centre as images settle their widths or on resize
  useEffect(() => {
    centerOn(idxRef.current, false);
    const cont = contRef.current;
    if (!cont) return;
    const ro = new ResizeObserver(() => centerOn(idxRef.current, false));
    ro.observe(cont);
    return () => ro.disconnect();
  }, [centerOn]);

  // autoplay
  useEffect(() => {
    if (!looped || paused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => goRel(1), 4600);
    return () => clearInterval(t);
  }, [looped, paused, goRel]);

  const holdPause = () => { setPaused(true); if (resume.current) clearTimeout(resume.current); };
  const releasePause = () => { if (resume.current) clearTimeout(resume.current); resume.current = setTimeout(() => setPaused(false), 3500); };

  // pointer drag / swipe
  const onDown = (e: React.PointerEvent) => {
    if (!looped) return;
    drag.current = { on: true, startX: e.clientX, base: posRef.current, moved: false };
    holdPause();
    const track = trackRef.current;
    if (track) track.style.transition = "none";
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.on) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 5) d.moved = true;
    posRef.current = d.base + dx;
    const track = trackRef.current;
    if (track) track.style.transform = `translate3d(${d.base + dx}px,0,0)`;
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.on) return;
    d.on = false;
    const dx = e.clientX - d.startX;
    if (dx < -50) goRel(1);
    else if (dx > 50) goRel(-1);
    else centerOn(idxRef.current, true);
    releasePause();
  };

  return (
    <div
      className="coverflow"
      ref={contRef}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <div className="cf-track" ref={trackRef} onTransitionEnd={onSettle}>
        {loop.map((s, i) => {
          const on = i === idx;
          const external = s.href && /^https?:\/\//i.test(s.href);
          return (
            <div
              key={i}
              ref={(el) => { cardsRef.current[i] = el; }}
              className={`cf-card ${on ? "on" : ""}`}
              onClick={() => { if (drag.current.moved) return; if (i !== idx) goTo(i); }}
            >
              <img
                className="cf-img"
                src={s.src}
                alt={s.title || "Promotion"}
                loading="eager"
                decoding="async"
                draggable={false}
                onLoad={() => { if (!drag.current.on) centerOn(idxRef.current, false); }}
              />
              {on && (s.title || s.href) && (
                <div className="cf-cap">
                  {s.title && <h3>{s.title}</h3>}
                  {s.href && (external ? (
                    <a className="cf-shop" href={s.href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                      {s.button} <ArrowRight className="cf-shop-ic" />
                    </a>
                  ) : (
                    <Link className="cf-shop" href={s.href} onClick={(e) => e.stopPropagation()}>
                      {s.button} <ArrowRight className="cf-shop-ic" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {looped && (
        <>
          <button type="button" className="cf-ctrl prev" onClick={() => goRel(-1)} aria-label="Previous slide"><ArrowRight /></button>
          <button type="button" className="cf-ctrl next" onClick={() => goRel(1)} aria-label="Next slide"><ArrowRight /></button>
          <div className="cf-dots">
            {slides.map((_, i) => (
              <button key={i} type="button" className={i === activeLogical ? "on" : ""} onClick={() => goTo(n + i)} aria-label={`Go to slide ${i + 1}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
