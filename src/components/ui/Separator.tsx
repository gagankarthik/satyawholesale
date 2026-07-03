import { cx } from "./cx";

/**
 * Horizontal rule between groups of content. `label` renders centered text
 * in the line ("or", "earlier this week").
 */
export function Separator({ label, className }: { label?: string; className?: string }) {
  if (!label) return <hr className={cx("sep", className)} />;
  return (
    <div className={cx("sep-labeled", className)} role="separator" aria-label={label}>
      <span>{label}</span>
    </div>
  );
}
