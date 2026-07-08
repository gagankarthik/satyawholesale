"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useSettings, LOW_STOCK, CONTACT,
} from "@/lib/store";
import {
  useStaff, useAdmins, createUser, setAdminEnabled, removeAdmin,
  PO_APPROVAL_THRESHOLD, RECEIVE_TOLERANCE, ROLES, type Role, type StaffUser,
} from "@/lib/wms";
import { Button, DialogFrame, EmptyState, FieldHelp, ListToolbar, Menu, Skeleton, Tabs, type ToolbarOption } from "@/components/ui";
import { useConfirm } from "@/components/Confirm";
import { Eye, EyeOff, Pencil, Trash } from "@/components/Icons";
import { Head, type Flash } from "./shared";

const EMPTY_STAFF = { name: "", email: "", role: "Viewer" as Role, device: "" };
// Active/Inactive from a Cognito admin-group member's account state.
const cognitoActive = (a: { status: string; enabled: boolean }) => a.enabled && a.status === "CONFIRMED";

export function UsersTab({ flash }: { flash: Flash }) {
  const { staff, add, update, remove, ready, error, refresh } = useStaff();
  const { admins, ready: adminsReady, error: adminsError, refresh: refreshAdmins } = useAdmins();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);
  const [d, setD] = useState(EMPTY_STAFF);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [sort, setSort] = useState("name");

  // Adding a user creates their company admin login (Cognito emails a temporary
  // password) and the staff-roster row together. Customers never get logins
  // here — they self-sign-up on the site or are invited from Customer accounts.
  const [addBusy, setAddBusy] = useState(false);

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!d.name.trim()) { flash.error("Full name is required"); return; }
    if (!d.email.trim()) { flash.error("Email is required to create a login"); return; }
    setAddBusy(true);
    try {
      await createUser(d.email.trim(), "admin");
      add({ id: "U-" + Math.floor(10 + Math.random() * 89), name: d.name.trim(), email: d.email.trim(), role: d.role, device: d.device || null, status: "Active" });
      refreshAdmins(); // the new login joins the Cognito admin group
      flash("User added. Cognito emailed a temporary password.");
      setD(EMPTY_STAFF); setAdding(false);
    } catch (err) {
      flash.error(err instanceof Error ? err.message : "Could not create the login");
    } finally {
      setAddBusy(false);
    }
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editing.name.trim()) { flash.error("Full name is required"); return; }
    update(editing.id, { name: editing.name.trim(), role: editing.role, device: editing.device?.trim() || null });
    flash(`${editing.name.trim()} updated`);
    setEditing(null);
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

  // Real admins that aren't on the staff roster (e.g. the seeded owner login):
  // appended as rows so the table shows the whole admin group.
  const extraAdmins = useMemo(() => {
    const q = query.trim().toLowerCase();
    const onRoster = new Set(staff.map((u) => u.email.toLowerCase()));
    return admins
      .filter((a) => !onRoster.has(a.email.toLowerCase()))
      .filter(() => role === "all" || role === "Admin")
      .filter((a) => q === "" || a.email.toLowerCase().includes(q))
      .sort((a, b) => a.email.localeCompare(b.email));
  }, [admins, staff, role, query]);

  return (
    <>
      <Head title="Users & roles">
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Add user</button>
      </Head>

      {adminsError && (
        <div className="ustatus-note">
          Couldn&apos;t read console access from Cognito.
          <Button variant="ghost" size="sm" onClick={refreshAdmins}>Retry</Button>
        </div>
      )}

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
                {rows.map((u) => {
                  const active = u.status === "Active";
                  return (
                  <tr key={u.id}>
                    <td><div className="prodcell"><span className="avatar">{u.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span><div><div className="pn">{u.name}</div><div className="mono muted" style={{ fontSize: 11 }}>{u.email}</div></div></div></td>
                    <td><select className="rolesel" aria-label={`Role for ${u.name}`} value={u.role} onChange={(e) => { update(u.id, { role: e.target.value as Role }); flash(`${u.name} is now ${e.target.value}`); }}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></td>
                    <td className="mono muted">{u.device || "—"}</td>
                    <td className="r"><span className={`ustatus ${active ? "active" : "hold"}`}>{active ? "Active" : "Inactive"}</span></td>
                    <td className="r">
                      <Menu
                        label={`Actions for ${u.name}`}
                        items={[
                          { label: "Edit user", icon: <Pencil />, onSelect: () => setEditing(u) },
                          { label: active ? "Set inactive" : "Set active", icon: active ? <EyeOff /> : <Eye />, onSelect: () => { update(u.id, { status: active ? "Suspended" : "Active" }); flash(active ? `${u.name} set inactive` : `${u.name} set active`); } },
                          { label: "Delete user", icon: <Trash />, danger: true, onSelect: async () => { if (await confirm({ title: "Delete user?", message: `${u.name} will lose access and be removed.`, confirmLabel: "Delete", danger: true })) { remove(u.id); flash(`${u.name} deleted`); } } },
                        ]}
                      />
                    </td>
                  </tr>
                  );
                })}
                {/* Cognito admins with no staff-roster row. */}
                {adminsReady && extraAdmins.map((a) => {
                  const active = cognitoActive(a);
                  return (
                    <tr key={`admin-${a.email}`}>
                      <td><div className="prodcell"><span className="avatar">{a.email.slice(0, 2).toUpperCase()}</span><div><div className="pn">{a.email}</div></div></div></td>
                      <td className="mono muted">Admin</td>
                      <td className="mono muted">—</td>
                      <td className="r"><span className={`ustatus ${active ? "active" : "hold"}`}>{active ? "Active" : "Inactive"}</span></td>
                      <td className="r">
                        <Menu
                          label={`Actions for ${a.email}`}
                          items={[
                            { label: active ? "Set inactive" : "Set active", icon: active ? <EyeOff /> : <Eye />, onSelect: async () => {
                              try { await setAdminEnabled(a.email, !active); flash(active ? `${a.email} set inactive` : `${a.email} set active`); refreshAdmins(); }
                              catch (err) { flash.error(err instanceof Error ? err.message : "Couldn't update that login"); }
                            } },
                            { label: "Delete user", icon: <Trash />, danger: true, onSelect: async () => {
                              if (!await confirm({ title: "Delete user?", message: `${a.email} will lose access to the console.`, confirmLabel: "Delete", danger: true })) return;
                              try { await removeAdmin(a.email); flash(`${a.email} deleted`); refreshAdmins(); }
                              catch (err) { flash.error(err instanceof Error ? err.message : "Couldn't delete that user"); }
                            } },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
                {!rows.length && !extraAdmins.length && (
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
          <form className="modal" onSubmit={addUser}>
            <h3>Add a user</h3>
            <p className="auth-sub" style={{ marginTop: 0 }}>Creates a company admin login (Cognito emails a temporary password) and adds them to the staff roster.</p>
            <div className="formgrid">
              <label className="field full"><span>Full name *</span><input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} required autoFocus /></label>
              <label className="field"><span>Work email *</span><input type="email" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} placeholder="employee@satyawholesalers.com" required /></label>
              <label className="field"><span>Role</span><select value={d.role} onChange={(e) => setD({ ...d, role: e.target.value as Role })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></label>
              <label className="field full"><span>Scanner device <FieldHelp text="ID of the handheld barcode scanner assigned to this user (optional)." /></span><input value={d.device} onChange={(e) => setD({ ...d, device: e.target.value })} placeholder="SCN-120" /></label>
            </div>
            <div className="modalbtns"><Button variant="ghost" type="button" onClick={() => setAdding(false)} disabled={addBusy}>Cancel</Button><Button variant="primary" type="submit" loading={addBusy}>Add user</Button></div>
          </form>
        </DialogFrame>
      )}
      {editing && (
        <DialogFrame onClose={() => setEditing(null)} label="Edit user">
          <form className="modal" onSubmit={saveEdit}>
            <h3>Edit user</h3>
            <p className="auth-sub" style={{ marginTop: 0 }}>Update this user&apos;s details and role. The login email can&apos;t be changed here.</p>
            <div className="formgrid">
              <label className="field full"><span>Full name *</span><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required autoFocus /></label>
              <label className="field"><span>Work email</span><input type="email" value={editing.email} disabled /></label>
              <label className="field"><span>Role</span><select value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value as Role })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></label>
              <label className="field full"><span>Scanner device <FieldHelp text="ID of the handheld barcode scanner assigned to this user (optional)." /></span><input value={editing.device ?? ""} onChange={(e) => setEditing({ ...editing, device: e.target.value })} placeholder="SCN-120" /></label>
            </div>
            <div className="modalbtns"><Button variant="ghost" type="button" onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" type="submit">Save changes</Button></div>
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
  const [lowStock, setLowStock] = useState(String(settings.lowStock ?? LOW_STOCK));
  const [poApproval, setPoApproval] = useState(String(settings.poApproval ?? PO_APPROVAL_THRESHOLD));
  const [recvTol, setRecvTol] = useState(String((settings.receiveTolerance ?? RECEIVE_TOLERANCE) * 100));

  useEffect(() => {
    setRate(String(settings.taxRate)); setLabel(settings.taxLabel);
    setCountyRate(String(settings.countyTaxRate ?? 0)); setCountyLabel(settings.countyTaxLabel ?? "County tax");
    setOrderMin(String(settings.orderMinimum ?? 0)); setDelivFee(String(settings.deliveryFee ?? 0)); setFreeAt(String(settings.freeFreightThreshold ?? 0));
    setLowStock(String(settings.lowStock ?? LOW_STOCK)); setPoApproval(String(settings.poApproval ?? PO_APPROVAL_THRESHOLD)); setRecvTol(String((settings.receiveTolerance ?? RECEIVE_TOLERANCE) * 100));
  }, [settings.taxRate, settings.taxLabel, settings.countyTaxRate, settings.countyTaxLabel, settings.orderMinimum, settings.deliveryFee, settings.freeFreightThreshold, settings.lowStock, settings.poApproval, settings.receiveTolerance]);

  const [tab, setTab] = useState<"company" | "tax" | "policies">("company");

  const saveTax = (e: React.FormEvent) => {
    e.preventDefault();
    const r = Number(rate);
    const cr = Number(countyRate);
    if (Number.isNaN(r) || r < 0 || r > 100) { flash.error("Enter a sales tax rate between 0 and 100"); return; }
    if (Number.isNaN(cr) || cr < 0 || cr > 100) { flash.error("Enter a county tax rate between 0 and 100"); return; }
    update({ taxRate: r, taxLabel: label.trim() || "Sales tax", countyTaxRate: cr, countyTaxLabel: countyLabel.trim() || "County tax" });
    flash("Tax settings saved");
  };

  const savePolicies = (e: React.FormEvent) => {
    e.preventDefault();
    const om = Number(orderMin), df = Number(delivFee), fa = Number(freeAt);
    if ([om, df, fa].some((n) => Number.isNaN(n) || n < 0)) { flash.error("Enter valid, non-negative dollar amounts"); return; }
    update({ orderMinimum: om, deliveryFee: df, freeFreightThreshold: fa });
    flash("Ordering policy saved");
  };

  const saveWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    const ls = Number(lowStock), pa = Number(poApproval), rt = Number(recvTol);
    if ([ls, pa, rt].some((n) => Number.isNaN(n) || n < 0)) { flash.error("Enter valid, non-negative values"); return; }
    update({ lowStock: ls, poApproval: pa, receiveTolerance: rt / 100 });
    flash("Warehouse policy saved");
  };

  return (
    <>
      <Head title="Settings" />
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
            <div className="panel-h"><h3>Tax &amp; invoicing</h3></div>
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
              <div className="panel-h"><h3>Customer ordering &amp; delivery</h3></div>
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
                <div className="modalbtns" style={{ gridColumn: "1 / -1", marginTop: 4 }}>
                  <button className="btn btn-primary btn-sm" type="submit">Save ordering policy</button>
                </div>
              </form>
            </div>
            <div className="panel anim-in">
              <div className="panel-h"><h3>Warehouse policies</h3></div>
              <form className="formgrid" onSubmit={saveWarehouse}>
                <label className="field"><span>Low-stock threshold (cases) <FieldHelp text="Products at or below this on-hand quantity are flagged as low / needing reorder when they have no reorder point of their own." /></span>
                  <input type="number" min={0} value={lowStock} onChange={(e) => setLowStock(e.target.value)} placeholder={String(LOW_STOCK)} />
                </label>
                <label className="field"><span>PO approval threshold ($) <FieldHelp text="Purchase orders above this value require manager approval before they can be sent." /></span>
                  <input type="number" step="0.01" min={0} value={poApproval} onChange={(e) => setPoApproval(e.target.value)} placeholder={String(PO_APPROVAL_THRESHOLD)} />
                </label>
                <label className="field"><span>Receiving tolerance (%) <FieldHelp text="How far over the ordered quantity receivers may accept before it is flagged as a variance." /></span>
                  <input type="number" step="0.1" min={0} value={recvTol} onChange={(e) => setRecvTol(e.target.value)} placeholder="5" />
                </label>
                <div className="setrow full" style={{ borderBottom: "none" }}>
                  <span>Barcode standard</span><b>UPC-A / EAN-13</b>
                </div>
                <div className="modalbtns" style={{ gridColumn: "1 / -1", marginTop: 4 }}>
                  <button className="btn btn-primary btn-sm" type="submit">Save warehouse policy</button>
                </div>
              </form>
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
      <Head title="POS sync" />
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
