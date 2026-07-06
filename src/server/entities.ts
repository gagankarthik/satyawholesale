import type { AuthUser } from "./auth";
import { isAdmin, isBuyer } from "./auth";
import type { Row } from "./db";

/* Which entities exist, who may touch them, and how rows are scoped.
   "buyer" access always includes admins. */
export interface EntityRule {
  /** who can list/read */
  read: "admin" | "buyer";
  /** who can create/update/delete */
  write: "admin" | "buyer";
  /** field holding the row id */
  idField: string;
  /** when set, buyers only see/write rows whose field matches their store claim */
  buyerScope?: string;
}

export const ENTITIES: Record<string, EntityRule> = {
  products:   { read: "buyer", write: "admin", idField: "id" },
  categories: { read: "buyer", write: "admin", idField: "key" },
  promos:     { read: "buyer", write: "admin", idField: "id" },
  settings:   { read: "buyer", write: "admin", idField: "id" },
  orders:     { read: "buyer", write: "buyer", idField: "ref", buyerScope: "store" },
  accounts:   { read: "admin", write: "admin", idField: "id" },
  suppliers:  { read: "admin", write: "admin", idField: "id" },
  pos:        { read: "admin", write: "admin", idField: "id" },
  grns:       { read: "admin", write: "admin", idField: "id" },
  invoices:   { read: "admin", write: "admin", idField: "id" },
  credits:    { read: "admin", write: "admin", idField: "id" },
  staff:      { read: "admin", write: "admin", idField: "id" },
  locations:  { read: "admin", write: "admin", idField: "id" },
  movements:  { read: "admin", write: "admin", idField: "id" },
};

export const canRead = (rule: EntityRule, u: AuthUser | null) =>
  rule.read === "admin" ? isAdmin(u) : isBuyer(u);
export const canWrite = (rule: EntityRule, u: AuthUser | null) =>
  rule.write === "admin" ? isAdmin(u) : isBuyer(u);

/** Rows a buyer may see; admins see everything. */
export const scopeRows = (rule: EntityRule, u: AuthUser, rows: Row[]) =>
  !rule.buyerScope || isAdmin(u) ? rows : rows.filter((r) => r[rule.buyerScope!] === u.store);

/** True when a buyer owns this particular row (admins always pass). */
export const ownsRow = (rule: EntityRule, u: AuthUser, row: Row) =>
  isAdmin(u) || !rule.buyerScope || row[rule.buyerScope] === u.store;
