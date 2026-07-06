"use client";

import { useCallback, useEffect, useState } from "react";
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
    e.error = (err as Error).message;
    // 401/403 (signed out, or a buyer touching admin data) resolves to empty
  } finally {
    e.ready = true;
    e.loading = false;
    publish(e);
  }
}

/** Force-refresh an entity from anywhere (e.g. after order placement). */
export const refreshCollection = (entity: string) => load(entity, true);

export function useCollection<T>(entity: string, idOf: (item: T) => string) {
  const [, bump] = useState(0);

  useEffect(() => {
    const e = entry(entity);
    const sub = () => bump((n) => n + 1);
    e.subs.add(sub);
    void load(entity);
    return () => { e.subs.delete(sub); };
  }, [entity]);

  const e = entry(entity);
  const items = e.items as T[];

  const add = useCallback((item: T) => {
    const c = entry(entity);
    c.items = [item, ...(c.items as T[])];
    publish(c);
    apiCreate(entity, item).catch(() => load(entity, true));
  }, [entity]);

  const update = useCallback((id: string, patch: Partial<T>) => {
    const c = entry(entity);
    c.items = (c.items as T[]).map((it) => (idOf(it) === id ? { ...it, ...patch } : it));
    publish(c);
    apiPatch(entity, id, patch).catch(() => load(entity, true));
  }, [entity, idOf]);

  const remove = useCallback((id: string) => {
    const c = entry(entity);
    c.items = (c.items as T[]).filter((it) => idOf(it) !== id);
    publish(c);
    apiDelete(entity, id).catch(() => load(entity, true));
  }, [entity, idOf]);

  const refresh = useCallback(() => load(entity, true), [entity]);

  return { items, ready: e.ready, error: e.error, add, update, remove, refresh };
}
