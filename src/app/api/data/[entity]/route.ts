import { getAuth, isAdmin, unauthorized, forbidden } from "@/server/auth";
import { listByType, putItem, getItem, patchItem, type Row } from "@/server/db";
import { ENTITIES, canRead, canWrite, scopeRows } from "@/server/entities";
import { readJson, isValidId, guardResponse } from "@/server/guard";
import { sanitizeBuyerOrder } from "@/server/orders";

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
      body = await sanitizeBuyerOrder(body, user);
    } else if (rule.buyerScope && !isAdmin(user)) {
      // stamp buyer-scoped rows with the caller's own store, never a chosen one
      body[rule.buyerScope] = user.store ?? user.email;
    }

    const id = body[rule.idField];
    if (!isValidId(id)) return Response.json({ error: `The record needs a valid "${rule.idField}".` }, { status: 400 });

    if (entity === "orders") await commitStock(body);
    await putItem(entity, String(id), body);
    return Response.json({ item: body }, { status: 201 });
  } catch (e) {
    return guardResponse(e) ?? Response.json({ error: "Couldn't save that record." }, { status: 500 });
  }
}

/** Order placement decrements product stock server-side. Lines were already
    validated (existence + availability) by sanitizeBuyerOrder for buyers;
    admin-created orders are trusted but still clamp at zero. */
async function commitStock(order: Row) {
  const lines = (order.lines as { id: number; qty: number }[] | undefined) ?? [];
  for (const line of lines) {
    const p = await getItem("products", String(line.id));
    if (!p) continue;
    const stock = Math.max(0, Number(p.stock ?? 0) - Number(line.qty ?? 0));
    await patchItem("products", String(line.id), { stock });
  }
}
