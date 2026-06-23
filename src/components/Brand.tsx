import Image from "next/image";

/**
 * Brand lockup — always the original Satya Wholesale logo.
 * On dark surfaces the original logo (navy text) is unreadable, so it
 * sits on a small clean light chip rather than being recoloured.
 */
export default function Brand({ dark = false, height = 34 }: { dark?: boolean; height?: number }) {
  const img = (
    <Image
      src="/logo.webp"
      alt="Satya Wholesale"
      width={Math.round(height * 4)}
      height={height}
      style={{ height, width: "auto" }}
      priority
    />
  );
  return dark ? <span className="brandchip">{img}</span> : img;
}
