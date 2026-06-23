"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEPTS, CUSTOMERS, type DeptKey, type Product, type Customer,
} from "./store";

/* =========================================================
   WMS foundation — suppliers, categories, warehouse locations,
   staff/roles, purchase orders, stock-movement ledger,
   customer approval, and bulk-import validation.
   All localStorage-backed (no backend).
   ========================================================= */

const DAY = 86400000;

/* ---------- generic persisted collection ---------- */
function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(`wms:${key}`));
}
function usePersisted<T>(key: string, seed: T[]) {
  const [items, setItems] = useState<T[]>(seed);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setItems(read(key, seed));
    setReady(true);
    const sync = () => setItems(read(key, seed));
    window.addEventListener(`wms:${key}`, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(`wms:${key}`, sync);
      window.removeEventListener("storage", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const persist = useCallback((next: T[]) => { setItems(next); write(key, next); }, [key]);
  return { items, ready, persist };
}

/* =========================================================
   SUPPLIERS
   ========================================================= */
export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  leadDays: number;
  terms: string; // payment terms
  status: "Active" | "Inactive";
}

export const SEED_SUPPLIERS: Supplier[] = [
  { id: "SUP-01", name: "Midwest Tobacco Dist.", contact: "R. Olsen", email: "orders@midwesttob.com", phone: "(513) 555-0142", leadDays: 3, terms: "Net 15", status: "Active" },
  { id: "SUP-02", name: "Great Lakes Vapor Supply", contact: "T. Brooks", email: "sales@glvapor.com", phone: "(614) 555-0188", leadDays: 5, terms: "Net 30", status: "Active" },
  { id: "SUP-03", name: "Queen City Candy & Snacks", contact: "M. Alvarez", email: "wholesale@qccandy.com", phone: "(513) 555-0199", leadDays: 2, terms: "Net 15", status: "Active" },
  { id: "SUP-04", name: "Tri-State HBA & Energy", contact: "S. Patel", email: "buy@tristatehba.com", phone: "(859) 555-0121", leadDays: 4, terms: "COD", status: "Active" },
  { id: "SUP-05", name: "Reading Rd Auto & GM", contact: "D. Klein", email: "parts@rrauto.com", phone: "(513) 555-0177", leadDays: 6, terms: "Net 30", status: "Inactive" },
];

export const useSuppliers = () => {
  const { items, ready, persist } = usePersisted<Supplier>("satya.suppliers.v1", SEED_SUPPLIERS);
  const add = (s: Supplier) => persist([s, ...items]);
  const update = (id: string, patch: Partial<Supplier>) =>
    persist(items.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const remove = (id: string) => persist(items.filter((s) => s.id !== id));
  return { suppliers: items, ready, add, update, remove };
};

/* =========================================================
   PROMOTIONS — admin-managed advertising shown on the portal
   dashboard (image banners / featured offers).
   ========================================================= */
export interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  image: string; // full image URL (S3 / Unsplash)
  tag: string;
  active: boolean;
  created: number;
}
const promoImg = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1400&q=70`;
export const SEED_PROMOS: Promotion[] = [
  { id: "PR-01", tag: "New arrivals", title: "Fresh vapor & disposables", subtitle: "The latest Mr Fog, Breeze and EB Design — just landed by the case.", image: promoImg("1586528116311-ad8dd3c8310d"), active: true, created: Date.now() - 2 * DAY },
  { id: "PR-02", tag: "This week's deal", title: "Stock up & save by the case", subtitle: "Volume pricing across candy, snacks and beverages.", image: promoImg("1604719312566-8912e9227c6a"), active: true, created: Date.now() - 5 * DAY },
  { id: "PR-03", tag: "Free next-day delivery", title: "Order by 2 PM, we deliver tomorrow", subtitle: "Across Greater Cincinnati.", image: promoImg("1601584115197-04ecc0da31d7"), active: true, created: Date.now() - 9 * DAY },
];
export const usePromotions = () => {
  const { items, ready, persist } = usePersisted<Promotion>("satya.promos.v1", SEED_PROMOS);
  const add = (p: Promotion) => persist([p, ...items]);
  const update = (id: string, patch: Partial<Promotion>) => persist(items.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const remove = (id: string) => persist(items.filter((x) => x.id !== id));
  return { promos: items, ready, add, update, remove };
};

/* =========================================================
   CATEGORIES (seeded from departments, extensible)
   ========================================================= */
export interface Category {
  id: string;
  key: string; // slug
  name: string;
  parent: string | null;
  active: boolean;
  details: string;
  icon: string;
  image: string;
  group: string;
  created: number;
}
const CAT_GROUP: Record<string, string> = {
  tobacco: "Tobacco & vapor", vape: "Tobacco & vapor", smoke: "Tobacco & vapor",
  hba: "Center store", grocery: "Center store", auto: "General merch", acc: "General merch",
};
const CAT_DETAIL: Record<string, string> = {
  tobacco: "Cigarettes, cigars, chewing, hookah and pipe.",
  vape: "Disposables, pods and e-liquids.",
  smoke: "Lighters, glass, rolling supplies and butane.",
  hba: "Medicine, energy shots and personal care.",
  grocery: "Candy, snacks, beverages and household.",
  auto: "Air fresheners, fluids and road essentials.",
  acc: "Charging cables, fashion and general merch.",
};
export const SEED_CATEGORIES: Category[] = DEPTS.map((d, i) => ({
  id: "CAT-" + (101 + i),
  key: d.key,
  name: d.name,
  parent: null,
  active: true,
  details: CAT_DETAIL[d.key] ?? "",
  icon: d.icon,
  image: "",
  group: CAT_GROUP[d.key] ?? "Front counter",
  created: Date.now() - (40 - i * 3) * 86400000,
}));

export const useCategories = () => {
  const { items, ready, persist } = usePersisted<Category>("satya.categories.v1", SEED_CATEGORIES);
  const add = (c: Category) => persist([...items, c]);
  const update = (key: string, patch: Partial<Category>) =>
    persist(items.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  const remove = (key: string) => persist(items.filter((c) => c.key !== key));
  return { categories: items, ready, add, update, remove };
};

/* =========================================================
   WAREHOUSE LOCATIONS (zone → aisle → rack → bin)
   ========================================================= */
export interface WLocation {
  id: string; // e.g. A-01-R3-B2
  zone: string;
  aisle: string;
  rack: string;
  bin: string;
  capacity: number; // cases
  used: number;
}
const mkLoc = (zone: string, aisle: string, rack: string, bin: string, capacity: number, used: number): WLocation =>
  ({ id: `${zone}-${aisle}-${rack}-${bin}`, zone, aisle, rack, bin, capacity, used });

export const SEED_LOCATIONS: WLocation[] = [
  mkLoc("A", "01", "R1", "B1", 240, 180), mkLoc("A", "01", "R1", "B2", 240, 96),
  mkLoc("A", "02", "R1", "B1", 240, 210), mkLoc("A", "02", "R2", "B1", 240, 60),
  mkLoc("B", "01", "R1", "B1", 180, 150), mkLoc("B", "01", "R1", "B2", 180, 40),
  mkLoc("B", "02", "R3", "B1", 180, 0), mkLoc("C", "01", "R1", "B1", 320, 300),
  mkLoc("C", "02", "R2", "B4", 320, 120), mkLoc("D", "01", "R1", "B1", 120, 27),
];

export const useLocations = () => {
  const { items, ready, persist } = usePersisted<WLocation>("satya.locations.v1", SEED_LOCATIONS);
  const update = (id: string, patch: Partial<WLocation>) =>
    persist(items.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  return { locations: items, ready, update };
};

/* =========================================================
   STAFF USERS + ROLES (with scanner device assignment)
   ========================================================= */
export type Role = "Admin" | "Inventory Manager" | "Buyer" | "Receiver" | "Viewer";
export const ROLES: Role[] = ["Admin", "Inventory Manager", "Buyer", "Receiver", "Viewer"];

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  device: string | null; // assigned scanner
  status: "Active" | "Suspended";
}
export const SEED_STAFF: StaffUser[] = [
  { id: "U-01", name: "Asha Rao", email: "asha@satyawholesalers.com", role: "Admin", device: null, status: "Active" },
  { id: "U-02", name: "Marcus Bell", email: "marcus@satyawholesalers.com", role: "Inventory Manager", device: "SCN-114", status: "Active" },
  { id: "U-03", name: "Priya Shah", email: "priya@satyawholesalers.com", role: "Buyer", device: null, status: "Active" },
  { id: "U-04", name: "Diego Ramos", email: "diego@satyawholesalers.com", role: "Receiver", device: "SCN-118", status: "Active" },
  { id: "U-05", name: "Lena Cho", email: "lena@satyawholesalers.com", role: "Viewer", device: null, status: "Suspended" },
];
export const useStaff = () => {
  const { items, ready, persist } = usePersisted<StaffUser>("satya.staff.v1", SEED_STAFF);
  const add = (u: StaffUser) => persist([u, ...items]);
  const update = (id: string, patch: Partial<StaffUser>) =>
    persist(items.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  return { staff: items, ready, add, update };
};

/* =========================================================
   CUSTOMERS (mutable, with approval workflow)
   ========================================================= */
export interface TradeAccount extends Customer {
  phone?: string;
  businessLicense?: string;
  tobaccoLicense?: string;
  applied?: number;
}
const SEED_ACCOUNTS_KEY = "satya.accounts.v1";

export const useCustomers = (seed: Customer[]) => {
  const { items, ready, persist } = usePersisted<TradeAccount>(SEED_ACCOUNTS_KEY, seed as TradeAccount[]);
  const setStatus = (id: string, status: TradeAccount["status"]) =>
    persist(items.map((c) => (c.id === id ? { ...c, status } : c)));
  const update = (id: string, patch: Partial<TradeAccount>) =>
    persist(items.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const add = (c: TradeAccount) => persist([c, ...items]);
  const remove = (id: string) => persist(items.filter((c) => c.id !== id));
  return { customers: items, ready, setStatus, update, add, remove };
};

/** Used by the public site's "open an account" form to file a pending application. */
export function fileApplication(a: Omit<TradeAccount, "id" | "since" | "status">) {
  const list = read<TradeAccount[]>(SEED_ACCOUNTS_KEY, CUSTOMERS as TradeAccount[]);
  const next: TradeAccount = {
    ...a,
    id: "C-" + Math.floor(1300 + Math.random() * 700),
    since: String(new Date().getFullYear()),
    status: "Pending",
    applied: Date.now(),
  };
  write(SEED_ACCOUNTS_KEY, [next, ...list]);
  return next;
}

/* =========================================================
   PURCHASE ORDERS
   ========================================================= */
export type POStatus = "Draft" | "Approved" | "Sent" | "Partially Received" | "Received" | "Closed";
export const PO_FLOW: POStatus[] = ["Draft", "Approved", "Sent", "Partially Received", "Received", "Closed"];
export const PO_APPROVAL_THRESHOLD = 2000;

export interface POLine { sku: string; name: string; ordered: number; received: number; cost: number; }
export interface PurchaseOrder {
  id: string;
  supplierId: string;
  status: POStatus;
  created: number;
  expected: number;
  lines: POLine[];
  approver?: string;
}
export const poTotal = (po: PurchaseOrder) => po.lines.reduce((s, l) => s + l.ordered * l.cost, 0);

export const SEED_POS: PurchaseOrder[] = [
  { id: "PO-3041", supplierId: "SUP-02", status: "Sent", created: Date.now() - 2 * DAY, expected: Date.now() + 3 * DAY,
    lines: [{ sku: "SW-5310", name: "Mr Fog Switch 5500", ordered: 20, received: 0, cost: 120.0 }, { sku: "SW-5510", name: "Breeze Pro 2% Assorted", ordered: 30, received: 0, cost: 42.0 }] },
  { id: "PO-3038", supplierId: "SUP-01", status: "Partially Received", created: Date.now() - 4 * DAY, expected: Date.now() - 1 * DAY,
    lines: [{ sku: "SW-5127", name: "24/7 King Red Carton", ordered: 40, received: 25, cost: 52.0 }, { sku: "SW-2798", name: "4K'S Cigarillo 4F99 Diamond", ordered: 60, received: 60, cost: 8.4 }] },
  { id: "PO-3032", supplierId: "SUP-03", status: "Draft", created: Date.now() - 1 * DAY, expected: Date.now() + 2 * DAY,
    lines: [{ sku: "SW-6411", name: "Candy Treasure Assorted Mix", ordered: 24, received: 0, cost: 36.0 }] },
  { id: "PO-3019", supplierId: "SUP-04", status: "Received", created: Date.now() - 9 * DAY, expected: Date.now() - 5 * DAY,
    lines: [{ sku: "SW-7250", name: "5-Hour Energy Berry 12ct", ordered: 30, received: 30, cost: 14.5 }] },
];

export const usePurchaseOrders = () => {
  const { items, ready, persist } = usePersisted<PurchaseOrder>("satya.pos.v1", SEED_POS);
  const add = (po: PurchaseOrder) => persist([po, ...items]);
  const update = (id: string, patch: Partial<PurchaseOrder>) =>
    persist(items.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const advance = (id: string) =>
    persist(items.map((p) => {
      if (p.id !== id) return p;
      const i = PO_FLOW.indexOf(p.status);
      return i < PO_FLOW.length - 1 ? { ...p, status: PO_FLOW[i + 1] } : p;
    }));
  const receiveAll = (id: string) =>
    persist(items.map((p) =>
      p.id === id
        ? { ...p, status: "Received", lines: p.lines.map((l) => ({ ...l, received: l.ordered })) }
        : p
    ));
  return { pos: items, ready, add, update, advance, receiveAll };
};

/* =========================================================
   GOODS RECEIPTS (GRN) + SUPPLIER INVOICES + THREE-WAY MATCH
   ========================================================= */
export const RECEIVE_TOLERANCE = 0.05; // ±5% over/under receipt tolerance

export interface GRNLine { sku: string; qty: number; }
export interface GRN { id: string; poId: string; received: number; lines: GRNLine[]; note?: string; by: string; }
export interface InvoiceLine { sku: string; qty: number; cost: number; }
export interface SupplierInvoice { id: string; poId: string; date: number; ref: string; lines: InvoiceLine[]; total: number; }

export const useReceipts = () => {
  const { items, ready, persist } = usePersisted<GRN>("satya.grns.v1", []);
  const add = (g: GRN) => persist([g, ...items]);
  return { receipts: items, ready, add };
};
export const useInvoices = () => {
  const { items, ready, persist } = usePersisted<SupplierInvoice>("satya.invoices.v1", []);
  const add = (inv: SupplierInvoice) => persist([inv, ...items]);
  return { invoices: items, ready, add };
};

export type MatchStatus = "Awaiting receipt" | "Awaiting invoice" | "Matched" | "Variance";
export interface MatchResult {
  ordered: number; received: number; invoicedQty: number;
  poTotal: number; invTotal: number;
  status: MatchStatus;
  variances: { sku: string; name: string; ordered: number; received: number; invoiced: number }[];
}

export function threeWayMatch(po: PurchaseOrder, grns: GRN[], invoices: SupplierInvoice[]): MatchResult {
  const recBySku: Record<string, number> = {};
  grns.filter((g) => g.poId === po.id).forEach((g) => g.lines.forEach((l) => { recBySku[l.sku] = (recBySku[l.sku] || 0) + l.qty; }));
  const invBySku: Record<string, number> = {};
  let invTotal = 0;
  const poInvoices = invoices.filter((i) => i.poId === po.id);
  poInvoices.forEach((i) => i.lines.forEach((l) => { invBySku[l.sku] = (invBySku[l.sku] || 0) + l.qty; invTotal += l.qty * l.cost; }));

  const ordered = po.lines.reduce((s, l) => s + l.ordered, 0);
  const received = po.lines.reduce((s, l) => s + (recBySku[l.sku] ?? l.received ?? 0), 0);
  const invoicedQty = Object.values(invBySku).reduce((s, n) => s + n, 0);
  const poTotal = poTotal2(po);
  const hasReceipt = received > 0;
  const hasInvoice = poInvoices.length > 0;

  const variances = po.lines
    .map((l) => ({ sku: l.sku, name: l.name, ordered: l.ordered, received: recBySku[l.sku] ?? l.received ?? 0, invoiced: invBySku[l.sku] ?? 0 }))
    .filter((v) => hasInvoice && v.received !== v.invoiced);

  let status: MatchStatus;
  if (!hasReceipt) status = "Awaiting receipt";
  else if (!hasInvoice) status = "Awaiting invoice";
  else if (variances.length === 0 && Math.abs(invTotal - poTotal) <= poTotal * RECEIVE_TOLERANCE) status = "Matched";
  else status = "Variance";

  return { ordered, received, invoicedQty, poTotal, invTotal, status, variances };
}
const poTotal2 = (po: PurchaseOrder) => po.lines.reduce((s, l) => s + l.ordered * l.cost, 0);

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
  qty: number; // signed
  ref: string;
  loc?: string;
}
export const SEED_MOVEMENTS: StockMovement[] = [
  { id: "M-9001", ts: Date.now() - 1 * 3600000, sku: "SW-2798", name: "4K'S Cigarillo 4F99 Diamond", type: "Receipt", qty: 60, ref: "PO-3038", loc: "A-01-R1-B1" },
  { id: "M-9002", ts: Date.now() - 2 * 3600000, sku: "SW-5510", name: "Breeze Pro 2% Assorted", type: "Pick", qty: -8, ref: "SW-4810", loc: "B-01-R1-B1" },
  { id: "M-9003", ts: Date.now() - 5 * 3600000, sku: "SW-7120", name: "ZYN Cool Mint 6mg", type: "Adjust", qty: -3, ref: "cycle count", loc: "B-01-R1-B2" },
  { id: "M-9004", ts: Date.now() - 8 * 3600000, sku: "SW-6411", name: "Candy Treasure Assorted Mix", type: "Transfer", qty: 12, ref: "C-01 → C-02", loc: "C-02-R2-B4" },
  { id: "M-9005", ts: Date.now() - 26 * 3600000, sku: "SW-5127", name: "24/7 King Red Carton", type: "Putaway", qty: 25, ref: "PO-3038", loc: "A-02-R1-B1" },
];
export const useMovements = () => {
  const { items, ready, persist } = usePersisted<StockMovement>("satya.movements.v1", SEED_MOVEMENTS);
  const log = (m: Omit<StockMovement, "id" | "ts">) =>
    persist([{ ...m, id: "M-" + Math.floor(9100 + Math.random() * 900), ts: Date.now() }, ...read<StockMovement[]>("satya.movements.v1", SEED_MOVEMENTS)]);
  return { movements: items, ready, log };
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
  // weight pattern depends on length; compute from the right
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
    "\nMr Fog Max Pro 1500,vape,841238100277,120.00,149.50,10,case,15,120,SUP-02,40" +
    "\nQueen City Gummies 24ct,grocery,036000291452,28.50,44.99,24,case,12,96,SUP-03,30";
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

/** Validate parsed rows in three layers; returns staging rows with per-row errors. */
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

    // 1) schema
    if (!name) errors.push("name is required");
    if (!r.category) errors.push("category is required");
    if (isNaN(num(r.price))) errors.push("price must be numeric");
    if (r.gtin && !validBarcode(r.gtin)) errors.push("invalid barcode check digit");
    if (r.caseQty && (isNaN(num(r.caseQty)) || num(r.caseQty) <= 0)) errors.push("caseQty must be > 0");
    if (errors.length) level = "schema";

    // 2) integrity
    if (level === "ok") {
      if (r.category && !ctx.categories.includes(r.category)) errors.push(`unknown category "${r.category}"`);
      if (r.supplierId && !ctx.suppliers.includes(r.supplierId)) errors.push(`unknown supplier "${r.supplierId}"`);
      if (r.gtin && (ctx.existingGtins.has(r.gtin) || seenGtin.has(r.gtin))) errors.push("duplicate barcode");
      if (name && seenName.has(name.toLowerCase())) errors.push("duplicate product in file");
      if (errors.length) level = "integrity";
    }

    // 3) business
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
    emoji: "📦",
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
  };
}
