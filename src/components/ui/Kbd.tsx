import { type ReactNode } from "react";

/**
 * Keyboard-key chip for shortcut hints, e.g. <Kbd>Ctrl</Kbd> <Kbd>K</Kbd>.
 * Purely presentational.
 */
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}
