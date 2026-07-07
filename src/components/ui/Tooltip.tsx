"use client";

import type { ReactNode } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export type TooltipSide = "top" | "bottom" | "right" | "left";

export interface TooltipProps {
  label: string;
  children: ReactNode;
  side?: TooltipSide;
  className?: string;
}

/**
 * Tooltip — shadcn/ui architecture on Radix. Content is portalled, so it works
 * anywhere (including inside `overflow:hidden` scroll containers, unlike the
 * old CSS tooltip). Shows on hover/focus. Themed to the brand ink surface.
 */
export function Tooltip({ label, children, side = "top", className }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <span className={cn("tip-trigger", className)}>{children}</span>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content side={side} sideOffset={6} className="uitip-content">
            {label}
            <TooltipPrimitive.Arrow className="uitip-arrow" width={11} height={6} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
