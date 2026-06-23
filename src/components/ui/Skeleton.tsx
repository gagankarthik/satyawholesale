import { cx } from "./cx";

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
}

/** Shimmer placeholder for loading content. Decorative (aria-hidden). */
export function Skeleton({ width = "100%", height = 16, radius = 8, className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cx("skeleton", className)}
      style={{ width, height, borderRadius: radius }}
    />
  );
}
