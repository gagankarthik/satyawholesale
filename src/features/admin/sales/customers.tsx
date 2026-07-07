"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrders } from "@/lib/store";
import { useCustomers, setAccountStatus } from "@/lib/wms";
import { Plus, Check, Paperclip } from "@/components/Icons";
import { useConfirm } from "@/components/Confirm";
import { Head, FlowHelp, CUSTOMER_FLOW, tableEmpty, m, k, timeAgo, type Flash } from "../shared";
import { KpiCard, DataTable, Badge, Button, DialogFrame, ListToolbar, Menu, type Column, type ToolbarOption } from "@/components/ui";
import { acctTone, statusTone } from "./_shared";

/* =======================================================================
   CUSTOMERS / ACCOUNTS  (approval)
   ======================================================================= */
const EMPTY_INVITE = { store: "", contact: "", email: "", phone: "", city: "Cincinnati, OH", terms: "Net 15" };
export function CustomersTab({ flash }: { flash: Flash }) {
  const { customers, setStatus, update, add, remove, ready, error, refresh } = useCustomers();
  const { orders } = useOrders();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "Pending" | "Active" | "Frozen" | "Blocked">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");
  const [openId, setOpenId] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [inviting, setInviting] = useState(false);
  const [inv, setInv] = useState(EMPTY_INVITE);
  const [docEdit, setDocEdit] = useState(false);
  const [docDraft, setDocDraft] = useState({ business: "", tobacco: "" });
  const confirm = useConfirm();

  const sendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inv.store.trim() || !inv.email.trim()) { flash("Store name and email are required"); return; }
    add({
      id: "C-" + Math.floor(1300 + Math.random() * 700),
      store: inv.store.trim(), contact: inv.contact.trim(), email: inv.email.trim(),
      phone: inv.phone.trim(), city: inv.city, since: String(new Date().getFullYear()),
      status: "Pending", terms: inv.terms, applied: Date.now(),
    });
    setInv(EMPTY_INVITE); setInviting(false);
    flash("Invite sent, account pending");
  };

  const stats = customers.map((c) => {
    const theirs = orders.filter((o) => o.store === c.store);
    return { ...c, orders: theirs.length, spend: theirs.reduce((s, o) => s + o.total, 0), history: theirs };
  });
  const pending = stats.filter((c) => c.status === "Pending");
  const rows = (() => {
    const q = query.trim().toLowerCase();
    const list = stats.filter(
      (c) =>
        (filter === "all" || c.status === filter) &&
        (q === "" || c.store.toLowerCase().includes(q) || c.contact.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
    );
    return [...list].sort((a, b) => {
      switch (sort) {
        case "orders-desc": return b.orders - a.orders;
        case "spend-desc": return b.spend - a.spend;
        default: return a.store.localeCompare(b.store);
      }
    });
  })();
  const ACCT_STATUS_OPTS: ToolbarOption[] = [
    { value: "all", label: "All statuses" },
    { value: "Pending", label: "Pending" },
    { value: "Active", label: "Active" },
    { value: "Frozen", label: "Frozen" },
    { value: "Blocked", label: "Blocked" },
  ];
  const ACCT_SORT_OPTS: ToolbarOption[] = [
    { value: "name", label: "Store A–Z" },
    { value: "orders-desc", label: "Most orders" },
    { value: "spend-desc", label: "Highest spend" },
  ];
  const cur = stats.find((s) => s.id === openId) || null;

  const startEdit = () => { if (cur) { setDraft({ store: cur.store, contact: cur.contact, email: cur.email, phone: cur.phone || "", address: cur.address || "", terms: cur.terms || "Net 15" }); setEdit(true); } };
  const saveEdit = () => { if (cur) { update(cur.id, draft); setEdit(false); flash("Account updated"); } };

  /* ---------- full-page account detail ---------- */
  if (cur) {
    const st: string = cur.status;
    const confirmBlock = async () => {
      if (await confirm({ title: "Block account?", message: `${cur.store} will no longer be able to sign in.`, confirmLabel: "Block account", danger: true })) {
        await setAccountStatus(cur.id, "block"); refresh(); flash("Account blocked");
      }
    };
    return (
      <>
        <button className="detail-back" onClick={() => { setOpenId(null); setEdit(false); }}>← All accounts</button>
        <header className="adminbar">
          <div><h1>{cur.store}</h1><p>Member #{cur.memberNo ?? "—"} · {cur.contact} · account since {cur.since}</p></div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Badge tone={acctTone(cur.status)}>{cur.status}</Badge>
            {(st === "Active" || st === "Pending") && (
              <>
                <Button variant="ghost" size="sm" style={{ color: "var(--red)" }} onClick={async () => { if (await confirm({ title: "Freeze account?", message: `${cur.store} can still sign in and browse but cannot place orders.`, confirmLabel: "Freeze account", danger: true })) { await setAccountStatus(cur.id, "freeze"); refresh(); flash("Account frozen"); } }}>Freeze</Button>
                <Button variant="ghost" size="sm" style={{ color: "var(--red)" }} onClick={confirmBlock}>Block</Button>
              </>
            )}
            {st === "Frozen" && (
              <>
                <Button variant="primary" size="sm" onClick={async () => { await setAccountStatus(cur.id, "unfreeze"); refresh(); flash("Account reactivated"); }}>Unfreeze</Button>
                <Button variant="ghost" size="sm" style={{ color: "var(--red)" }} onClick={confirmBlock}>Block</Button>
              </>
            )}
            {st === "Blocked" && (
              <Button variant="primary" size="sm" onClick={async () => { await setAccountStatus(cur.id, "unblock"); refresh(); flash("Account reactivated"); }}>Unblock</Button>
            )}
            {!edit && <Button variant="ghost" size="sm" onClick={startEdit}>Edit</Button>}
            <Button variant="ghost" size="sm" style={{ color: "var(--red)" }} onClick={async () => { if (await confirm({ title: "Delete account?", message: `${cur.store} and its access will be removed.`, confirmLabel: "Delete account", danger: true })) { remove(cur.id); setOpenId(null); flash("Account deleted"); } }}>Delete</Button>
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
                  <label className="field"><span>Email</span><input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></label>
                  <label className="field"><span>Phone</span><input type="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></label>
                  <label className="field"><span>Payment terms</span><input value={draft.terms} onChange={(e) => setDraft({ ...draft, terms: e.target.value })} /></label>
                  <label className="field full"><span>Address</span><input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></label>
                  <div className="full modalactions"><Button variant="ghost" onClick={() => setEdit(false)}>Cancel</Button><Button variant="primary" onClick={saveEdit}>Save changes</Button></div>
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
                <div className="tablewrap">
                <table className="invtable flat">
                  <thead><tr><th>Order</th><th>Date</th><th className="r">Cases</th><th className="r">Total</th><th>Status</th></tr></thead>
                  <tbody>
                    {cur.history.map((o) => (
                      <tr key={o.ref} className="clickrow" style={{ cursor: "pointer" }} onClick={() => router.push(`/admin/orders/${o.ref}`)}><td className="mono" style={{ fontWeight: 600 }}>{o.ref}</td><td className="muted" style={{ fontSize: 13 }}>{timeAgo(o.placed)}</td><td className="r mono">{o.cases}</td><td className="r mono">{m(o.total)}</td><td><Badge tone={statusTone(o.status)}>{o.status}</Badge></td></tr>
                    ))}
                  </tbody>
                </table>
                </div>
              ) : <p style={{ color: "var(--slate)", fontSize: 14 }}>No orders on record yet. Orders this account places in the portal will appear here.</p>}
            </div>
          </div>

          <aside className="detail-side">
            <div className="panel">
              <div className="panel-h"><h3>Approval</h3></div>
              <div className="modalactions" style={{ flexDirection: "column" }}>
                {cur.status !== "Active" && <Button fullWidth onClick={() => { setStatus(cur.id, "Active"); flash("Account approved"); }}>Approve account</Button>}
                {cur.status !== "Pending" && <Button variant="ghost" fullWidth onClick={() => { setStatus(cur.id, "Pending"); flash("Marked pending"); }}>Mark pending</Button>}
                <p className="hint" style={{ margin: "6px 2px 0" }}>Use Freeze or Block above to suspend ordering or sign-in.</p>
              </div>
            </div>
            <div className="panel">
              <div className="panel-h"><h3>Verification documents</h3>
                {docEdit
                  ? <span className="hint">editing</span>
                  : <Button variant="ghost" size="sm" onClick={() => { setDocDraft({ business: cur.businessLicense || "", tobacco: cur.tobaccoLicense || "" }); setDocEdit(true); }}>Edit</Button>}
              </div>
              {docEdit ? (
                <div className="formgrid" style={{ margin: 0 }}>
                  <label className="field full"><span>Business license #</span><input value={docDraft.business} onChange={(e) => setDocDraft({ ...docDraft, business: e.target.value })} /></label>
                  <label className="field full"><span>Tobacco license #</span><input value={docDraft.tobacco} onChange={(e) => setDocDraft({ ...docDraft, tobacco: e.target.value })} /></label>
                  <div className="full modalactions"><Button variant="ghost" onClick={() => setDocEdit(false)}>Cancel</Button><Button variant="primary" onClick={() => { update(cur.id, { businessLicense: docDraft.business.trim() || undefined, tobaccoLicense: docDraft.tobacco.trim() || undefined }); setDocEdit(false); flash("Documents updated"); }}>Save</Button></div>
                </div>
              ) : (
                <div className="doclist">
                  <div className="docchip"><span className="di" aria-hidden="true"><Check /></span><div><div className="dn">Business license</div><div className="ds mono">{cur.businessLicense || "—"}</div></div></div>
                  <div className="docchip"><span className="di" aria-hidden="true"><Check /></span><div><div className="dn">Tobacco license</div><div className="ds mono">{cur.tobaccoLicense || "—"}</div></div></div>
                  <div className="docchip"><span className="di" aria-hidden="true"><Check /></span><div><div className="dn">Age verification</div><div className="ds">21+ confirmed</div></div></div>
                  {(cur.docs || []).map((d, i) => (
                    <div className="docchip" key={i}><span className="di" aria-hidden="true"><Paperclip /></span><div><div className="dn">{d.label}</div><div className="ds">uploaded {timeAgo(d.uploaded)}</div></div></div>
                  ))}
                </div>
              )}
              <label className="btn btn-ghost btn-sm uploadbtn" style={{ marginTop: 14 }}>
                <Paperclip /> Upload document
                <input type="file" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { update(cur.id, { docs: [...(cur.docs || []), { label: f.name, name: f.name, uploaded: Date.now() }] }); flash("Document uploaded"); } e.target.value = ""; }} />
              </label>
            </div>
          </aside>
        </div>
      </>
    );
  }

  /* ---------- list ---------- */
  const acctColumns: Column<(typeof stats)[number]>[] = [
    { key: "store", header: "Store", render: (c) => (
      <div className="prodcell">
        <span className="avatar">{c.store.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</span>
        <div><div className="pn">{c.store}</div><div className="mono muted" style={{ fontSize: 11 }}>{c.id} · {c.email}</div></div>
      </div>
    ) },
    { key: "contact", header: "Contact", render: (c) => <span style={{ fontSize: 13 }}>{c.contact}</span> },
    { key: "city", header: "Location", render: (c) => <span style={{ fontSize: 13 }}>{c.city}</span> },
    { key: "orders", header: "Orders", align: "right", render: (c) => <span className="mono">{c.orders}</span> },
    { key: "spend", header: "Spend", align: "right", render: (c) => <span className="mono">{m(c.spend)}</span> },
    { key: "status", header: "Status", align: "right", render: (c) => <Badge tone={acctTone(c.status)}>{c.status}</Badge> },
    { key: "action", header: "", align: "right", render: (c) => (
      <Menu
        label={`Actions for ${c.store}`}
        items={[
          { label: "Open account", onSelect: () => setOpenId(c.id) },
          ...(c.status !== "Active" ? [{ label: "Approve account", onSelect: () => { setStatus(c.id, "Active"); flash("Account approved"); } }] : []),
          ...(c.status === "Frozen"
            ? [{ label: "Unfreeze account", onSelect: async () => { await setAccountStatus(c.id, "unfreeze"); refresh(); flash("Account reactivated"); } }]
            : [{ label: "Freeze account", onSelect: async () => { await setAccountStatus(c.id, "freeze"); refresh(); flash("Account frozen"); } }]),
        ]}
      />
    ) },
  ];

  return (
    <>
      <Head title="Customer accounts" sub="Review applications, approve stores, then they order in the portal">
        <Button variant="primary" size="sm" onClick={() => setInviting(true)}><Plus /> Invite account</Button>
      </Head>
      <FlowHelp steps={CUSTOMER_FLOW} active="review" title="Customer onboarding" />
      <div className="kpis">
        <KpiCard label="Total accounts" value={customers.length} foot="on file" />
        <KpiCard label="Active" value={stats.filter((c) => c.status === "Active").length} foot="cleared to order" />
        <KpiCard tone="danger" label="Pending approval" value={pending.length} foot="submitted from the site" />
        <KpiCard label="Lifetime sales" value={k(stats.reduce((s, c) => s + c.spend, 0))} foot="across accounts" />
      </div>
      <ListToolbar
        search={{ value: query, onChange: setQuery, placeholder: "Search store, contact or email…" }}
        filters={[{ label: "Status", value: filter, onChange: (v) => setFilter(v as "all" | "Pending" | "Active" | "Frozen" | "Blocked"), options: ACCT_STATUS_OPTS }]}
        sort={{ value: sort, onChange: setSort, options: ACCT_SORT_OPTS }}
      />
      <DataTable
        columns={acctColumns}
        rows={rows}
        rowKey={(c) => c.id}
        onRowClick={(c) => setOpenId(c.id)}
        rowClassName={(c) => (c.status === "Pending" ? "rowflag" : undefined)}
        loading={!ready}
        empty={tableEmpty(error, refresh, "No accounts match.")}
        pageSize={25}
      />

      {inviting && (
        <DialogFrame onClose={() => setInviting(false)} label="Invite a customer account">
          <form className="modal" onSubmit={sendInvite}>
            <h3>Invite a customer account</h3>
            <p className="auth-sub" style={{ marginTop: 0 }}>They&apos;ll be created as Pending until verified and approved.</p>
            <div className="formgrid">
              <label className="field full"><span>Store name *</span><input value={inv.store} onChange={(e) => setInv({ ...inv, store: e.target.value })} required placeholder="Jay's Stop & Shop" /></label>
              <label className="field"><span>Contact</span><input value={inv.contact} onChange={(e) => setInv({ ...inv, contact: e.target.value })} placeholder="Full name" /></label>
              <label className="field"><span>Email *</span><input type="email" value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} required placeholder="buyer@store.com" /></label>
              <label className="field"><span>Phone</span><input type="tel" value={inv.phone} onChange={(e) => setInv({ ...inv, phone: e.target.value })} placeholder="(513) 555-0000" /></label>
              <label className="field"><span>City</span><input value={inv.city} onChange={(e) => setInv({ ...inv, city: e.target.value })} /></label>
              <label className="field"><span>Payment terms</span><select value={inv.terms} onChange={(e) => setInv({ ...inv, terms: e.target.value })}><option>Net 15</option><option>Net 30</option><option>COD</option></select></label>
            </div>
            <div className="modalbtns"><Button variant="ghost" type="button" onClick={() => setInviting(false)}>Cancel</Button><Button variant="primary" type="submit">Send invite</Button></div>
          </form>
        </DialogFrame>
      )}
    </>
  );
}
