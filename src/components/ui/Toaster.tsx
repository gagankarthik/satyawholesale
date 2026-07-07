"use client";

import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Toast host — shadcn/ui Sonner, themed to the Satya brand (ink surface,
 * white text). Mounted once in the root layout; call `toast()` anywhere.
 */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-center"
      offset={24}
      toastOptions={{ className: "satya-toast" }}
      style={
        {
          "--normal-bg": "var(--ink)",
          "--normal-text": "#ffffff",
          "--normal-border": "transparent",
          "--border-radius": "12px",
        } as CSSProperties
      }
      {...props}
    />
  );
}
