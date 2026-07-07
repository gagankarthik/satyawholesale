"use client";

import { getIdToken } from "./auth";

/* Thin fetch wrapper for the app's API. Attaches the Cognito ID token;
   throws Error with the server's message so callers can flash() it. */

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getIdToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    const err = new Error(body?.error || `Request failed (${res.status})`) as Error & { status?: number };
    err.status = res.status; // let callers distinguish expected 401/403 from real failures
    throw err;
  }
  return body;
}

export const apiGet = <T>(path: string) => call<T>(path);
export const apiList = <T>(entity: string) =>
  call<{ items: T[] }>(`/api/data/${entity}`).then((r) => r.items);
export const apiCreate = <T>(entity: string, item: T) =>
  call<{ item: T }>(`/api/data/${entity}`, { method: "POST", body: JSON.stringify(item) }).then((r) => r.item);
export const apiPatch = <T>(entity: string, id: string, patch: Partial<T>) =>
  call<{ item: T }>(`/api/data/${entity}/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) }).then((r) => r.item);
export const apiDelete = (entity: string, id: string) =>
  call<{ ok: true }>(`/api/data/${entity}/${encodeURIComponent(id)}`, { method: "DELETE" }).then(() => undefined);
export const apiPost = <T, B = unknown>(path: string, body: B) =>
  call<T>(path, { method: "POST", body: JSON.stringify(body) });
export const apiPatchPath = <T, B = unknown>(path: string, body: B) =>
  call<T>(path, { method: "PATCH", body: JSON.stringify(body) });

/** Browser → S3 upload via a presigned URL; returns the servable URL.
    `folder` is one of the allowed folders in src/server/s3.ts. */
export async function uploadFile(file: Blob, contentType: string, folder: string): Promise<string> {
  const { putUrl, url } = await apiPost<{ putUrl: string; url: string }>("/api/upload", { contentType, folder });
  const put = await fetch(putUrl, { method: "PUT", headers: { "content-type": contentType }, body: file });
  if (!put.ok) throw new Error("The upload didn't go through. Try again.");
  return url;
}

/** Resolve a servable image URL. Public S3 URLs pass through untouched;
    a private "/api/file?key=…" link is exchanged (with the auth token) for a
    short-lived presigned URL an <img> can load. */
export async function resolveFileUrl(url: string): Promise<string> {
  if (!url || !url.startsWith("/api/file")) return url;
  const { url: signed } = await call<{ url: string }>(url);
  return signed;
}
