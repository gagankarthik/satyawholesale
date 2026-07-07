"use client";

import { useCallback } from "react";
import { useCollection, refreshCollection } from "./collection";

/* =========================================================
   Shared catalog + inventory + orders store.
   Backed by DynamoDB through /api/data/* — the old localStorage
   layer is gone. Hook interfaces are unchanged so feature code
   reads exactly as before.
   ========================================================= */

export type DeptKey =
  | "tobacco" | "vape" | "smoke" | "hba" | "grocery" | "auto" | "acc";

export type Tag = "new" | "pop" | "low" | null;

export interface Product {
  id: number;
  name: string;
  dep: DeptKey;
  emoji?: string;
  price: number;
  pack: string;
  unit: string;
  tag: Tag;
  stock: number;
  // --- master data ---
  sku?: string;
  gtin?: string; // UPC-A (12) / EAN-13 (13)
  cost?: number; // landed case cost
  uom?: string; // base unit of measure
  caseQty?: number; // eaches per case
  reorderPoint?: number;
  maxStock?: number;
  supplierId?: string;
  locationId?: string;
  weightLb?: number;
  active?: boolean;
  description?: string;
  mrp?: number; // suggested retail
  created?: number;
  image?: string; // S3 URL; falls back to the placeholder
  onArrivals?: boolean;
  onOffers?: boolean;
  offerPrice?: number;
}

export const sku = (p: Product) => p.sku || `SW-${p.id}`;

/** True when a product has a live offer (featured on Offers with a lower price). */
export const offerActive = (p: Pick<Product, "onOffers" | "offerPrice" | "price">) =>
  !!(p.onOffers && p.offerPrice && p.offerPrice < p.price);
/** The price a buyer actually pays — the offer price when one is live, else the list price. */
export const effPrice = (p: Pick<Product, "onOffers" | "offerPrice" | "price">) =>
  offerActive(p) ? p.offerPrice! : p.price;

/** Shared placeholder shown until a product photo is uploaded. */
export const PRODUCT_PLACEHOLDER = "/coming-soon.webp";
export const productImg = (p: { image?: string }) => p.image || PRODUCT_PLACEHOLDER;

export interface Dept {
  key: DeptKey;
  name: string;
}

export interface OrderLine {
  id: number;
  name: string;
  qty: number;
  price: number;
}

export type OrderStatus =
  | "Pending" | "Processing" | "At Local Facility" | "Out for delivery" | "Completed" | "Cancelled";
export type PayStatus = "Unpaid" | "Paid" | "Partial" | "Refunded";

export const ORDER_FLOW: OrderStatus[] = [
  "Pending", "Processing", "At Local Facility", "Out for delivery", "Completed",
];
export const statusSlug = (s: OrderStatus) => s.replace(/\s+/g, "").toLowerCase();

/* Buyers may only self-cancel while an order is still Pending. Once we start
   processing it, cancellation has to go through a call so we can stop the pick
   in the warehouse — an admin does it from the console. */
export const CANCELLABLE_STATUSES: OrderStatus[] = ["Pending"];
export const canCancelOrder = (s: OrderStatus) => CANCELLABLE_STATUSES.includes(s);
export const canEditOrder = (s: OrderStatus) => s === "Pending";

export interface Order {
  ref: string;
  placed: number;
  store: string;
  lines: OrderLine[];
  cases: number;
  total: number;
  status: OrderStatus;
  payment?: string;
  fulfilment?: string;
  notes?: string;
  tracking?: string;
  deliveryFee?: number;
  tax?: number;
  discount?: number;
  paymentStatus?: PayStatus;
  billing?: string;
  shipping?: string;
  adminNote?: string;
  taxExempt?: boolean;
  discountReason?: string;
}

export const orderGrand = (o: Order) =>
  o.total + (o.deliveryFee ?? 0) + (o.tax ?? 0) - (o.discount ?? 0);

export const CONTACT = {
  name: "Satya Wholesale",
  legalName: "Satya Wholesalers",
  phone: "(513) 266-6175",
  phoneHref: "tel:+15132666175",
  email: "sales@satyawholesalers.com",
  address1: "8100 Reading Rd",
  address2: "Cincinnati, OH 45237-1404",
  city: "Cincinnati, Ohio",
  region: "Greater Cincinnati",
  domain: "satyawholesalers.com",
  hours: "Mon–Fri 10–5:30 · Sat 10:30–5 · Sun closed",
  hoursList: [
    { d: "Monday", t: "10:00 AM – 5:30 PM" },
    { d: "Tuesday", t: "10:00 AM – 5:30 PM" },
    { d: "Wednesday", t: "10:00 AM – 5:30 PM" },
    { d: "Thursday", t: "10:00 AM – 5:30 PM" },
    { d: "Friday", t: "10:00 AM – 5:30 PM" },
    { d: "Saturday", t: "10:30 AM – 5:00 PM" },
    { d: "Sunday", t: "Closed" },
  ],
};

export interface Customer {
  id: string;
  store: string;
  contact: string;
  email: string;
  city: string;
  since: string;
  status: "Active" | "Pending" | "Frozen" | "Blocked";
  phone?: string;
  address?: string;
  businessLicense?: string;
  tobaccoLicense?: string;
  terms?: string;
  /** 12-digit Costco-style membership number, assigned when the account is created. */
  memberNo?: string;
}

/**
 * Order reference: 4-digit year + 10-digit Unix timestamp (seconds) = 14 digits,
 * e.g. 20261767000000. Unique to the second; the server mirrors this format.
 */
export const orderRef = () => `${new Date().getUTCFullYear()}${Math.floor(Date.now() / 1000)}`;

export const DEPTS: Dept[] = [
  { key: "tobacco", name: "Tobacco" },
  { key: "vape", name: "Vape" },
  { key: "smoke", name: "Smoking Acc." },
  { key: "hba", name: "HBA" },
  { key: "grocery", name: "Grocery & Candy" },
  { key: "auto", name: "Automotive" },
  { key: "acc", name: "Accessories" },
];

export const DEPT_BG: Record<DeptKey, string> = {
  tobacco: "#FFE9DF", vape: "#E6F1FF", smoke: "#FFF1E0", hba: "#F0E9FF",
  grocery: "#FFF4DC", auto: "#E7F0FF", acc: "#E8F6EE",
};

export const deptName = (k: DeptKey) => DEPTS.find((d) => d.key === k)?.name ?? k;

export const LOW_STOCK = 20;

export const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ---- inventory hook ---- */
export function useInventory() {
  const col = useCollection<Product>("products", (p) => String(p.id));
  const updateProduct = useCallback(
    (id: number, patch: Partial<Product>) => col.update(String(id), patch),
    [col.update] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const addProduct = col.add;
  const removeProduct = useCallback(
    (id: number) => col.remove(String(id)),
    [col.remove] // eslint-disable-line react-hooks/exhaustive-deps
  );
  return { products: col.items, ready: col.ready, error: col.error, refresh: col.refresh, updateProduct, addProduct, removeProduct, reset: col.refresh };
}

/* ---- orders hook ----
   The server scopes rows: buyers get their own store's orders, admins get
   all. Placing an order also decrements stock server-side. */
export function useOrders() {
  const col = useCollection<Order>("orders", (o) => o.ref);
  const placeOrder = useCallback((order: Order) => {
    col.add(order); // optimistic insert + POST; the server decrements stock
    setTimeout(() => refreshCollection("products"), 1500); // pull the fresh catalog after commit
  }, [col.add]); // eslint-disable-line react-hooks/exhaustive-deps
  const setStatus = useCallback((ref: string, status: Order["status"]) => col.update(ref, { status }), [col.update]); // eslint-disable-line react-hooks/exhaustive-deps
  const patchOrder = useCallback((ref: string, patch: Partial<Order>) => col.update(ref, patch), [col.update]); // eslint-disable-line react-hooks/exhaustive-deps
  const removeOrder = useCallback((ref: string) => col.remove(ref), [col.remove]); // eslint-disable-line react-hooks/exhaustive-deps
  return { orders: col.items, ready: col.ready, error: col.error, refresh: col.refresh, placeOrder, setStatus, patchOrder, removeOrder };
}

/* ---- app settings (tax, thresholds) ---- */
export interface AppSettings {
  id?: string;
  taxRate: number;
  taxLabel: string;
  /** Optional second (county/local) tax line, applied on top of the sales tax. */
  countyTaxRate?: number;
  countyTaxLabel?: string;
  lowStock: number;
}
export const DEFAULT_SETTINGS: AppSettings = { taxRate: 6.5, taxLabel: "OH sales tax", countyTaxRate: 0, countyTaxLabel: "County tax", lowStock: LOW_STOCK };

export function useSettings() {
  const col = useCollection<AppSettings>("settings", (s) => s.id ?? "main");
  const settings = col.items[0] ?? DEFAULT_SETTINGS;
  const update = useCallback((patch: Partial<AppSettings>) => {
    if (col.items.length === 0) col.add({ ...DEFAULT_SETTINGS, ...patch, id: "main" });
    else col.update("main", patch);
  }, [col.items.length, col.add, col.update]); // eslint-disable-line react-hooks/exhaustive-deps
  return { settings, update, ready: col.ready, error: col.error, refresh: col.refresh };
}

/** Tax applies to everyone by default; only an explicit resale exemption skips it. */
export const computeTax = (subtotal: number, exempt: boolean | undefined, ratePct: number) =>
  exempt === true ? 0 : Math.round(subtotal * ratePct) / 100;

/** Sales tax + optional county/local tax, split out for display and summed for
    the order total. Keeps every surface consistent with the server calculation. */
export const taxBreakdown = (
  subtotal: number,
  exempt: boolean | undefined,
  s: { taxRate: number; countyTaxRate?: number }
) => {
  const sales = computeTax(subtotal, exempt, s.taxRate);
  const county = computeTax(subtotal, exempt, s.countyTaxRate ?? 0);
  return { sales, county, total: sales + county };
};
