import { putItem } from "@/server/db";
import { readJson, guardResponse, rateLimit, clientIp } from "@/server/guard";

/* Public "Send us a message" submission from the landing contact form.
   Stores a message for admins to read in the console. No auth required,
   but the payload is whitelisted, size-capped and rate-limited. */

export async function POST(req: Request) {
  // Blunt abuse of this open endpoint: 5 messages per IP per 10 minutes.
  if (!rateLimit(`contact:${clientIp(req)}`, 5, 10 * 60 * 1000)) {
    return Response.json({ error: "Too many messages. Please try again later." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await readJson<Record<string, unknown>>(req, 8 * 1024);
  } catch (e) {
    return guardResponse(e) ?? Response.json({ error: "Send the message as JSON." }, { status: 400 });
  }

  const s = (v: unknown, max = 160) => String(v ?? "").trim().slice(0, max);
  const name = s(body.name);
  const email = s(body.email);
  const message = s(body.message, 2000);
  if (!name || !/\S+@\S+\.\S+/.test(email) || !message) {
    return Response.json({ error: "Your name, a valid email and a message are required." }, { status: 400 });
  }

  const id = "M-" + Date.now().toString(36).toUpperCase();
  const record = {
    id,
    name,
    email,
    store: s(body.store, 120) || undefined,
    phone: s(body.phone, 30) || undefined,
    message,
    created: Date.now(),
    read: false,
  };
  await putItem("messages", id, record);
  return Response.json({ item: record }, { status: 201 });
}
