"use client";

import { type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";

/**
 * DialogFrame — Radix Dialog behavior (focus trap, scroll lock, Escape, portal,
 * focus restore) wrapped around an existing `.modal` panel, so brand modal
 * markup migrates without restructuring. Render it inside a conditional
 * (`{open && <DialogFrame …>`); mount/unmount drives open/close. Backdrop click
 * and Escape both close. `label` is the accessible dialog name (visually hidden;
 * the panel keeps its own visible heading).
 */
export function DialogFrame({
  onClose,
  label,
  children,
}: {
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="uidialog-overlay" />
        <Dialog.Content
          className="uidialog-viewport"
          aria-describedby={undefined}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <Dialog.Title className="sr-only">{label}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
