import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Status pill — shadcn/ui cva architecture over the design-system tokens. */
export const badgeVariants = cva("uibadge", {
  variants: {
    tone: {
      neutral: "t-neutral",
      success: "t-success",
      warning: "t-warning",
      danger: "t-danger",
      info: "t-info",
      brand: "t-brand",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

/** Status pill. Map domain state → tone in the caller. */
export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)}>{children}</span>;
}
