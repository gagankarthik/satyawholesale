"use client";

import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type MouseEventHandler, type ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

/**
 * Button — shadcn/ui architecture (cva variants + Slot `asChild`), themed with
 * the Satya design-system classes so the brand look is preserved.
 */
export const buttonVariants = cva("btn", {
  variants: {
    variant: {
      primary: "btn-primary",
      ink: "btn-ink",
      ghost: "btn-ghost",
      light: "btn-light",
      danger: "btn-danger",
    },
    size: {
      md: "",
      sm: "btn-sm",
    },
    fullWidth: {
      true: "btn-block",
    },
  },
  defaultVariants: { variant: "primary", size: "md" },
});

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

interface BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, sets `aria-busy`, and blocks interaction. */
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  /** Render as a link (Next.js `Link`) instead of a `<button>`. */
  href?: string;
  /** Merge props onto the child element instead of rendering a `<button>`. */
  asChild?: boolean;
}

export interface ButtonProps
  extends BaseProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, fullWidth, iconLeft, iconRight, href, asChild, className, children, disabled, ...rest },
  ref
) {
  const cls = cn(buttonVariants({ variant, size, fullWidth }), className);
  const content = (
    <>
      {loading ? <Spinner /> : iconLeft}
      {children}
      {!loading && iconRight}
    </>
  );

  if (asChild) {
    return <Slot className={cls} {...rest}>{children}</Slot>;
  }

  if (href && !disabled && !loading) {
    const { style, title, onClick, tabIndex, ["aria-label"]: ariaLabel } = rest;
    return (
      <Link
        href={href}
        className={cls}
        style={style}
        title={title}
        tabIndex={tabIndex}
        aria-label={ariaLabel}
        onClick={onClick as unknown as MouseEventHandler<HTMLAnchorElement>}
      >
        {content}
      </Link>
    );
  }

  return (
    <button ref={ref} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
});
