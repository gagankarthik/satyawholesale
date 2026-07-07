"use client";

import { useCallback } from "react";
import { useCollection } from "./collection";
import { apiPost } from "./api";
import type { Product, Customer, DeptKey } from "./store";

/* =========================================================
   WMS domain — suppliers, categories, warehouse locations,
   staff, purchase orders, receipts, invoices, credits and
   the stock-movement ledger. Backed by DynamoDB via
   /api/data/*; hook interfaces match the old local store.
   ========================================================= */

/* =========================================================
   SUPPLIERS
   ========================================================= */
export const SUPPLIER_TERMS = ["Net 15", "Net 30", "COD", "COD Cash Only", "7 Days EFT"];

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  leadDays: number;
  terms: string;
  status: "Active" | "Inactive";
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  website?: string;
  accountNo?: string;
  salesRep?: string;
  csr?: string;
  deliveryDay?: string;
  truck?: string;
  stop?: string;
  categories?: string;
  notes?: string;
}

export const useSuppliers = () => {
  const col = useCollection<Supplier>("suppliers", (s) => s.id);
  return { suppliers: col.items, ready: col.ready, error: col.error, refresh: col.refresh, add: col.add, update: col.update, remove: col.remove };
};

/* =========================================================
   PROMOTIONS
   ========================================================= */
export interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  tag: string;
  /** Optional destination for the carousel "Shop now" button. When empty, no button is shown. */
  link?: string;
  active: boolean;
  created: number;
}
export const usePromotions = () => {
  const col = useCollection<Promotion>("promos", (p) => p.id);
  return { promos: col.items, ready: col.ready, error: col.error, refresh: col.refresh, add: col.add, update: col.update, remove: col.remove };
};

/* =========================================================
   CONTACT MESSAGES — the public "Send us a message" inbox
   ========================================================= */
export interface Message {
  id: string;
  name: string;
  store?: string;
  email: string;
  phone?: string;
  message: string;
  created: number;
  read?: boolean;
}
export const useMessages = () => {
  const col = useCollection<Message>("messages", (m) => m.id);
  return { messages: col.items, ready: col.ready, error: col.error, refresh: col.refresh, update: col.update, remove: col.remove };
};

/* =========================================================
   CATEGORIES
   ========================================================= */
export interface Category {
  id: string;
  key: string;
  name: string;
  parent: string | null;
  active: boolean;
  details: string;
  icon: string;
  image: string;
  group: string;
  created: number;
}
export const useCategories = () => {
  const col = useCollection<Category>("categories", (c) => c.key);
  return { categories: col.items, ready: col.ready, error: col.error, refresh: col.refresh, add: col.add, update: col.update, remove: col.remove };
};

/* =========================================================
   WAREHOUSE LOCATIONS
   ========================================================= */
export interface WLocation {
  id: string;
  zone: string;
  aisle: string;
  rack: string;
  bin: string;
  capacity: number;
  used: number;
}
export const useLocations = () => {
  const col = useCollection<WLocation>("locations", (l) => l.id);
  return { locations: col.items, ready: col.ready, error: col.error, refresh: col.refresh, update: col.update, add: col.add, remove: col.remove };
};

/* =========================================================
   STAFF USERS + ROLES
   ========================================================= */
export type Role = "Admin" | "Inventory Manager" | "Buyer" | "Receiver" | "Viewer";
export const ROLES: Role[] = ["Admin", "Inventory Manager", "Buyer", "Receiver", "Viewer"];

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  device: string | null;
  status: "Active" | "Suspended";
}
export const useStaff = () => {
  const col = useCollection<StaffUser>("staff", (u) => u.id);
  return { staff: col.items, ready: col.ready, error: col.error, refresh: col.refresh, add: col.add, update: col.update, remove: col.remove };
};

/* =========================================================
   TRADE ACCOUNTS (customers) + public application intake
   ========================================================= */
export interface TradeAccount extends Customer {
  phone?: string;
  businessLicense?: string;
  tobaccoLicense?: string;
  applied?: number;
  invited?: number;
  state?: string;
  zip?: string;
  docs?: { label: string; name: string; uploaded: number; url?: string; approved?: boolean }[];
}

export const useCustomers = () => {
  const col = useCollection<TradeAccount>("accounts", (c) => c.id);
  const setStatus = useCallback(
    (id: string, status: TradeAccount["status"]) => col.update(id, { status }),
    [col.update] // eslint-disable-line react-hooks/exhaustive-deps
  );
  return { customers: col.items, ready: col.ready, error: col.error, refresh: col.refresh, setStatus, update: col.update, add: col.add, remove: col.remove };
};

/** Files a Pending application from the public site (no auth). */
export function fileApplication(a: Omit<TradeAccount, "id" | "since" | "status">) {
  void apiPost("/api/apply", a).catch(() => {
    /* the /apply page shows success optimistically; failures surface on retry */
  });
  return { ...a, id: "pending", since: String(new Date().getFullYear()), status: "Pending" as const };
}

/** Approve + invite: creates the Cognito buyer login for an account. */
export const inviteAccount = (accountId: string) =>
  apiPost<{ item: TradeAccount }>("/api/accounts/invite", { accountId });

/** Finish a self-signup: tag store, join buyer group, write Active account. */
export interface OnboardingInput {
  store: string; contact: string; phone?: string; city?: string;
  businessLicense?: string; tobaccoLicense?: string;
}
export const onboardAccount = (input: OnboardingInput) =>
  apiPost<{ item: TradeAccount }>("/api/onboarding", input);

/** Admin account controls: freeze / unfreeze / block / unblock. */
export type AccountAction = "freeze" | "unfreeze" | "block" | "unblock";
export const setAccountStatus = (accountId: string, action: AccountAction) =>
  apiPost<{ item: TradeAccount }>("/api/accounts/status", { accountId, action });

/** Admin: create a staff/admin or customer login (Cognito emails the temp password). */
export const createUser = (email: string, role: "admin" | "buyer", store?: string) =>
  apiPost<{ item: { email: string; role: string; store: string | null } }>("/api/users", { email, role, store });

/* =========================================================
   PURCHASE ORDERS
   ========================================================= */
export type POStatus = "Draft" | "Approved" | "Sent" | "Partially Received" | "Received" | "Closed";
export const PO_FLOW: POStatus[] = ["Draft", "Approved", "Sent", "Partially Received", "Received", "Closed"];
export const PO_APPROVAL_THRESHOLD = 2000;

export interface POLine {
  sku: string; name: string; ordered: number; received: number; cost: number;
  upc?: string;
  unit?: string;
  retail?: string | number;
  dep?: string;
}
export interface PurchaseOrder {
  id: string;
  supplierId: string;
  status: POStatus;
  created: number;
  expected: number;
  lines: POLine[];
  approver?: string;
  supplierRef?: string;
  notes?: string;
  attachment?: string;
  attachmentName?: string;
}
export const poTotal = (po: PurchaseOrder) => po.lines.reduce((s, l) => s + l.ordered * l.cost, 0);

/** GP% the way distributor invoices print it: (retail − cost) / retail. */
export const gpPct = (retail: number | string | undefined, cost: number) => {
  const r = Number(retail);
  return r > 0 ? ((r - cost) / r) * 100 : null;
};

export const usePurchaseOrders = () => {
  const col = useCollection<PurchaseOrder>("pos", (p) => p.id);
  const advance = useCallback((id: string) => {
    const p = (col.items as PurchaseOrder[]).find((x) => x.id === id);
    if (!p) return;
    const i = PO_FLOW.indexOf(p.status);
    if (i < PO_FLOW.length - 1) col.update(id, { status: PO_FLOW[i + 1] });
  }, [col.items, col.update]); // eslint-disable-line react-hooks/exhaustive-deps
  const receiveAll = useCallback((id: string) => {
    const p = (col.items as PurchaseOrder[]).find((x) => x.id === id);
    if (!p) return;
    col.update(id, { status: "Received", lines: p.lines.map((l) => ({ ...l, received: l.ordered })) });
  }, [col.items, col.update]); // eslint-disable-line react-hooks/exhaustive-deps
  return { pos: col.items, ready: col.ready, error: col.error, refresh: col.refresh, add: col.add, update: col.update, remove: col.remove, advance, receiveAll };
};

/* =========================================================
   GOODS RECEIPTS + SUPPLIER INVOICES + CREDITS + 3-WAY MATCH
   ========================================================= */
export const RECEIVE_TOLERANCE = 0.05;

export interface GRNLine { sku: string; qty: number; }
export interface GRN { id: string; poId: string; received: number; lines: GRNLine[]; note?: string; by: string; }
export interface InvoiceLine { sku: string; qty: number; cost: number; }
export interface SupplierInvoice {
  id: string; poId: string; date: number; ref: string; lines: InvoiceLine[]; total: number;
  charges?: number;
  tax?: number;
  due?: number;
  paid?: boolean;
}

/** Days until payment is due for a given supplier terms string. */
export const termsDueDays = (terms: string) => {
  if (/net\s*30/i.test(terms)) return 30;
  if (/net\s*15/i.test(terms)) return 15;
  if (/7\s*days/i.test(terms)) return 7;
  return 0;
};

export const useReceipts = () => {
  const col = useCollection<GRN>("grns", (g) => g.id);
  return { receipts: col.items, ready: col.ready, error: col.error, refresh: col.refresh, add: col.add };
};
export const useInvoices = () => {
  const col = useCollection<SupplierInvoice>("invoices", (i) => i.id);
  const markPaid = useCallback((id: string) => col.update(id, { paid: true }), [col.update]); // eslint-disable-line react-hooks/exhaustive-deps
  return { invoices: col.items, ready: col.ready, error: col.error, refresh: col.refresh, add: col.add, markPaid };
};

export const CREDIT_REASONS = ["Shortage", "Damaged goods", "Price adjustment", "Return"];
export interface CreditMemo {
  id: string;
  poId: string;
  date: number;
  ref: string;
  reason: string;
  amount: number;
  note?: string;
}
export const useCredits = () => {
  const col = useCollection<CreditMemo>("credits", (c) => c.id);
  return { credits: col.items, ready: col.ready, error: col.error, refresh: col.refresh, add: col.add, remove: col.remove };
};

export type MatchStatus = "Awaiting receipt" | "Awaiting invoice" | "Matched" | "Variance";
export interface MatchResult {
  ordered: number; received: number; invoicedQty: number;
  poTotal: number; invTotal: number;
  status: MatchStatus;
  variances: { sku: string; name: string; ordered: number; received: number; invoiced: number }[];
}

export function threeWayMatch(po: PurchaseOrder, grns: GRN[], invoices: SupplierInvoice[], credits: CreditMemo[] = []): MatchResult {
  const recBySku: Record<string, number> = {};
  grns.filter((g) => g.poId === po.id).forEach((g) => g.lines.forEach((l) => { recBySku[l.sku] = (recBySku[l.sku] || 0) + l.qty; }));
  const invBySku: Record<string, number> = {};
  let invTotal = 0;
  const poInvoices = invoices.filter((i) => i.poId === po.id);
  poInvoices.forEach((i) => {
    i.lines.forEach((l) => { invBySku[l.sku] = (invBySku[l.sku] || 0) + l.qty; invTotal += l.qty * l.cost; });
    invTotal += (i.charges ?? 0) + (i.tax ?? 0);
  });
  invTotal -= credits.filter((c) => c.poId === po.id).reduce((s, c) => s + c.amount, 0);

  const ordered = po.lines.reduce((s, l) => s + l.ordered, 0);
  const received = po.lines.reduce((s, l) => s + (recBySku[l.sku] ?? l.received ?? 0), 0);
  const invoicedQty = Object.values(invBySku).reduce((s, n) => s + n, 0);
  const total = poTotal(po);
  const hasReceipt = received > 0;
  const hasInvoice = poInvoices.length > 0;

  const variances = po.lines
    .map((l) => ({ sku: l.sku, name: l.name, ordered: l.ordered, received: recBySku[l.sku] ?? l.received ?? 0, invoiced: invBySku[l.sku] ?? 0 }))
    .filter((v) => hasInvoice && v.received !== v.invoiced);

  let status: MatchStatus;
  if (!hasReceipt) status = "Awaiting receipt";
  else if (!hasInvoice) status = "Awaiting invoice";
  else if (variances.length === 0 && Math.abs(invTotal - total) <= total * RECEIVE_TOLERANCE) status = "Matched";
  else status = "Variance";

  return { ordered, received, invoicedQty, poTotal: total, invTotal, status, variances };
}

/* =========================================================
   INVOICE TEXT → PO LINES
   ========================================================= */
export interface ParsedInvoiceRow {
  raw: string;
  qty: number;
  cost: number;
  desc: string;
  upc?: string;
  productId: string;
  matchedName?: string;
  matchedBy?: "upc" | "name";
}

const nameTokens = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((t) => t.length > 1);

export function parseInvoiceText(text: string, products: Product[]): ParsedInvoiceRow[] {
  const byGtin = new Map(products.filter((p) => p.gtin).map((p) => [p.gtin!, p]));
  const rows: ParsedInvoiceRow[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length < 8) continue;
    const monies = [...line.matchAll(/\d{1,6}\.\d{2}\b/g)].map((mt) => ({ v: Number(mt[0]), i: mt.index! }));
    if (!monies.length) continue;
    if (/subtotal|total|service charge|taxable|please pay/i.test(line)) continue;
    const cost = monies.length >= 2 ? monies[monies.length - 2].v : monies[0].v;
    if (cost <= 0) continue;

    const upc = line.match(/\b\d{11,13}\b/)?.[0];
    const ints = [...line.slice(0, monies[0].i).matchAll(/\b\d{1,4}\b/g)].map((mt) => Number(mt[0])).filter((n) => n > 0 && String(n) !== upc?.slice(0, String(n).length));
    const qty = ints.length >= 2 ? ints[1] : ints[0] ?? 1;
    if (!qty || qty > 5000) continue;

    const desc = line.slice(0, monies[0].i).replace(/\b\d{11,13}\b/g, "").replace(/^\s*\d+\s+\d+\s*/, "").replace(/\s{2,}/g, " ").trim();

    let matched: Product | undefined = upc ? byGtin.get(upc) : undefined;
    let matchedBy: ParsedInvoiceRow["matchedBy"] = matched ? "upc" : undefined;
    if (!matched && desc) {
      const dt = nameTokens(desc);
      let best: { p: Product; score: number } | null = null;
      for (const p of products) {
        const pt = nameTokens(p.name);
        const hits = pt.filter((t) => dt.includes(t)).length;
        const score = hits / Math.max(pt.length, 1);
        if (score >= 0.5 && (!best || score > best.score)) best = { p, score };
      }
      if (best) { matched = best.p; matchedBy = "name"; }
    }

    rows.push({
      raw: line, qty, cost, desc: desc || line.slice(0, 40), upc,
      productId: matched ? String(matched.id) : "",
      matchedName: matched?.name, matchedBy,
    });
  }
  return rows;
}

/* =========================================================
   STOCK MOVEMENT LEDGER
   ========================================================= */
export type MoveType = "Receipt" | "Pick" | "Adjust" | "Transfer" | "Putaway";
export interface StockMovement {
  id: string;
  ts: number;
  sku: string;
  name: string;
  type: MoveType;
  qty: number;
  ref: string;
  loc?: string;
}
export const useMovements = () => {
  const col = useCollection<StockMovement>("movements", (m) => m.id);
  const log = useCallback((m: Omit<StockMovement, "id" | "ts">) => {
    col.add({ ...m, id: "M-" + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 90 + 10), ts: Date.now() });
  }, [col.add]); // eslint-disable-line react-hooks/exhaustive-deps
  const update = useCallback((id: string, patch: Partial<StockMovement>) => col.update(id, patch), [col.update]); // eslint-disable-line react-hooks/exhaustive-deps
  const remove = useCallback((id: string) => col.remove(id), [col.remove]); // eslint-disable-line react-hooks/exhaustive-deps
  return { movements: col.items, ready: col.ready, error: col.error, refresh: col.refresh, log, update, remove };
};

/* =========================================================
   VALIDATION — schema, integrity, business rules
   ========================================================= */

/** UPC-A (12) / EAN-13 (13) mod-10 check-digit verification. */
export function validBarcode(code: string): boolean {
  if (!/^\d{12,13}$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const check = digits.pop()!;
  let sum = 0;
  digits.reverse().forEach((d, i) => { sum += i % 2 === 0 ? d * 3 : d; });
  return (10 - (sum % 10)) % 10 === check;
}

export interface ImportRow {
  line: number;
  name: string;
  category: string;
  gtin: string;
  cost: string;
  price: string;
  caseQty: string;
  uom: string;
  reorderPoint: string;
  maxStock: string;
  supplierId: string;
  stock: string;
  errors: string[];
  level: "ok" | "schema" | "integrity" | "business";
}

const IMPORT_COLUMNS = ["name", "category", "gtin", "cost", "price", "caseQty", "uom", "reorderPoint", "maxStock", "supplierId", "stock"];

export function csvTemplate(): string {
  return IMPORT_COLUMNS.join(",") +
    "\nMr Fog Max Pro 1500,vape,841238100277,120.00,149.50,10,case,15,120,SUP-06,40" +
    "\nQueen City Gummies 24ct,grocery,036000291452,28.50,44.99,24,case,12,96,SUP-07,30";
}

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const header = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row: Record<string, string> = {};
    header.forEach((h, i) => { row[h] = (cells[i] ?? "").trim(); });
    return row;
  });
}

export function validateRows(
  rows: Record<string, string>[],
  ctx: { categories: string[]; suppliers: string[]; existingSkus: Set<string>; existingGtins: Set<string> }
): ImportRow[] {
  const seenGtin = new Set<string>();
  const seenName = new Set<string>();
  return rows.map((r, idx) => {
    const errors: string[] = [];
    let level: ImportRow["level"] = "ok";
    const name = r.name || "";
    const num = (v: string) => (v === "" || isNaN(Number(v)) ? NaN : Number(v));

    if (!name) errors.push("name is required");
    if (!r.category) errors.push("category is required");
    if (isNaN(num(r.price))) errors.push("price must be numeric");
    if (r.gtin && !validBarcode(r.gtin)) errors.push("invalid barcode check digit");
    if (r.caseQty && (isNaN(num(r.caseQty)) || num(r.caseQty) <= 0)) errors.push("caseQty must be > 0");
    if (errors.length) level = "schema";

    if (level === "ok") {
      if (r.category && !ctx.categories.includes(r.category)) errors.push(`unknown category "${r.category}"`);
      if (r.supplierId && !ctx.suppliers.includes(r.supplierId)) errors.push(`unknown supplier "${r.supplierId}"`);
      if (r.gtin && (ctx.existingGtins.has(r.gtin) || seenGtin.has(r.gtin))) errors.push("duplicate barcode");
      if (name && seenName.has(name.toLowerCase())) errors.push("duplicate product in file");
      if (errors.length) level = "integrity";
    }

    if (level === "ok") {
      const rp = num(r.reorderPoint), ms = num(r.maxStock), cost = num(r.cost), price = num(r.price);
      if (!isNaN(rp) && !isNaN(ms) && rp > ms) errors.push("reorder point exceeds max stock");
      if (!isNaN(cost) && !isNaN(price) && price < cost) errors.push("price below cost");
      if (errors.length) level = "business";
    }

    if (r.gtin) seenGtin.add(r.gtin);
    if (name) seenName.add(name.toLowerCase());
    return {
      line: idx + 1, name, category: r.category || "", gtin: r.gtin || "", cost: r.cost || "",
      price: r.price || "", caseQty: r.caseQty || "", uom: r.uom || "case", reorderPoint: r.reorderPoint || "",
      maxStock: r.maxStock || "", supplierId: r.supplierId || "", stock: r.stock || "0",
      errors, level,
    };
  });
}

/** Convert a clean staging row into a Product for commit. */
export function rowToProduct(r: ImportRow, id: number): Product {
  return {
    id,
    name: r.name,
    dep: (r.category as DeptKey),
    price: Number(r.price) || 0,
    pack: `${r.caseQty || 1}ct`,
    unit: r.uom || "case",
    tag: "new",
    stock: Number(r.stock) || 0,
    sku: `SW-${id}`,
    gtin: r.gtin || undefined,
    cost: Number(r.cost) || undefined,
    uom: r.uom || "case",
    caseQty: Number(r.caseQty) || undefined,
    reorderPoint: Number(r.reorderPoint) || undefined,
    maxStock: Number(r.maxStock) || undefined,
    supplierId: r.supplierId || undefined,
    active: true,
    onArrivals: true,
    created: Date.now(),
  };
}
