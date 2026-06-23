import { cx } from "./cx";

export interface SpinnerProps {
  /** Accessible label announced to screen readers. */
  label?: string;
  className?: string;
}

/**
 * Accessible loading indicator. Sized to `1em` so it inherits the
 * surrounding font-size; colour follows `currentColor`.
 */
export function Spinner({ label = "Loading", className }: SpinnerProps) {
  return <span className={cx("spinner", className)} role="status" aria-label={label} />;
}
