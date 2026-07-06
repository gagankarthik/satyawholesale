import { getAuth, isAdmin, unauthorized, forbidden } from "@/server/auth";
import { getItem, patchItem, deleteItem, type Row } from "@/server/db";
import { ENTITIES, canRead, canWrite, ownsRow } from "@/server/entities";
import { readJson, isValidId, guardResponse } from "@/server/guard";
import { sanitizeBuyerOrderPatch } from "@/server/orders";

/* GET/PATCH/DELETE /api/data/<entity>/<id> */

type Ctx = { params: Promise<{ entity: string; id: string }> };

async function load(req: Request, ctx: Ctx, mode: "read" | "write") {
  const { entity, id } = await ctx.params;
  const rule = ENTITIES[entity];
  if (!rule) return { fail: Response.json({ error: `Unknown collection "${entity}".` }, { status: 404 }) };
  if (!isValidId(id)) return { fail: Response.json({ error: "Invalid record id." }, { status: 400 }) };
  const user = await getAuth(req);
  if (!user) return { fail: unauthorized() };
  if (!(mode === "read" ? canRead(rule, user) : canWrite(rule, user))) return { fail: forbidden() };
  const row = await getItem(entity, id);
  if (!row) return { fail: Response.json({ error: "Not found." }, { status: 404 }) };
  if (!ownsRow(rule, user, row)) return { fail: forbidden() };
  return { entity, id, rule, user, row };
}

export async function GET(req: Request, ctx: Ctx) {
  const r = await load(req, ctx, "read");
  if ("fail" in r) return r.fail;
  return Response.json({ item: r.row });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const r = await load(req, ctx, "write");
  if ("fail" in r) return r.fail;
  try {
    let patch = await readJson<Row>(req);

    if (!isAdmin(r.user)) {
      // Buyers may only cancel or (while Pending) edit their own order, with
      // every price/total recomputed server-side. Other buyer-writable
      // entities don't exist, but this fails closed if one is ever added.
      if (r.entity === "orders") patch = await sanitizeBuyerOrderPatch(r.row, patch);
      else return forbidden();
      // a buyer can never move a row to another store
      if (r.rule.buyerScope) delete patch[r.rule.buyerScope];
    }

    const item = await patchItem(r.entity, r.id, patch);
    return Response.json({ item });
  } catch (e) {
    return guardResponse(e) ?? Response.json({ error: "Couldn't save those changes." }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const r = await load(req, ctx, "write");
  if ("fail" in r) return r.fail;
  // Deletes are destructive and audit-sensitive — admin only. Buyers cancel.
  if (!isAdmin(r.user)) return forbidden();
  await deleteItem(r.entity, r.id);
  return Response.json({ ok: true });
}
