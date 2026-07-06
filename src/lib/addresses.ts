"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* =========================================================
   Saved delivery addresses for the signed-in trade account.
   These are a per-account UI convenience (quick-fill at
   checkout), kept in localStorage keyed by store so two
   accounts on a shared machine never see each other's list.
   Starts empty — the buyer adds their own; nothing is seeded.
   ========================================================= */

export interface Address {
  id: string;
  label: string;
  addr: string;
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
    ref.current = next;
    setList(next);
    setReady(true);
  }, [key]);

  const commit = useCallback((next: Address[]) => {
    ref.current = next;
    setList(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* private mode / quota */ }
  }, [key]);

  const add = useCallback((label: string, addr: string) => {
    commit([...ref.current, { id: "a" + Date.now().toString(36), label: label.trim(), addr: addr.trim() }]);
  }, [commit]);

  const remove = useCallback((id: string) => {
    commit(ref.current.filter((a) => a.id !== id));
  }, [commit]);

  return { addresses: list, ready, add, remove };
}
