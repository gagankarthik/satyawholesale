"use client";

import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type MouseEventHandler, type ReactNode } from "react";
import { cx } from "./cx";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "ink" | "ghost" | "light" | "danger";
export type ButtonSize = "sm" | "md";

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
}

export interface ButtonProps
  extends BaseProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> {}

/**
 * The single button primitive for the app. Encapsulates the design-system
 * button classes plus loading/disabled/icon affordances and accessibility.
 *
 * @example <Button variant="primary" loading={saving}>Save changes</Button>
 * @example <Button href="/portal" variant="ghost">Trade login</Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, fullWidth, iconLeft, iconRight, href, className, children, disabled, ...rest },
  ref
) {
  const cls = cx("btn", `btn-${variant}`, size === "sm" && "btn-sm", fullWidth && "btn-block", className);
  const content = (
    <>
      {loading ? <Spinner /> : iconLeft}
      {children}
      {!loading && iconRight}
    </>
  );

  if (href && !disabled && !loading) {
    // Forward the props that make sense on an anchor so link-buttons stay
    // as capable as button-buttons (onClick side-effects, layout style, a11y).
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
    <button
      ref={ref}
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {content}
    </button>
  );
});
