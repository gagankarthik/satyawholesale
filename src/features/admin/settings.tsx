"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useInventory, useSettings, LOW_STOCK, CONTACT,
} from "@/lib/store";
import {
  useStaff, PO_APPROVAL_THRESHOLD, ROLES, type Role,
} from "@/lib/wms";
import { useConfirm } from "@/components/Confirm";
import { ListToolbar, type ToolbarOption } from "@/components/ui";
import { Head, m, type Flash } from "./shared";

const EMPTY_STAFF = { name: "", email: "", role: "Viewer" as Role, device: "" };
export function UsersTab({ flash }: { flash: Flash }) {
  const { staff, add, update } = useStaff();
  const [adding, setAdding] = useState(false);
  const [d, setD] = useState(EMPTY_STAFF);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [sort, setSort] = useState("name");

  const roleOpts: ToolbarOption[] = [{ value: "all", label: "All roles" }, ...ROLES.map((r) => ({ value: r, label: r }))];
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = staff.filter((u) =>
      (role === "all" || u.role === role) &&
      (q === "" || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
    return [...list].sort((a, b) => (sort === "role" ? a.role.localeCompare(b.role) : a.name.localeCompare(b.name)));
  }, [staff, query, role, sort]);

  return (
    <>
      <Head title="Users & roles" sub="Staff access and scanner-device assignment">
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Add user</button>
      </Head>
      <ListToolbar
        search={{ value: query, onChange: setQuery, placeholder: "Search name or email…" }}
        filters={[{ label: "Role", value: role, onChange: setRole, options: roleOpts }]}
        sort={{ value: sort, onChange: setSort, options: [{ value: "name", label: "Name A–Z" }, { value: "role", label: "Role" }] }}
      />
      <div className="tablewrap">
        <table className="invtable">
          <thead><tr><th>User</th><th>Role</th><th>Scanner</th><th className="r">Status</th><th className="r"></th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td><div className="prodcell"><span className="avatar">{u.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span><div><div className="pn">{u.name}</div><div className="mono muted" style={{ fontSize: 11 }}>{u.email}</div></div></div></td>
                <td><select className="rolesel" value={u.role} onChange={(e) => { update(u.id, { role: e.target.value as Role }); flash("Role updated"); }}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></td>
                <td className="mono muted">{u.device || "—"}</td>
                <td className="r"><span className={`ustatus ${u.status === "Active" ? "active" : "hold"}`}>{u.status}</span></td>
                <td className="r"><button className="ia" onClick={() => { update(u.id, { status: u.status === "Active" ? "Suspended" : "Active" }); flash("Updated"); }}>{u.status === "Active" ? "Suspend" : "Restore"}</button></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="muted" style={{ textAlign: "center", padding: "28px 0" }}>No users match.</td></tr>}
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
export function SettingsTab({ flash }: { flash: Flash }) {
  const { reset } = useInventory();
  const { settings, update } = useSettings();
  const confirm = useConfirm();
  const [rate, setRate] = useState(String(settings.taxRate));
  const [label, setLabel] = useState(settings.taxLabel);

  useEffect(() => { setRate(String(settings.taxRate)); setLabel(settings.taxLabel); }, [settings.taxRate, settings.taxLabel]);

  const [tab, setTab] = useState<"company" | "tax" | "policies">("company");

  const saveTax = (e: React.FormEvent) => {
    e.preventDefault();
    const r = Number(rate);
    if (Number.isNaN(r) || r < 0 || r > 100) { flash("Enter a tax rate between 0 and 100"); return; }
    update({ taxRate: r, taxLabel: label.trim() || "Sales tax" });
    flash("Tax settings saved");
  };

  const TABS = [{ k: "company", label: "Company" }, { k: "tax", label: "Tax & invoicing" }, { k: "policies", label: "Warehouse policies" }] as const;

  return (
    <>
      <Head title="Settings" sub="Company profile, tax and warehouse policies" />
      <div className="tabbar">
        {TABS.map((t) => <button key={t.k} className={tab === t.k ? "on" : ""} onClick={() => setTab(t.k)}>{t.label}</button>)}
      </div>

      <div className="setpane">
        {tab === "company" && (
          <div className="panel anim-in" key="company">
            <div className="panel-h"><h3>Company profile</h3></div>
            <div className="setrows">
              <div className="setrow"><span>Legal name</span><b>{CONTACT.legalName}</b></div>
              <div className="setrow"><span>Warehouse</span><b>{CONTACT.address1}, {CONTACT.address2}</b></div>
              <div className="setrow"><span>Phone</span><b>{CONTACT.phone}</b></div>
              <div className="setrow"><span>Email</span><b>{CONTACT.email}</b></div>
              <div className="setrow"><span>Hours</span><b>{CONTACT.hours}</b></div>
            </div>
          </div>
        )}

        {tab === "tax" && (
          <div className="panel anim-in" key="tax">
            <div className="panel-h"><h3>Tax &amp; invoicing</h3><span className="hint">Applied to orders that aren&apos;t resale-exempt</span></div>
            <form className="formgrid" onSubmit={saveTax}>
              <label className="field"><span>Sales tax rate (%)</span>
                <input type="number" step="0.01" min={0} max={100} value={rate} onChange={(e) => setRate(e.target.value)} />
              </label>
              <label className="field"><span>Tax label</span>
                <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="OH sales tax" />
              </label>
              <div className="setrow full" style={{ borderBottom: "none" }}>
                <span>Default for new orders</span><b>Resale-exempt (B2B)</b>
              </div>
              <div className="modalbtns full" style={{ marginTop: 4 }}>
                <button className="btn btn-primary btn-sm" type="submit">Save tax settings</button>
              </div>
            </form>
          </div>
        )}

        {tab === "policies" && (
          <div className="panel anim-in" key="policies">
            <div className="panel-h"><h3>Warehouse policies</h3></div>
            <div className="setrows">
              <div className="setrow"><span>Default low-stock threshold</span><b>{LOW_STOCK} cases</b></div>
              <div className="setrow"><span>PO approval threshold</span><b>{m(PO_APPROVAL_THRESHOLD)}</b></div>
              <div className="setrow"><span>Receiving tolerance</span><b>±5% of PO</b></div>
              <div className="setrow"><span>Barcode standard</span><b>UPC-A / EAN-13</b></div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 18 }} onClick={async () => { if (await confirm({ title: "Reset demo catalog?", message: "All products revert to the seeded data. Orders and accounts are kept.", confirmLabel: "Reset", danger: true })) { reset(); flash("Catalog reset"); } }}>Reset demo catalog</button>
          </div>
        )}
      </div>
    </>
  );
}

/* =======================================================================
   POS SYNC — coming soon
   ======================================================================= */
export function ComingSoon() {
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
