"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { useConfirm } from "@/components/Confirm";
import { Head, m, k, timeAgo, stockClass, fmtDate, type Tab, type Flash } from "./shared";
import { Button, Badge, DataTable, type Column, type BadgeTone } from "@/components/ui";

/** Stock level → Badge tone. */
const stockTone = (n: number): BadgeTone => (n <= 0 ? "danger" : n <= LOW_STOCK ? "warning" : "success");

const EMPTY_PRODUCT = {
  name: "", category: "tobacco" as DeptKey, gtin: "", uom: "case", caseQty: "",
  cost: "", price: "", mrp: "", description: "", reorderPoint: "", maxStock: "", supplierId: "", stock: "",
};

export function ProductsTab({ flash, go }: { flash: Flash; go: (t: Tab) => void }) {
  const router = useRouter();
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
          <Button variant="ghost" size="sm" onClick={() => go("import")}>Bulk import</Button>
          <Button variant="primary" size="sm" onClick={() => setAdding(true)}>+ Onboard product</Button>
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

      <DataTable
        columns={[
          { key: "name", header: "Item name", render: (p) => <div className="prodcell"><span className="th" style={{ background: DEPT_BG[p.dep] }}>{p.emoji}</span><div><div className="pn">{p.name}</div><div className="mono muted" style={{ fontSize: 11 }}>{p.gtin || "no barcode"}</div></div></div> },
          { key: "code", header: "Code", render: (p) => <span className="mono muted">{sku(p)}</span> },
          { key: "desc", header: "Description", render: (p) => <span className="muted" style={{ fontSize: 12.5 }}>{p.description || "—"}</span> },
          { key: "cat", header: "Category", render: (p) => <span className="deptpill">{deptName(p.dep)}</span> },
          { key: "mrp", header: "MRP", align: "right", render: (p) => <span className="mono">{p.mrp ? m(p.mrp) : "—"}</span> },
          { key: "cost", header: "Unit cost", align: "right", render: (p) => <span className="mono">{p.cost ? m(p.cost) : "—"}</span> },
          { key: "price", header: "Unit price", align: "right", render: (p) => <span className="mono" style={{ fontWeight: 600 }}>{m(p.price)}</span> },
          { key: "stock", header: "Stock", align: "right", render: (p) => <Badge tone={stockTone(p.stock)}>{p.stock}</Badge> },
          { key: "created", header: "Created", render: (p) => <span className="muted" style={{ fontSize: 12.5 }}>{fmtDate(p.created)}</span> },
          { key: "actions", header: "Actions", align: "right", render: (p) => (
            <div className="rowactions">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(p); }}>Edit</Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); updateProduct(p.id, { stock: p.stock + 12 }); flash("+12 cases"); }}>+12</Button>
              <Button variant="ghost" size="sm" style={{ color: "var(--red)" }} onClick={async (e) => { e.stopPropagation(); if (await confirm({ title: "Remove product?", message: `${p.name} will be removed from the catalog.`, confirmLabel: "Remove", danger: true })) { removeProduct(p.id); flash("Removed"); } }}>✕</Button>
            </div>
          ) },
        ] satisfies Column<Product>[]}
        rows={rows}
        rowKey={(p) => String(p.id)}
        rowClassName={(p) => (p.stock <= 0 ? "rowdim" : undefined)}
        onRowClick={(p) => router.push(`/admin/products/${p.id}`)}
        empty="No products match."
      />

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
export function ImportTab({ flash }: { flash: Flash }) {
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
export function CategoriesTab({ flash }: { flash: Flash }) {
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
        <Button variant="primary" size="sm" onClick={openCreate}>+ New category</Button>
      </Head>
      <DataTable
        columns={[
          { key: "id", header: "ID", render: (c) => <span className="mono muted">{c.id}</span> },
          { key: "name", header: "Item name", render: (c) => <span className="prodcell"><span className="th" style={{ background: DEPT_BG[c.key as DeptKey] || "#eee" }}>{c.icon}</span><span className="pn">{c.name}</span></span> },
          { key: "details", header: "Details", render: (c) => <span className="muted" style={{ fontSize: 13 }}>{c.details}</span> },
          { key: "image", header: "Image", render: (c) => c.image ? <span className="catimg" style={{ backgroundImage: `url(${c.image})` }} /> : <span className="muted">—</span> },
          { key: "icon", header: "Icon", render: (c) => <span style={{ fontSize: 18 }}>{c.icon}</span> },
          { key: "slug", header: "Slug", render: (c) => <span className="mono muted">{c.key}</span> },
          { key: "group", header: "Group", render: (c) => <span className="deptpill">{c.group}</span> },
          { key: "created", header: "Created", render: (c) => <span className="muted" style={{ fontSize: 13 }}>{fmtDate(c.created)}</span> },
          { key: "actions", header: "Actions", align: "right", render: (c) => (
            <div className="rowactions">
              <Button variant="ghost" size="sm" onClick={() => openEdit(c.key)}>Edit</Button>
              <Button variant="ghost" size="sm" onClick={() => { update(c.key, { active: !c.active }); flash("Updated"); }}>{c.active ? "Hide" : "Show"}</Button>
              <Button variant="ghost" size="sm" style={{ color: "var(--red)" }} onClick={async () => { if (count(c.key) > 0) { flash("Category has products — reassign first"); return; } if (await confirm({ title: "Delete category?", message: `${c.name} will be removed.`, confirmLabel: "Delete", danger: true })) { remove(c.key); flash("Deleted"); } }}>✕</Button>
            </div>
          ) },
        ] satisfies Column<(typeof categories)[number]>[]}
        rows={categories}
        rowKey={(c) => c.key}
        empty="No categories."
      />

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
export function SuppliersTab({ flash }: { flash: Flash }) {
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
export function PromotionsTab({ flash }: { flash: Flash }) {
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
