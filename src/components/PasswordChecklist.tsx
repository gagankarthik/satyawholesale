"use client";

import { Check } from "@/components/Icons";

/* Live password requirements. Each rule ticks green the moment it's met as the
   user types, instead of making them parse a static "rules" line. */

const RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: "At least 10 characters", test: (p) => p.length >= 10 },
  { label: "Upper and lowercase letters", test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: "A number", test: (p) => /\d/.test(p) },
];

/** True when the password satisfies every rule (mirrors the checklist). */
export const passwordValid = (p: string) => RULES.every((r) => r.test(p));

export function PasswordChecklist({ value }: { value: string }) {
  return (
    <ul className="pwchecks" aria-label="Password requirements">
      {RULES.map((r) => {
        const ok = r.test(value);
        return (
          <li key={r.label} className={ok ? "ok" : ""}>
            <span className="pwc-ic" aria-hidden="true"><Check /></span>
            {r.label}
          </li>
        );
      })}
    </ul>
  );
}
