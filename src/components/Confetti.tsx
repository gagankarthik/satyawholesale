"use client";

import { useEffect, useRef } from "react";

/* Lightweight, self-contained confetti burst (no external library, CSP-safe).
   Renders a fixed full-screen canvas, fires once on mount, then fades out. */
export default function Confetti({ duration = 2400 }: { duration?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => { canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr; };
    resize();

    const W = canvas.width, H = canvas.height;
    // scale the burst to the viewport so it fills wide screens instead of a
    // tight central spray; more pieces + wider spread as the screen grows.
    const spread = Math.min(Math.max(W / (1200 * dpr), 1), 2.4);
    const count = Math.round(150 * spread);
    const colors = ["#e8722b", "#f4a259", "#2a9d8f", "#e9c46a", "#264653", "#e76f51"];
    const cx = W / 2;
    const pieces = Array.from({ length: count }).map(() => ({
      x: cx + (Math.random() - 0.5) * W * 0.5,
      y: H * 0.28,
      vx: (Math.random() - 0.5) * W * 0.03,
      vy: (Math.random() * -1.2 - 0.4) * 15 * dpr,
      size: (Math.random() * 6 + 4) * dpr,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.35,
      color: colors[Math.floor(Math.random() * colors.length)],
      round: Math.random() > 0.5,
    }));

    const gravity = 0.4 * dpr;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const elapsed = t - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = Math.max(0, 1 - elapsed / duration);
      for (const p of pieces) {
        p.vy += gravity; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (elapsed < duration) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [duration]);

  return <canvas ref={ref} className="confetti-canvas" aria-hidden="true" />;
}
