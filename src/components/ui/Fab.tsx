"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { cx } from "./cx";

export interface FabProps {
  /** Icon shown before the label. */
  icon: ReactNode;
  /** The label — extended FABs always name their action. */
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  /** Only render below the mobile breakpoint (default true — on desktop the
      same action should live in the page header). */
  mobileOnly?: boolean;
  ariaLabel?: string;
  className?: string;
}

/**
 * Extended floating action button — the page's single primary action, pinned
 * bottom-right within thumb reach. Use at most one per screen, and keep the
 * header button too: the FAB is a shortcut, not the only path.
 *
 * @example <Fab icon={<Plus />} href="/admin/purchaseorder/new">New PO</Fab>
 */
export function Fab({ icon, children, href, onClick, mobileOnly = true, ariaLabel, className }: FabProps) {
  const cls = cx("fab", mobileOnly && "fab-mobile", className);
  const content = (
    <>
      <span className="fab-ic" aria-hidden="true">{icon}</span>
      <span className="fab-label">{children}</span>
    </>
  );
  if (href) {
    return <Link href={href} className={cls} aria-label={ariaLabel}>{content}</Link>;
  }
  return <button type="button" className={cls} onClick={onClick} aria-label={ariaLabel}>{content}</button>;
}
