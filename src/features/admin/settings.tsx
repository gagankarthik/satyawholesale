"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useSettings, LOW_STOCK, CONTACT,
} from "@/lib/store";
import {
  useStaff, createUser, PO_APPROVAL_THRESHOLD, ROLES, type Role,
} from "@/lib/wms";
import { Button, DialogFrame, EmptyState, FieldHelp, ListToolbar, Menu, Skeleton, Tabs, type ToolbarOption } from "@/components/ui";
import { useConfirm } from "@/components/Confirm";
import { Head, m, type Flash } from "./shared";

const EMPTY_STAFF = { name: "", email: "", role: "Viewer" as Role, device: "" };
export function UsersTab({ flash }: { flash: Flash }) {
  const { staff, add, update, remove, ready, error, refresh } = useStaff();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);
  const [d, setD] = useState(EMPTY_STAFF);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [sort, setSort] = useState("name");

  // New Cognito login (separate from the DynamoDB staff roster above).
  const [luEmail, setLuEmail] = useState("");
  const [luRole, setLuRole] = useState<"admin" | "buyer">("admin");
  const [luStore, setLuStore] = useState("");
  const [luBusy, setLuBusy] = useState(false);

  const createLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!luEmail.trim()) { flash("Email is required"); return; }
    if (luRole === "buyer" && !luStore.trim()) { flash("Store name is required for a customer login"); return; }
    setLuBusy(true);
    try {
      await createUser(luEmail.trim(), luRole, luRole === "buyer" ? luStore.trim() : undefined);
      flash("Login created. Cognito emailed a temporary password.");
      setLuEmail(""); setLuStore(""); setLuRole("admin");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not create login");
    } finally {
      setLuBusy(false);
    }
  };

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
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-h"><h3>Create login</h3><span className="hint">Cognito emails a temporary password</span></div>
        <form className="formgrid" onSubmit={createLogin}>
          <label className="field"><span>Email *</span><input type="email" value={luEmail} onChange={(e) => setLuEmail(e.target.value)} placeholder="person@store.com" required /></label>
          <label className="field"><span>Role</span>
            <select value={luRole === "admin" ? "Admin" : "Customer"} onChange={(e) => setLuRole(e.target.value === "Admin" ? "admin" : "buyer")}>
              <option>Admin</option>
              <option>Customer</option>
            </select>
          </label>
          {luRole === "buyer" && (
            <label className="field"><span>Store name *</span><input value={luStore} onChange={(e) => setLuStore(e.target.value)} placeholder="Jay's Stop &amp; Shop" required /></label>
          )}
          <div className="modalbtns full" style={{ marginTop: 4 }}>
            <Button variant="primary" size="sm" type="submit" loading={luBusy}>Create login</Button>
          </div>
        </form>
      </div>
      <ListToolbar
        search={{ value: query, onChange: setQuery, placeholder: "Search name or email…" }}
        filters={[{ label: "Role", value: role, onChange: setRole, options: roleOpts }]}
        sort={{ value: sort, onChange: setSort, options: [{ value: "name", label: "Name A–Z" }, { value: "role", label: "Role" }] }}
      />
      <div className="tablewrap">
        <table className="invtable">
          <thead><tr><th>User</th><th>Role</th><th>Scanner</th><th className="r">Status</th><th className="r"></th></tr></thead>
          <tbody>
            {!ready ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`s${i}`} aria-hidden="true"><td colSpan={5}><Skeleton width="100%" height={18} /></td></tr>
              ))
            ) : (
              <>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td><div className="prodcell"><span className="avatar">{u.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span><div><div className="pn">{u.name}</div><div className="mono muted" style={{ fontSize: 11 }}>{u.email}</div></div></div></td>
                    <td><select className="rolesel" aria-label={`Role for ${u.name}`} value={u.role} onChange={(e) => { update(u.id, { role: e.target.value as Role }); flash(`${u.name} is now ${e.target.value}`); }}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></td>
                    <td className="mono muted">{u.device || "—"}</td>
                    <td className="r"><span className={`ustatus ${u.status === "Active" ? "active" : "hold"}`}>{u.status}</span></td>
                    <td className="r">
                      <Menu
                        label={`Actions for ${u.name}`}
                        items={[
                          { label: u.status === "Active" ? "Suspend user" : "Restore user", danger: u.status === "Active", onSelect: () => { const suspending = u.status === "Active"; update(u.id, { status: suspending ? "Suspended" : "Active" }); flash(suspending ? `${u.name} suspended` : `${u.name} restored`); } },
                          { label: "Remove user", danger: true, onSelect: async () => { if (await confirm({ title: "Remove user?", message: `${u.name} will lose access and be removed.`, confirmLabel: "Remove", danger: true })) { remove(u.id); flash(`${u.name} removed`); } } },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={5} style={{ padding: 0 }}>
                    {error
                      ? <EmptyState title="Couldn't load" description="There was a problem loading users." action={<Button variant="ghost" onClick={refresh}>Retry</Button>} />
                      : <div className="muted" style={{ textAlign: "center", padding: "28px 0" }}>No users match.</div>}
                  </td></tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
      {adding && (
        <DialogFrame onClose={() => setAdding(false)} label="Add a user">
          <form className="modal" onSubmit={(e) => { e.preventDefault(); if (!d.name.trim()) return; add({ id: "U-" + Math.floor(10 + Math.random() * 89), name: d.name.trim(), email: d.email, role: d.role, device: d.device || null, status: "Active" }); setD(EMPTY_STAFF); setAdding(false); flash("User added"); }}>
            <h3>Add a user</h3>
            <div className="formgrid">
              <label className="field full"><span>Full name *</span><input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} required /></label>
              <label className="field"><span>Email</span><input type="email" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} /></label>
              <label className="field"><span>Role</span><select value={d.role} onChange={(e) => setD({ ...d, role: e.target.value as Role })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></label>
              <label className="field"><span>Scanner device <FieldHelp text="ID of the handheld barcode scanner assigned to this user (optional)." /></span><input value={d.device} onChange={(e) => setD({ ...d, device: e.target.value })} placeholder="SCN-120" /></label>
            </div>
            <div className="modalbtns"><button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button><button className="btn btn-primary" type="submit">Add user</button></div>
          </form>
        </DialogFrame>
      )}
    </>
  );
}

/* =======================================================================
   WAREHOUSE
   ======================================================================= */
export function SettingsTab({ flash }: { flash: Flash }) {
  const { settings, update } = useSettings();
  const [rate, setRate] = useState(String(settings.taxRate));
  const [label, setLabel] = useState(settings.taxLabel);
  const [countyRate, setCountyRate] = useState(String(settings.countyTaxRate ?? 0));
  const [countyLabel, setCountyLabel] = useState(settings.countyTaxLabel ?? "County tax");
  const [orderMin, setOrderMin] = useState(String(settings.orderMinimum ?? 0));
  const [delivFee, setDelivFee] = useState(String(settings.deliveryFee ?? 0));
  const [freeAt, setFreeAt] = useState(String(settings.freeFreightThreshold ?? 0));

  useEffect(() => {
    setRate(String(settings.taxRate)); setLabel(settings.taxLabel);
    setCountyRate(String(settings.countyTaxRate ?? 0)); setCountyLabel(settings.countyTaxLabel ?? "County tax");
    setOrderMin(String(settings.orderMinimum ?? 0)); setDelivFee(String(settings.deliveryFee ?? 0)); setFreeAt(String(settings.freeFreightThreshold ?? 0));
  }, [settings.taxRate, settings.taxLabel, settings.countyTaxRate, settings.countyTaxLabel, settings.orderMinimum, settings.deliveryFee, settings.freeFreightThreshold]);

  const [tab, setTab] = useState<"company" | "tax" | "policies">("company");

  const saveTax = (e: React.FormEvent) => {
    e.preventDefault();
    const r = Number(rate);
    const cr = Number(countyRate);
    if (Number.isNaN(r) || r < 0 || r > 100) { flash("Enter a sales tax rate between 0 and 100"); return; }
    if (Number.isNaN(cr) || cr < 0 || cr > 100) { flash("Enter a county tax rate between 0 and 100"); return; }
    update({ taxRate: r, taxLabel: label.trim() || "Sales tax", countyTaxRate: cr, countyTaxLabel: countyLabel.trim() || "County tax" });
    flash("Tax settings saved");
  };

  const savePolicies = (e: React.FormEvent) => {
    e.preventDefault();
    const om = Number(orderMin), df = Number(delivFee), fa = Number(freeAt);
    if ([om, df, fa].some((n) => Number.isNaN(n) || n < 0)) { flash("Enter valid, non-negative dollar amounts"); return; }
    update({ orderMinimum: om, deliveryFee: df, freeFreightThreshold: fa });
    flash("Ordering policy saved");
  };

  return (
    <>
      <Head title="Settings" sub="Company profile, tax and warehouse policies" />
      <Tabs
        ariaLabel="Settings sections"
        value={tab}
        onChange={(k) => setTab(k as typeof tab)}
        tabs={[{ key: "company", label: "Company" }, { key: "tax", label: "Tax & invoicing" }, { key: "policies", label: "Warehouse policies" }]}
      />

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
              <label className="field"><span>Sales tax rate (%) <FieldHelp text="Applied to taxable subtotals on customer orders. Resale-exempt customers are not charged." /></span>
                <input type="number" step="0.01" min={0} max={100} value={rate} onChange={(e) => setRate(e.target.value)} />
              </label>
              <label className="field"><span>Sales tax label <FieldHelp text="How this tax line is named on invoices (e.g. 'OH sales tax')." /></span>
                <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="OH sales tax" />
              </label>
              <label className="field"><span>County tax rate (%) <FieldHelp text="Additional local county tax, charged on top of the sales tax. Set 0 to disable." /></span>
                <input type="number" step="0.01" min={0} max={100} value={countyRate} onChange={(e) => setCountyRate(e.target.value)} />
              </label>
              <label className="field"><span>County tax label <FieldHelp text="How the county tax line is named on invoices." /></span>
                <input value={countyLabel} onChange={(e) => setCountyLabel(e.target.value)} placeholder="County tax" />
              </label>
              <div className="setrow full" style={{ borderBottom: "none" }}>
                <span>Combined rate</span><b>{(Number(rate) || 0) + (Number(countyRate) || 0)}%</b>
              </div>
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
          <div key="policies">
            <div className="panel anim-in" style={{ marginBottom: 18 }}>
              <div className="panel-h"><h3>Customer ordering &amp; delivery</h3><span className="hint">Applied at buyer checkout and enforced server-side</span></div>
              <form className="formgrid" onSubmit={savePolicies}>
                <label className="field"><span>Order minimum ($) <FieldHelp text="Smallest order subtotal a customer can check out with. Set 0 for no minimum." /></span>
                  <input type="number" step="0.01" min={0} value={orderMin} onChange={(e) => setOrderMin(e.target.value)} placeholder="0" />
                </label>
                <label className="field"><span>Delivery fee ($) <FieldHelp text="Flat fee on delivery orders. Pickup is always free. Set 0 for free delivery." /></span>
                  <input type="number" step="0.01" min={0} value={delivFee} onChange={(e) => setDelivFee(e.target.value)} placeholder="0" />
                </label>
                <label className="field"><span>Free delivery over ($) <FieldHelp text="Waive the delivery fee once the subtotal reaches this amount. Set 0 to always charge the fee." /></span>
                  <input type="number" step="0.01" min={0} value={freeAt} onChange={(e) => setFreeAt(e.target.value)} placeholder="0" />
                </label>
                <div className="modalbtns full" style={{ marginTop: 4 }}>
                  <button className="btn btn-primary btn-sm" type="submit">Save ordering policy</button>
                </div>
              </form>
            </div>
            <div className="panel anim-in">
              <div className="panel-h"><h3>Warehouse policies</h3></div>
              <div className="setrows">
                <div className="setrow"><span>Default low-stock threshold</span><b>{LOW_STOCK} cases</b></div>
                <div className="setrow"><span>PO approval threshold</span><b>{m(PO_APPROVAL_THRESHOLD)}</b></div>
                <div className="setrow"><span>Receiving tolerance</span><b>±5% of PO</b></div>
                <div className="setrow"><span>Barcode standard</span><b>UPC-A / EAN-13</b></div>
              </div>
            </div>
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
