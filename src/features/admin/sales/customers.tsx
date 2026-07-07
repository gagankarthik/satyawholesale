"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrders } from "@/lib/store";
import { useCustomers, setAccountStatus } from "@/lib/wms";
import { resolveFileUrl } from "@/lib/api";
import { Plus, Check, Paperclip, ArrowLeft } from "@/components/Icons";
import { useConfirm } from "@/components/Confirm";
import { Head, FlowHelp, CUSTOMER_FLOW, tableEmpty, m, k, timeAgo, type Flash } from "../shared";
import { KpiCard, DataTable, Badge, Button, DialogFrame, ListToolbar, Menu, type Column, type ToolbarOption, type MenuAction } from "@/components/ui";
import { PaymentTermsSelect, PaymentTermHint, PaymentTermsGuide } from "@/components/PaymentTerms";
import { paymentTermInfo, DEFAULT_PAYMENT_TERM } from "@/lib/paymentTerms";
import { acctTone, statusTone } from "./_shared";

/* =======================================================================
   CUSTOMERS / ACCOUNTS  (approval)
   ======================================================================= */
const EMPTY_INVITE = { store: "", contact: "", email: "", phone: "", address: "", city: "Cincinnati", state: "OH", zip: "", terms: DEFAULT_PAYMENT_TERM };
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
      phone: inv.phone.trim(), address: inv.address.trim() || undefined,
      city: inv.city.trim(), state: inv.state.trim() || undefined, zip: inv.zip.trim() || undefined,
      since: String(new Date().getFullYear()),
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

  const startEditFor = (c: (typeof stats)[number]) => {
    setDraft({ store: c.store, contact: c.contact, email: c.email, phone: c.phone || "", address: c.address || "", city: c.city || "", state: c.state || "", zip: c.zip || "", terms: c.terms || "Net 15" });
    setOpenId(c.id); setEdit(true);
  };
  const saveEdit = () => { if (cur) { update(cur.id, draft); setEdit(false); flash("Account updated"); } };

  /* Verification documents the customer uploaded from their profile: the
     warehouse reviews each one and approves (or removes) it here. */
  const setDocApproved = (i: number, approved: boolean) => {
    if (!cur) return;
    update(cur.id, { docs: (cur.docs || []).map((d, j) => (j === i ? { ...d, approved } : d)) });
    flash(approved ? "Document approved" : "Approval removed");
  };
  const removeDoc = (i: number) => {
    if (!cur) return;
    update(cur.id, { docs: (cur.docs || []).filter((_, j) => j !== i) });
    flash("Document removed");
  };
  const viewDoc = async (url?: string) => {
    if (!url) return;
    try { window.open(await resolveFileUrl(url), "_blank", "noopener"); }
    catch { flash("Couldn't open that document"); }
  };

  /* One source of truth for account actions, used by both the list row menu
     and the open-account header, so every surface offers the same options in
     the same order and wording. `includeOpen` adds the list's "Open account". */
  const accountActions = (c: (typeof stats)[number], opts?: { includeOpen?: boolean }): MenuAction[] => {
    const items: MenuAction[] = [];
    if (opts?.includeOpen) items.push({ label: "Open account", onSelect: () => setOpenId(c.id) });
    if (c.status !== "Active") items.push({ label: "Approve account", onSelect: () => { setStatus(c.id, "Active"); flash("Account approved"); } });
    if (c.status !== "Pending") items.push({ label: "Mark pending", onSelect: () => { setStatus(c.id, "Pending"); flash("Marked pending"); } });
    // Freeze / Unfreeze — a blocked account can't be frozen, only unblocked.
    if (c.status === "Frozen")
      items.push({ label: "Unfreeze account", onSelect: async () => { await setAccountStatus(c.id, "unfreeze"); refresh(); flash("Account reactivated"); } });
    else if (c.status !== "Blocked")
      items.push({ label: "Freeze account", onSelect: async () => { if (await confirm({ title: "Freeze account?", message: `${c.store} can still sign in and browse but cannot place orders.`, confirmLabel: "Freeze account", danger: true })) { await setAccountStatus(c.id, "freeze"); refresh(); flash("Account frozen"); } } });
    // Block / Unblock
    if (c.status === "Blocked")
      items.push({ label: "Unblock account", onSelect: async () => { await setAccountStatus(c.id, "unblock"); refresh(); flash("Account reactivated"); } });
    else
      items.push({ label: "Block account", danger: true, onSelect: async () => { if (await confirm({ title: "Block account?", message: `${c.store} will no longer be able to sign in.`, confirmLabel: "Block account", danger: true })) { await setAccountStatus(c.id, "block"); refresh(); flash("Account blocked"); } } });
    items.push({ label: "Edit details", onSelect: () => startEditFor(c) });
    items.push({ label: "Delete account", danger: true, onSelect: async () => { if (await confirm({ title: "Delete account?", message: `${c.store} and its access will be removed.`, confirmLabel: "Delete account", danger: true })) { remove(c.id); setOpenId(null); flash("Account deleted"); } } });
    return items;
  };

  /* ---------- full-page account detail ---------- */
  if (cur) {
    return (
      <>
        <button className="detail-back" onClick={() => { setOpenId(null); setEdit(false); }}><ArrowLeft /> All accounts</button>
        <header className="adminbar">
          <div><h1>{cur.store}</h1><p>Member #{cur.memberNo ?? "—"} · {cur.contact} · account since {cur.since}</p></div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Badge tone={acctTone(cur.status)}>{cur.status}</Badge>
            <Menu label={`Actions for ${cur.store}`} items={accountActions(cur)} />
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
                  <label className="field"><span>Payment terms</span>
                    <PaymentTermsSelect ariaLabel="Payment terms" value={draft.terms} onChange={(v) => setDraft({ ...draft, terms: v })} />
                    <PaymentTermHint term={draft.terms} />
                  </label>
                  <label className="field full"><span>Street address</span><input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="123 Reading Rd" /></label>
                  <div className="field-row">
                    <label className="field"><span>City</span><input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} /></label>
                    <label className="field"><span>State</span><input value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value })} maxLength={2} /></label>
                    <label className="field"><span>ZIP</span><input value={draft.zip} onChange={(e) => setDraft({ ...draft, zip: e.target.value })} inputMode="numeric" /></label>
                  </div>
                  <div className="full modalactions"><Button variant="ghost" onClick={() => setEdit(false)}>Cancel</Button><Button variant="primary" onClick={saveEdit}>Save changes</Button></div>
                </div>
              ) : (
                <div className="kvs two">
                  <div className="kv2"><span>Primary contact</span><b>{cur.contact}</b></div>
                  <div className="kv2"><span>Email</span><b>{cur.email}</b></div>
                  <div className="kv2"><span>Phone</span><b>{cur.phone || "—"}</b></div>
                  <div className="kv2"><span>Payment terms</span><b>{cur.terms || DEFAULT_PAYMENT_TERM}</b></div>
                  {paymentTermInfo(cur.terms || DEFAULT_PAYMENT_TERM) && (
                    <div className="kv2 full"><span>What it means</span><b style={{ fontWeight: 400, color: "var(--slate)" }}>{paymentTermInfo(cur.terms || DEFAULT_PAYMENT_TERM)}</b></div>
                  )}
                  <div className="kv2 full"><span>Address</span><b>{[cur.address, cur.city, [cur.state, cur.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "—"}</b></div>
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
                    <div className="docchip" key={i}>
                      <span className="di" aria-hidden="true"><Paperclip /></span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="dn">{d.label}</div>
                        <div className="ds">uploaded {timeAgo(d.uploaded)} · <b style={{ color: d.approved ? "var(--green)" : "var(--slate-2)" }}>{d.approved ? "Approved" : "Pending review"}</b></div>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {d.url && <Button variant="ghost" size="sm" onClick={() => viewDoc(d.url)}>View</Button>}
                        <Button variant={d.approved ? "ghost" : "primary"} size="sm" onClick={() => setDocApproved(i, !d.approved)}>{d.approved ? "Unapprove" : "Approve"}</Button>
                        <Menu label={`Actions for ${d.label}`} items={[{ label: "Remove document", danger: true, onSelect: () => removeDoc(i) }]} />
                      </div>
                    </div>
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
      <Menu label={`Actions for ${c.store}`} items={accountActions(c, { includeOpen: true })} />
    ) },
  ];

  return (
    <>
      <Head title="Customer accounts" sub="Review applications, approve stores, then they order in the portal">
        <PaymentTermsGuide />
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
              <label className="field full"><span>Street address</span><input value={inv.address} onChange={(e) => setInv({ ...inv, address: e.target.value })} placeholder="123 Reading Rd" /></label>
              <div className="field-row">
                <label className="field"><span>City</span><input value={inv.city} onChange={(e) => setInv({ ...inv, city: e.target.value })} /></label>
                <label className="field"><span>State</span><input value={inv.state} onChange={(e) => setInv({ ...inv, state: e.target.value })} maxLength={2} /></label>
                <label className="field"><span>ZIP</span><input value={inv.zip} onChange={(e) => setInv({ ...inv, zip: e.target.value })} inputMode="numeric" /></label>
              </div>
              <label className="field"><span>Payment terms</span>
                <PaymentTermsSelect ariaLabel="Payment terms" value={inv.terms} onChange={(v) => setInv({ ...inv, terms: v })} />
                <PaymentTermHint term={inv.terms} />
              </label>
            </div>
            <div className="modalbtns"><Button variant="ghost" type="button" onClick={() => setInviting(false)}>Cancel</Button><Button variant="primary" type="submit">Send invite</Button></div>
          </form>
        </DialogFrame>
      )}
    </>
  );
}
