"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { DEPTS, deptName, productImg, sku, useInventory, LOW_STOCK, type DeptKey, type Product, type Tag } from "@/lib/store";
import { useSuppliers, useCategories } from "@/lib/wms";
import { Search, Inbox, Plus, ArrowLeft, Pencil, Trash } from "@/components/Icons";
import { useConfirm } from "@/components/Confirm";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { Head, FlowHelp, PRODUCT_FLOW, tableEmpty, m, fmtDate, type Tab, type Flash } from "../shared";
import { downloadCsv } from "@/lib/csv";
import { Button, Badge, Breadcrumb, DataTable, Fab, FieldHelp, ListToolbar, Menu, ImageUpload, Switch, type Column, type BadgeTone, type ToolbarOption } from "@/components/ui";

/** Stock level → Badge tone. */
const stockTone = (n: number): BadgeTone => (n <= 0 ? "danger" : n <= LOW_STOCK ? "warning" : "success");

const EMPTY_PRODUCT = {
  name: "", category: "tobacco" as DeptKey, sku: "", gtin: "", uom: "case", caseQty: "",
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
    name: existing.name, category: existing.dep, sku: existing.sku || "", gtin: existing.gtin || "", uom: existing.uom || "case",
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
        <button className="detail-back" onClick={() => router.push("/admin/products")}><ArrowLeft /> All products</button>
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
    if (draft.gtin && !/^\d{12,13}$/.test(draft.gtin)) errors.push("UPC must be 12–13 digits.");
    if (draft.gtin && /^\d{12,13}$/.test(draft.gtin)) {
      const digits = draft.gtin.split("").map(Number); const check = digits.pop()!;
      let sum = 0; digits.reverse().forEach((d, i) => { sum += i % 2 === 0 ? d * 3 : d; });
      if ((10 - (sum % 10)) % 10 !== check) errors.push("UPC check digit is invalid.");
    }
    if (draft.gtin && products.some((p) => p.gtin === draft.gtin && p.id !== existing?.id)) errors.push("That UPC already exists.");
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
      updateProduct(existing!.id, { ...common, stock: Number(draft.stock) || 0, sku: draft.sku.trim() || existing!.sku || undefined });
      flash("Product updated");
      router.push(`/admin/products/${existing!.id}`);
    } else {
      const id = Math.floor(1000 + Math.random() * 8999);
      addProduct({ id, emoji: "📦", tag: "new" as Tag, stock: Number(draft.stock) || 0, active: true, created: Date.now(), ...common, sku: draft.sku.trim() || undefined });
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
        <div><h1>{editing ? existing!.name : "Onboard a product"}</h1>{editing && <p>{existing!.sku?.trim() ? `SKU ${existing!.sku.trim()}` : "No SKU"}</p>}</div>
        {editing && (
          <Menu
            label={`More actions for ${existing!.name}`}
            items={[{ label: "Remove product", icon: <Trash />, danger: true, onSelect: async () => { if (await confirm({ title: "Remove product?", message: `${existing!.name} will be removed from the catalog.`, confirmLabel: "Remove", danger: true })) { removeProduct(existing!.id); router.push("/admin/products"); flash(`${existing!.name} removed from catalog`); } } }]}
          />
        )}
      </header>
      <div className="setpane">
        <form className="panel anim-in" onSubmit={submit}>
          <div className="panel-h"><h3>{editing ? "Edit master data" : "Product details"}</h3></div>
          {errs.length > 0 && <div className="valbox">{errs.map((er, i) => <div key={i}>• {er}</div>)}</div>}
          {/* Identity — chunked into labeled sections so the 13 fields don't
              read as one flat wall (Miller's Law); matches the SupplierForm pattern */}
          <div className="formgrid">
            <label className="field full"><span>Product name *</span><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Mr Fog Max Pro 1500" required /></label>
            <label className="field full"><span>Description</span><input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="e.g. 5% nicotine, 15-pack display, assorted flavors" /></label>
            <div className="field full">
              <ImageUpload value={draft.image} onChange={(v) => setDraft({ ...draft, image: v })} label="Product image" aspect="square" folder="products" onError={flash} hint="Optional. Shown in the portal and admin; a placeholder is used until you add one." />
            </div>
            <label className="field"><span>Category * <FieldHelp text="The department this product lives under in the portal catalog." /></span><select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as DeptKey })}>{categories.filter((c) => c.active).map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}</select></label>
            <label className="field"><span>SKU <FieldHelp text="Your internal item code for local inventory management. Optional. Shown as entered; left blank, none is shown." /></span><input className="mono" value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} placeholder="e.g. 100-2345" /></label>
            <div className="field"><span>UPC <FieldHelp text="The retailer UPC-A (12) or EAN-13 (13) barcode printed on the pack. Used at receiving and checkout." /></span>
              <div className="scanrow">
                <input value={draft.gtin} onChange={(e) => setDraft({ ...draft, gtin: e.target.value })} placeholder="Scan or type 12–13 digits" inputMode="numeric" aria-label="UPC" />
                <BarcodeScanner onDetect={(code) => setDraft((d) => ({ ...d, gtin: code }))} />
              </div>
            </div>
            <label className="field"><span>Supplier <FieldHelp text="The vendor you buy this from. Links the product to purchase orders." /></span><select value={draft.supplierId} onChange={(e) => setDraft({ ...draft, supplierId: e.target.value })}><option value="">None</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          </div>

          <div className="panel-h" style={{ marginTop: 18 }}><h3>Pricing</h3></div>
          <div className="formgrid">
            <label className="field"><span>Unit cost ($) <FieldHelp text="Your landed cost per case. Drives margin and inventory value." /></span><input type="number" step="0.01" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: e.target.value })} placeholder="0.00" /></label>
            <label className="field"><span>Unit price ($) * <FieldHelp text="The price customers pay per case in the portal." /></span><input type="number" step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="0.00" required /></label>
            <label className="field"><span>MRP ($) <FieldHelp text="Manufacturer's suggested retail, shown for reference, not charged." /></span><input type="number" step="0.01" value={draft.mrp} onChange={(e) => setDraft({ ...draft, mrp: e.target.value })} placeholder="0.00" /></label>
          </div>

          <div className="panel-h" style={{ marginTop: 18 }}><h3>Stock &amp; reorder</h3></div>
          <div className="formgrid">
            <label className="field"><span>Unit of measure <FieldHelp text="How this item is sold and counted (case, each, box…)." /></span><select value={draft.uom} onChange={(e) => setDraft({ ...draft, uom: e.target.value })}>{["case", "each", "box", "pack", "carton", "tray", "bag", "bottle", "can"].map((u) => <option key={u} value={u}>{u[0].toUpperCase() + u.slice(1)}</option>)}</select></label>
            <label className="field"><span>Eaches / case <FieldHelp text="How many individual units are inside one case." /></span><input type="number" value={draft.caseQty} onChange={(e) => setDraft({ ...draft, caseQty: e.target.value })} placeholder="10" /></label>
            <label className="field"><span>Reorder point <FieldHelp text="When on-hand cases fall to this number, the item is flagged to reorder." /></span><input type="number" value={draft.reorderPoint} onChange={(e) => setDraft({ ...draft, reorderPoint: e.target.value })} placeholder="15" /></label>
            <label className="field"><span>Max stock <FieldHelp text="The most you want on hand, caps replenishment suggestions." /></span><input type="number" value={draft.maxStock} onChange={(e) => setDraft({ ...draft, maxStock: e.target.value })} placeholder="120" /></label>
            <label className="field"><span>On-hand (cases) <FieldHelp text="Current cases physically in the warehouse right now." /></span><input type="number" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} placeholder="0" /></label>
          </div>

          <div className="panel-h" style={{ marginTop: 18 }}><h3>Storefront placement</h3></div>
          <div className="formgrid">
            <div className="field full">
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const confirm = useConfirm();

  const toggle = (k: string) => setSelected((prev) => { const nx = new Set(prev); if (nx.has(k)) nx.delete(k); else nx.add(k); return nx; });
  const toggleAll = (keys: string[], select: boolean) => setSelected((prev) => { const nx = new Set(prev); keys.forEach((k) => (select ? nx.add(k) : nx.delete(k))); return nx; });
  const clearSel = () => setSelected(new Set());
  const selIds = () => [...selected].map(Number);
  const nSel = selected.size;
  const plural = nSel === 1 ? "product" : "products";
  const bulkPatch = (patch: Partial<Product>, msg: string) => { selIds().forEach((id) => updateProduct(id, patch)); flash(msg); clearSel(); };
  const bulkAddCases = (delta: number) => { selIds().forEach((id) => { const p = products.find((x) => x.id === id); if (p) updateProduct(id, { stock: p.stock + delta }); }); flash(`+${delta} cases to ${nSel} ${plural}`); clearSel(); };
  const bulkRemove = async () => {
    if (await confirm({ title: `Remove ${nSel} ${plural}?`, message: "The selected products will be removed from the catalog. This can't be undone.", confirmLabel: "Remove", danger: true })) {
      selIds().forEach((id) => removeProduct(id));
      flash(`${nSel} ${plural} removed`);
      clearSel();
    }
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.filter((p) =>
      (filter === "all" || p.dep === filter) &&
      (q === "" || p.name.toLowerCase().includes(q) || sku(p).toLowerCase().includes(q) || (p.gtin || "").includes(q))
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

  const exportProducts = () => {
    downloadCsv(
      `products-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Name", "SKU", "UPC", "Category", "Cost", "Price", "MRP", "Stock"],
      rows.map((p) => [p.name, p.sku ?? "", p.gtin ?? "", deptName(p.dep), p.cost ?? "", p.price, p.mrp ?? "", p.stock]),
    );
  };

  return (
    <>
      <Head title="Products">
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="ghost" size="sm" onClick={exportProducts} disabled={!rows.length}>Export CSV</Button>
          <Button variant="ghost" size="sm" iconLeft={<Inbox />} onClick={() => go("import")}>Bulk import</Button>
          <Link className="btn btn-primary btn-sm" href="/admin/products/new"><Plus /> Onboard product</Link>
        </div>
      </Head>
      <FlowHelp steps={PRODUCT_FLOW} active="product" title="Stock-in flow" />

      <ListToolbar
        search={{ value: query, onChange: setQuery, placeholder: "Search name, SKU or UPC…" }}
        filters={[{ label: "Category", value: filter, onChange: (v) => setFilter(v as DeptKey | "all"), options: CAT_OPTS }]}
        sort={{ value: sort, onChange: setSort, options: SORT_OPTS }}
      />

      {nSel > 0 && (
        <div className="bulkbar anim-in">
          <span className="bulkbar-n">{nSel} {plural} selected</span>
          <div className="bulkbar-acts">
            <Button size="sm" variant="ghost" onClick={() => bulkPatch({ active: true }, `${nSel} ${plural} activated`)}>Activate</Button>
            <Button size="sm" variant="ghost" onClick={() => bulkPatch({ active: false }, `${nSel} ${plural} hidden`)}>Deactivate</Button>
            <Button size="sm" variant="ghost" onClick={() => bulkAddCases(12)}>+12 cases</Button>
            <select
              className="bulkbar-sel"
              value=""
              aria-label="Set category for selected products"
              onChange={(e) => { const v = e.target.value as DeptKey; if (v) bulkPatch({ dep: v }, `Moved ${nSel} ${plural} to ${deptName(v)}`); }}
            >
              <option value="">Set category…</option>
              {DEPTS.map((d) => <option key={d.key} value={d.key}>{d.name}</option>)}
            </select>
            <Button size="sm" variant="danger" onClick={bulkRemove}>Remove</Button>
            <Button size="sm" variant="ghost" onClick={clearSel}>Clear</Button>
          </div>
        </div>
      )}

      <DataTable
        columns={[
          { key: "name", header: "Item name", render: (p) => <div className="prodcell"><span className="th"><Image src={productImg(p)} alt="" fill sizes="36px" style={{ objectFit: "contain" }} /></span><div><div className="pn">{p.name}</div><div className="mono muted" style={{ fontSize: 11 }}>{p.gtin ? `UPC ${p.gtin}` : "no UPC"}</div></div></div> },
          { key: "code", header: "SKU", render: (p) => <span className="mono muted">{p.sku?.trim() || "—"}</span> },
          { key: "desc", header: "Description", hideOnMobile: true, render: (p) => <span className="muted" style={{ fontSize: 12.5 }}>{p.description || "—"}</span> },
          { key: "cat", header: "Category", render: (p) => <span className="deptpill">{deptName(p.dep)}</span> },
          { key: "mrp", header: "MRP", align: "right", hideOnMobile: true, render: (p) => <span className="mono">{p.mrp ? m(p.mrp) : "—"}</span> },
          { key: "cost", header: "Unit cost", align: "right", hideOnMobile: true, render: (p) => <span className="mono">{p.cost ? m(p.cost) : "—"}</span> },
          { key: "price", header: "Unit price", align: "right", render: (p) => <span className="mono" style={{ fontWeight: 600 }}>{m(p.price)}</span> },
          { key: "stock", header: "Stock", align: "right", render: (p) => <Badge tone={stockTone(p.stock)}>{p.stock}</Badge> },
          { key: "created", header: "Created", hideOnMobile: true, render: (p) => <span className="muted" style={{ fontSize: 12.5 }}>{fmtDate(p.created)}</span> },
          { key: "actions", header: "", align: "right", render: (p) => (
            <Menu
              label={`Actions for ${p.name}`}
              items={[
                { label: "Edit product", icon: <Pencil />, onSelect: () => router.push(`/admin/products/${p.id}/edit`) },
                { label: "Add 12 cases", icon: <Plus />, onSelect: () => { updateProduct(p.id, { stock: p.stock + 12 }); flash("+12 cases"); } },
                { label: "Remove product", icon: <Trash />, danger: true, onSelect: async () => { if (await confirm({ title: "Remove product?", message: `${p.name} will be removed from the catalog.`, confirmLabel: "Remove", danger: true })) { removeProduct(p.id); flash(`${p.name} removed from catalog`); } } },
              ]}
            />
          ) },
        ] satisfies Column<Product>[]}
        rows={rows}
        rowKey={(p) => String(p.id)}
        selectable
        selected={selected}
        onToggle={toggle}
        onToggleAll={toggleAll}
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
