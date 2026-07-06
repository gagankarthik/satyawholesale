"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEPTS, DEPT_BG, deptName, fmt, sku, productImg, useInventory, useOrders, LOW_STOCK,
  CONTACT, orderGrand,
  type DeptKey, type Product, type Tag, type Order, type OrderStatus, type PayStatus,
} from "@/lib/store";
import {
  useSuppliers, useCategories, useLocations, useStaff, useCustomers,
  usePurchaseOrders, useMovements, useReceipts, useInvoices, usePromotions,
  poTotal, PO_FLOW, PO_APPROVAL_THRESHOLD, RECEIVE_TOLERANCE, threeWayMatch,
  ROLES, SUPPLIER_TERMS, csvTemplate, parseCsv, validateRows, rowToProduct,
  type ImportRow, type PurchaseOrder, type Role,
} from "@/lib/wms";
import { Grid, Receipt, Boxes, Users, Truck, Store, Shield, Pin, Refresh, Search, Close, Inbox, Tag as TagIcon, Plus } from "@/components/Icons";
import Image from "next/image";
import Link from "next/link";
import { useConfirm } from "@/components/Confirm";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { Head, FlowGuide, PRODUCT_FLOW, tableEmpty, m, k, timeAgo, stockClass, fmtDate, type Tab, type Flash } from "./shared";
import { Button, Badge, Breadcrumb, DataTable, EmptyState, Fab, ListToolbar, Menu, ImageUpload, Skeleton, Switch, type Column, type BadgeTone, type ToolbarOption } from "@/components/ui";

/** Stock level → Badge tone. */
const stockTone = (n: number): BadgeTone => (n <= 0 ? "danger" : n <= LOW_STOCK ? "warning" : "success");

const EMPTY_PRODUCT = {
  name: "", category: "tobacco" as DeptKey, gtin: "", uom: "case", caseQty: "",
  cost: "", price: "", mrp: "", description: "", reorderPoint: "", maxStock: "", supplierId: "", stock: "", image: "",
  onArrivals: true, onOffers: false, offerPrice: "",
};

/** Full-page onboard / edit product (with camera barcode scanning). */
export function ProductForm({ productId, flash }: { productId?: string; flash: Flash }) {
  const router = useRouter();
  const { products, addProduct, updateProduct, removeProduct } = useInventory();
  const { suppliers } = useSuppliers();
  const { categories } = useCategories();
  const confirm = useConfirm();
  const existing = productId ? products.find((p) => String(p.id) === productId) : undefined;
  const editing = !!existing;
  const [draft, setDraft] = useState(existing ? {
    name: existing.name, category: existing.dep, gtin: existing.gtin || "", uom: existing.uom || "case",
    caseQty: String(existing.caseQty || ""), cost: existing.cost ? String(existing.cost) : "", price: String(existing.price),
    mrp: existing.mrp ? String(existing.mrp) : "", description: existing.description || "",
    reorderPoint: existing.reorderPoint ? String(existing.reorderPoint) : "", maxStock: existing.maxStock ? String(existing.maxStock) : "",
    supplierId: existing.supplierId || "", stock: String(existing.stock), image: existing.image || "",
    onArrivals: existing.onArrivals ?? false, onOffers: existing.onOffers ?? false,
    offerPrice: existing.offerPrice ? String(existing.offerPrice) : "",
  } : EMPTY_PRODUCT);
  const [errs, setErrs] = useState<string[]>([]);
  const backHref = editing ? `/admin/products/${existing!.id}` : "/admin/products";

  if (productId && !existing) {
    return (
      <>
        <button className="detail-back" onClick={() => router.push("/admin/products")}>← All products</button>
        <div className="empty"><div className="ei" aria-hidden="true"><Search /></div><h3>Product not found</h3></div>
      </>
    );
  }

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
    if (draft.gtin && products.some((p) => p.gtin === draft.gtin && p.id !== existing?.id)) errors.push("That barcode already exists.");
    const rp = num(draft.reorderPoint), ms = num(draft.maxStock);
    if (!isNaN(rp) && !isNaN(ms) && rp > ms) errors.push("Reorder point can't exceed max stock.");
    const cost = num(draft.cost), price = num(draft.price);
    if (!isNaN(cost) && !isNaN(price) && price < cost) errors.push("Price is below cost.");
    const offer = num(draft.offerPrice);
    if (draft.onOffers) {
      if (isNaN(offer)) errors.push("Enter the offer price for products featured on Offers.");
      else if (offer <= 0) errors.push("Offer price must be greater than zero.");
      else if (!isNaN(price) && offer >= price) errors.push("Offer price must be below the regular price.");
    }
    if (errors.length) { setErrs(errors); return; }

    const common = {
      name: draft.name.trim(), dep: draft.category,
      price: Number(draft.price) || 0, pack: `${draft.caseQty || 1}ct`, unit: draft.uom || "case",
      gtin: draft.gtin || undefined, cost: Number(draft.cost) || undefined,
      mrp: Number(draft.mrp) || undefined, description: draft.description || undefined,
      uom: draft.uom, caseQty: Number(draft.caseQty) || undefined,
      reorderPoint: Number(draft.reorderPoint) || undefined, maxStock: Number(draft.maxStock) || undefined,
      supplierId: draft.supplierId || undefined, image: draft.image || undefined,
      onArrivals: draft.onArrivals, onOffers: draft.onOffers,
      offerPrice: draft.onOffers ? (Number(draft.offerPrice) || undefined) : undefined,
    };
    if (editing) {
      updateProduct(existing!.id, { ...common, stock: Number(draft.stock) || 0 });
      flash("Product updated");
      router.push(`/admin/products/${existing!.id}`);
    } else {
      const id = Math.floor(1000 + Math.random() * 8999);
      addProduct({ id, emoji: "📦", tag: "new" as Tag, stock: Number(draft.stock) || 0, sku: `SW-${id}`, active: true, created: Date.now(), ...common });
      flash("Product onboarded to catalog");
      router.push("/admin/products");
    }
  };

  return (
    <>
      <Breadcrumb items={editing
        ? [{ label: "Products", href: "/admin/products" }, { label: existing!.name, href: backHref }, { label: "Edit" }]
        : [{ label: "Products", href: "/admin/products" }, { label: "Onboard" }]} />
      <header className="adminbar">
        <div><h1>{editing ? existing!.name : "Onboard a product"}</h1><p>{editing ? sku(existing!) : "Add a SKU to the master catalog"}</p></div>
        {editing && (
          <Menu
            label={`More actions for ${existing!.name}`}
            items={[{ label: "Remove product", danger: true, onSelect: async () => { if (await confirm({ title: "Remove product?", message: `${existing!.name} will be removed from the catalog.`, confirmLabel: "Remove", danger: true })) { removeProduct(existing!.id); router.push("/admin/products"); flash(`${existing!.name} removed from catalog`); } } }]}
          />
        )}
      </header>
      <div className="setpane">
        <form className="panel anim-in" onSubmit={submit}>
          <div className="panel-h"><h3>{editing ? "Edit master data" : "Product details"}</h3><span className="hint">Validates against schema, integrity and business rules before it goes live.</span></div>
          {errs.length > 0 && <div className="valbox">{errs.map((er, i) => <div key={i}>• {er}</div>)}</div>}
          <div className="formgrid">
            <label className="field full"><span>Product name *</span><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Mr Fog Max Pro 1500" required /></label>
            <label className="field full"><span>Description</span><input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="e.g. 5% nicotine, 15-pack display, assorted flavors" /></label>
            <div className="field full">
              <ImageUpload value={draft.image} onChange={(v) => setDraft({ ...draft, image: v })} label="Product image" aspect="square" folder="products" onError={flash} hint="Optional. Shown in the portal and admin; a placeholder is used until you add one." />
            </div>
            <label className="field"><span>Category *</span><select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as DeptKey })}>{categories.filter((c) => c.active).map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}</select></label>
            <div className="field"><span>Barcode (UPC/EAN)</span>
              <div className="scanrow">
                <input value={draft.gtin} onChange={(e) => setDraft({ ...draft, gtin: e.target.value })} placeholder="Scan or type 12–13 digits" inputMode="numeric" aria-label="Barcode (UPC/EAN)" />
                <BarcodeScanner onDetect={(code) => setDraft((d) => ({ ...d, gtin: code }))} />
              </div>
            </div>
            <label className="field"><span>Supplier</span><select value={draft.supplierId} onChange={(e) => setDraft({ ...draft, supplierId: e.target.value })}><option value="">— none —</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            <label className="field"><span>Eaches / case</span><input type="number" value={draft.caseQty} onChange={(e) => setDraft({ ...draft, caseQty: e.target.value })} placeholder="10" /></label>
            <label className="field"><span>Unit cost ($)</span><input type="number" step="0.01" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: e.target.value })} placeholder="0.00" /></label>
            <label className="field"><span>Unit price ($) *</span><input type="number" step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="0.00" required /></label>
            <label className="field"><span>MRP ($)</span><input type="number" step="0.01" value={draft.mrp} onChange={(e) => setDraft({ ...draft, mrp: e.target.value })} placeholder="0.00" /></label>
            <label className="field"><span>Reorder point</span><input type="number" value={draft.reorderPoint} onChange={(e) => setDraft({ ...draft, reorderPoint: e.target.value })} placeholder="15" /></label>
            <label className="field"><span>Max stock</span><input type="number" value={draft.maxStock} onChange={(e) => setDraft({ ...draft, maxStock: e.target.value })} placeholder="120" /></label>
            <label className="field"><span>On-hand (cases)</span><input type="number" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} placeholder="0" /></label>
            <div className="field full">
              <span>Storefront placement</span>
              <div className="placetoggles">
                <Switch
                  checked={draft.onArrivals}
                  onChange={(v) => setDraft({ ...draft, onArrivals: v })}
                  label={<><b>Feature on New arrivals</b><small>Shows on the portal&apos;s New arrivals page</small></>}
                />
                <Switch
                  checked={draft.onOffers}
                  onChange={(v) => setDraft({ ...draft, onOffers: v })}
                  label={<><b>Feature on Offers</b><small>Shows on the portal&apos;s Offers page</small></>}
                />
              </div>
              {draft.onOffers && (
                <label className="field" style={{ marginTop: 10, maxWidth: 240 }}>
                  <span>Offer price ($) *</span>
                  <input type="number" step="0.01" value={draft.offerPrice} onChange={(e) => setDraft({ ...draft, offerPrice: e.target.value })} placeholder="Discounted price" required />
                </label>
              )}
            </div>
          </div>
          <div className="modalbtns" style={{ marginTop: 8 }}>
            <Button variant="ghost" type="button" onClick={() => router.push(backHref)}>Cancel</Button>
            <Button variant="primary" type="submit">{editing ? "Save changes" : "Validate & add"}</Button>
          </div>
        </form>
      </div>
    </>
  );
}

export function ProductsTab({ flash, go }: { flash: Flash; go: (t: Tab) => void }) {
  const router = useRouter();
  const { products, updateProduct, removeProduct, ready, error, refresh } = useInventory();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DeptKey | "all">("all");
  const [sort, setSort] = useState("name");
  const confirm = useConfirm();

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.filter((p) =>
      (filter === "all" || p.dep === filter) &&
      (q === "" || p.name.toLowerCase().includes(q) || String(p.id).includes(q) || (p.gtin || "").includes(q))
    );
    return [...list].sort((a, b) => {
      switch (sort) {
        case "price-desc": return b.price - a.price;
        case "stock-asc": return a.stock - b.stock;
        case "newest": return (b.created ?? 0) - (a.created ?? 0);
        default: return a.name.localeCompare(b.name);
      }
    });
  }, [products, query, filter, sort]);

  const CAT_OPTS: ToolbarOption[] = [{ value: "all", label: "All categories" }, ...DEPTS.map((d) => ({ value: d.key, label: d.name }))];
  const SORT_OPTS: ToolbarOption[] = [
    { value: "name", label: "Name A–Z" },
    { value: "price-desc", label: "Highest price" },
    { value: "stock-asc", label: "Lowest stock" },
    { value: "newest", label: "Newest" },
  ];

  return (
    <>
      <Head title="Products" sub="SKU master data, the foundation everything else depends on">
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="ghost" size="sm" iconLeft={<Inbox />} onClick={() => go("import")}>Bulk import</Button>
          <Link className="btn btn-primary btn-sm" href="/admin/products/new">+ Onboard product</Link>
        </div>
      </Head>
      <FlowGuide steps={PRODUCT_FLOW} active="product" title="Stock-in flow" />

      <ListToolbar
        search={{ value: query, onChange: setQuery, placeholder: "Search name, SKU or barcode…" }}
        filters={[{ label: "Category", value: filter, onChange: (v) => setFilter(v as DeptKey | "all"), options: CAT_OPTS }]}
        sort={{ value: sort, onChange: setSort, options: SORT_OPTS }}
      />

      <DataTable
        columns={[
          { key: "name", header: "Item name", render: (p) => <div className="prodcell"><span className="th"><Image src={productImg(p)} alt="" fill sizes="36px" style={{ objectFit: "contain" }} /></span><div><div className="pn">{p.name}</div><div className="mono muted" style={{ fontSize: 11 }}>{p.gtin || "no barcode"}</div></div></div> },
          { key: "code", header: "Code", render: (p) => <span className="mono muted">{sku(p)}</span> },
          { key: "desc", header: "Description", render: (p) => <span className="muted" style={{ fontSize: 12.5 }}>{p.description || "—"}</span> },
          { key: "cat", header: "Category", render: (p) => <span className="deptpill">{deptName(p.dep)}</span> },
          { key: "mrp", header: "MRP", align: "right", render: (p) => <span className="mono">{p.mrp ? m(p.mrp) : "—"}</span> },
          { key: "cost", header: "Unit cost", align: "right", render: (p) => <span className="mono">{p.cost ? m(p.cost) : "—"}</span> },
          { key: "price", header: "Unit price", align: "right", render: (p) => <span className="mono" style={{ fontWeight: 600 }}>{m(p.price)}</span> },
          { key: "stock", header: "Stock", align: "right", render: (p) => <Badge tone={stockTone(p.stock)}>{p.stock}</Badge> },
          { key: "created", header: "Created", render: (p) => <span className="muted" style={{ fontSize: 12.5 }}>{fmtDate(p.created)}</span> },
          { key: "actions", header: "", align: "right", render: (p) => (
            <Menu
              label={`Actions for ${p.name}`}
              items={[
                { label: "Edit product", onSelect: () => router.push(`/admin/products/${p.id}/edit`) },
                { label: "Add 12 cases", onSelect: () => { updateProduct(p.id, { stock: p.stock + 12 }); flash("+12 cases"); } },
                { label: "Remove product", danger: true, onSelect: async () => { if (await confirm({ title: "Remove product?", message: `${p.name} will be removed from the catalog.`, confirmLabel: "Remove", danger: true })) { removeProduct(p.id); flash(`${p.name} removed from catalog`); } } },
              ]}
            />
          ) },
        ] satisfies Column<Product>[]}
        rows={rows}
        rowKey={(p) => String(p.id)}
        rowClassName={(p) => (p.stock <= 0 ? "rowdim" : undefined)}
        onRowClick={(p) => router.push(`/admin/products/${p.id}`)}
        loading={!ready}
        empty={tableEmpty(error, refresh, "No products match.")}
        pageSize={25}
      />
      <Fab icon={<Plus />} href="/admin/products/new">Onboard product</Fab>
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
export function CategoriesTab({ flash }: { flash: Flash }) {
  const router = useRouter();
  const { categories, update, remove, ready, error, refresh } = useCategories();
  const { products } = useInventory();
  const confirm = useConfirm();
  const count = (key: string) => products.filter((p) => p.dep === key).length;
  const parentName = (k: string | null) => (k ? categories.find((c) => c.key === k)?.name ?? k : "—");

  return (
    <>
      <Head title="Categories" sub="Department taxonomy & sub-categories used across products, ordering and reporting">
        <Button variant="primary" size="sm" onClick={() => router.push("/admin/categories/new")}>+ New category</Button>
      </Head>
      <DataTable
        columns={[
          { key: "name", header: "Category", render: (c) => <span className="prodcell"><span className="th">{c.image
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={c.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ display: "grid", placeItems: "center", width: "100%", height: "100%", color: "var(--slate-2)" }}><TagIcon /></span>}</span><span className="pn">{c.name}{!c.active && <span className="muted" style={{ fontSize: 11 }}> · hidden</span>}</span></span> },
          { key: "parent", header: "Parent", render: (c) => c.parent ? <span className="deptpill">{parentName(c.parent)}</span> : <span className="muted">Top-level</span> },
          { key: "details", header: "Details", render: (c) => <span className="muted" style={{ fontSize: 13 }}>{c.details}</span> },
          { key: "group", header: "Group", render: (c) => <span className="deptpill">{c.group}</span> },
          { key: "products", header: "Products", align: "right", render: (c) => <span className="mono">{count(c.key)}</span> },
          { key: "slug", header: "Slug", render: (c) => <span className="mono muted">{c.key}</span> },
          { key: "actions", header: "", align: "right", render: (c) => (
            <Menu
              label={`Actions for ${c.name}`}
              items={[
                { label: "Edit category", onSelect: () => router.push(`/admin/categories/${c.key}`) },
                { label: c.active ? "Hide category" : "Show category", onSelect: () => { update(c.key, { active: !c.active }); flash(c.active ? `${c.name} hidden from portal` : `${c.name} visible on portal`); } },
                { label: "Delete category", danger: true, onSelect: async () => { if (count(c.key) > 0) { flash("Category has products. Reassign them first"); return; } if (categories.some((x) => x.parent === c.key)) { flash("Remove sub-categories first"); return; } if (await confirm({ title: "Delete category?", message: `${c.name} will be removed.`, confirmLabel: "Delete", danger: true })) { remove(c.key); flash(`${c.name} deleted`); } } },
              ]}
            />
          ) },
        ] satisfies Column<(typeof categories)[number]>[]}
        rows={categories}
        rowKey={(c) => c.key}
        onRowClick={(c) => router.push(`/admin/categories/${c.key}`)}
        loading={!ready}
        empty={tableEmpty(error, refresh, "No categories.")}
      />
    </>
  );
}

/* =======================================================================
   CATEGORY — full-page create / edit (with sub-category parent)
   ======================================================================= */
const EMPTY_CAT = { name: "", details: "", icon: "📦", group: "Front counter", image: "", parent: "" };
export function CategoryForm({ catKey, flash }: { catKey?: string; flash: Flash }) {
  const router = useRouter();
  const { categories, add, update, remove } = useCategories();
  const { products } = useInventory();
  const confirm = useConfirm();

  const existing = catKey ? categories.find((c) => c.key === catKey) : undefined;
  const editing = !!existing;
  const [draft, setDraft] = useState(existing
    ? { name: existing.name, details: existing.details, icon: existing.icon, group: existing.group, image: existing.image, parent: existing.parent ?? "" }
    : EMPTY_CAT);

  if (catKey && !existing) {
    return (
      <>
        <Breadcrumb items={[{ label: "Categories", href: "/admin/categories" }, { label: "Not found" }]} />
        <div className="empty"><div className="ei" aria-hidden="true"><Search /></div><h3>Category not found</h3></div>
      </>
    );
  }

  const parents = categories.filter((c) => c.parent === null && c.key !== catKey);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) { flash("Name is required"); return; }
    const patch = { name: draft.name.trim(), details: draft.details, icon: "", group: draft.group || "Front counter", image: draft.image, parent: draft.parent || null };
    if (editing) { update(existing!.key, patch); flash("Category updated"); }
    else {
      const key = draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (categories.some((c) => c.key === key)) { flash("A category with that name already exists"); return; }
      add({ id: "CAT-" + Math.floor(110 + Math.random() * 800), key, active: true, created: Date.now(), ...patch });
      flash("Category created");
    }
    router.push("/admin/categories");
  };

  return (
    <>
      <Breadcrumb items={[{ label: "Categories", href: "/admin/categories" }, { label: editing ? existing!.name : "New category" }]} />
      <header className="adminbar">
        <div><h1>{editing ? existing!.name : "New category"}</h1><p>{editing ? `${existing!.key} · ${products.filter((p) => p.dep === existing!.key).length} products` : "Create a department or sub-category"}</p></div>
        {editing && (
          <Menu
            label={`More actions for ${existing!.name}`}
            items={[{ label: "Delete category", danger: true, onSelect: async () => { if (products.filter((p) => p.dep === existing!.key).length > 0) { flash("Category has products. Reassign them first"); return; } if (await confirm({ title: "Delete category?", message: `${existing!.name} will be removed.`, confirmLabel: "Delete", danger: true })) { remove(existing!.key); router.push("/admin/categories"); flash(`${existing!.name} deleted`); } } }]}
          />
        )}
      </header>

      <div className="setpane">
        <form className="panel anim-in" onSubmit={save}>
          <div className="panel-h"><h3>{editing ? "Edit category" : "Category details"}</h3></div>
          <div className="formgrid">
            <label className="field full"><span>Name *</span><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required placeholder="e.g. Cigarettes" /></label>
            <label className="field"><span>Parent category</span>
              <select value={draft.parent} onChange={(e) => setDraft({ ...draft, parent: e.target.value })}>
                <option value="">— Top-level department</option>
                {parents.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
              </select>
            </label>
            <label className="field"><span>Group</span><input value={draft.group} onChange={(e) => setDraft({ ...draft, group: e.target.value })} /></label>
            <label className="field full"><span>Details</span><input value={draft.details} onChange={(e) => setDraft({ ...draft, details: e.target.value })} placeholder="e.g. Disposables, pods and e-liquids" /></label>
            <div className="field full">
              <ImageUpload value={draft.image} onChange={(v) => setDraft({ ...draft, image: v })} label="Category image" aspect="wide" folder="categories" onError={flash} hint="Shown across the storefront. A tag glyph is used until you add one." />
            </div>
          </div>
          <div className="modalbtns" style={{ marginTop: 8 }}>
            <Button variant="ghost" type="button" onClick={() => router.push("/admin/categories")}>Cancel</Button>
            <Button variant="primary" type="submit">{editing ? "Save changes" : "Create category"}</Button>
          </div>
        </form>

        {editing && categories.some((c) => c.parent === existing!.key) && (
          <div className="panel anim-in" style={{ marginTop: 18 }}>
            <div className="panel-h"><h3>Sub-categories</h3></div>
            <div className="minirows">
              {categories.filter((c) => c.parent === existing!.key).map((c) => (
                <div className="minirow" key={c.key} style={{ cursor: "pointer" }} onClick={() => router.push(`/admin/categories/${c.key}`)}>
                  <div><div className="ref" style={{ fontWeight: 600 }}>{c.name}</div><div className="st2">{c.key}</div></div>
                  <span className="amt mono">{products.filter((p) => p.dep === c.key).length} products</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* =======================================================================
   SUPPLIERS
   ======================================================================= */
export function SuppliersTab({ flash }: { flash: Flash }) {
  const router = useRouter();
  const { suppliers, update, ready, error, refresh } = useSuppliers();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("name");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = suppliers.filter((s) =>
      (status === "all" || s.status === status) &&
      (q === "" || s.name.toLowerCase().includes(q) || s.contact.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
    );
    return [...list].sort((a, b) => (sort === "lead" ? a.leadDays - b.leadDays : a.name.localeCompare(b.name)));
  }, [suppliers, query, status, sort]);

  return (
    <>
      <Head title="Suppliers" sub="Vendor master: lead times, terms, accounts and delivery routes">
        <Button variant="primary" size="sm" onClick={() => router.push("/admin/suppliers/new")}>+ Add supplier</Button>
      </Head>
      <ListToolbar
        search={{ value: query, onChange: setQuery, placeholder: "Search supplier, contact or email…" }}
        filters={[{ label: "Status", value: status, onChange: setStatus, options: [{ value: "all", label: "All statuses" }, { value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }] }]}
        sort={{ value: sort, onChange: setSort, options: [{ value: "name", label: "Name A–Z" }, { value: "lead", label: "Lead time" }] }}
      />
      <DataTable
        columns={[
          { key: "name", header: "Supplier", render: (s) => <div className="prodcell"><span className="avatar">{s.name.slice(0, 2).toUpperCase()}</span><div><div className="pn">{s.name}</div><div className="mono muted" style={{ fontSize: 11 }}>{s.id}{s.accountNo ? ` · acct #${s.accountNo}` : ""}</div></div></div> },
          { key: "contact", header: "Contact", render: (s) => <span style={{ fontSize: 13 }}>{s.contact}<div className="mono muted" style={{ fontSize: 11 }}>{s.email}</div></span> },
          { key: "terms", header: "Terms", render: (s) => <span className="deptpill">{s.terms}</span> },
          { key: "delivery", header: "Delivery", render: (s) => s.deliveryDay ? <span style={{ fontSize: 13 }}>{s.deliveryDay}{s.truck ? <div className="mono muted" style={{ fontSize: 11 }}>truck {s.truck} · stop {s.stop}</div> : null}</span> : <span className="muted">—</span> },
          { key: "lead", header: "Lead time", align: "right", render: (s) => <span className="mono">{s.leadDays}d</span> },
          { key: "status", header: "Status", align: "right", render: (s) => <Badge tone={s.status === "Active" ? "success" : "neutral"}>{s.status}</Badge> },
          { key: "action", header: "", align: "right", render: (s) => (
            <Menu
              label={`Actions for ${s.name}`}
              items={[
                { label: "Edit supplier", onSelect: () => router.push(`/admin/suppliers/${s.id}`) },
                { label: s.status === "Active" ? "Disable supplier" : "Enable supplier", onSelect: () => { const disabling = s.status === "Active"; update(s.id, { status: disabling ? "Inactive" : "Active" }); flash(disabling ? `${s.name} disabled` : `${s.name} enabled`); } },
              ]}
            />
          ) },
        ] satisfies Column<(typeof suppliers)[number]>[]}
        rows={rows}
        rowKey={(s) => s.id}
        onRowClick={(s) => router.push(`/admin/suppliers/${s.id}`)}
        loading={!ready}
        empty={tableEmpty(error, refresh, "No suppliers match.")}
      />
    </>
  );
}

/* =======================================================================
   SUPPLIER — full-page create / edit
   ======================================================================= */
const EMPTY_SUP = {
  name: "", contact: "", email: "", phone: "", leadDays: "3", terms: "Net 15", status: "Active" as "Active" | "Inactive",
  address: "", city: "", state: "OH", zip: "", website: "",
  accountNo: "", salesRep: "", csr: "", deliveryDay: "", truck: "", stop: "",
  categories: "", notes: "",
};
export function SupplierForm({ supId, flash }: { supId?: string; flash: Flash }) {
  const router = useRouter();
  const { suppliers, add, update, remove } = useSuppliers();
  const { pos } = usePurchaseOrders();
  const confirm = useConfirm();
  const existing = supId ? suppliers.find((s) => s.id === supId) : undefined;
  const editing = !!existing;
  const [d, setD] = useState(existing
    ? {
        name: existing.name, contact: existing.contact, email: existing.email, phone: existing.phone,
        leadDays: String(existing.leadDays), terms: existing.terms, status: existing.status,
        address: existing.address ?? "", city: existing.city ?? "", state: existing.state ?? "", zip: existing.zip ?? "",
        website: existing.website ?? "", accountNo: existing.accountNo ?? "", salesRep: existing.salesRep ?? "",
        csr: existing.csr ?? "", deliveryDay: existing.deliveryDay ?? "", truck: existing.truck ?? "", stop: existing.stop ?? "",
        categories: existing.categories ?? "", notes: existing.notes ?? "",
      }
    : EMPTY_SUP);

  const history = useMemo(() => {
    if (!existing) return null;
    const list = pos.filter((p) => p.supplierId === existing.id);
    const open = list.filter((p) => p.status !== "Received" && p.status !== "Closed");
    return { list: [...list].sort((a, b) => b.created - a.created), open: open.length, spend: list.reduce((s, p) => s + poTotal(p), 0) };
  }, [pos, existing]);

  if (supId && !existing) {
    return (
      <>
        <Breadcrumb items={[{ label: "Suppliers", href: "/admin/suppliers" }, { label: "Not found" }]} />
        <div className="empty"><div className="ei" aria-hidden="true"><Search /></div><h3>Supplier not found</h3></div>
      </>
    );
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!d.name.trim()) { flash("Name is required"); return; }
    const patch = {
      name: d.name.trim(), contact: d.contact, email: d.email, phone: d.phone,
      leadDays: Number(d.leadDays) || 3, terms: d.terms, status: d.status,
      address: d.address.trim(), city: d.city.trim(), state: d.state.trim(), zip: d.zip.trim(),
      website: d.website.trim(), accountNo: d.accountNo.trim(), salesRep: d.salesRep.trim(),
      csr: d.csr.trim(), deliveryDay: d.deliveryDay.trim(), truck: d.truck.trim(), stop: d.stop.trim(),
      categories: d.categories.trim(), notes: d.notes.trim(),
    };
    if (editing) { update(existing!.id, patch); flash("Supplier updated"); }
    else { add({ id: "SUP-" + Math.floor(10 + Math.random() * 89), ...patch }); flash("Supplier added"); }
    router.push("/admin/suppliers");
  };

  const form = (
    <form className="panel anim-in" onSubmit={save}>
      <div className="panel-h"><h3>{editing ? "Edit supplier" : "Supplier details"}</h3><span className="hint">Mirrors the header block on the supplier&apos;s invoices</span></div>
      <div className="formgrid">
        <label className="field full"><span>Name *</span><input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} required /></label>
        <label className="field"><span>Contact</span><input value={d.contact} onChange={(e) => setD({ ...d, contact: e.target.value })} /></label>
        <label className="field"><span>Email</span><input type="email" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} /></label>
        <label className="field"><span>Phone</span><input type="tel" value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} /></label>
        <label className="field"><span>Website</span><input value={d.website} onChange={(e) => setD({ ...d, website: e.target.value })} placeholder="www.example.com" /></label>
        <label className="field full"><span>Street address</span><input value={d.address} onChange={(e) => setD({ ...d, address: e.target.value })} placeholder="2121 Section Road" /></label>
        <label className="field"><span>City</span><input value={d.city} onChange={(e) => setD({ ...d, city: e.target.value })} /></label>
        <label className="field"><span>State</span><input value={d.state} onChange={(e) => setD({ ...d, state: e.target.value })} /></label>
        <label className="field"><span>ZIP</span><input inputMode="numeric" value={d.zip} onChange={(e) => setD({ ...d, zip: e.target.value })} /></label>
        <label className="field full"><span>What they distribute</span><input value={d.categories} onChange={(e) => setD({ ...d, categories: e.target.value })} placeholder="Cigarettes, tobacco, cigars, candy, groceries" /></label>
      </div>
      <div className="panel-h" style={{ marginTop: 18 }}><h3>Account &amp; delivery</h3><span className="hint">Our account with them + their route</span></div>
      <div className="formgrid">
        <label className="field"><span>Account #</span><input className="mono" value={d.accountNo} onChange={(e) => setD({ ...d, accountNo: e.target.value })} placeholder="904722" /></label>
        <label className="field"><span>Sales rep</span><input value={d.salesRep} onChange={(e) => setD({ ...d, salesRep: e.target.value })} /></label>
        <label className="field"><span>CSR</span><input value={d.csr} onChange={(e) => setD({ ...d, csr: e.target.value })} /></label>
        <label className="field"><span>Payment terms</span>
          <select value={d.terms} onChange={(e) => setD({ ...d, terms: e.target.value })}>
            {SUPPLIER_TERMS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="field"><span>Lead time (days)</span><input type="number" value={d.leadDays} onChange={(e) => setD({ ...d, leadDays: e.target.value })} /></label>
        <label className="field"><span>Delivery day</span><input value={d.deliveryDay} onChange={(e) => setD({ ...d, deliveryDay: e.target.value })} placeholder="Thursday" /></label>
        <label className="field"><span>Truck #</span><input className="mono" value={d.truck} onChange={(e) => setD({ ...d, truck: e.target.value })} /></label>
        <label className="field"><span>Stop #</span><input className="mono" value={d.stop} onChange={(e) => setD({ ...d, stop: e.target.value })} /></label>
        <div className="field"><span>Status</span>
          <Switch checked={d.status === "Active"} onChange={(v) => setD({ ...d, status: v ? "Active" : "Inactive" })} label={d.status === "Active" ? "Active, available on new POs" : "Inactive, hidden from new POs"} />
        </div>
        <label className="field full"><span>Notes</span><textarea rows={2} value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} placeholder="Tax paid notes, claim window, minimums…" /></label>
      </div>
      <div className="modalbtns" style={{ marginTop: 8 }}>
        <Button variant="ghost" type="button" onClick={() => router.push("/admin/suppliers")}>Cancel</Button>
        <Button variant="primary" type="submit">{editing ? "Save changes" : "Add supplier"}</Button>
      </div>
    </form>
  );

  return (
    <>
      <Breadcrumb items={[{ label: "Suppliers", href: "/admin/suppliers" }, { label: editing ? existing!.name : "New supplier" }]} />
      <header className="adminbar">
        <div><h1>{editing ? existing!.name : "New supplier"}</h1><p>{editing ? `${existing!.id}${existing!.accountNo ? ` · account #${existing!.accountNo}` : ""}` : "Add a vendor to the master list"}</p></div>
        {editing && (
          <Menu
            label={`More actions for ${existing!.name}`}
            items={[{ label: "Delete supplier", danger: true, onSelect: async () => { if (await confirm({ title: "Delete supplier?", message: `${existing!.name} will be removed.`, confirmLabel: "Delete", danger: true })) { remove(existing!.id); router.push("/admin/suppliers"); flash(`${existing!.name} deleted`); } } }]}
          />
        )}
      </header>
      {editing && history ? (
        <div className="detail-grid">
          <div className="detail-main">{form}</div>
          <aside className="detail-side">
            <div className="panel anim-in">
              <div className="panel-h"><h3>Purchase history</h3><Link className="ia" href="/admin/purchaseorder/new">+ New PO</Link></div>
              <div className="kvs">
                <div className="kv2"><span>Purchase orders</span><b className="mono">{history.list.length}</b></div>
                <div className="kv2"><span>Open</span><b className="mono">{history.open}</b></div>
                <div className="kv2"><span>Total spend</span><b className="mono">{m(history.spend)}</b></div>
              </div>
              {history.list.length > 0 && (
                <div className="minirows" style={{ marginTop: 12 }}>
                  {history.list.slice(0, 6).map((p) => (
                    <Link className="minirow clickrow" key={p.id} href={`/admin/purchaseorder/${p.id}`}>
                      <div><div className="ref mono">{p.id}</div><div className="st2">{p.lines.length} lines · {timeAgo(p.created)}</div></div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span className="mono">{m(poTotal(p))}</span>
                        <span className={`pobadge s-${p.status.replace(/\s+/g, "").toLowerCase()}`}>{p.status}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      ) : (
        <div className="setpane">{form}</div>
      )}
    </>
  );
}

/* =======================================================================
   PROMOTIONS (advertising shown on the buyer dashboard)
   ======================================================================= */
const EMPTY_PROMO = { tag: "New arrivals", title: "", subtitle: "", image: "", active: true };

/** Full-page create / edit promotion. */
export function PromotionForm({ promoId, flash }: { promoId?: string; flash: Flash }) {
  const router = useRouter();
  const { promos, add, update, remove } = usePromotions();
  const confirm = useConfirm();
  const existing = promoId ? promos.find((p) => p.id === promoId) : undefined;
  const editing = !!existing;
  const [d, setD] = useState(existing
    ? { tag: existing.tag, title: existing.title, subtitle: existing.subtitle, image: existing.image, active: existing.active }
    : EMPTY_PROMO);

  if (promoId && !existing) {
    return (
      <>
        <Breadcrumb items={[{ label: "Promotions", href: "/admin/promotions" }, { label: "Not found" }]} />
        <div className="empty"><div className="ei" aria-hidden="true"><Search /></div><h3>Promotion not found</h3></div>
      </>
    );
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!d.title.trim()) { flash("Title is required"); return; }
    const patch = { tag: d.tag.trim() || "Featured", title: d.title.trim(), subtitle: d.subtitle.trim(), image: d.image, active: d.active };
    if (editing) { update(existing!.id, patch); flash("Promotion updated"); }
    else { add({ id: "PR-" + Math.floor(10 + Math.random() * 89), ...patch, created: Date.now() }); flash("Promotion published"); }
    router.push("/admin/promotions");
  };

  return (
    <>
      <Breadcrumb items={[{ label: "Promotions", href: "/admin/promotions" }, { label: editing ? (existing!.title || "Untitled") : "New promotion" }]} />
      <header className="adminbar">
        <div><h1>{editing ? (existing!.title || "Untitled promotion") : "New promotion"}</h1><p>{editing ? existing!.id : "Create a banner for the buyer dashboard carousel"}</p></div>
        {editing && (
          <Menu
            label={`More actions for ${existing!.title || "this promotion"}`}
            items={[{ label: "Delete promotion", danger: true, onSelect: async () => { if (await confirm({ title: "Delete promotion?", message: `"${existing!.title}" will be removed from the portal.`, confirmLabel: "Delete", danger: true })) { remove(existing!.id); router.push("/admin/promotions"); flash("Promotion deleted"); } } }]}
          />
        )}
      </header>
      <div className="setpane">
        <form className="panel anim-in" onSubmit={save}>
          <div className="panel-h"><h3>{editing ? "Edit promotion" : "Promotion details"}</h3><span className="hint">Appears on the buyer dashboard carousel while published.</span></div>
          <div className="formgrid">
            <label className="field"><span>Tag</span><input value={d.tag} onChange={(e) => setD({ ...d, tag: e.target.value })} placeholder="New arrivals" /></label>
            <label className="field"><span>Title *</span><input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} required placeholder="Fresh vapor & disposables" /></label>
            <label className="field full"><span>Subtitle</span><input value={d.subtitle} onChange={(e) => setD({ ...d, subtitle: e.target.value })} placeholder="The latest Mr Fog, Breeze and EB Design, just landed by the case." /></label>
            <div className="field"><span>Visibility</span>
              <Switch checked={d.active} onChange={(v) => setD({ ...d, active: v })} label={d.active ? "Live on the portal carousel" : "Hidden from the portal"} />
            </div>
            <div className="field full"><ImageUpload value={d.image} onChange={(v) => setD({ ...d, image: v })} label="Banner image" aspect="wide" folder="promos" onError={flash} hint="Shown on the buyer dashboard carousel." /></div>
          </div>
          <div className="modalbtns" style={{ marginTop: 8 }}>
            <Button variant="ghost" type="button" onClick={() => router.push("/admin/promotions")}>Cancel</Button>
            <Button variant="primary" type="submit">{editing ? "Save changes" : "Publish promotion"}</Button>
          </div>
        </form>
      </div>
    </>
  );
}

export function PromotionsTab({ flash }: { flash: Flash }) {
  const { promos, update, remove, ready, error, refresh } = usePromotions();
  const confirm = useConfirm();
  const router = useRouter();

  return (
    <>
      <Head title="Promotions" sub="Image banners shown on the buyer dashboard in the order portal">
        <Link className="btn btn-primary btn-sm" href="/admin/promotions/new">+ New promotion</Link>
      </Head>
      {!ready ? (
        <div className="promogrid">
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="promocard" key={i}>
              <span className="promoshot"><Skeleton width="100%" height="100%" radius={0} /></span>
              <div className="promobody"><Skeleton width="60%" height={18} /><Skeleton width="90%" height={14} /></div>
            </div>
          ))}
        </div>
      ) : error && promos.length === 0 ? (
        <EmptyState title="Couldn't load" description="There was a problem loading promotions." action={<Button variant="ghost" onClick={refresh}>Retry</Button>} />
      ) : (
      <div className="promogrid">
        {promos.map((p) => (
          <div className={`promocard ${p.active ? "" : "off"}`} key={p.id}>
            <Link className="promoshot" href={`/admin/promotions/${p.id}`} style={{ backgroundImage: p.image ? `url(${p.image})` : undefined }} aria-label={`Edit ${p.title}`}>
              {!p.image && <span className="muted">no image</span>}
              <span className="promotag">{p.tag}</span>
            </Link>
            <div className="promobody">
              <h3>{p.title}</h3>
              <p>{p.subtitle}</p>
              <div className="rowactions" style={{ marginTop: 12, justifyContent: "space-between", display: "flex", alignItems: "center" }}>
                <Switch checked={p.active} onChange={() => { update(p.id, { active: !p.active }); flash(p.active ? `"${p.title}" hidden from portal` : `"${p.title}" live on portal`); }} label={p.active ? "Live" : "Hidden"} />
                <Menu
                  label={`Actions for ${p.title}`}
                  items={[
                    { label: "Edit promotion", onSelect: () => router.push(`/admin/promotions/${p.id}`) },
                    { label: "Delete promotion", danger: true, onSelect: async () => { if (await confirm({ title: "Delete promotion?", message: `"${p.title}" will be removed from the portal.`, confirmLabel: "Delete", danger: true })) { remove(p.id); flash("Promotion deleted"); } } },
                  ]}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
    </>
  );
}

/* =======================================================================
   PURCHASE ORDERS
   ======================================================================= */
