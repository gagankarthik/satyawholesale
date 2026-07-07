import { getAuth, unauthorized } from "@/server/auth";
import { getItem, listByType, patchItem, type Row } from "@/server/db";
import { readJson, rateLimit } from "@/server/guard";
import { logError } from "@/server/log";

const clamp = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

/** Find the caller's own account row and its storage key (self-signup keys by
    the Cognito sub; older rows match on email/store and key by their id). */
async function findOwnAccount(sub: string, email?: string | null, store?: string | null): Promise<{ key: string; row: Row } | null> {
  const direct = await getItem("accounts", sub);
  if (direct) return { key: sub, row: direct };
  const row = (await listByType("accounts")).find(
    (a) => a.email === email || (!!store && a.store === store)
  );
  return row ? { key: String(row.id), row } : null;
}

/* GET /api/me/account → the caller's OWN trade account (licenses + submitted
   documents) for the portal profile page. The `accounts` collection itself is
   admin-only; this endpoint returns only the caller's row, and only the
   profile-relevant fields — never anyone else's data. */
/** The profile-safe projection of an account — the only fields ever returned. */
const view = (a: Row) => ({
  memberNo: a.memberNo ?? null,
  store: a.store ?? null,
  contact: a.contact ?? null,
  email: a.email ?? null,
  phone: a.phone ?? null,
  city: a.city ?? null,
  status: a.status ?? null,
  since: a.since ?? null,
  terms: a.terms ?? null,
  businessLicense: a.businessLicense ?? null,
  tobaccoLicense: a.tobaccoLicense ?? null,
  docs: Array.isArray(a.docs) ? a.docs : [],
});

export async function GET(req: Request) {
  const user = await getAuth(req);
  if (!user) return unauthorized();
  const found = await findOwnAccount(user.sub, user.email, user.store);
  return Response.json({ account: found ? view(found.row) : null });
}

/* PATCH /api/me/account → the caller updates their OWN contact details. Only
   self-service fields are writable here (contact name, phone). Store name,
   payment terms, licenses, status and membership number are set by the
   warehouse and can never be changed through this endpoint. */
export async function PATCH(req: Request) {
  const user = await getAuth(req);
  if (!user) return unauthorized();
  if (!rateLimit(`me:${user.sub}`, 20, 60_000)) {
    return Response.json({ error: "Too many updates. Please wait a moment." }, { status: 429 });
  }
  try {
    const body = await readJson<Row>(req);
    const found = await findOwnAccount(user.sub, user.email, user.store);
    if (!found) return Response.json({ error: "No account on file to update." }, { status: 404 });

    // Only the fields present in the request are touched, so a document upload
    // doesn't blank out contact details and vice-versa.
    const patch: Row = {};
    if (body.contact !== undefined) patch.contact = clamp(body.contact, 120);
    if (body.phone !== undefined) patch.phone = clamp(body.phone, 40);

    // Append a verification document. The customer supplies a label + the
    // uploaded file URL; approval is always false here — only an admin approves.
    if (body.addDoc && typeof body.addDoc === "object") {
      const d = body.addDoc as Row;
      const name = clamp(d.name, 200);
      const doc = { label: clamp(d.label, 120) || name || "Document", name, url: clamp(d.url, 600), uploaded: Date.now(), approved: false };
      const cur = Array.isArray(found.row.docs) ? (found.row.docs as Row[]) : [];
      if (cur.length >= 30) return Response.json({ error: "Too many documents on file. Remove one first." }, { status: 400 });
      patch.docs = [...cur, doc];
    }

    if (Object.keys(patch).length === 0) return Response.json({ account: view(found.row) });
    const updated = await patchItem("accounts", found.key, patch);
    return Response.json({ account: updated ? view(updated) : view({ ...found.row, ...patch }) });
  } catch (e) {
    logError("me.account.PATCH", e, { sub: user.sub });
    return Response.json({ error: "Couldn't save your changes." }, { status: 500 });
  }
}
