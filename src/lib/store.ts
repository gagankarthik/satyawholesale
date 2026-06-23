"use client";

import { useCallback, useEffect, useState } from "react";

/* =========================================================
   Shared catalog + inventory + orders store
   No backend — persisted to localStorage so the order portal
   and the admin inventory portal read/write the same data.
   ========================================================= */

export type DeptKey =
  | "tobacco" | "vape" | "smoke" | "hba" | "grocery" | "auto" | "acc";

export type Tag = "new" | "pop" | "low" | null;

export interface Product {
  id: number;
  name: string;
  dep: DeptKey;
  emoji: string;
  price: number;
  pack: string;
  unit: string;
  tag: Tag;
  stock: number;
  // --- master data (Phase 1 onboarding) ---
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
}

export const sku = (p: Product) => p.sku || `SW-${p.id}`;

export interface Dept {
  key: DeptKey;
  name: string;
  icon: string;
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

/** Ordered fulfilment lifecycle — shared by the portal tracker and admin console.
 *  "Cancelled" is a terminal off-flow state, deliberately excluded here. */
export const ORDER_FLOW: OrderStatus[] = [
  "Pending", "Processing", "At Local Facility", "Out for delivery", "Completed",
];
/** css-safe slug for a status, e.g. "Out for delivery" -> "outfordelivery". */
export const statusSlug = (s: OrderStatus) => s.replace(/\s+/g, "").toLowerCase();

/** A customer may cancel only before the order leaves the building.
 *  Note: cancel/edit are status/field changes only — inventory is not
 *  reconciled, mirroring the admin line-edit behavior. */
export const CANCELLABLE_STATUSES: OrderStatus[] = ["Pending", "Processing"];
export const canCancelOrder = (s: OrderStatus) => CANCELLABLE_STATUSES.includes(s);
/** Items & delivery details stay editable only while the order is still Pending. */
export const canEditOrder = (s: OrderStatus) => s === "Pending";

export interface Order {
  ref: string;
  placed: number; // epoch ms
  store: string;
  lines: OrderLine[];
  cases: number;
  total: number; // subtotal of lines
  status: OrderStatus;
  payment?: string;
  fulfilment?: string;
  notes?: string;
  // enriched billing/fulfilment
  tracking?: string;
  deliveryFee?: number;
  tax?: number;
  discount?: number;
  paymentStatus?: PayStatus;
  billing?: string;
  shipping?: string;
  adminNote?: string; // message from the warehouse team, shown to the customer
  taxExempt?: boolean; // resale exemption; when false, sales tax applies
  discountReason?: string; // why a discount was applied
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
  status: "Active" | "Pending" | "Hold";
  phone?: string;
  address?: string;
  businessLicense?: string;
  tobaccoLicense?: string;
  terms?: string;
}

export const CUSTOMERS: Customer[] = [
  { id: "C-1042", store: "Jay's Stop & Shop", contact: "Jay Patel", email: "buyer@yourstore.com", phone: "(513) 555-0110", address: "412 Vine St, Cincinnati, OH 45202", city: "Cincinnati, OH", since: "2021", status: "Active", businessLicense: "OH-BL-884201", tobaccoLicense: "OH-TOB-22914", terms: "Net 15" },
  { id: "C-1088", store: "Reading Rd Mini Mart", contact: "M. Hassan", email: "mart@readingrd.com", phone: "(513) 555-0134", address: "8100 Reading Rd, Cincinnati, OH 45237", city: "Cincinnati, OH", since: "2022", status: "Active", businessLicense: "OH-BL-901744", tobaccoLicense: "OH-TOB-30188", terms: "Net 30" },
  { id: "C-1130", store: "Tri-State Smoke & Vape", contact: "D. Nguyen", email: "ops@tristatesv.com", phone: "(859) 555-0177", address: "55 Pike St, Covington, KY 41011", city: "Covington, KY", since: "2022", status: "Active", businessLicense: "KY-BL-55120", tobaccoLicense: "KY-TOB-11209", terms: "Net 15" },
  { id: "C-1175", store: "Norwood Quick Stop", contact: "A. Rivera", email: "buyer@norwoodqs.com", phone: "(513) 555-0162", address: "4700 Montgomery Rd, Norwood, OH 45212", city: "Norwood, OH", since: "2023", status: "Active", businessLicense: "OH-BL-771230", tobaccoLicense: "OH-TOB-44120", terms: "COD" },
  { id: "C-1209", store: "Lawrenceburg Corner", contact: "S. Kaur", email: "corner@lburg.com", phone: "(812) 555-0143", address: "20 W High St, Lawrenceburg, IN 47025", city: "Lawrenceburg, IN", since: "2023", status: "Hold", businessLicense: "IN-BL-220915", tobaccoLicense: "IN-TOB-09813", terms: "Net 15" },
  { id: "C-1233", store: "Eastgate Convenience", contact: "P. Shah", email: "eastgate@conv.com", phone: "(513) 555-0199", address: "4500 Eastgate Blvd, Cincinnati, OH 45245", city: "Cincinnati, OH", since: "2024", status: "Pending", businessLicense: "OH-BL-pending", tobaccoLicense: "submitted", terms: "Net 15" },
];

export const DEPTS: Dept[] = [
  { key: "tobacco", name: "Tobacco", icon: "🚬" },
  { key: "vape", name: "Vape", icon: "💨" },
  { key: "smoke", name: "Smoking Acc.", icon: "🔥" },
  { key: "hba", name: "HBA", icon: "💊" },
  { key: "grocery", name: "Grocery & Candy", icon: "🍬" },
  { key: "auto", name: "Automotive", icon: "🚗" },
  { key: "acc", name: "Accessories", icon: "📱" },
];

export const DEPT_BG: Record<DeptKey, string> = {
  tobacco: "#FFE9DF", vape: "#E6F1FF", smoke: "#FFF1E0", hba: "#F0E9FF",
  grocery: "#FFF4DC", auto: "#E7F0FF", acc: "#E8F6EE",
};

export const deptName = (k: DeptKey) => DEPTS.find((d) => d.key === k)?.name ?? k;

const P = (
  id: number, name: string, dep: DeptKey, emoji: string, price: number,
  pack: string, unit: string, tag: Tag, stock: number
): Product => ({ id, name, dep, emoji, price, pack, unit, tag, stock });

export const SEED_PRODUCTS: Product[] = [
  P(2798, "4K'S Cigarillo 4F99 Diamond", "tobacco", "🚬", 10.42, "10/4ct", "case", "pop", 180),
  P(6510, "4K'S Cigarillo 4F99 Black Sweets", "tobacco", "🚬", 10.42, "10/4ct", "case", null, 140),
  P(2708, "4K'S Cigarillo 4F99 Mango", "tobacco", "🚬", 10.42, "10/4ct", "case", null, 96),
  P(5127, "24/7 King Red Carton", "tobacco", "🚬", 60.0, "10 packs", "carton", null, 94),
  P(5128, "24/7 King Gold Carton", "tobacco", "🚬", 60.0, "10 packs", "carton", null, 94),
  P(5180, "24/7 100 Silver Carton", "tobacco", "🚬", 60.0, "10 packs", "carton", "low", 12),
  P(3300, "Beech-Nut Wintergreen 3oz", "tobacco", "🟫", 38.5, "12ct", "case", null, 60),
  P(2453, "Blue Legend Hookah 100g", "tobacco", "🌫️", 16.75, "10ct", "case", null, 36),
  P(5510, "Breeze Pro 2% Assorted", "vape", "💨", 53.0, "10ct", "display", "pop", 210),
  P(5310, "Mr Fog Switch 5500", "vape", "💨", 149.5, "10ct", "display", "new", 103),
  P(5402, "EB Design BC5000 Mix", "vape", "💨", 88.0, "10ct", "display", null, 73),
  P(5601, "JUUL Pods Virginia Tobacco", "vape", "💨", 74.0, "8ct", "box", null, 17),
  P(5705, "Vuse Alto Golden Tobacco", "vape", "💨", 62.4, "5ct", "box", null, 14),
  P(5810, "E-Liquid Salt 30ml Mix", "vape", "🧪", 46.0, "10ct", "box", null, 46),
  P(7120, "ZYN Cool Mint 6mg", "vape", "⚡", 78.4, "5/15ct", "case", "pop", 150),
  P(4401, "3 Kings Hookah Charcoal Big", "smoke", "🔥", 16.97, "1 case", "case", null, 98),
  P(3612, "3 Kings Hookah Charcoal Small", "smoke", "🔥", 13.5, "1 case", "case", null, 80),
  P(4797, "3-in-1 Pipe Set", "smoke", "🪈", 24.0, "12ct", "case", null, 40),
  P(4801, "Clipper Lighter Tray 48ct", "smoke", "🔦", 34.99, "48ct", "tray", "pop", 107),
  P(4852, "Cigarette Tubes 200ct", "smoke", "📄", 2.1, "50ct", "box", null, 52),
  P(1981, "357 Magnum BTL", "hba", "💊", 60.0, "36ct", "case", null, 90),
  P(1980, "357 PK 24ct", "hba", "💊", 24.0, "24ct", "case", null, 72),
  P(7250, "5-Hour Energy Berry 12ct", "hba", "⚡", 18.99, "12ct", "case", "pop", 59),
  P(7310, "Assorted Pain Relief Packets", "hba", "💊", 22.4, "30ct", "box", null, 127),
  P(6411, "Candy Treasure Assorted Mix", "grocery", "🍬", 44.99, "1 case", "case", "pop", 300),
  P(6610, "Twix Cookie Dough King 24ct", "grocery", "🍫", 30.99, "24ct", "box", "new", 120),
  P(6240, "Essentia Water 24pk", "grocery", "💧", 22.8, "24pk", "case", null, 101),
  P(6720, "Pop Cones Pre-Roll Display", "grocery", "🌿", 38.0, "24ct", "display", "new", 64),
  P(6810, "Household Cleaning Caddy", "grocery", "🧴", 40.0, "mixed", "case", null, 80),
  P(6905, "Big Dog Pet Treats 12ct", "grocery", "🐾", 19.5, "12ct", "case", null, 9),
  P(8010, "Car Fresh Fiber Can 1.05oz", "auto", "🚗", 12.5, "12ct", "case", null, 33),
  P(8020, "Rain-X 2-in-1 Windshield Solvent", "auto", "🚙", 24.0, "6ct", "case", "low", 4),
  P(8110, "Booster Cables 8ft 200A", "auto", "🔌", 28.0, "6ct", "case", null, 27),
  P(9010, "Phone Charging Cable Asst.", "acc", "📱", 32.0, "24ct", "case", "pop", 85),
  P(9110, "Fashion Sunglasses Display", "acc", "🕶️", 48.0, "36ct", "display", null, 260),
  P(9210, "4-in-1 Utility Jar", "acc", "🫙", 12.0, "12ct", "case", null, 98),
];

const INV_KEY = "satya.inventory.v1";
const ORD_KEY = "satya.orders.v1";
export const LOW_STOCK = 20;
const DAY = 86400000;

/* historical orders so the admin dashboards have data on first run */
export const SEED_ORDERS: Order[] = [
  { ref: "SW-4810", placed: Date.now() - 1 * DAY, store: "Reading Rd Mini Mart", status: "Out for delivery", cases: 22, total: 1284.4,
    lines: [{ id: 5510, name: "Breeze Pro 2% Assorted", qty: 8, price: 53.0 }, { id: 6411, name: "Candy Treasure Assorted Mix", qty: 6, price: 44.99 }, { id: 5127, name: "24/7 King Red Carton", qty: 8, price: 60.0 }] },
  { ref: "SW-4806", placed: Date.now() - 2 * DAY, store: "Tri-State Smoke & Vape", status: "Processing", cases: 18, total: 2106.5,
    lines: [{ id: 5310, name: "Mr Fog Switch 5500", qty: 10, price: 149.5 }, { id: 7120, name: "ZYN Cool Mint 6mg", qty: 8, price: 78.4 }] },
  { ref: "SW-4801", placed: Date.now() - 3 * DAY, store: "Norwood Quick Stop", status: "Completed", cases: 14, total: 742.86,
    lines: [{ id: 2798, name: "4K'S Cigarillo 4F99 Diamond", qty: 9, price: 10.42 }, { id: 6610, name: "Twix Cookie Dough King 24ct", qty: 5, price: 30.99 }] },
  { ref: "SW-4793", placed: Date.now() - 4 * DAY, store: "Jay's Stop & Shop", status: "Completed", cases: 26, total: 1488.0,
    lines: [{ id: 5128, name: "24/7 King Gold Carton", qty: 12, price: 60.0 }, { id: 4801, name: "Clipper Lighter Tray 48ct", qty: 8, price: 34.99 }, { id: 7250, name: "5-Hour Energy Berry 12ct", qty: 6, price: 18.99 }] },
  { ref: "SW-4788", placed: Date.now() - 5 * DAY, store: "Reading Rd Mini Mart", status: "Completed", cases: 11, total: 612.4,
    lines: [{ id: 6240, name: "Essentia Water 24pk", qty: 7, price: 22.8 }, { id: 9110, name: "Fashion Sunglasses Display", qty: 4, price: 48.0 }] },
  { ref: "SW-4779", placed: Date.now() - 6 * DAY, store: "Eastgate Convenience", status: "Completed", cases: 19, total: 1342.7,
    lines: [{ id: 5402, name: "EB Design BC5000 Mix", qty: 9, price: 88.0 }, { id: 4401, name: "3 Kings Hookah Charcoal Big", qty: 10, price: 16.97 }] },
  { ref: "SW-4768", placed: Date.now() - 7 * DAY, store: "Tri-State Smoke & Vape", status: "Completed", cases: 16, total: 968.0,
    lines: [{ id: 1981, name: "357 Magnum BTL", qty: 10, price: 60.0 }, { id: 9010, name: "Phone Charging Cable Asst.", qty: 6, price: 32.0 }] },
];

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
  // notify same-tab listeners (storage event only fires cross-tab)
  window.dispatchEvent(new CustomEvent(`satya:${key}`));
}

export const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ---- inventory hook ---- */
export function useInventory() {
  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProducts(read(INV_KEY, SEED_PRODUCTS));
    setReady(true);
    const sync = () => setProducts(read(INV_KEY, SEED_PRODUCTS));
    window.addEventListener(`satya:${INV_KEY}`, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(`satya:${INV_KEY}`, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const persist = useCallback((next: Product[]) => {
    setProducts(next);
    write(INV_KEY, next);
  }, []);

  const updateProduct = useCallback(
    (id: number, patch: Partial<Product>) =>
      persist(products.map((p) => (p.id === id ? { ...p, ...patch } : p))),
    [products, persist]
  );

  const addProduct = useCallback(
    (p: Product) => persist([p, ...products]),
    [products, persist]
  );

  const removeProduct = useCallback(
    (id: number) => persist(products.filter((p) => p.id !== id)),
    [products, persist]
  );

  const reset = useCallback(() => persist(SEED_PRODUCTS), [persist]);

  return { products, ready, updateProduct, addProduct, removeProduct, reset };
}

/* ---- orders hook ---- */
export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    setOrders(read(ORD_KEY, SEED_ORDERS));
    const sync = () => setOrders(read(ORD_KEY, SEED_ORDERS));
    window.addEventListener(`satya:${ORD_KEY}`, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(`satya:${ORD_KEY}`, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const placeOrder = useCallback((order: Order) => {
    const next = [order, ...read<Order[]>(ORD_KEY, SEED_ORDERS)];
    setOrders(next);
    write(ORD_KEY, next);
  }, []);

  const setStatus = useCallback((ref: string, status: Order["status"]) => {
    const next = read<Order[]>(ORD_KEY, SEED_ORDERS).map((o) =>
      o.ref === ref ? { ...o, status } : o
    );
    setOrders(next);
    write(ORD_KEY, next);
  }, []);

  const patchOrder = useCallback((ref: string, patch: Partial<Order>) => {
    const next = read<Order[]>(ORD_KEY, SEED_ORDERS).map((o) =>
      o.ref === ref ? { ...o, ...patch } : o
    );
    setOrders(next);
    write(ORD_KEY, next);
  }, []);

  const removeOrder = useCallback((ref: string) => {
    const next = read<Order[]>(ORD_KEY, SEED_ORDERS).filter((o) => o.ref !== ref);
    setOrders(next);
    write(ORD_KEY, next);
  }, []);

  return { orders, placeOrder, setStatus, patchOrder, removeOrder };
}

/* ---- app settings (tax, thresholds) ---- */
const SETTINGS_KEY = "satya.settings.v1";
export interface AppSettings {
  taxRate: number; // percent, e.g. 6.5
  taxLabel: string;
  lowStock: number;
}
export const DEFAULT_SETTINGS: AppSettings = { taxRate: 6.5, taxLabel: "OH sales tax", lowStock: LOW_STOCK };

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    setSettings(read(SETTINGS_KEY, DEFAULT_SETTINGS));
    const sync = () => setSettings(read(SETTINGS_KEY, DEFAULT_SETTINGS));
    window.addEventListener(`satya:${SETTINGS_KEY}`, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(`satya:${SETTINGS_KEY}`, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      write(SETTINGS_KEY, next);
      return next;
    });
  }, []);
  return { settings, update };
}

/* sales tax for an order: 0 when resale-exempt, else subtotal × rate% */
/** Tax applies to everyone by default; only an explicit resale exemption skips it. */
export const computeTax = (subtotal: number, exempt: boolean | undefined, ratePct: number) =>
  exempt === true ? 0 : Math.round(subtotal * ratePct) / 100;

/* decrement stock when an order is submitted */
export function commitStockForOrder(lines: OrderLine[]) {
  const inv = read<Product[]>(INV_KEY, SEED_PRODUCTS);
  const next = inv.map((p) => {
    const line = lines.find((l) => l.id === p.id);
    return line ? { ...p, stock: Math.max(0, p.stock - line.qty) } : p;
  });
  write(INV_KEY, next);
}
