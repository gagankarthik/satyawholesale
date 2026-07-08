"use client";

import { useState } from "react";
import { Pin, Plus, Trash } from "@/components/Icons";
import { Button, DialogFrame, EmptyState } from "@/components/ui";
import { useConfirm } from "@/components/Confirm";
import { usePortal } from "../PortalShell";
import { useAddresses, type Address } from "@/lib/addresses";

const EMPTY = { label: "", line: "", apt: "", city: "", state: "", zip: "" };

export default function PortalAddresses() {
  const { flash, STORE } = usePortal();
  const confirm = useConfirm();
  const { addresses, add, remove } = useAddresses(STORE);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(EMPTY);

  const set = (k: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));

  const addAddr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.label.trim() || !draft.line.trim() || !draft.city.trim() || !draft.state.trim() || !draft.zip.trim()) {
      flash.error("Fill in label, address, city, state and ZIP");
      return;
    }
    add(draft);
    setDraft(EMPTY);
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
        <DialogFrame onClose={() => setAdding(false)} label="Add a delivery address">
          <form className="modal flow" onSubmit={addAddr}>
            <h3>Add a delivery address</h3>
            <div className="formgrid">
              <label className="field full"><span>Label</span><input value={draft.label} onChange={set("label")} placeholder="e.g. Back dock" required autoFocus /></label>
              <label className="field full"><span>Street address</span><input value={draft.line} onChange={set("line")} placeholder="123 Reading Rd" autoComplete="address-line1" required /></label>
              <label className="field full"><span>Apt / suite / building no. <em className="opt">optional</em></span><input value={draft.apt} onChange={set("apt")} placeholder="Suite 200" autoComplete="address-line2" /></label>
              <div className="field-row">
                <label className="field"><span>City</span><input value={draft.city} onChange={set("city")} placeholder="Cincinnati" autoComplete="address-level2" required /></label>
                <label className="field"><span>State</span><input value={draft.state} onChange={set("state")} placeholder="OH" autoComplete="address-level1" maxLength={2} required /></label>
                <label className="field"><span>ZIP code</span><input value={draft.zip} onChange={set("zip")} placeholder="45202" autoComplete="postal-code" inputMode="numeric" required /></label>
              </div>
            </div>
            <div className="modalbtns">
              <Button variant="ghost" type="button" onClick={() => { setAdding(false); setDraft(EMPTY); }}>Cancel</Button>
              <Button variant="primary" type="submit">Add address</Button>
            </div>
          </form>
        </DialogFrame>
      )}
    </>
  );
}
