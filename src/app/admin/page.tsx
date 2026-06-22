"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  DEPTS, DEPT_BG, deptName, fmt, sku, useInventory, useOrders, LOW_STOCK,
  CONTACT, CUSTOMERS, orderGrand,
  type DeptKey, type Product, type Tag, type Order, type OrderStatus, type PayStatus,
} from "@/lib/store";
import {
  useSuppliers, useCategories, useLocations, useStaff, useCustomers,
  usePurchaseOrders, useMovements, useReceipts, useInvoices, usePromotions,
  poTotal, PO_FLOW, PO_APPROVAL_THRESHOLD, RECEIVE_TOLERANCE, threeWayMatch,
  ROLES, csvTemplate, parseCsv, validateRows, rowToProduct,
  type ImportRow, type PurchaseOrder, type Role,
} from "@/lib/wms";
import { Grid, Receipt, Boxes, Users, Truck, Store, Shield, Pin, Refresh } from "@/components/Icons";
import Brand from "@/components/Brand";
import { ConfirmProvider, useConfirm } from "@/components/Confirm";

type Tab =
  | "dashboard" | "products" | "import" | "categories" | "suppliers" | "promos"
  | "pos" | "inventory" | "orders" | "customers" | "users" | "warehouse"
  | "settings" | "possync";

const m = (n: number) => "$" + fmt(n);
const k = (n: number) => (n >= 1000 ? "$" + (Math.round(n / 100) / 10) + "k" : "$" + Math.round(n));
function timeAgo(ms: number) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
const stockClass = (n: number) => (n <= 0 ? "oos" : n <= LOW_STOCK ? "low" : "ok");
type Flash = (m: string) => void;

/* =======================================================================
   ADMIN SHELL
   ======================================================================= */
export default function Admin() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [toast, setToast] = useState("");
  const flash: Flash = (msg) => {
    setToast(msg);
    window.clearTimeout((flash as unknown as { t?: number }).t);
    (flash as unknown as { t?: number }).t = window.setTimeout(() => setToast(""), 2000);
  };

  const { orders } = useOrders();
  const { products } = useInventory();
  const { customers } = useCustomers(CUSTOMERS);
  const { pos } = usePurchaseOrders();

  const pendingAccounts = customers.filter((c) => c.status === "Pending").length;
  const openPOs = pos.filter((p) => p.status !== "Closed" && p.status !== "Received").length;

  const GROUPS: { label: string; items: { key: Tab; label: string; Icon: typeof Grid; badge?: number }[] }[] = [
    { label: "Overview", items: [{ key: "dashboard", label: "Dashboard", Icon: Grid }] },
    { label: "Catalog", items: [
      { key: "products", label: "Products", Icon: Boxes, badge: products.length },
      { key: "import", label: "Bulk import", Icon: Receipt },
      { key: "categories", label: "Categories", Icon: Grid },
      { key: "suppliers", label: "Suppliers", Icon: Truck },
      { key: "promos", label: "Promotions", Icon: Store },
    ] },
    { label: "Inventory", items: [
      { key: "inventory", label: "Stock ledger", Icon: Refresh },
      { key: "pos", label: "Purchase orders", Icon: Receipt, badge: openPOs },
      { key: "warehouse", label: "Warehouse", Icon: Store },
    ] },
    { label: "Sales", items: [
      { key: "orders", label: "Orders", Icon: Receipt, badge: orders.length },
      { key: "customers", label: "Accounts", Icon: Users, badge: pendingAccounts || undefined },
    ] },
    { label: "Admin", items: [
      { key: "users", label: "Users & roles", Icon: Shield },
      { key: "settings", label: "Settings", Icon: Grid },
      { key: "possync", label: "POS sync", Icon: Store },
    ] },
  ];

  return (
    <ConfirmProvider>
    <div className="admin">
      <aside className="aside-dark">
        <Link href="/" className="side-brand"><Brand dark height={30} /></Link>
        <div className="adminrole mono">WAREHOUSE CONSOLE</div>
        <nav className="anav scroll">
          {GROUPS.map((g) => (
            <div key={g.label} className="anav-group">
              <div className="anav-label">{g.label}</div>
              {g.items.map(({ key, label, Icon, badge }) => (
                <button key={key} className={tab === key ? "on" : ""} onClick={() => setTab(key)}>
                  <Icon className="nicon" /> {label}
                  {badge ? <span className="cb">{badge}</span> : null}
                  {key === "possync" && <span className="soon">soon</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="aside-foot">
          <Link href="/portal" className="aside-link">→ Order portal</Link>
        </div>
      </aside>

      <div className="adminmain">
        {tab === "dashboard" && <DashboardTab go={setTab} />}
        {tab === "products" && <ProductsTab flash={flash} go={setTab} />}
        {tab === "import" && <ImportTab flash={flash} />}
        {tab === "categories" && <CategoriesTab flash={flash} />}
        {tab === "suppliers" && <SuppliersTab flash={flash} />}
        {tab === "promos" && <PromotionsTab flash={flash} />}
        {tab === "pos" && <POTab flash={flash} />}
        {tab === "inventory" && <InventoryTab flash={flash} />}
        {tab === "orders" && <OrdersTab flash={flash} />}
        {tab === "customers" && <CustomersTab flash={flash} />}
        {tab === "users" && <UsersTab flash={flash} />}
        {tab === "warehouse" && <WarehouseTab />}
        {tab === "settings" && <SettingsTab flash={flash} />}
        {tab === "possync" && <ComingSoon />}
      </div>

      {toast && <div className="toast show">✓ {toast}</div>}
    </div>
    </ConfirmProvider>
  );
}

function Head({ title, sub, children }: { title: string; sub: string; children?: React.ReactNode }) {
  return (
    <header className="adminbar">
      <div><h1>{title}</h1><p>{sub}</p></div>
      {children}
    </header>
  );
}

/* =======================================================================
   DASHBOARD
   ======================================================================= */
function DashboardTab({ go }: { go: (t: Tab) => void }) {
  const { products } = useInventory();
  const { orders } = useOrders();
  const { pos } = usePurchaseOrders();
  const { movements } = useMovements();
  const { customers } = useCustomers(CUSTOMERS);
  const { suppliers } = useSuppliers();

  const DAY = 86400000;
  const [period, setPeriod] = useState(7);
  const since = Date.now() - period * DAY;
  const inPeriod = orders.filter((o) => o.placed >= since);
  const revenue = inPeriod.reduce((s, o) => s + o.total, 0);
  const aov = inPeriod.length ? revenue / inPeriod.length : 0;
  const invValue = products.reduce((s, p) => s + (p.cost ?? p.price * 0.7) * p.stock, 0);
  const low = products.filter((p) => p.stock <= (p.reorderPoint ?? LOW_STOCK));
  const pending = customers.filter((c) => c.status === "Pending").length;

  const nB = 7;
  const bucketMs = (period * DAY) / nB;
  const days = Array.from({ length: nB }).map((_, i) => {
    const start = since + i * bucketMs;
    const total = orders.filter((o) => o.placed >= start && o.placed < start + bucketMs).reduce((s, o) => s + o.total, 0);
    const d = new Date(start);
    const label = period <= 7 ? d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2) : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { label, total };
  });
  const maxDay = Math.max(1, ...days.map((d) => d.total));

  return (
    <>
      <Head title="Dashboard" sub={`Live warehouse health · ${CONTACT.city}`}>
        <div className="fchips">
          {[7, 30, 90].map((d) => (
            <button key={d} className={period === d ? "on" : ""} onClick={() => setPeriod(d)}>{d}D</button>
          ))}
        </div>
      </Head>
      <div className="kpis">
        <div className="kpi accent"><div className="kl">Revenue · {period} days</div><div className="kv">{k(revenue)}</div><div className="kf"><span className="up">▲</span> {inPeriod.length} orders</div></div>
        <div className="kpi"><div className="kl">Avg order · {period}d</div><div className="kv">{k(aov)}</div><div className="kf">per order</div></div>
        <div className="kpi"><div className="kl">Inventory value</div><div className="kv">{k(invValue)}</div><div className="kf">{products.length} SKUs at cost</div></div>
        <div className="kpi warn"><div className="kl">Reorder needed</div><div className="kv">{low.length}</div><div className="kf">at/below reorder point</div></div>
        <div className="kpi danger"><div className="kl">Pending accounts</div><div className="kv">{pending}</div><div className="kf">awaiting approval</div></div>
      </div>

      <div className="dash">
        <div className="panel">
          <div className="panel-h"><h3>Sales · last {period} days</h3><span className="hint">{pos.filter((p) => p.status !== "Received" && p.status !== "Closed").length} open POs</span></div>
          <div className="bars">
            {days.map((d, i) => (
              <div className="barcol" key={i}>
                <div className="bval">{d.total ? k(d.total) : ""}</div>
                <div className="bar" style={{ height: `${(d.total / maxDay) * 100}%` }} title={m(d.total)} />
                <div className="bday">{d.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-h"><h3>Reorder suggestions</h3><button className="ia" onClick={() => go("pos")}>Create POs</button></div>
          <div className="minirows">
            {low.length ? low.slice(0, 6).map((p) => {
              const sup = suppliers.find((s) => s.id === p.supplierId);
              return (
                <div className="minirow" key={p.id}>
                  <div>
                    <div className="ref" style={{ fontFamily: "var(--font-body-f)", fontWeight: 600 }}>{p.name}</div>
                    <div className="st2">{sku(p)} · {sup ? sup.name : "no supplier"}</div>
                  </div>
                  <span className={`stockbadge ${stockClass(p.stock)}`}>{p.stock} cs</span>
                </div>
              );
            }) : <p style={{ color: "var(--slate)", fontSize: 14 }}>All SKUs above reorder point.</p>}
          </div>
        </div>
      </div>

      <div className="dash">
        <div className="panel">
          <div className="panel-h"><h3>Recent orders</h3><button className="ia" onClick={() => go("orders")}>View all</button></div>
          <div className="minirows">
            {orders.slice(0, 5).map((o) => (
              <div className="minirow" key={o.ref}>
                <div><div className="ref">{o.ref}</div><div className="st2">{o.store} · {timeAgo(o.placed)}</div></div>
                <span className="amt">{m(o.total)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-h"><h3>Recent stock movements</h3><button className="ia" onClick={() => go("inventory")}>Ledger</button></div>
          <div className="minirows">
            {movements.slice(0, 5).map((mv) => (
              <div className="minirow" key={mv.id}>
                <div><div className="ref" style={{ fontFamily: "var(--font-body-f)", fontWeight: 600 }}>{mv.name}</div><div className="st2">{mv.type} · {mv.ref}</div></div>
                <span className="amt" style={{ color: mv.qty < 0 ? "var(--red)" : "var(--green)" }}>{mv.qty > 0 ? "+" : ""}{mv.qty}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* =======================================================================
   PRODUCTS  (master data + onboarding)
   ======================================================================= */
const EMPTY_PRODUCT = {
  name: "", category: "tobacco" as DeptKey, gtin: "", uom: "case", caseQty: "",
  cost: "", price: "", mrp: "", description: "", reorderPoint: "", maxStock: "", supplierId: "", stock: "",
};

function ProductsTab({ flash, go }: { flash: Flash; go: (t: Tab) => void }) {
  const { products, addProduct, updateProduct, removeProduct } = useInventory();
  const { suppliers } = useSuppliers();
  const { categories } = useCategories();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DeptKey | "all">("all");
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [draft, setDraft] = useState(EMPTY_PRODUCT);
  const [errs, setErrs] = useState<string[]>([]);
  const confirm = useConfirm();

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) =>
      (filter === "all" || p.dep === filter) &&
      (q === "" || p.name.toLowerCase().includes(q) || String(p.id).includes(q) || (p.gtin || "").includes(q))
    );
  }, [products, query, filter]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];
    const num = (v: string) => (v === "" ? NaN : Number(v));
    if (!draft.name.trim()) errors.push("Product name is required.");
    if (isNaN(num(draft.price))) errors.push("A numeric price is required.");
    if (draft.gtin && !/^\d{12,13}$/.test(draft.gtin)) errors.push("Barcode must be 12–13 digits.");
    if (draft.gtin && /^\d{12,13}$/.test(draft.gtin)) {
      const digits = draft.gtin.split("").map(Number); const check = digits.pop()!;
      let sum = 0; digits.reverse().forEach((d, i) => { sum += i % 2 === 0 ? d * 3 : d; });
      if ((10 - (sum % 10)) % 10 !== check) errors.push("Barcode check digit is invalid.");
    }
    if (draft.gtin && products.some((p) => p.gtin === draft.gtin)) errors.push("That barcode already exists.");
    const rp = num(draft.reorderPoint), ms = num(draft.maxStock);
    if (!isNaN(rp) && !isNaN(ms) && rp > ms) errors.push("Reorder point can't exceed max stock.");
    const cost = num(draft.cost), price = num(draft.price);
    if (!isNaN(cost) && !isNaN(price) && price < cost) errors.push("Price is below cost.");
    if (errors.length) { setErrs(errors); return; }

    const common = {
      name: draft.name.trim(), dep: draft.category,
      price: Number(draft.price) || 0, pack: `${draft.caseQty || 1}ct`, unit: draft.uom || "case",
      gtin: draft.gtin || undefined, cost: Number(draft.cost) || undefined,
      mrp: Number(draft.mrp) || undefined, description: draft.description || undefined,
      uom: draft.uom, caseQty: Number(draft.caseQty) || undefined,
      reorderPoint: Number(draft.reorderPoint) || undefined, maxStock: Number(draft.maxStock) || undefined,
      supplierId: draft.supplierId || undefined,
    };
    if (editId) {
      updateProduct(editId, { ...common, stock: Number(draft.stock) || 0 });
      flash("Product updated");
    } else {
      const id = Math.floor(1000 + Math.random() * 8999);
      addProduct({ id, emoji: "📦", tag: "new" as Tag, stock: Number(draft.stock) || 0, sku: `SW-${id}`, active: true, created: Date.now(), ...common });
      flash("Product onboarded to catalog");
    }
    setDraft(EMPTY_PRODUCT); setErrs([]); setAdding(false); setEditId(null);
  };

  const openEdit = (p: Product) => {
    setDraft({
      name: p.name, category: p.dep, gtin: p.gtin || "", uom: p.uom || "case",
      caseQty: String(p.caseQty || ""), cost: p.cost ? String(p.cost) : "", price: String(p.price),
      mrp: p.mrp ? String(p.mrp) : "", description: p.description || "",
      reorderPoint: p.reorderPoint ? String(p.reorderPoint) : "", maxStock: p.maxStock ? String(p.maxStock) : "",
      supplierId: p.supplierId || "", stock: String(p.stock),
    });
    setEditId(p.id); setErrs([]); setAdding(true);
  };

  return (
    <>
      <Head title="Products" sub="SKU master data — the foundation everything else depends on">
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => go("import")}>Bulk import</button>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Onboard product</button>
        </div>
      </Head>

      <div className="adminctl">
        <div className="search small">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" /></svg>
          <input placeholder="Search name, SKU or barcode…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="fchips">
          <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>All</button>
          {DEPTS.map((d) => <button key={d.key} className={filter === d.key ? "on" : ""} onClick={() => setFilter(d.key)}>{d.name}</button>)}
        </div>
      </div>

      <div className="tablewrap">
        <table className="invtable">
          <thead><tr><th>Item name</th><th>Code</th><th>Description</th><th>Category</th><th className="r">MRP</th><th className="r">Unit cost</th><th className="r">Unit price</th><th className="r">Stock</th><th>Created</th><th className="r">Actions</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className={p.stock <= 0 ? "rowdim" : ""}>
                <td><div className="prodcell"><span className="th" style={{ background: DEPT_BG[p.dep] }}>{p.emoji}</span><div><div className="pn">{p.name}</div><div className="mono muted" style={{ fontSize: 11 }}>{p.gtin || "no barcode"}</div></div></div></td>
                <td className="mono muted">{sku(p)}</td>
                <td className="muted" style={{ fontSize: 12.5, maxWidth: 220 }}>{p.description || "—"}</td>
                <td><span className="deptpill">{deptName(p.dep)}</span></td>
                <td className="r mono">{p.mrp ? m(p.mrp) : "—"}</td>
                <td className="r mono">{p.cost ? m(p.cost) : "—"}</td>
                <td className="r mono" style={{ fontWeight: 600 }}>{m(p.price)}</td>
                <td className="r"><span className={`stockbadge ${stockClass(p.stock)}`}>{p.stock}</span></td>
                <td className="muted" style={{ fontSize: 12.5 }}>{fmtDate(p.created)}</td>
                <td className="r"><div className="rowactions">
                  <button className="ia" onClick={() => openEdit(p)}>Edit</button>
                  <button className="ia" onClick={() => { updateProduct(p.id, { stock: p.stock + 12 }); flash("+12 cases"); }}>+12</button>
                  <button className="ia del" onClick={async () => { if (await confirm({ title: "Remove product?", message: `${p.name} will be removed from the catalog.`, confirmLabel: "Remove", danger: true })) { removeProduct(p.id); flash("Removed"); } }}>✕</button>
                </div></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={10} className="tableempty">No products match.</td></tr>}
          </tbody>
        </table>
      </div>

      {adding && (
        <div className="modal-overlay" onClick={() => { setAdding(false); setEditId(null); }}>
          <form className="modal wide" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
            <h3>{editId ? "Edit product" : "Onboard a product"}</h3>
            <p className="modalp">Master data validates against schema, integrity and business rules before it goes live.</p>
            {errs.length > 0 && (
              <div className="valbox">{errs.map((e, i) => <div key={i}>• {e}</div>)}</div>
            )}
            <div className="formgrid">
              <label className="field full"><span>Product name *</span><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Mr Fog Max Pro 1500" required /></label>
              <label className="field full"><span>Description</span><input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Short product description" /></label>
              <label className="field"><span>Category *</span><select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as DeptKey })}>{categories.filter((c) => c.active).map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}</select></label>
              <label className="field"><span>Barcode (UPC/EAN)</span><input value={draft.gtin} onChange={(e) => setDraft({ ...draft, gtin: e.target.value })} placeholder="12–13 digits" /></label>
              <label className="field"><span>Supplier</span><select value={draft.supplierId} onChange={(e) => setDraft({ ...draft, supplierId: e.target.value })}><option value="">— none —</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
              <label className="field"><span>Eaches / case</span><input type="number" value={draft.caseQty} onChange={(e) => setDraft({ ...draft, caseQty: e.target.value })} placeholder="10" /></label>
              <label className="field"><span>Unit cost ($)</span><input type="number" step="0.01" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: e.target.value })} placeholder="0.00" /></label>
              <label className="field"><span>Unit price ($) *</span><input type="number" step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="0.00" required /></label>
              <label className="field"><span>MRP ($)</span><input type="number" step="0.01" value={draft.mrp} onChange={(e) => setDraft({ ...draft, mrp: e.target.value })} placeholder="0.00" /></label>
              <label className="field"><span>Reorder point</span><input type="number" value={draft.reorderPoint} onChange={(e) => setDraft({ ...draft, reorderPoint: e.target.value })} placeholder="15" /></label>
              <label className="field"><span>Max stock</span><input type="number" value={draft.maxStock} onChange={(e) => setDraft({ ...draft, maxStock: e.target.value })} placeholder="120" /></label>
              <label className="field"><span>On-hand (cases)</span><input type="number" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} placeholder="0" /></label>
            </div>
            <div className="modalbtns">
              <button type="button" className="btn btn-ghost" onClick={() => { setAdding(false); setEditId(null); }}>Cancel</button>
              <button type="submit" className="btn btn-primary">Validate &amp; add</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

/* =======================================================================
   BULK IMPORT  (staging → validate → commit)
   ======================================================================= */
function ImportTab({ flash }: { flash: Flash }) {
  const { products, addProduct } = useInventory();
  const { categories } = useCategories();
  const { suppliers } = useSuppliers();
  const { log } = useMovements();
  const [text, setText] = useState("");
  const [staging, setStaging] = useState<ImportRow[] | null>(null);

  const validate = () => {
    const rows = parseCsv(text);
    const result = validateRows(rows, {
      categories: categories.map((c) => c.key),
      suppliers: suppliers.map((s) => s.id),
      existingSkus: new Set(products.map((p) => sku(p))),
      existingGtins: new Set(products.map((p) => p.gtin || "").filter(Boolean)),
    });
    setStaging(result);
  };

  const clean = staging?.filter((r) => r.level === "ok") ?? [];
  const bad = staging?.filter((r) => r.level !== "ok") ?? [];

  const commit = () => {
    let id = Math.floor(1000 + Math.random() * 8000);
    clean.forEach((r) => {
      id += 1;
      const p = rowToProduct(r, id);
      addProduct(p);
      log({ sku: sku(p), name: p.name, type: "Receipt", qty: p.stock, ref: "bulk import" });
    });
    flash(`${clean.length} products committed to catalog`);
    setStaging(null); setText("");
  };

  return (
    <>
      <Head title="Bulk import" sub="Validate-everything-first, then commit only clean rows">
        <button className="btn btn-ghost btn-sm" onClick={() => setText(csvTemplate())}>Load sample CSV</button>
      </Head>

      {!staging ? (
        <div className="panel">
          <div className="panel-h"><h3>Paste catalog CSV</h3><span className="hint">columns: name, category, gtin, cost, price, caseQty, uom, reorderPoint, maxStock, supplierId, stock</span></div>
          <textarea className="csvbox" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste rows here, or load the sample…" spellCheck={false} />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <button className="btn btn-primary btn-sm" disabled={!text.trim()} onClick={validate}>Validate {parseCsv(text).length || ""} rows →</button>
          </div>
        </div>
      ) : (
        <>
          <div className="import-summary">
            <div className="isum ok"><b>{clean.length}</b> clean &amp; ready</div>
            <div className="isum bad"><b>{bad.length}</b> with errors</div>
            <div className="isum"><b>{staging.length}</b> total rows</div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setStaging(null)}>Back to CSV</button>
              <button className="btn btn-primary btn-sm" disabled={!clean.length} onClick={commit}>Commit {clean.length} clean rows</button>
            </div>
          </div>
          <div className="tablewrap">
            <table className="invtable">
              <thead><tr><th>#</th><th>Product</th><th>Category</th><th>Barcode</th><th className="r">Price</th><th>Status</th></tr></thead>
              <tbody>
                {staging.map((r) => (
                  <tr key={r.line} className={r.level !== "ok" ? "rowbad" : ""}>
                    <td className="mono muted">{r.line}</td>
                    <td>{r.name || <span className="muted">(blank)</span>}</td>
                    <td className="mono muted">{r.category}</td>
                    <td className="mono muted">{r.gtin || "—"}</td>
                    <td className="r mono">{r.price ? "$" + r.price : "—"}</td>
                    <td>
                      {r.level === "ok"
                        ? <span className="levelbadge ok">Ready</span>
                        : <span className="levelbadge bad" title={r.errors.join("; ")}>{r.level}: {r.errors[0]}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

/* =======================================================================
   CATEGORIES
   ======================================================================= */
const EMPTY_CAT = { name: "", details: "", icon: "📦", group: "Front counter", image: "" };
const fmtDate = (ts?: number) => (ts ? new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");

function CategoriesTab({ flash }: { flash: Flash }) {
  const { categories, add, update, remove } = useCategories();
  const { products } = useInventory();
  const confirm = useConfirm();
  const [editKey, setEditKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(EMPTY_CAT);
  const count = (key: string) => products.filter((p) => p.dep === key).length;

  const openCreate = () => { setDraft(EMPTY_CAT); setCreating(true); setEditKey(null); };
  const openEdit = (key: string) => { const c = categories.find((x) => x.key === key)!; setDraft({ name: c.name, details: c.details, icon: c.icon, group: c.group, image: c.image }); setEditKey(key); setCreating(false); };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) return;
    if (editKey) { update(editKey, { name: draft.name.trim(), details: draft.details, icon: draft.icon, group: draft.group, image: draft.image }); flash("Category updated"); }
    else {
      const key = draft.name.trim().toLowerCase().replace(/\s+/g, "-");
      add({ id: "CAT-" + Math.floor(110 + Math.random() * 800), key, name: draft.name.trim(), parent: null, active: true, details: draft.details, icon: draft.icon || "📦", image: draft.image, group: draft.group || "Front counter", created: Date.now() });
      flash("Category created");
    }
    setCreating(false); setEditKey(null);
  };

  return (
    <>
      <Head title="Categories" sub="Department taxonomy used across products, ordering and reporting">
        <button className="btn btn-primary btn-sm" onClick={openCreate}>+ New category</button>
      </Head>
      <div className="tablewrap">
        <table className="invtable">
          <thead><tr><th>ID</th><th>Item name</th><th>Details</th><th>Image</th><th>Icon</th><th>Slug</th><th>Group</th><th>Created</th><th className="r">Actions</th></tr></thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.key}>
                <td className="mono muted">{c.id}</td>
                <td><span className="prodcell"><span className="th" style={{ background: DEPT_BG[c.key as DeptKey] || "#eee" }}>{c.icon}</span><span className="pn">{c.name}</span></span></td>
                <td className="muted" style={{ fontSize: 13, maxWidth: 240 }}>{c.details}</td>
                <td>{c.image ? <span className="catimg" style={{ backgroundImage: `url(${c.image})` }} /> : <span className="muted">—</span>}</td>
                <td style={{ fontSize: 18 }}>{c.icon}</td>
                <td className="mono muted">{c.key}</td>
                <td><span className="deptpill">{c.group}</span></td>
                <td className="muted" style={{ fontSize: 13 }}>{fmtDate(c.created)}</td>
                <td className="r"><div className="rowactions">
                  <button className="ia" onClick={() => openEdit(c.key)}>Edit</button>
                  <button className="ia" onClick={() => { update(c.key, { active: !c.active }); flash("Updated"); }}>{c.active ? "Hide" : "Show"}</button>
                  <button className="ia del" onClick={async () => { if (count(c.key) > 0) { flash("Category has products — reassign first"); return; } if (await confirm({ title: "Delete category?", message: `${c.name} will be removed.`, confirmLabel: "Delete", danger: true })) { remove(c.key); flash("Deleted"); } }}>✕</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(creating || editKey) && (
        <div className="modal-overlay" onClick={() => { setCreating(false); setEditKey(null); }}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h3>{editKey ? "Edit category" : "New category"}</h3>
            <div className="formgrid">
              <label className="field full"><span>Item name *</span><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></label>
              <label className="field full"><span>Details</span><input value={draft.details} onChange={(e) => setDraft({ ...draft, details: e.target.value })} /></label>
              <label className="field"><span>Icon (emoji)</span><input value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} maxLength={2} /></label>
              <label className="field"><span>Group</span><input value={draft.group} onChange={(e) => setDraft({ ...draft, group: e.target.value })} /></label>
              <label className="field full"><span>Image URL (optional)</span><input value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })} placeholder="https://…" /></label>
            </div>
            <div className="modalbtns"><button type="button" className="btn btn-ghost" onClick={() => { setCreating(false); setEditKey(null); }}>Cancel</button><button className="btn btn-primary" type="submit">{editKey ? "Save" : "Create"}</button></div>
          </form>
        </div>
      )}
    </>
  );
}

/* =======================================================================
   SUPPLIERS
   ======================================================================= */
const EMPTY_SUP = { name: "", contact: "", email: "", phone: "", leadDays: "3", terms: "Net 15" };
function SuppliersTab({ flash }: { flash: Flash }) {
  const { suppliers, add, update } = useSuppliers();
  const [adding, setAdding] = useState(false);
  const [d, setD] = useState(EMPTY_SUP);
  return (
    <>
      <Head title="Suppliers" sub="Vendor master — lead times, terms and catalog mapping">
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Add supplier</button>
      </Head>
      <div className="tablewrap">
        <table className="invtable">
          <thead><tr><th>Supplier</th><th>Contact</th><th>Terms</th><th className="r">Lead time</th><th className="r">Status</th><th className="r"></th></tr></thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id}>
                <td><div className="prodcell"><span className="avatar">{s.name.slice(0, 2).toUpperCase()}</span><div><div className="pn">{s.name}</div><div className="mono muted" style={{ fontSize: 11 }}>{s.id}</div></div></div></td>
                <td style={{ fontSize: 13 }}>{s.contact}<div className="mono muted" style={{ fontSize: 11 }}>{s.email}</div></td>
                <td><span className="deptpill">{s.terms}</span></td>
                <td className="r mono">{s.leadDays}d</td>
                <td className="r"><span className={`ustatus ${s.status === "Active" ? "active" : "hold"}`}>{s.status}</span></td>
                <td className="r"><button className="ia" onClick={() => { update(s.id, { status: s.status === "Active" ? "Inactive" : "Active" }); flash("Updated"); }}>{s.status === "Active" ? "Disable" : "Enable"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {adding && (
        <div className="modal-overlay" onClick={() => setAdding(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); if (!d.name.trim()) return; add({ id: "SUP-" + Math.floor(10 + Math.random() * 89), name: d.name.trim(), contact: d.contact, email: d.email, phone: d.phone, leadDays: Number(d.leadDays) || 3, terms: d.terms, status: "Active" }); setD(EMPTY_SUP); setAdding(false); flash("Supplier added"); }}>
            <h3>Add a supplier</h3>
            <div className="formgrid">
              <label className="field full"><span>Name *</span><input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} required /></label>
              <label className="field"><span>Contact</span><input value={d.contact} onChange={(e) => setD({ ...d, contact: e.target.value })} /></label>
              <label className="field"><span>Email</span><input value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} /></label>
              <label className="field"><span>Lead time (days)</span><input type="number" value={d.leadDays} onChange={(e) => setD({ ...d, leadDays: e.target.value })} /></label>
              <label className="field"><span>Terms</span><input value={d.terms} onChange={(e) => setD({ ...d, terms: e.target.value })} /></label>
            </div>
            <div className="modalbtns"><button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button><button className="btn btn-primary" type="submit">Add supplier</button></div>
          </form>
        </div>
      )}
    </>
  );
}

/* =======================================================================
   PROMOTIONS (advertising shown on the buyer dashboard)
   ======================================================================= */
const EMPTY_PROMO = { tag: "New arrivals", title: "", subtitle: "", image: "" };
function PromotionsTab({ flash }: { flash: Flash }) {
  const { promos, add, update, remove } = usePromotions();
  const confirm = useConfirm();
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(EMPTY_PROMO);

  const openCreate = () => { setDraft(EMPTY_PROMO); setCreating(true); setEditId(null); };
  const openEdit = (id: string) => { const p = promos.find((x) => x.id === id)!; setDraft({ tag: p.tag, title: p.title, subtitle: p.subtitle, image: p.image }); setEditId(id); setCreating(false); };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    if (editId) { update(editId, draft); flash("Promotion updated"); }
    else { add({ id: "PR-" + Math.floor(10 + Math.random() * 89), ...draft, active: true, created: Date.now() }); flash("Promotion published"); }
    setCreating(false); setEditId(null);
  };

  return (
    <>
      <Head title="Promotions" sub="Image banners shown on the buyer dashboard in the order portal">
        <button className="btn btn-primary btn-sm" onClick={openCreate}>+ New promotion</button>
      </Head>
      <div className="promogrid">
        {promos.map((p) => (
          <div className={`promocard ${p.active ? "" : "off"}`} key={p.id}>
            <div className="promoshot" style={{ backgroundImage: p.image ? `url(${p.image})` : undefined }}>
              {!p.image && <span className="muted">no image</span>}
              <span className="promotag">{p.tag}</span>
            </div>
            <div className="promobody">
              <h3>{p.title}</h3>
              <p>{p.subtitle}</p>
              <div className="rowactions" style={{ marginTop: 12 }}>
                <button className="ia" onClick={() => openEdit(p.id)}>Edit</button>
                <button className="ia" onClick={() => { update(p.id, { active: !p.active }); flash(p.active ? "Hidden from portal" : "Live on portal"); }}>{p.active ? "Unpublish" : "Publish"}</button>
                <button className="ia del" onClick={async () => { if (await confirm({ title: "Delete promotion?", message: `"${p.title}" will be removed from the portal.`, confirmLabel: "Delete", danger: true })) { remove(p.id); flash("Deleted"); } }}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(creating || editId) && (
        <div className="modal-overlay" onClick={() => { setCreating(false); setEditId(null); }}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h3>{editId ? "Edit promotion" : "New promotion"}</h3>
            <p className="modalp">Appears on the buyer dashboard carousel while published.</p>
            <div className="formgrid">
              <label className="field"><span>Tag</span><input value={draft.tag} onChange={(e) => setDraft({ ...draft, tag: e.target.value })} placeholder="New arrivals" /></label>
              <label className="field"><span>Title *</span><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required /></label>
              <label className="field full"><span>Subtitle</span><input value={draft.subtitle} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} /></label>
              <label className="field full"><span>Image URL</span><input value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })} placeholder="https://… (S3 or any image URL)" /></label>
            </div>
            {draft.image && <div className="promoshot" style={{ backgroundImage: `url(${draft.image})`, height: 130, borderRadius: 12, marginBottom: 16 }} />}
            <div className="modalbtns"><button type="button" className="btn btn-ghost" onClick={() => { setCreating(false); setEditId(null); }}>Cancel</button><button className="btn btn-primary" type="submit">{editId ? "Save" : "Publish"}</button></div>
          </form>
        </div>
      )}
    </>
  );
}

/* =======================================================================
   PURCHASE ORDERS
   ======================================================================= */
const rid = (pre: string) => pre + Math.floor(1000 + Math.random() * 8999);
const matchClass = (s: string) => s === "Matched" ? "matched" : s === "Variance" ? "variance" : "awaiting";

function POTab({ flash }: { flash: Flash }) {
  const { pos, add, advance, update } = usePurchaseOrders();
  const { suppliers } = useSuppliers();
  const { products, updateProduct } = useInventory();
  const { log } = useMovements();
  const { receipts, add: addReceipt } = useReceipts();
  const { invoices, add: addInvoice } = useInvoices();

  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "receive" | "invoice">("view");
  const [recvQty, setRecvQty] = useState<Record<string, string>>({});
  const [invQty, setInvQty] = useState<Record<string, string>>({});
  const [invCost, setInvCost] = useState<Record<string, string>>({});

  const supName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? id;
  const cur = pos.find((p) => p.id === openId) || null;

  const suggestions = useMemo(() => {
    const low = products.filter((p) => p.stock <= (p.reorderPoint ?? LOW_STOCK) && p.supplierId);
    const bySup: Record<string, Product[]> = {};
    low.forEach((p) => { const s = p.supplierId!; (bySup[s] ||= []).push(p); });
    return bySup;
  }, [products]);

  const createDraft = (supplierId: string, items: Product[]) => {
    add({
      id: rid("PO-"), supplierId, status: "Draft", created: Date.now(), expected: Date.now() + 4 * 86400000,
      lines: items.map((p) => ({ sku: sku(p), name: p.name, ordered: Math.max(12, (p.maxStock ?? LOW_STOCK * 4) - p.stock), received: 0, cost: p.cost ?? p.price * 0.7 })),
    });
    flash("Draft PO created from reorder suggestions");
  };

  const openPO = (id: string) => { setOpenId(id); setMode("view"); setRecvQty({}); setInvQty({}); setInvCost({}); };

  const postReceipt = () => {
    if (!cur) return;
    const glines = cur.lines.map((l) => ({ sku: l.sku, qty: Number(recvQty[l.sku] || 0) })).filter((x) => x.qty > 0);
    if (!glines.length) { flash("Enter quantities to receive"); return; }
    for (const l of cur.lines) {
      const q = Number(recvQty[l.sku] || 0);
      const maxAllow = Math.ceil(l.ordered * (1 + RECEIVE_TOLERANCE)) - l.received;
      if (q > maxAllow) { flash(`${l.name}: over-receipt beyond ±${RECEIVE_TOLERANCE * 100}% tolerance`); return; }
    }
    addReceipt({ id: rid("GRN-"), poId: cur.id, received: Date.now(), lines: glines, by: "M. Bell" });
    const newLines = cur.lines.map((l) => { const q = Number(recvQty[l.sku] || 0); return q > 0 ? { ...l, received: l.received + q } : l; });
    glines.forEach((g) => {
      const p = products.find((x) => sku(x) === g.sku);
      if (p) { updateProduct(p.id, { stock: p.stock + g.qty }); log({ sku: g.sku, name: cur.lines.find((l) => l.sku === g.sku)?.name || g.sku, type: "Receipt", qty: g.qty, ref: cur.id }); }
    });
    const full = newLines.every((l) => l.received >= l.ordered);
    update(cur.id, { lines: newLines, status: full ? "Received" : "Partially Received" });
    flash("Goods receipt posted to stock");
    setRecvQty({}); setMode("view");
  };

  const postInvoice = () => {
    if (!cur) return;
    const ilines = cur.lines
      .map((l) => ({ sku: l.sku, qty: Number(invQty[l.sku] ?? l.received), cost: Number(invCost[l.sku] ?? l.cost) }))
      .filter((x) => x.qty > 0);
    if (!ilines.length) { flash("Nothing to invoice yet — receive first"); return; }
    const total = ilines.reduce((s, l) => s + l.qty * l.cost, 0);
    addInvoice({ id: rid("INV-"), poId: cur.id, date: Date.now(), ref: rid("SI-"), lines: ilines, total });
    flash("Supplier invoice recorded");
    setMode("view");
  };

  return (
    <>
      <Head title="Purchase orders" sub={`Receive · invoice · three-way match — tolerance ±${RECEIVE_TOLERANCE * 100}%`} />
      {Object.keys(suggestions).length > 0 && (
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-h"><h3>Reorder suggestions</h3><span className="hint">SKUs at/below reorder point, grouped by supplier</span></div>
          <div className="minirows">
            {Object.entries(suggestions).map(([sid, items]) => (
              <div className="minirow" key={sid}>
                <div><div className="ref" style={{ fontFamily: "var(--font-body-f)", fontWeight: 600 }}>{supName(sid)}</div><div className="st2">{items.length} SKU{items.length > 1 ? "s" : ""} need reordering</div></div>
                <button className="btn btn-primary btn-sm" onClick={() => createDraft(sid, items)}>Create draft PO</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="orders">
        {pos.map((po) => {
          const total = poTotal(po);
          const recv = po.lines.reduce((s, l) => s + l.received, 0);
          const ord = po.lines.reduce((s, l) => s + l.ordered, 0);
          const match = threeWayMatch(po, receipts, invoices);
          return (
            <div className="ordercard clickrow" key={po.id} onClick={() => openPO(po.id)}>
              <div className="oc-head">
                <div>
                  <div className="oc-ref mono">{po.id} · {supName(po.supplierId)}</div>
                  <div className="oc-meta">{po.lines.length} lines · received {recv}/{ord} · created {timeAgo(po.created)}</div>
                </div>
                <div className="oc-right">
                  <span className="oc-total mono">{m(total)}</span>
                  <span className={`pobadge s-${po.status.replace(/\s+/g, "").toLowerCase()}`}>{po.status}</span>
                  <span className={`matchbadge ${matchClass(match.status)}`}>{match.status}</span>
                </div>
              </div>
              <div className="oc-lines">
                {po.lines.map((l) => <span key={l.sku} className="oc-line"><b className="mono">{l.received}/{l.ordered}</b> {l.name}</span>)}
              </div>
            </div>
          );
        })}
      </div>

      {cur && (() => {
        const match = threeWayMatch(cur, receipts, invoices);
        const idx = PO_FLOW.indexOf(cur.status);
        const poGrns = receipts.filter((g) => g.poId === cur.id);
        const recBySku: Record<string, number> = {};
        poGrns.forEach((g) => g.lines.forEach((l) => { recBySku[l.sku] = (recBySku[l.sku] || 0) + l.qty; }));
        const invBySku: Record<string, number> = {};
        invoices.filter((i) => i.poId === cur.id).forEach((i) => i.lines.forEach((l) => { invBySku[l.sku] = (invBySku[l.sku] || 0) + l.qty; }));
        return (
          <div className="modal-overlay" onClick={() => setOpenId(null)}>
            <div className="modal wide" onClick={(e) => e.stopPropagation()}>
              <div className="receipt-head">
                <div><div className="rstore">{cur.id} · {supName(cur.supplierId)}</div><div className="rref">created {new Date(cur.created).toLocaleDateString()} · expected {new Date(cur.expected).toLocaleDateString()}</div></div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className={`pobadge s-${cur.status.replace(/\s+/g, "").toLowerCase()}`}>{cur.status}</span>
                  <span className={`matchbadge ${matchClass(match.status)}`}>{match.status}</span>
                </div>
              </div>

              {/* three-way match summary */}
              <div className="match3">
                <div className="m3"><span>Ordered</span><b>{match.ordered} cs · {m(match.poTotal)}</b></div>
                <div className="m3"><span>Received</span><b>{match.received} cs</b></div>
                <div className="m3"><span>Invoiced</span><b>{match.invoicedQty} cs · {m(match.invTotal)}</b></div>
              </div>
              {match.variances.length > 0 && (
                <div className="valbox" style={{ marginBottom: 14 }}>
                  {match.variances.map((v) => <div key={v.sku}>• {v.name}: received {v.received} vs invoiced {v.invoiced}</div>)}
                </div>
              )}

              {/* lines / receive / invoice modes */}
              <div className="tablewrap" style={{ marginBottom: 16 }}>
                <table className="invtable">
                  <thead><tr><th>Line</th><th className="r">Ordered</th><th className="r">Received</th><th className="r">Invoiced</th>
                    {mode === "receive" && <th className="r">Receive now</th>}
                    {mode === "invoice" && <th className="r">Inv qty</th>}
                    {mode === "invoice" && <th className="r">Unit cost</th>}
                  </tr></thead>
                  <tbody>
                    {cur.lines.map((l) => {
                      const remaining = l.ordered - l.received;
                      return (
                        <tr key={l.sku}>
                          <td><div className="pn" style={{ fontSize: 13.5 }}>{l.name}</div><div className="mono muted" style={{ fontSize: 11 }}>{l.sku}</div></td>
                          <td className="r mono">{l.ordered}</td>
                          <td className="r mono">{recBySku[l.sku] ?? l.received}</td>
                          <td className="r mono">{invBySku[l.sku] ?? 0}</td>
                          {mode === "receive" && <td className="r"><input className="cellinput" type="number" min={0} placeholder={String(remaining)} value={recvQty[l.sku] ?? ""} onChange={(e) => setRecvQty({ ...recvQty, [l.sku]: e.target.value })} disabled={remaining <= 0} /></td>}
                          {mode === "invoice" && <td className="r"><input className="cellinput" type="number" min={0} value={invQty[l.sku] ?? String(l.received)} onChange={(e) => setInvQty({ ...invQty, [l.sku]: e.target.value })} /></td>}
                          {mode === "invoice" && <td className="r"><input className="cellinput" type="number" step="0.01" value={invCost[l.sku] ?? String(l.cost)} onChange={(e) => setInvCost({ ...invCost, [l.sku]: e.target.value })} /></td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {poGrns.length > 0 && mode === "view" && (
                <div className="grnlist">
                  {poGrns.map((g) => <span key={g.id} className="grnchip">{g.id} · {g.lines.reduce((s, l) => s + l.qty, 0)} cs · {timeAgo(g.received)} · {g.by}</span>)}
                </div>
              )}

              <div className="modalactions" style={{ marginTop: 18 }}>
                {mode === "view" ? (
                  <>
                    {(cur.status === "Draft" || cur.status === "Approved") && (
                      <button className="btn btn-ghost" onClick={() => { advance(cur.id); flash(`${cur.id} → ${PO_FLOW[idx + 1]}`); }}>
                        {cur.status === "Draft" ? "Approve" : "Mark sent"}
                      </button>
                    )}
                    {(cur.status === "Sent" || cur.status === "Partially Received" || cur.status === "Approved") && (
                      <button className="btn btn-primary" onClick={() => setMode("receive")}>Receive goods</button>
                    )}
                    <button className="btn btn-ink" onClick={() => setMode("invoice")}>Record invoice</button>
                  </>
                ) : mode === "receive" ? (
                  <>
                    <button className="btn btn-ghost" onClick={() => setMode("view")}>Cancel</button>
                    <button className="btn btn-primary" onClick={postReceipt}>Post goods receipt</button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-ghost" onClick={() => setMode("view")}>Cancel</button>
                    <button className="btn btn-primary" onClick={postInvoice}>Save invoice</button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

/* =======================================================================
   INVENTORY LEDGER
   ======================================================================= */
function InventoryTab({ flash }: { flash: Flash }) {
  const { movements, log } = useMovements();
  const { products, updateProduct } = useInventory();
  const [pid, setPid] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("cycle count");

  const adjust = (e: React.FormEvent) => {
    e.preventDefault();
    const p = products.find((x) => String(x.id) === pid);
    const q = Number(qty);
    if (!p || !q) return;
    updateProduct(p.id, { stock: Math.max(0, p.stock + q) });
    log({ sku: sku(p), name: p.name, type: "Adjust", qty: q, ref: reason });
    setQty(""); flash("Stock adjusted &amp; logged");
  };

  return (
    <>
      <Head title="Stock ledger" sub="Every receipt, pick, adjustment and transfer — the source of truth" />
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-h"><h3>Manual adjustment</h3></div>
        <form style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }} onSubmit={adjust}>
          <label className="field" style={{ flex: "2 1 240px" }}><span>Product</span>
            <select value={pid} onChange={(e) => setPid(e.target.value)} required>
              <option value="">Select…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.stock} cs)</option>)}
            </select>
          </label>
          <label className="field" style={{ flex: "0 1 130px" }}><span>Qty (±)</span><input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="-3" required /></label>
          <label className="field" style={{ flex: "1 1 160px" }}><span>Reason</span><input value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          <button className="btn btn-primary btn-sm" type="submit" style={{ height: 46 }}>Post adjustment</button>
        </form>
      </div>
      <div className="tablewrap">
        <table className="invtable">
          <thead><tr><th>Time</th><th>Type</th><th>SKU / Product</th><th>Location</th><th>Ref</th><th className="r">Qty</th></tr></thead>
          <tbody>
            {movements.map((mv) => (
              <tr key={mv.id}>
                <td className="muted" style={{ fontSize: 13 }}>{timeAgo(mv.ts)}</td>
                <td><span className={`movebadge ${mv.type.toLowerCase()}`}>{mv.type}</span></td>
                <td><div className="pn" style={{ fontSize: 13.5 }}>{mv.name}</div><div className="mono muted" style={{ fontSize: 11 }}>{mv.sku}</div></td>
                <td className="mono muted">{mv.loc || "—"}</td>
                <td className="mono muted">{mv.ref}</td>
                <td className="r mono" style={{ color: mv.qty < 0 ? "var(--red)" : "var(--green)", fontWeight: 600 }}>{mv.qty > 0 ? "+" : ""}{mv.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* =======================================================================
   ORDERS
   ======================================================================= */
const O_STATUSES: OrderStatus[] = ["Submitted", "Picking", "Out for delivery", "Delivered"];
const PAY_STATUSES: PayStatus[] = ["Unpaid", "Partial", "Paid", "Refunded"];
function ov(o: Order) {
  const deliveryFee = o.deliveryFee ?? 0, tax = o.tax ?? 0, discount = o.discount ?? 0;
  return {
    deliveryFee, tax, discount, grand: orderGrand(o),
    tracking: o.tracking ?? "1Z" + o.ref.replace(/\D/g, "") + "OH",
    paymentStatus: o.paymentStatus ?? (o.payment?.includes("Net") ? "Unpaid" : "Paid") as PayStatus,
    shipping: o.shipping ?? `${o.store}, Cincinnati, OH`,
    billing: o.billing ?? o.shipping ?? `${o.store}, Cincinnati, OH`,
  };
}

function OrdersTab({ flash }: { flash: Flash }) {
  const { orders, setStatus, patchOrder, removeOrder } = useOrders();
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [openRef, setOpenRef] = useState<string | null>(null);
  const confirm = useConfirm();

  const cur = orders.find((o) => o.ref === openRef) || null;
  const rows = orders.filter((o) =>
    (filter === "all" || o.status === filter) &&
    (query.trim() === "" || o.ref.toLowerCase().includes(query.toLowerCase()) || o.store.toLowerCase().includes(query.toLowerCase()))
  );
  const rev = orders.reduce((s, o) => s + o.total, 0);

  /* ---------- full-page order detail ---------- */
  if (cur) {
    const v = ov(cur);
    return (
      <>
        <button className="detail-back" onClick={() => setOpenRef(null)}>← All orders</button>
        <header className="adminbar">
          <div><h1>{cur.ref}</h1><p>{cur.store} · placed {new Date(cur.placed).toLocaleString()}</p></div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>Print receipt</button>
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={async () => { if (await confirm({ title: "Delete order?", message: `Order ${cur.ref} will be permanently removed.`, confirmLabel: "Delete order", danger: true })) { removeOrder(cur.ref); setOpenRef(null); flash("Order deleted"); } }}>Delete</button>
          </div>
        </header>

        <div className="detail-grid">
          <div className="detail-main">
            <div className="panel">
              <div className="panel-h"><h3>Products ordered</h3><span className="hint">{cur.cases} cases · {cur.lines.length} items</span></div>
              <table className="invtable flat">
                <thead><tr><th>Product</th><th>Code</th><th className="r">Qty</th><th className="r">Unit price</th><th className="r">Line total</th></tr></thead>
                <tbody>
                  {cur.lines.map((l) => (
                    <tr key={l.id}>
                      <td className="pn" style={{ fontSize: 13.5 }}>{l.name}</td>
                      <td className="mono muted">SW-{l.id}</td>
                      <td className="r mono">{l.qty}</td>
                      <td className="r mono">{m(l.price)}</td>
                      <td className="r mono">{m(l.qty * l.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="totals">
                <div className="tl"><span>Subtotal</span><span className="mono">{m(cur.total)}</span></div>
                <div className="tl"><span>Discount</span><span className="mono">−{m(v.discount)}</span></div>
                <div className="tl"><span>Tax (resale exempt)</span><span className="mono">{m(v.tax)}</span></div>
                <div className="tl"><span>Delivery fee</span><span className="mono" style={{ color: v.deliveryFee ? "inherit" : "var(--green)" }}>{v.deliveryFee ? m(v.deliveryFee) : "Free"}</span></div>
                <div className="tl grand"><span>Order total</span><b>{m(v.grand)}</b></div>
              </div>
            </div>
          </div>

          <aside className="detail-side">
            <div className="panel">
              <div className="panel-h"><h3>Fulfillment</h3></div>
              <div className="kvs">
                <div className="kv2"><span>Order ID</span><b className="mono">{cur.ref}</b></div>
                <div className="kv2"><span>Tracking</span><b className="mono">{v.tracking}</b></div>
                <div className="kv2"><span>Method</span><b>{cur.fulfilment || "Next-day delivery"}</b></div>
                <div className="kv2"><span>Order status</span>
                  <select className={`statussel s-${cur.status.replace(/\s+/g, "").toLowerCase()}`} value={cur.status} onChange={(e) => { setStatus(cur.ref, e.target.value as OrderStatus); flash("Status updated"); }}>
                    {O_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="panel-h"><h3>Payment</h3></div>
              <div className="kvs">
                <div className="kv2"><span>Terms</span><b>{cur.payment || "Net 15 terms"}</b></div>
                <div className="kv2"><span>Payment status</span>
                  <select className={`paysel p-${v.paymentStatus.toLowerCase()}`} value={v.paymentStatus} onChange={(e) => { patchOrder(cur.ref, { paymentStatus: e.target.value as PayStatus }); flash("Payment updated"); }}>
                    {PAY_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="panel-h"><h3>Addresses</h3></div>
              <div className="addrbox"><div className="al">Billing</div><p>{cur.store}<br />{v.billing}</p></div>
              <div className="addrbox"><div className="al">Shipping</div><p>{cur.store}<br />{v.shipping}</p></div>
              {cur.notes && <div className="addrbox"><div className="al">Notes</div><p>{cur.notes}</p></div>}
            </div>
          </aside>
        </div>
      </>
    );
  }

  /* ---------- list ---------- */
  return (
    <>
      <Head title="Orders" sub="Orders from the trade portal — open any order for the full receipt" />
      <div className="kpis">
        <div className="kpi accent"><div className="kl">All-time sales</div><div className="kv">{k(rev)}</div><div className="kf">{orders.length} orders</div></div>
        <div className="kpi"><div className="kl">Open</div><div className="kv">{orders.filter((o) => o.status !== "Delivered").length}</div><div className="kf">in fulfillment</div></div>
        <div className="kpi"><div className="kl">Avg order</div><div className="kv">{k(orders.length ? rev / orders.length : 0)}</div><div className="kf">per order</div></div>
        <div className="kpi"><div className="kl">Cases shipped</div><div className="kv">{orders.reduce((s, o) => s + o.cases, 0)}</div><div className="kf">all time</div></div>
      </div>

      <div className="adminctl">
        <div className="search small">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" /></svg>
          <input placeholder="Search order # or store…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="fchips">
          <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>All</button>
          {O_STATUSES.map((s) => <button key={s} className={filter === s ? "on" : ""} onClick={() => setFilter(s)}>{s}</button>)}
        </div>
      </div>

      <div className="tablewrap">
        <table className="invtable">
          <thead><tr><th>Order</th><th>Store</th><th>Placed</th><th className="r">Cases</th><th className="r">Total</th><th>Payment</th><th>Status</th><th className="r"></th></tr></thead>
          <tbody>
            {rows.map((o) => {
              const v = ov(o);
              return (
                <tr key={o.ref} className="clickrow" onClick={() => setOpenRef(o.ref)}>
                  <td className="mono" style={{ fontWeight: 600 }}>{o.ref}</td>
                  <td>{o.store}</td>
                  <td className="muted" style={{ fontSize: 13 }}>{timeAgo(o.placed)}</td>
                  <td className="r mono">{o.cases}</td>
                  <td className="r mono">{m(v.grand)}</td>
                  <td><span className={`paypill p-${v.paymentStatus.toLowerCase()}`}>{v.paymentStatus}</span></td>
                  <td><span className={`pobadge s-${o.status.replace(/\s+/g, "").toLowerCase()}`}>{o.status}</span></td>
                  <td className="r"><button className="ia" onClick={(e) => { e.stopPropagation(); setOpenRef(o.ref); }}>Open</button></td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={8} className="tableempty">No orders match.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* =======================================================================
   CUSTOMERS / ACCOUNTS  (approval)
   ======================================================================= */
function CustomersTab({ flash }: { flash: Flash }) {
  const { customers, setStatus, update, remove } = useCustomers(CUSTOMERS);
  const { orders } = useOrders();
  const [filter, setFilter] = useState<"all" | "Pending" | "Active" | "Hold">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const confirm = useConfirm();

  const stats = customers.map((c) => {
    const theirs = orders.filter((o) => o.store === c.store);
    return { ...c, orders: theirs.length, spend: theirs.reduce((s, o) => s + o.total, 0), history: theirs };
  });
  const pending = stats.filter((c) => c.status === "Pending");
  const rows = stats.filter((c) => filter === "all" || c.status === filter);
  const cur = stats.find((s) => s.id === openId) || null;

  const startEdit = () => { if (cur) { setDraft({ store: cur.store, contact: cur.contact, email: cur.email, phone: cur.phone || "", address: cur.address || "", terms: cur.terms || "Net 15" }); setEdit(true); } };
  const saveEdit = () => { if (cur) { update(cur.id, draft); setEdit(false); flash("Account updated"); } };

  /* ---------- full-page account detail ---------- */
  if (cur) {
    return (
      <>
        <button className="detail-back" onClick={() => { setOpenId(null); setEdit(false); }}>← All accounts</button>
        <header className="adminbar">
          <div><h1>{cur.store}</h1><p>{cur.id} · {cur.contact} · account since {cur.since}</p></div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className={`ustatus ${cur.status.toLowerCase()}`}>{cur.status}</span>
            {!edit && <button className="btn btn-ghost btn-sm" onClick={startEdit}>Edit</button>}
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={async () => { if (await confirm({ title: "Delete account?", message: `${cur.store} and its access will be removed.`, confirmLabel: "Delete account", danger: true })) { remove(cur.id); setOpenId(null); flash("Account deleted"); } }}>Delete</button>
          </div>
        </header>

        <div className="detail-grid">
          <div className="detail-main">
            <div className="panel">
              <div className="panel-h"><h3>Store details</h3>{edit && <span className="hint">editing</span>}</div>
              {edit ? (
                <div className="formgrid" style={{ margin: 0 }}>
                  <label className="field full"><span>Store name</span><input value={draft.store} onChange={(e) => setDraft({ ...draft, store: e.target.value })} /></label>
                  <label className="field"><span>Contact</span><input value={draft.contact} onChange={(e) => setDraft({ ...draft, contact: e.target.value })} /></label>
                  <label className="field"><span>Email</span><input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></label>
                  <label className="field"><span>Phone</span><input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></label>
                  <label className="field"><span>Payment terms</span><input value={draft.terms} onChange={(e) => setDraft({ ...draft, terms: e.target.value })} /></label>
                  <label className="field full"><span>Address</span><input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></label>
                  <div className="full modalactions"><button className="btn btn-ghost" onClick={() => setEdit(false)}>Cancel</button><button className="btn btn-primary" onClick={saveEdit}>Save changes</button></div>
                </div>
              ) : (
                <div className="kvs two">
                  <div className="kv2"><span>Primary contact</span><b>{cur.contact}</b></div>
                  <div className="kv2"><span>Email</span><b>{cur.email}</b></div>
                  <div className="kv2"><span>Phone</span><b>{cur.phone || "—"}</b></div>
                  <div className="kv2"><span>Payment terms</span><b>{cur.terms || "Net 15"}</b></div>
                  <div className="kv2 full"><span>Address</span><b>{cur.address || cur.city}</b></div>
                </div>
              )}
            </div>

            <div className="panel">
              <div className="panel-h"><h3>Order history</h3><span className="hint">{cur.orders} orders · {m(cur.spend)}</span></div>
              {cur.history.length ? (
                <table className="invtable flat">
                  <thead><tr><th>Order</th><th>Date</th><th className="r">Cases</th><th className="r">Total</th><th>Status</th></tr></thead>
                  <tbody>
                    {cur.history.map((o) => (
                      <tr key={o.ref}><td className="mono" style={{ fontWeight: 600 }}>{o.ref}</td><td className="muted" style={{ fontSize: 13 }}>{timeAgo(o.placed)}</td><td className="r mono">{o.cases}</td><td className="r mono">{m(o.total)}</td><td><span className={`pobadge s-${o.status.replace(/\s+/g, "").toLowerCase()}`}>{o.status}</span></td></tr>
                    ))}
                  </tbody>
                </table>
              ) : <p style={{ color: "var(--slate)", fontSize: 14 }}>No orders on record yet.</p>}
            </div>
          </div>

          <aside className="detail-side">
            <div className="panel">
              <div className="panel-h"><h3>Approval</h3></div>
              <div className="modalactions" style={{ flexDirection: "column" }}>
                {cur.status !== "Active" && <button className="btn btn-primary" onClick={() => { setStatus(cur.id, "Active"); flash("Account approved"); }}>Approve account</button>}
                {cur.status !== "Hold" && <button className="btn btn-ghost" onClick={() => { setStatus(cur.id, "Hold"); flash("Account on hold"); }}>Place on hold</button>}
                {cur.status !== "Pending" && <button className="btn btn-ghost" onClick={() => { setStatus(cur.id, "Pending"); flash("Marked pending"); }}>Mark pending</button>}
              </div>
            </div>
            <div className="panel">
              <div className="panel-h"><h3>Verification documents</h3></div>
              <div className="doclist">
                <div className="docchip"><span className="di">✓</span><div><div className="dn">Business license</div><div className="ds mono">{cur.businessLicense || "—"}</div></div></div>
                <div className="docchip"><span className="di">✓</span><div><div className="dn">Tobacco license</div><div className="ds mono">{cur.tobaccoLicense || "—"}</div></div></div>
                <div className="docchip"><span className="di">✓</span><div><div className="dn">Age verification</div><div className="ds">21+ confirmed</div></div></div>
                <div className="docchip"><span className="di">✓</span><div><div className="dn">Resale / tax ID</div><div className="ds">On file</div></div></div>
              </div>
            </div>
          </aside>
        </div>
      </>
    );
  }

  /* ---------- list ---------- */
  return (
    <>
      <Head title="Trade accounts" sub="Open an account for full store details, documents and order history" />
      <div className="kpis">
        <div className="kpi"><div className="kl">Total accounts</div><div className="kv">{customers.length}</div><div className="kf">on file</div></div>
        <div className="kpi"><div className="kl">Active</div><div className="kv">{stats.filter((c) => c.status === "Active").length}</div><div className="kf">cleared to order</div></div>
        <div className="kpi danger"><div className="kl">Pending approval</div><div className="kv">{pending.length}</div><div className="kf">submitted from the site</div></div>
        <div className="kpi"><div className="kl">Lifetime sales</div><div className="kv">{k(stats.reduce((s, c) => s + c.spend, 0))}</div><div className="kf">across accounts</div></div>
      </div>
      <div className="adminctl">
        <div className="fchips">
          {(["all", "Pending", "Active", "Hold"] as const).map((f) => (
            <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>{f === "all" ? "All" : f}</button>
          ))}
        </div>
      </div>
      <div className="tablewrap">
        <table className="invtable">
          <thead><tr><th>Store</th><th>Contact</th><th>Location</th><th className="r">Orders</th><th className="r">Spend</th><th className="r">Status</th><th className="r">Action</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className={`clickrow ${c.status === "Pending" ? "rowflag" : ""}`} onClick={() => setOpenId(c.id)}>
                <td><div className="prodcell"><span className="avatar">{c.store.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</span><div><div className="pn">{c.store}</div><div className="mono muted" style={{ fontSize: 11 }}>{c.id} · {c.email}</div></div></div></td>
                <td style={{ fontSize: 13 }}>{c.contact}</td>
                <td style={{ fontSize: 13 }}>{c.city}</td>
                <td className="r mono">{c.orders}</td>
                <td className="r mono">{m(c.spend)}</td>
                <td className="r"><span className={`ustatus ${c.status.toLowerCase()}`}>{c.status}</span></td>
                <td className="r" onClick={(e) => e.stopPropagation()}><div className="rowactions">
                  <button className="ia" onClick={() => setOpenId(c.id)}>Open</button>
                  {c.status !== "Active" && <button className="ia save" onClick={() => { setStatus(c.id, "Active"); flash("Account approved"); }}>Approve</button>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* =======================================================================
   USERS & ROLES
   ======================================================================= */
const EMPTY_STAFF = { name: "", email: "", role: "Viewer" as Role, device: "" };
function UsersTab({ flash }: { flash: Flash }) {
  const { staff, add, update } = useStaff();
  const [adding, setAdding] = useState(false);
  const [d, setD] = useState(EMPTY_STAFF);
  return (
    <>
      <Head title="Users & roles" sub="Staff access and scanner-device assignment">
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Add user</button>
      </Head>
      <div className="tablewrap">
        <table className="invtable">
          <thead><tr><th>User</th><th>Role</th><th>Scanner</th><th className="r">Status</th><th className="r"></th></tr></thead>
          <tbody>
            {staff.map((u) => (
              <tr key={u.id}>
                <td><div className="prodcell"><span className="avatar">{u.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span><div><div className="pn">{u.name}</div><div className="mono muted" style={{ fontSize: 11 }}>{u.email}</div></div></div></td>
                <td><select className="rolesel" value={u.role} onChange={(e) => { update(u.id, { role: e.target.value as Role }); flash("Role updated"); }}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></td>
                <td className="mono muted">{u.device || "—"}</td>
                <td className="r"><span className={`ustatus ${u.status === "Active" ? "active" : "hold"}`}>{u.status}</span></td>
                <td className="r"><button className="ia" onClick={() => { update(u.id, { status: u.status === "Active" ? "Suspended" : "Active" }); flash("Updated"); }}>{u.status === "Active" ? "Suspend" : "Restore"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {adding && (
        <div className="modal-overlay" onClick={() => setAdding(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); if (!d.name.trim()) return; add({ id: "U-" + Math.floor(10 + Math.random() * 89), name: d.name.trim(), email: d.email, role: d.role, device: d.device || null, status: "Active" }); setD(EMPTY_STAFF); setAdding(false); flash("User added"); }}>
            <h3>Add a user</h3>
            <div className="formgrid">
              <label className="field full"><span>Full name *</span><input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} required /></label>
              <label className="field"><span>Email</span><input value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} /></label>
              <label className="field"><span>Role</span><select value={d.role} onChange={(e) => setD({ ...d, role: e.target.value as Role })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></label>
              <label className="field"><span>Scanner device</span><input value={d.device} onChange={(e) => setD({ ...d, device: e.target.value })} placeholder="SCN-120" /></label>
            </div>
            <div className="modalbtns"><button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button><button className="btn btn-primary" type="submit">Add user</button></div>
          </form>
        </div>
      )}
    </>
  );
}

/* =======================================================================
   WAREHOUSE
   ======================================================================= */
function WarehouseTab() {
  const { locations } = useLocations();
  const totalCap = locations.reduce((s, l) => s + l.capacity, 0);
  const totalUsed = locations.reduce((s, l) => s + l.used, 0);
  return (
    <>
      <Head title="Warehouse" sub="Zones → aisles → racks → bins, with live capacity" />
      <div className="kpis">
        <div className="kpi"><div className="kl">Bins</div><div className="kv">{locations.length}</div><div className="kf">across {new Set(locations.map((l) => l.zone)).size} zones</div></div>
        <div className="kpi"><div className="kl">Total capacity</div><div className="kv">{totalCap.toLocaleString()}</div><div className="kf">cases</div></div>
        <div className="kpi accent"><div className="kl">Utilization</div><div className="kv">{Math.round((totalUsed / totalCap) * 100)}%</div><div className="kf">{totalUsed.toLocaleString()} cases stored</div></div>
        <div className="kpi warn"><div className="kl">Near full</div><div className="kv">{locations.filter((l) => l.used / l.capacity >= 0.85).length}</div><div className="kf">bins ≥ 85%</div></div>
      </div>
      <div className="tablewrap">
        <table className="invtable">
          <thead><tr><th>Bin</th><th>Zone</th><th>Aisle</th><th>Rack</th><th>Utilization</th><th className="r">Used / Cap</th></tr></thead>
          <tbody>
            {locations.map((l) => {
              const pct = Math.round((l.used / l.capacity) * 100);
              return (
                <tr key={l.id}>
                  <td className="mono">{l.id}</td><td>{l.zone}</td><td>{l.aisle}</td><td>{l.rack}</td>
                  <td><div className="capbar"><span className={`capfill ${pct >= 85 ? "hot" : pct >= 60 ? "mid" : ""}`} style={{ width: `${pct}%` }} /></div></td>
                  <td className="r mono muted">{l.used} / {l.capacity}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* =======================================================================
   SETTINGS
   ======================================================================= */
function SettingsTab({ flash }: { flash: Flash }) {
  const { reset } = useInventory();
  const confirm = useConfirm();
  return (
    <>
      <Head title="Settings" sub="Company profile and warehouse policies" />
      <div className="dash">
        <div className="panel">
          <div className="panel-h"><h3>Company profile</h3></div>
          <div className="setrows">
            <div className="setrow"><span>Legal name</span><b>{CONTACT.legalName}</b></div>
            <div className="setrow"><span>Warehouse</span><b>{CONTACT.address1}, {CONTACT.address2}</b></div>
            <div className="setrow"><span>Phone</span><b>{CONTACT.phone}</b></div>
            <div className="setrow"><span>Email</span><b>{CONTACT.email}</b></div>
            <div className="setrow"><span>Hours</span><b>{CONTACT.hours}</b></div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-h"><h3>Warehouse policies</h3></div>
          <div className="setrows">
            <div className="setrow"><span>Default low-stock threshold</span><b>{LOW_STOCK} cases</b></div>
            <div className="setrow"><span>PO approval threshold</span><b>{m(PO_APPROVAL_THRESHOLD)}</b></div>
            <div className="setrow"><span>Receiving tolerance</span><b>±5% of PO</b></div>
            <div className="setrow"><span>Barcode standard</span><b>UPC-A / EAN-13</b></div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 18 }} onClick={async () => { if (await confirm({ title: "Reset demo catalog?", message: "All products revert to the seeded data. Orders and accounts are kept.", confirmLabel: "Reset", danger: true })) { reset(); flash("Catalog reset"); } }}>Reset demo catalog</button>
        </div>
      </div>
    </>
  );
}

/* =======================================================================
   POS SYNC — coming soon
   ======================================================================= */
function ComingSoon() {
  return (
    <>
      <Head title="POS sync" sub="Point-of-sale integration" />
      <div className="comingsoon">
        <div className="cs-badge mono">COMING SOON</div>
        <h2>Two-way POS integration</h2>
        <p>Catalog push, real-time stock sync, sales pull and nightly reconciliation against register data. Planned for a later phase, after the inventory and purchasing foundation is in production.</p>
        <div className="cs-steps">
          <span>Catalog push</span><span>Stock sync</span><span>Sales pull</span><span>Nightly reconciliation</span>
        </div>
      </div>
    </>
  );
}
