import { putItem } from "@/server/db";
import { readJson, guardResponse, rateLimit, clientIp } from "@/server/guard";

/* Public trade-account application from /apply or the contact form.
   Creates a Pending account record for admin review. No auth required,
   but the payload is strictly whitelisted, size-capped and rate-limited. */

export async function POST(req: Request) {
  // Blunt abuse of this open endpoint: 5 applications per IP per 10 minutes.
  if (!rateLimit(`apply:${clientIp(req)}`, 5, 10 * 60 * 1000)) {
    return Response.json({ error: "Too many applications. Please try again later." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await readJson<Record<string, unknown>>(req, 8 * 1024);
  } catch (e) {
    return guardResponse(e) ?? Response.json({ error: "Send the application as JSON." }, { status: 400 });
  }

  const s = (v: unknown, max = 160) => String(v ?? "").trim().slice(0, max);
  const store = s(body.store);
  const contact = s(body.contact);
  const email = s(body.email);
  if (!store || !contact || !/\S+@\S+\.\S+/.test(email)) {
    return Response.json({ error: "Store name, contact name and a valid email are required." }, { status: 400 });
  }

  const id = "C-" + Date.now().toString(36).toUpperCase();
  const account = {
    id,
    store,
    contact,
    email,
    phone: s(body.phone, 30),
    city: s(body.city, 80),
    businessLicense: s(body.businessLicense, 60) || undefined,
    tobaccoLicense: s(body.tobaccoLicense, 60) || undefined,
    since: String(new Date().getFullYear()),
    status: "Pending" as const,
    applied: Date.now(),
  };
  await putItem("accounts", id, account);
  return Response.json({ item: account }, { status: 201 });
}
