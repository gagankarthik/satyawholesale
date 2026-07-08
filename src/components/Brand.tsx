import Image from "next/image";

/**
 * Brand lockup — always the original Satya Wholesale logo.
 * On dark surfaces the original logo (navy text) is unreadable, so it
 * sits on a small clean light chip rather than being recoloured.
 */
/* logo.webp intrinsic size is 787×226 (≈3.48:1) — keep the declared ratio
   matched so next/image reserves the correct box and the mark isn't offset. */
const LOGO_RATIO = 787 / 226;

/* `priority` is OPT-IN: the shells render several Brand instances, some hidden
   by CSS (e.g. the mobile topbar logo on desktop). Preloading (priority) every
   one makes the browser warn "preloaded but not used" for the hidden variants,
   so default to lazy loading and only opt in for a genuine above-the-fold LCP. */
export default function Brand({ dark = false, height = 34, priority = false }: { dark?: boolean; height?: number; priority?: boolean }) {
  const img = (
    <Image
      src="/logo.webp"
      alt="Satya Wholesale"
      width={Math.round(height * LOGO_RATIO)}
      height={height}
      style={{ height, width: "auto", display: "block" }}
      priority={priority}
    />
  );
  return dark ? <span className="brandchip">{img}</span> : img;
}
