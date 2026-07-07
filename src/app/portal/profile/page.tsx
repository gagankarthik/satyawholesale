"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth";
import { CONTACT } from "@/lib/store";
import { useAddresses } from "@/lib/addresses";
import { apiGet, apiPatchPath, uploadFile } from "@/lib/api";
import { paymentTermInfo } from "@/lib/paymentTerms";
import { Button } from "@/components/ui";
import { Check, Paperclip } from "@/components/Icons";

interface MyAccount {
  memberNo: string | null;
  store: string | null;
  contact: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: string | null;
  since: string | null;
  terms: string | null;
  businessLicense: string | null;
  tobaccoLicense: string | null;
  docs: { label: string; name: string; uploaded: number; url?: string; approved?: boolean }[];
}

const fmtDate = (ms: number) => {
  try { return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
  catch { return ""; }
};

export default function PortalProfile() {
  const { store, email, isAdmin } = useSession();
  const { addresses } = useAddresses(store ?? email ?? "");

  const [account, setAccount] = useState<MyAccount | null>(null);
  const [loadingAcct, setLoadingAcct] = useState(true);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ contact: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let live = true;
    apiGet<{ account: MyAccount | null }>("/api/me/account")
      .then((r) => { if (live) setAccount(r.account); })
      .catch(() => { if (live) setAccount(null); })
      .finally(() => { if (live) setLoadingAcct(false); });
    return () => { live = false; };
  }, []);

  const startEdit = () => {
    setForm({ contact: account?.contact ?? "", phone: account?.phone ?? "" });
    setNote(null);
    setEditing(true);
  };
  const saveInfo = async () => {
    setSaving(true);
    setNote(null);
    try {
      const r = await apiPatchPath<{ account: MyAccount | null }>("/api/me/account", { contact: form.contact.trim(), phone: form.phone.trim() });
      setAccount(r.account);
      setEditing(false);
      setNote({ kind: "ok", text: "Your info was updated." });
    } catch (e) {
      setNote({ kind: "err", text: e instanceof Error ? e.message : "Couldn't save your changes." });
    } finally {
      setSaving(false);
    }
  };

  const uploadDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setUploadingDoc(true);
    setNote(null);
    try {
      const url = await uploadFile(f, f.type, "documents");
      const r = await apiPatchPath<{ account: MyAccount | null }>("/api/me/account", { addDoc: { label: f.name, name: f.name, url } });
      setAccount(r.account);
      setNote({ kind: "ok", text: "Document uploaded. The warehouse will review it." });
    } catch (err) {
      setNote({ kind: "err", text: err instanceof Error ? err.message : "Couldn't upload that file." });
    } finally {
      setUploadingDoc(false);
    }
  };

  const docs = account?.docs ?? [];
  const hasCompliance = !!(account?.businessLicense || account?.tobaccoLicense || docs.length);

  return (
    <div className="od-cols rise-in">
      <div className="co-main">
        <div className="panel">
          <div className="panel-h">
            <h3>Account</h3>
            {!editing && <span className="hint">{isAdmin ? "Warehouse staff" : "Customer account"}</span>}
            {editing && <span className="hint">editing your contact info</span>}
          </div>

          {editing ? (
            <div className="formgrid" style={{ margin: 0 }}>
              <label className="field full"><span>Contact name</span><input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="Full name" /></label>
              <label className="field full"><span>Phone</span><input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(513) 555-0000" /></label>
              <p className="muted full" style={{ fontSize: 12.5, margin: "2px 2px 0" }}>Store name, payment terms and licenses are set by the warehouse. Call {CONTACT.phone} to change those.</p>
              <div className="full modalactions">
                <Button variant="ghost" onClick={() => { setEditing(false); setNote(null); }} disabled={saving}>Cancel</Button>
                <Button variant="primary" onClick={saveInfo} loading={saving}>Save changes</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="kvs">
                {account?.memberNo && <div className="kv2"><span>Membership no.</span><b><span className="memberno-val">{account.memberNo}</span></b></div>}
                <div className="kv2"><span>Store</span><b>{account?.store ?? store ?? "—"}</b></div>
                {account?.contact && <div className="kv2"><span>Contact</span><b>{account.contact}</b></div>}
                <div className="kv2"><span>Sign-in email</span><b>{account?.email ?? email}</b></div>
                {account?.phone && <div className="kv2"><span>Phone</span><b>{account.phone}</b></div>}
                {(account?.address || account?.city) && (
                  <div className="kv2 full"><span>Address</span><b>{[account?.address, account?.city, [account?.state, account?.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</b></div>
                )}
                {account?.terms && <div className="kv2"><span>Payment terms</span><b>{account.terms}</b></div>}
                {account?.terms && paymentTermInfo(account.terms) && (
                  <div className="kv2 full"><span>What it means</span><b style={{ fontWeight: 400, color: "var(--slate)" }}>{paymentTermInfo(account.terms)}</b></div>
                )}
                {account?.status && <div className="kv2"><span>Status</span><b>{account.status}</b></div>}
                <div className="kv2"><span>Access</span><b>{isAdmin ? "Admin + ordering" : "Ordering"}</b></div>
              </div>
              {!isAdmin && (
                <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
                  Update your contact name and phone below. Store details, licenses and payment terms are set by the warehouse ({CONTACT.phone}).
                </p>
              )}
              {!isAdmin && (
                <div style={{ marginTop: 16 }}>
                  <Button variant="primary" onClick={startEdit}>Update my info</Button>
                </div>
              )}
            </>
          )}

          {note && <p className={note.kind === "ok" ? "linklike" : "err"} style={{ fontSize: 13, marginTop: 12, color: note.kind === "ok" ? "var(--green)" : "var(--red)" }}>{note.text}</p>}
        </div>

        {/* documents & compliance submitted at sign-up / onboarding */}
        <div className="panel" style={{ marginTop: 18 }}>
          <div className="panel-h"><h3>Documents &amp; compliance</h3></div>
          {loadingAcct ? (
            <p className="muted" style={{ fontSize: 13 }}>Loading your documents…</p>
          ) : (
            <>
              {hasCompliance ? (
                <div className="doclist">
                  <div className="docchip">
                    <span className="di" aria-hidden="true"><Check /></span>
                    <div><div className="dn">Business license</div><div className="ds mono">{account?.businessLicense || "Not provided"}</div></div>
                  </div>
                  <div className="docchip">
                    <span className="di" aria-hidden="true"><Check /></span>
                    <div><div className="dn">Tobacco license</div><div className="ds mono">{account?.tobaccoLicense || "Not provided"}</div></div>
                  </div>
                  {docs.map((d, i) => (
                    <div className="docchip" key={i}>
                      <span className="di" aria-hidden="true"><Paperclip /></span>
                      <div>
                        <div className="dn">{d.label || d.name}</div>
                        <div className="ds">Uploaded {fmtDate(d.uploaded)} · <b style={{ color: d.approved ? "var(--green)" : "var(--slate-2)" }}>{d.approved ? "Approved" : "Pending review"}</b></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted" style={{ fontSize: 13 }}>
                  No documents on file yet. Upload your business or tobacco license (PDF or photo) below and the warehouse will review it.
                </p>
              )}
              {!isAdmin && (
                <label className="btn btn-ghost btn-sm uploadbtn" style={{ marginTop: 14 }}>
                  <Paperclip /> {uploadingDoc ? "Uploading…" : "Upload a document"}
                  <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={uploadDoc} disabled={uploadingDoc} />
                </label>
              )}
            </>
          )}
        </div>
      </div>

      <aside className="od-side">
        {account?.memberNo && (
          <div className="panel membercard">
            <div className="mc-label">Membership number</div>
            <div className="mc-no">{account.memberNo}</div>
            <div className="mc-store">{account?.store ?? store ?? "Customer account"}</div>
          </div>
        )}
        <div className="panel">
          <div className="panel-h"><h3>Saved addresses</h3><Link href="/portal/addresses" className="linklike">Manage</Link></div>
          {addresses.length > 0 ? (
            addresses.map((a) => (
              <div className="addrbox" key={a.id}><div className="al">{a.label}</div><p>{a.addr}</p></div>
            ))
          ) : (
            <p className="muted" style={{ fontSize: 13 }}>No saved addresses yet. <Link href="/portal/addresses" className="linklike">Add one</Link> for faster checkout.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
