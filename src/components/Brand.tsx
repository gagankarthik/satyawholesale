import Image from "next/image";

/**
 * Brand lockup — always the original Satya Wholesale logo.
 * `dark` is accepted for call-site compatibility; the same logo
 * asset is used on every surface (no recolouring, no wordmark).
 */
export default function Brand({ height = 36 }: { dark?: boolean; height?: number }) {
  return (
    <Image
      src="/logo.webp"
      alt="Satya Wholesale"
      width={Math.round(height * 4)}
      height={height}
      style={{ height, width: "auto" }}
      priority
    />
  );
}
