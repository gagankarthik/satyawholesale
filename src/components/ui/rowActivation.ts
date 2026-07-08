import type { KeyboardEvent } from "react";

/* Spreadable props that make a non-button element (a clickable card or table
   row) operable by mouse AND keyboard, per WCAG 2.1.1: Enter and Space both
   activate, and Space's default page-scroll is prevented. Use on rows/cards
   that navigate; child interactive controls should call stopPropagation. */
export function rowActivation(onActivate: () => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onActivate();
      }
    },
  };
}
