"use client";

import { useState } from "react";
import { Pin, Plus, Trash } from "@/components/Icons";
import { Button, EmptyState } from "@/components/ui";
import { useConfirm } from "@/components/Confirm";
import { usePortal } from "../PortalShell";
import { useAddresses, type Address } from "@/lib/addresses";

export default function PortalAddresses() {
  const { flash, STORE } = usePortal();
  const confirm = useConfirm();
  const { addresses, add, remove } = useAddresses(STORE);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ label: "", addr: "" });

  const addAddr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.label.trim() || !draft.addr.trim()) return;
    add(draft.label, draft.addr);
    setDraft({ label: "", addr: "" });
    setAdding(false);
    flash("Address added");
  };
  const removeAddr = async (a: Address) => {
    if (!(await confirm({ title: "Remove this address?", message: `"${a.label}" will no longer be offered at checkout.`, confirmLabel: "Remove address", danger: true }))) return;
    remove(a.id);
    flash(`${a.label} removed`);
  };

  return (
    <>
      {addresses.length === 0 && !adding ? (
        <EmptyState
          variant="light"
          icon={<Pin />}
          title="No saved addresses yet"
          description="Save the places you take delivery and they'll be one tap away at checkout."
          action={<Button variant="primary" onClick={() => setAdding(true)}>Add address</Button>}
        />
      ) : (
        <div className="addrgrid">
          {addresses.map((a, i) => (
            <div className="addrcard" key={a.id}>
              <div className="addrcard-h">
                <span className="addrcard-ic" aria-hidden="true"><Pin /></span>
                <b>{a.label}</b>
                {i === 0 && <span className="addrcard-def">Default</span>}
              </div>
              <p>{a.addr}</p>
              <button type="button" className="addrcard-rm" onClick={() => removeAddr(a)} aria-label={`Remove ${a.label}`}><Trash /> Remove</button>
            </div>
          ))}
          <button type="button" className="addrcard addrcard-add" onClick={() => setAdding(true)}>
            <span className="addrcard-add-ic"><Plus /></span>
            Add address
          </button>
        </div>
      )}

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
