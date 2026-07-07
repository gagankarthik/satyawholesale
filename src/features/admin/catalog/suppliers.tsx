"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSuppliers, usePurchaseOrders, poTotal, SUPPLIER_TERMS } from "@/lib/wms";
import { Search, Plus } from "@/components/Icons";
import { useConfirm } from "@/components/Confirm";
import { Head, tableEmpty, m, timeAgo, type Flash } from "../shared";
import { Button, Badge, Breadcrumb, DataTable, FieldHelp, ListToolbar, Menu, Switch, type Column } from "@/components/ui";

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
      <Head title="Suppliers">
        <Button variant="primary" size="sm" onClick={() => router.push("/admin/suppliers/new")}><Plus /> Add supplier</Button>
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
        pageSize={25}
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
      <div className="panel-h"><h3>{editing ? "Edit supplier" : "Supplier details"}</h3></div>
      <div className="formgrid">
        <label className="field full"><span>Name *</span><input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} required /></label>
        <label className="field"><span>Contact</span><input value={d.contact} onChange={(e) => setD({ ...d, contact: e.target.value })} /></label>
        <label className="field"><span>Email</span><input type="email" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} /></label>
        <label className="field"><span>Phone</span><input type="tel" value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} /></label>
        <label className="field"><span>Website</span><input value={d.website} onChange={(e) => setD({ ...d, website: e.target.value })} placeholder="www.example.com" /></label>
        <label className="field full"><span>Street address</span><input value={d.address} onChange={(e) => setD({ ...d, address: e.target.value })} placeholder="2121 Section Road" /></label>
        <div className="field-row">
          <label className="field"><span>City</span><input value={d.city} onChange={(e) => setD({ ...d, city: e.target.value })} /></label>
          <label className="field"><span>State</span><input value={d.state} onChange={(e) => setD({ ...d, state: e.target.value })} /></label>
          <label className="field"><span>ZIP</span><input inputMode="numeric" value={d.zip} onChange={(e) => setD({ ...d, zip: e.target.value })} /></label>
        </div>
        <label className="field full"><span>What they distribute <FieldHelp text="Product categories this vendor supplies — helps match products to their POs." /></span><input value={d.categories} onChange={(e) => setD({ ...d, categories: e.target.value })} placeholder="Cigarettes, tobacco, cigars, candy, groceries" /></label>
      </div>
      <div className="panel-h" style={{ marginTop: 18 }}><h3>Account &amp; delivery</h3></div>
      <div className="formgrid">
        <label className="field"><span>Account # <FieldHelp text="Your account number with this supplier, as printed on their invoices." /></span><input className="mono" value={d.accountNo} onChange={(e) => setD({ ...d, accountNo: e.target.value })} placeholder="904722" /></label>
        <label className="field"><span>Sales rep</span><input value={d.salesRep} onChange={(e) => setD({ ...d, salesRep: e.target.value })} /></label>
        <label className="field"><span>CSR <FieldHelp text="Customer service rep — your day-to-day contact at the supplier." /></span><input value={d.csr} onChange={(e) => setD({ ...d, csr: e.target.value })} /></label>
        <label className="field"><span>Payment terms <FieldHelp text="How long you have to pay their invoices (Net 15/30, COD)." /></span>
          <select value={d.terms} onChange={(e) => setD({ ...d, terms: e.target.value })}>
            {SUPPLIER_TERMS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="field"><span>Lead time (days) <FieldHelp text="Typical days from placing a PO to the stock arriving." /></span><input type="number" value={d.leadDays} onChange={(e) => setD({ ...d, leadDays: e.target.value })} /></label>
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
        <div><h1>{editing ? existing!.name : "New supplier"}</h1>{editing && <p>{`${existing!.id}${existing!.accountNo ? ` · account #${existing!.accountNo}` : ""}`}</p>}</div>
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
              <div className="panel-h"><h3>Purchase history</h3><Link className="ia" href="/admin/purchaseorder/new"><Plus /> New PO</Link></div>
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
