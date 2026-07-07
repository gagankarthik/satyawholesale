import { getAuth, isAdmin, unauthorized, forbidden, type AuthUser } from "@/server/auth";
import { listByType, putItem, getItem, decrementField, nextMemberNo, type Row } from "@/server/db";
import { ENTITIES, canRead, canWrite, scopeRows } from "@/server/entities";
import { readJson, isValidId, guardResponse, rateLimit } from "@/server/guard";
import { sanitizeBuyerOrder } from "@/server/orders";

/** A buyer whose account has been frozen or blocked may not place orders. */
async function orderingBlocked(user: AuthUser): Promise<boolean> {
  const direct = await getItem("accounts", user.sub); // self-signup accounts key by sub
  const acct = direct ?? (await listByType("accounts")).find(
    (a) => a.email === user.email || (!!user.store && a.store === user.store)
  );
  return acct?.status === "Frozen" || acct?.status === "Blocked";
}

/* GET  /api/data/<entity>      → list (role-checked, buyer-scoped)
   POST /api/data/<entity>      → create (orders also decrement stock) */

export async function GET(req: Request, ctx: { params: Promise<{ entity: string }> }) {
  const { entity } = await ctx.params;
  const rule = ENTITIES[entity];
  if (!rule) return Response.json({ error: `Unknown collection "${entity}".` }, { status: 404 });
  const user = await getAuth(req);
  if (!user) return unauthorized();
  if (!canRead(rule, user)) return forbidden();
  const rows = await listByType(entity);
  return Response.json({ items: scopeRows(rule, user, rows) });
}

export async function POST(req: Request, ctx: { params: Promise<{ entity: string }> }) {
  const { entity } = await ctx.params;
  const rule = ENTITIES[entity];
  if (!rule) return Response.json({ error: `Unknown collection "${entity}".` }, { status: 404 });
  const user = await getAuth(req);
  if (!user) return unauthorized();
  if (!canWrite(rule, user)) return forbidden();

  try {
    let body = await readJson<Row>(req);

    // Orders carry money — buyers never set prices, totals or state directly.
    if (entity === "orders" && !isAdmin(user)) {
      if (!rateLimit(`order:${user.sub}`, 20, 60_000)) {
        return Response.json({ error: "Too many orders in a short time. Please wait a moment and try again." }, { status: 429 });
      }
      if (await orderingBlocked(user)) {
        return Response.json({ error: "Your account is on hold. Please contact the warehouse to place orders." }, { status: 403 });
      }
      body = await sanitizeBuyerOrder(body, user);
    } else if (rule.buyerScope && !isAdmin(user)) {
      // stamp buyer-scoped rows with the caller's own store, never a chosen one
      body[rule.buyerScope] = user.store ?? user.email;
    }

    // ids may be strings (accounts, orders) or numbers (products) — validate the
    // stringified form so a legit numeric product id isn't rejected as invalid
    const id = body[rule.idField];
    if (id == null || !isValidId(String(id))) return Response.json({ error: `The record needs a valid "${rule.idField}".` }, { status: 400 });

    // Accounts get a strictly-sequential 12-digit membership number on creation.
    if (entity === "accounts" && !body.memberNo) body.memberNo = await nextMemberNo();

    if (entity === "orders") await commitStock(body);
    await putItem(entity, String(id), body);
    return Response.json({ item: body }, { status: 201 });
  } catch (e) {
    return guardResponse(e) ?? Response.json({ error: "Couldn't save that record." }, { status: 500 });
  }
}

/** Order placement decrements product stock server-side. Lines were already
    validated (existence + availability) by sanitizeBuyerOrder for buyers;
    admin-created orders are trusted but still clamp at zero. Uses an atomic
    per-item decrement so two orders placed at once can't lose a decrement. */
async function commitStock(order: Row) {
  const lines = (order.lines as { id: number; qty: number }[] | undefined) ?? [];
  for (const line of lines) {
    await decrementField("products", String(line.id), "stock", Math.floor(Number(line.qty ?? 0)));
  }
}
