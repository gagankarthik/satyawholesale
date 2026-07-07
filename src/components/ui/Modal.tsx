"use client";

import { type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Footer actions (rendered in a button row). */
  footer?: ReactNode;
  size?: "md" | "wide";
  className?: string;
}

/**
 * Dialog — shadcn/ui architecture on Radix. Radix supplies the focus trap,
 * scroll lock, Escape handling, portal, and focus restore; the panel keeps the
 * brand `.modal` styling. Overlay click and Escape both close.
 */
export function Modal({ open, onClose, title, children, footer, size = "md", className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="uidialog-overlay" />
        <Dialog.Content
          className="uidialog-viewport"
          aria-describedby={undefined}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <div className={cn("modal", size === "wide" && "wide", className)}>
            {title ? (
              <Dialog.Title asChild><h3>{title}</h3></Dialog.Title>
            ) : (
              <Dialog.Title className="sr-only">Dialog</Dialog.Title>
            )}
            {children}
            {footer && <div className="modalbtns" style={{ marginTop: 20 }}>{footer}</div>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
