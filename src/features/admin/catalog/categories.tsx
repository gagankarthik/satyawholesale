"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useInventory } from "@/lib/store";
import { useCategories } from "@/lib/wms";
import { Search, Plus, Tag as TagIcon } from "@/components/Icons";
import { useConfirm } from "@/components/Confirm";
import { Head, tableEmpty, type Flash } from "../shared";
import { Button, Breadcrumb, DataTable, ImageUpload, Menu, type Column } from "@/components/ui";

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
        <Button variant="primary" size="sm" onClick={() => router.push("/admin/categories/new")}><Plus /> New category</Button>
      </Head>
      <DataTable
        columns={[
          { key: "name", header: "Category", render: (c) => <span className="prodcell"><span className="th">{c.image
            ? <Image src={c.image} alt="" fill sizes="40px" style={{ objectFit: "cover" }} />
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
        pageSize={25}
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
                <div className="minirow" key={c.key} style={{ cursor: "pointer" }} role="button" tabIndex={0} onClick={() => router.push(`/admin/categories/${c.key}`)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(`/admin/categories/${c.key}`); } }}>
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
