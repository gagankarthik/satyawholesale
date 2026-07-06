/* Request guards shared by the API routes: body size caps, id validation,
   and a lightweight in-memory rate limiter. Keep these dependency-free so
   every route can lean on them cheaply. */

export class GuardError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Read and size-cap a JSON body. Rejects oversized or malformed payloads
    before they reach the data layer. Default cap 64 KB. */
export async function readJson<T = unknown>(req: Request, maxBytes = 64 * 1024): Promise<T> {
  const text = await req.text();
  // Byte length, not string length — multibyte chars must count fully.
  if (new Blob([text]).size > maxBytes) throw new GuardError("That request is too large.", 413);
  if (!text.trim()) throw new GuardError("Send the record as JSON.");
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new GuardError("That request body isn't valid JSON."); }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new GuardError("Send the record as a JSON object.");
  }
  return parsed as T;
}

/** Record ids / path segments: printable, bounded, no control or path chars. */
const ID_RE = /^[A-Za-z0-9._:-]{1,128}$/;
export const isValidId = (id: unknown): id is string => typeof id === "string" && ID_RE.test(id);

/** Turn a GuardError into a JSON Response; returns null for anything else so
    the caller can rethrow real (500-worthy) errors. */
export const guardResponse = (e: unknown): Response | null =>
  e instanceof GuardError ? Response.json({ error: e.message }, { status: e.status }) : null;

/* ---- fixed-window rate limiter (per server instance) ----
   Good enough to blunt abuse of the public endpoints on a single small SSR
   container. If you scale to multiple instances, back this with a shared
   store (DynamoDB TTL table / ElastiCache) instead. */
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) { buckets.set(key, { count: 1, reset: now + windowMs }); return true; }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

/** Best-effort client IP from the proxy headers Amplify/CloudFront set. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
