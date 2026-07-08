import { getItem, type Row } from "./db";
import type { AuthUser } from "./auth";
import { GuardError, isValidId } from "./guard";

/* Orders are the only buyer-writable records, and they carry money and
   fulfilment state. NEVER trust the client for either: line prices, totals
   and tax are recomputed from the live catalog + settings here, and status
   transitions are constrained. The browser's optimistic copy is cosmetic;
   this is the record of truth that gets stored. */

interface RawLine { id: number | string; qty: number | string }

const clampStr = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** A fresh, collision-resistant order ref: 4-digit year + 10-digit Unix
    seconds + 3 random digits. Used server-side when the client ref is missing
    or already taken, so two orders in the same second never share an id. */
export function freshOrderRef(): string {
  const rnd = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `${new Date().getUTCFullYear()}${Math.floor(Date.now() / 1000)}${rnd}`;
}

/** Combined sales + county/local rate. The order stores one tax figure; the
    UI splits it back into its two lines from the same settings. */
async function taxRate(): Promise<number> {
  const s = await getItem("settings", "main");
  const sales = Number(s?.taxRate);
  const county = Number(s?.countyTaxRate);
  const salesR = Number.isFinite(sales) && sales >= 0 ? sales : 6.5;
  const countyR = Number.isFinite(county) && county >= 0 ? county : 0;
  return salesR + countyR;
}

/** Customer ordering policy from settings, with safe fallbacks (0 = disabled).
    Enforced server-side so a buyer can't bypass the minimum or dodge freight. */
async function orderPolicy(): Promise<{ orderMinimum: number; deliveryFee: number; freeFreightThreshold: number }> {
  const s = await getItem("settings", "main");
  const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) && x > 0 ? x : 0; };
  return { orderMinimum: n(s?.orderMinimum), deliveryFee: n(s?.deliveryFee), freeFreightThreshold: n(s?.freeFreightThreshold) };
}

/** Re-price a client line list against the catalog. Rejects unknown/inactive
    products, bad quantities, and quantities beyond available stock. */
async function priceLines(raw: unknown): Promise<{ lines: Row[]; subtotal: number; cases: number }> {
  const rawLines = Array.isArray(raw) ? (raw as RawLine[]) : [];
  if (!rawLines.length) throw new GuardError("Your cart is empty.");
  if (rawLines.length > 200) throw new GuardError("That order has too many line items.");

  const lines: Row[] = [];
  let subtotal = 0, cases = 0;
  for (const l of rawLines) {
    const qty = Math.floor(Number(l.qty));
    if (!Number.isFinite(qty) || qty <= 0 || qty > 100_000) throw new GuardError("A line item has an invalid quantity.");
    const p = await getItem("products", String(l.id));
    if (!p || p.active === false) throw new GuardError("A product in your cart is no longer available.");
    const stock = Number(p.stock);
    if (Number.isFinite(stock) && qty > stock) throw new GuardError(`Only ${stock} case(s) of ${String(p.name ?? "an item")} are in stock.`);
    // server price = live offer price when one is active, else the list price
    const list = Number(p.price);
    const offer = Number(p.offerPrice);
    const onOffer = p.onOffers === true && Number.isFinite(offer) && offer > 0 && offer < list;
    const price = onOffer ? offer : list;
    if (!Number.isFinite(price) || price < 0) throw new GuardError("A product in your cart has no valid price.");
    subtotal += price * qty;
    cases += qty;
    lines.push({ id: Number(p.id) || String(l.id), name: String(p.name ?? ""), qty, price });
  }
  return { lines, subtotal: Math.round(subtotal * 100) / 100, cases };
}

/** Build a brand-new buyer order from trusted data. The client controls only
    the line ids/quantities and free-text delivery details; everything financial
    and every state field is set here. In particular:
    - the order minimum is enforced (reject below it),
    - the delivery fee is computed from the freight policy, not the client,
    - payment terms come from the account's approved terms, never buyer-chosen. */
export async function sanitizeBuyerOrder(body: Row, user: AuthUser, account: Row | null): Promise<Row> {
  const { lines, subtotal, cases } = await priceLines(body.lines);

  const policy = await orderPolicy();
  if (policy.orderMinimum > 0 && subtotal < policy.orderMinimum) {
    throw new GuardError(`Orders have a $${policy.orderMinimum.toFixed(2)} minimum. Your cart is $${subtotal.toFixed(2)}. Add a little more to check out.`);
  }

  const rate = await taxRate();
  const tax = Math.round(subtotal * rate) / 100; // resale exemption is an admin decision, applied later

  const fulfilment = clampStr(body.fulfilment, 60);
  const isPickup = /pickup/i.test(fulfilment);
  const deliveryFee =
    isPickup || (policy.freeFreightThreshold > 0 && subtotal >= policy.freeFreightThreshold)
      ? 0
      : policy.deliveryFee;

  // Payment terms are the account's approved terms — a buyer can't upgrade
  // themselves to longer credit at checkout. Falls back to Net 15.
  const payment = clampStr(account?.terms, 60) || "Net 15";

  const owner = user.store ?? user.email;
  // The client proposes a ref; the create path (create-only write) guarantees
  // it can never overwrite an existing order, and hands out a fresh ref if it
  // collides. Fall back to a server-generated ref when none is provided.
  const ref = isValidId(body.ref) ? String(body.ref) : freshOrderRef();

  return {
    ref,
    placed: Date.now(),
    store: owner,
    lines, cases,
    total: subtotal,
    status: "Pending",
    payment, fulfilment,
    notes: clampStr(body.notes, 500) || undefined,
    tracking: isPickup ? "PICKUP" : undefined, // warehouse assigns real tracking on ship
    deliveryFee,
    tax,
    discount: 0,
    paymentStatus: /net/i.test(payment) ? "Unpaid" : "Paid",
    billing: clampStr(body.billing, 200) || owner,
    shipping: clampStr(body.shipping ?? body.billing, 200) || owner,
    taxExempt: false,
  };
}

/** Constrain a buyer's PATCH to their own order: they may cancel a
    still-cancellable order, or edit lines/details only while it's Pending.
    Re-prices any line edits; refuses to let a buyer touch status→anything
    but Cancelled, payment status, tracking, discounts, or totals. */
export async function sanitizeBuyerOrderPatch(current: Row, patch: Row): Promise<Row> {
  const status = String(current.status ?? "");

  // Cancel path — ignores every other field in the patch. Buyers can only
  // cancel while Pending; once it's Processing or later they must call us.
  if (patch.status === "Cancelled") {
    if (status !== "Pending") throw new GuardError("This order is already being processed and can't be cancelled online. Call us to cancel it.");
    return { status: "Cancelled" };
  }
  if (patch.status !== undefined && patch.status !== status) {
    throw new GuardError("You can only cancel an order, not change its status.");
  }

  // Edit path — only while Pending.
  if (status !== "Pending") throw new GuardError("This order can no longer be edited.");

  const out: Row = {};
  if (patch.lines !== undefined) {
    const { lines, subtotal, cases } = await priceLines(patch.lines);
    out.lines = lines;
    out.total = subtotal;
    out.cases = cases;
    const rate = await taxRate();
    out.tax = current.taxExempt === true ? 0 : Math.round(subtotal * rate) / 100;
  }
  if (patch.fulfilment !== undefined) out.fulfilment = clampStr(patch.fulfilment, 60);
  if (patch.shipping !== undefined) out.shipping = clampStr(patch.shipping, 200) || String(current.store ?? "");
  if (patch.notes !== undefined) out.notes = clampStr(patch.notes, 500) || undefined;
  return out;
}
