"use client";

import { useCallback, useEffect, useRef } from "react";
import { useCollection } from "./collection";

/* =========================================================
   Saved delivery addresses for the signed-in customer account.
   Persisted server-side (DynamoDB) via the buyer-scoped "addresses"
   entity, so a store's saved addresses follow them across devices
   and are visible to admins on the account — unlike the old
   per-device localStorage list, which was lost on device switch.
   Legacy localStorage addresses are migrated once on first load.
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
  /** buyer scope — stamped server-side; present on records read back. */
  store?: string;
}

export type AddressParts = Omit<Address, "id" | "addr" | "store">;

/** Compose "123 Main St, Suite 4, Cincinnati, OH 45202" from parts. */
export function formatAddress(p: Partial<AddressParts>): string {
  const cityStateZip = [[p.city, p.state].filter(Boolean).join(", "), p.zip].filter(Boolean).join(" ").trim();
  return [p.line, p.apt, cityStateZip].map((s) => (s || "").trim()).filter(Boolean).join(", ");
}

const keyFor = (store: string) =>
  `satya.addr.${(store || "default").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

const newId = () => "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function useAddresses(store: string) {
  const col = useCollection<Address>("addresses", (a) => a.id);
  const migrated = useRef(false);

  /* One-time migration: if this account has no server addresses yet but a
     legacy localStorage list exists, push it up, then clear the local key so
     it never runs again. Guarded so it fires at most once per mount and only
     when the server side is genuinely empty (never clobbers real data). */
  useEffect(() => {
    if (!col.ready || migrated.current) return;
    migrated.current = true;
    if (col.items.length > 0) return;
    try {
      const raw = localStorage.getItem(keyFor(store));
      if (!raw) return;
      const legacy = JSON.parse(raw) as Address[];
      legacy.forEach((a) => col.add({ id: a.id || newId(), label: a.label, line: a.line, apt: a.apt, city: a.city, state: a.state, zip: a.zip, addr: a.addr || formatAddress(a) }));
      localStorage.removeItem(keyFor(store));
    } catch { /* private mode / bad JSON — nothing to migrate */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [col.ready, store]);

  const add = useCallback((parts: AddressParts) => {
    const clean: AddressParts = {
      label: parts.label.trim(),
      line: parts.line.trim(),
      apt: parts.apt?.trim() || undefined,
      city: parts.city.trim(),
      state: parts.state.trim(),
      zip: parts.zip.trim(),
    };
    // `store` is stamped server-side from the caller's account claim.
    col.add({ id: newId(), ...clean, addr: formatAddress(clean) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [col.add]);

  const remove = useCallback((id: string) => col.remove(id), [col.remove]); // eslint-disable-line react-hooks/exhaustive-deps

  return { addresses: col.items, ready: col.ready, add, remove };
}
