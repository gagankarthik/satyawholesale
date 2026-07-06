"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* =========================================================
   Saved delivery addresses for the signed-in customer account.
   A per-account UI convenience (quick-fill at checkout), kept
   in localStorage keyed by store so two accounts on a shared
   machine never see each other's list. Starts empty — the
   buyer adds their own on the Manage addresses page.
   ========================================================= */

export interface Address {
  id: string;
  label: string;
  line: string;      // street address
  apt?: string;      // apartment / suite / building no. (optional)
  city: string;
  state: string;
  zip: string;
  /** One-line composed form, used for display and on the order record. */
  addr: string;
}

export type AddressParts = Omit<Address, "id" | "addr">;

/** Compose "123 Main St, Suite 4, Cincinnati, OH 45202" from parts. */
export function formatAddress(p: Partial<AddressParts>): string {
  const cityStateZip = [[p.city, p.state].filter(Boolean).join(", "), p.zip].filter(Boolean).join(" ").trim();
  return [p.line, p.apt, cityStateZip].map((s) => (s || "").trim()).filter(Boolean).join(", ");
}

const keyFor = (store: string) =>
  `satya.addr.${(store || "default").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

export function useAddresses(store: string) {
  const [list, setList] = useState<Address[]>([]);
  const [ready, setReady] = useState(false);
  const ref = useRef<Address[]>([]);
  const key = keyFor(store);

  useEffect(() => {
    let next: Address[] = [];
    try { const s = localStorage.getItem(key); next = s ? (JSON.parse(s) as Address[]) : []; } catch { next = []; }
    // Backfill the composed line for any legacy record missing it.
    next = next.map((a) => (a.addr ? a : { ...a, addr: formatAddress(a) }));
    ref.current = next;
    setList(next);
    setReady(true);
  }, [key]);

  const commit = useCallback((next: Address[]) => {
    ref.current = next;
    setList(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* private mode / quota */ }
  }, [key]);

  const add = useCallback((parts: AddressParts) => {
    const clean: AddressParts = {
      label: parts.label.trim(),
      line: parts.line.trim(),
      apt: parts.apt?.trim() || undefined,
      city: parts.city.trim(),
      state: parts.state.trim(),
      zip: parts.zip.trim(),
    };
    commit([...ref.current, { id: "a" + Date.now().toString(36), ...clean, addr: formatAddress(clean) }]);
  }, [commit]);

  const remove = useCallback((id: string) => {
    commit(ref.current.filter((a) => a.id !== id));
  }, [commit]);

  return { addresses: list, ready, add, remove };
}
