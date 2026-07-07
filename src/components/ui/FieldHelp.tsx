"use client";

import { Tooltip } from "./Tooltip";

/**
 * FieldHelp — a small help icon beside a form-field label. On hover/focus it
 * shows a Radix tooltip explaining what the field is for. Portal-based, so it
 * works inside modals and scroll containers.
 *
 * @example <span>Reorder point <FieldHelp text="When on-hand cases fall to this number, the item is flagged to reorder." /></span>
 */
export function FieldHelp({ text }: { text: string }) {
  return (
    <Tooltip label={text}>
      <span className="fieldhelp" tabIndex={0} role="img" aria-label={`Help: ${text}`}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M9.6 9.3a2.4 2.4 0 1 1 3.1 2.3c-.7.26-1.2.85-1.2 1.6v.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="12" cy="16.7" r="1" fill="currentColor" />
        </svg>
      </span>
    </Tooltip>
  );
}
