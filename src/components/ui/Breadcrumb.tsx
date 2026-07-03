"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { cx } from "./cx";

export interface Crumb {
  label: ReactNode;
  /** Omit on the last (current) crumb. */
  href?: string;
}

export interface BreadcrumbProps {
  items: Crumb[];
  className?: string;
}

/**
 * Breadcrumb trail for detail pages — every ancestor is a link, the current
 * page is plain text. Keeps deep admin pages (PO → supplier → product)
 * escapable in one tap.
 *
 * @example
 * <Breadcrumb items={[{ label: "Purchase orders", href: "/admin/purchaseorder" }, { label: po.id }]} />
 */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cx("crumbs", className)} aria-label="Breadcrumb">
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <Fragment key={i}>
            {c.href && !last ? (
              <Link className="crumb" href={c.href}>{c.label}</Link>
            ) : (
              <span className={cx("crumb", last && "crumb-cur")} aria-current={last ? "page" : undefined}>{c.label}</span>
            )}
            {!last && <span className="crumb-sep" aria-hidden="true">/</span>}
          </Fragment>
        );
      })}
    </nav>
  );
}
