"use client";

import { useEffect } from "react";

/* Sticky-nav shadow + scroll-reveal animation. Renders nothing. */
export default function LandingEffects() {
  useEffect(() => {
    const nav = document.getElementById("nav");
    const onScroll = () => nav?.classList.toggle("solid", window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      }),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    return () => { window.removeEventListener("scroll", onScroll); io.disconnect(); };
  }, []);

  return null;
}
