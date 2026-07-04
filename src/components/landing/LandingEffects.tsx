"use client";

import { useEffect } from "react";

/* =======================================================================
   Landing motion engine. One IntersectionObserver + one rAF loop drive
   every effect via data attributes, so section components stay static:

   .reveal            — fade/rise on view (legacy, kept)
   [data-lines]       — staggered line-mask reveal (children .lm > .lm-in)
   [data-counter]     — odometer digit-roll to data-counter value on view
   [data-parallax]    — translateY at data-parallax rate while in view
   [data-pin-track]   — scroll progress (0..1) → --pinp CSS var on the el
   #nav               — .solid past 20px; --scrollp var for the progress bar

   All motion collapses instantly under prefers-reduced-motion.
   ======================================================================= */
export default function LandingEffects() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nav = document.getElementById("nav");

    /* ---- on-view triggers ---- */
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("in");
          io.unobserve(e.target);
        }),
      { threshold: 0.12 }
    );
    document
      .querySelectorAll(".reveal, [data-lines]")
      .forEach((el) => io.observe(el));

    /* ---- scroll loop: nav state, parallax, pinned progress ---- */
    const parallaxEls = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    const pinTracks = Array.from(document.querySelectorAll<HTMLElement>("[data-pin-track]"));
    let raf = 0;

    const frame = () => {
      raf = 0;
      const y = window.scrollY;
      nav?.classList.toggle("solid", y > 20);
      if (reduced) return;

      for (const el of parallaxEls) {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) continue;
        const rate = Number(el.dataset.parallax) || 0.15;
        const mid = r.top + r.height / 2 - window.innerHeight / 2;
        el.style.transform = `translateY(${(-mid * rate).toFixed(1)}px)`;
      }
      for (const el of pinTracks) {
        const r = el.getBoundingClientRect();
        const span = r.height - window.innerHeight;
        const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : r.top < window.innerHeight / 2 ? 1 : 0;
        el.style.setProperty("--pinp", p.toFixed(4));
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(frame); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    frame();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  return null;
}
