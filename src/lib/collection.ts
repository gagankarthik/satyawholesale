"use client";

import { useCallback, useEffect, useState } from "react";
import { flash } from "./flash";
import { apiList, apiCreate, apiPatch, apiDelete } from "./api";

/* =========================================================
   useCollection — the app's data layer over /api/data/<entity>.
   One in-memory cache per entity, shared across components;
   writes are optimistic and roll back to a server refetch on
   failure. Replaces the old localStorage stores end to end.
   ========================================================= */

interface CacheEntry {
  items: unknown[];
  ready: boolean;
  loading: boolean;
  error: string | null;
  subs: Set<() => void>;
}
const cache = new Map<string, CacheEntry>();

const entry = (entity: string): CacheEntry => {
  let e = cache.get(entity);
  if (!e) { e = { items: [], ready: false, loading: false, error: null, subs: new Set() }; cache.set(entity, e); }
  return e;
};
const publish = (e: CacheEntry) => e.subs.forEach((fn) => fn());

async function load(entity: string, force = false) {
  const e = entry(entity);
  if (e.loading || (e.ready && !force)) return;
  e.loading = true;
  try {
    e.items = await apiList(entity);
    e.error = null;
  } catch (err) {
    // 401/403 (signed out, or a buyer touching admin-only data) is expected and
    // resolves to an empty list with no error banner. Anything else is a real
    // failure: keep it in `error` so the UI can offer a retry, and log it so it
    // isn't a silent blank screen.
    const status = (err as { status?: number }).status;
    if (status === 401 || status === 403) {
      e.error = null;
    } else {
      e.error = (err as Error).message;
      console.error(`[data:${entity}] load failed`, err);
    }
  } finally {
    e.ready = true;
    e.loading = false;
    publish(e);
  }
}

/** Force-refresh an entity from anywhere (e.g. after order placement). */
export const refreshCollection = (entity: string) => load(entity, true);

/* ---------------------------------------------------------------
   Real-time: keep every on-screen collection fresh by refetching
   the entities that currently have mounted subscribers, both on a
   steady interval and whenever the tab regains focus/visibility.
   Refreshes are silent (items stay put until new data lands, and
   `ready` never flips back), so there is no skeleton flicker.
   --------------------------------------------------------------- */
const REFRESH_MS = 20000;

function refreshActive() {
  for (const [entity, e] of cache) if (e.subs.size > 0) void load(entity, true);
}

let autoStarted = false;
let lastRefresh = 0;
/* Returning to a tab fires both `visibilitychange` and `focus`; coalesce any
   calls within 1s so we don't refetch every active collection twice. */
function refreshActiveWake() {
  if (document.visibilityState !== "visible") return;
  const now = Date.now();
  if (now - lastRefresh < 1000) return;
  lastRefresh = now;
  refreshActive();
}
function startAutoRefresh() {
  if (autoStarted || typeof window === "undefined") return;
  autoStarted = true;
  window.setInterval(() => { if (document.visibilityState === "visible") { lastRefresh = Date.now(); refreshActive(); } }, REFRESH_MS);
  document.addEventListener("visibilitychange", refreshActiveWake);
  window.addEventListener("focus", refreshActiveWake);
}

export function useCollection<T>(entity: string, idOf: (item: T) => string) {
  const [, bump] = useState(0);

  useEffect(() => {
    startAutoRefresh();
    const e = entry(entity);
    const sub = () => bump((n) => n + 1);
    e.subs.add(sub);
    void load(entity);
    return () => { e.subs.delete(sub); };
  }, [entity]);

  const e = entry(entity);
  const items = e.items as T[];

  // A failed write rolls the optimistic change back to the server truth AND
  // tells the user, so a change never silently reverts. `call()` throws the
  // server's friendly message, so surface it directly.
  const rollback = useCallback((err: unknown) => {
    load(entity, true);
    flash.error((err as Error)?.message || "Couldn't save that change. Please try again.");
  }, [entity]);

  const add = useCallback((item: T) => {
    const c = entry(entity);
    c.items = [item, ...(c.items as T[])];
    publish(c);
    apiCreate(entity, item)
      .then((saved) => {
        // Adopt the server's canonical record over the optimistic one: it may
        // re-price a buyer order, assign a sequential memberNo, or hand back a
        // fresh order ref. Match by object identity so a changed id still swaps.
        const cc = entry(entity);
        cc.items = (cc.items as T[]).map((it) => (it === item ? saved : it));
        publish(cc);
      })
      .catch(rollback);
  }, [entity, rollback]);

  const update = useCallback((id: string, patch: Partial<T>) => {
    const c = entry(entity);
    c.items = (c.items as T[]).map((it) => (idOf(it) === id ? { ...it, ...patch } : it));
    publish(c);
    apiPatch(entity, id, patch).catch(rollback);
  }, [entity, idOf, rollback]);

  const remove = useCallback((id: string) => {
    const c = entry(entity);
    c.items = (c.items as T[]).filter((it) => idOf(it) !== id);
    publish(c);
    apiDelete(entity, id).catch(rollback);
  }, [entity, idOf, rollback]);

  const refresh = useCallback(() => load(entity, true), [entity]);

  return { items, ready: e.ready, error: e.error, add, update, remove, refresh };
}
