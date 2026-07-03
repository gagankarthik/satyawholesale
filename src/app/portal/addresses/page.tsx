"use client";

import { useEffect, useState } from "react";
import { Pin, Plus, Trash } from "@/components/Icons";
import { Button } from "@/components/ui";
import { useConfirm } from "@/components/Confirm";
import { usePortal } from "../PortalShell";
import { ADDRESSES } from "../meta";

type Addr = { id: string; label: string; addr: string };
const KEY = "satya.addresses";

export default function PortalAddresses() {
  const { flash } = usePortal();
  const confirm = useConfirm();
  const [list, setList] = useState<Addr[]>(ADDRESSES);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ label: "", addr: "" });

  useEffect(() => {
    try { const s = localStorage.getItem(KEY); if (s) setList(JSON.parse(s)); } catch {}
  }, []);
  const persist = (next: Addr[]) => { setList(next); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {} };

  const addAddr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.label.trim() || !draft.addr.trim()) return;
    persist([...list, { id: "a" + Date.now(), label: draft.label.trim(), addr: draft.addr.trim() }]);
    setDraft({ label: "", addr: "" });
    setAdding(false);
    flash("Address added");
  };
  const removeAddr = async (a: Addr) => {
    if (!(await confirm({ title: "Remove this address?", message: `"${a.label}" will no longer be offered at checkout.`, confirmLabel: "Remove address", danger: true }))) return;
    persist(list.filter((x) => x.id !== a.id));
    flash(`${a.label} removed`);
  };

  return (
    <>
      <div className="addrgrid">
        {list.map((a, i) => (
          <div className="addrcard" key={a.id}>
            <div className="addrcard-h">
              <span className="addrcard-ic" aria-hidden="true"><Pin /></span>
              <b>{a.label}</b>
              {i === 0 && <span className="addrcard-def">Default</span>}
            </div>
            <p>{a.addr}</p>
            {list.length > 1 && (
              <button type="button" className="addrcard-rm" onClick={() => removeAddr(a)} aria-label={`Remove ${a.label}`}><Trash /> Remove</button>
            )}
          </div>
        ))}
        <button type="button" className="addrcard addrcard-add" onClick={() => setAdding(true)}>
          <span className="addrcard-add-ic"><Plus /></span>
          Add address
        </button>
      </div>

      {adding && (
        <div className="modal-overlay" onClick={() => setAdding(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={addAddr}>
            <h3>Add a delivery address</h3>
            <div className="formgrid">
              <label className="field full"><span>Label</span><input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="e.g. Back dock" required autoFocus /></label>
              <label className="field full"><span>Address</span><input value={draft.addr} onChange={(e) => setDraft({ ...draft, addr: e.target.value })} placeholder="Street, city, state ZIP" required /></label>
            </div>
            <div className="modalbtns">
              <Button variant="ghost" type="button" onClick={() => setAdding(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Add address</Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
