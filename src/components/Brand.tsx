import Image from "next/image";

/**
 * Brand lockup — always the original Satya Wholesale logo.
 * On dark surfaces the original logo (navy text) is unreadable, so it
 * sits on a small clean light chip rather than being recoloured.
 */
/* logo.webp intrinsic size is 787×226 (≈3.48:1) — keep the declared ratio
   matched so next/image reserves the correct box and the mark isn't offset. */
const LOGO_RATIO = 787 / 226;

export default function Brand({ dark = false, height = 34 }: { dark?: boolean; height?: number }) {
  const img = (
    <Image
      src="/logo.webp"
      alt="Satya Wholesale"
      width={Math.round(height * LOGO_RATIO)}
      height={height}
      style={{ height, width: "auto", display: "block" }}
      priority
    />
  );
  return dark ? <span className="brandchip">{img}</span> : img;
}
