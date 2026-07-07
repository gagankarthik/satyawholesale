"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sku, useInventory } from "@/lib/store";
import { useSuppliers, usePurchaseOrders, type POLine } from "@/lib/wms";
import { Close } from "@/components/Icons";
import { m, type Flash } from "../shared";
import { Breadcrumb, Combobox } from "@/components/ui";
import { rid, lineFromProduct, InvoiceImport } from "./_shared";

/* =======================================================================
   PURCHASE ORDER — create (/admin/purchaseorder/new)
   ======================================================================= */
export function AdminPOCreate({ flash }: { flash: Flash }) {
  const router = useRouter();
  const { suppliers } = useSuppliers();
  const { products } = useInventory();
  const { add } = usePurchaseOrders();

  const active = suppliers.filter((s) => s.status === "Active");
  const [supplierId, setSupplierId] = useState(active[0]?.id ?? suppliers[0]?.id ?? "");
  const [expected, setExpected] = useState(new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10));
  const [supplierRef, setSupplierRef] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<POLine[]>([]);
  const [importing, setImporting] = useState(false);
  const [attachment, setAttachment] = useState<{ url: string; name: string } | null>(null);

  const total = lines.reduce((s, l) => s + l.ordered * l.cost, 0);
  const addLine = (id: string) => {
    const p = products.find((x) => String(x.id) === id);
    if (!p) return;
    const code = sku(p);
    if (lines.some((l) => l.sku === code)) { flash("Already on this PO"); return; }
    setLines((ls) => [...ls, lineFromProduct(p, 12)]);
  };
  const setField = (code: string, field: "ordered" | "cost", val: string) =>
    setLines((ls) => ls.map((l) => (l.sku === code ? { ...l, [field]: Number(val) || 0 } : l)));
  const drop = (code: string) => setLines((ls) => ls.filter((l) => l.sku !== code));

  const create = () => {
    if (!supplierId) { flash("Pick a supplier"); return; }
    if (!lines.length) { flash("Add at least one line"); return; }
    const id = rid("PO-");
    add({ id, supplierId, status: "Draft", created: Date.now(), expected: new Date(expected).getTime(), lines, supplierRef: supplierRef.trim(), notes: notes.trim(), attachment: attachment?.url, attachmentName: attachment?.name });
    flash("Draft PO created");
    router.push(`/admin/purchaseorder/${id}`);
  };

  return (
    <>
      <Breadcrumb items={[{ label: "Purchase orders", href: "/admin/purchaseorder" }, { label: "New PO" }]} />
      <header className="adminbar">
        <div><h1>New purchase order</h1></div>
      </header>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="panel anim-in">
            <div className="panel-h"><h3>Lines</h3><span className="hint">{lines.length} SKUs · {m(total)}</span></div>
            {lines.length ? (
              <div className="tablewrap">
              <table className="invtable flat">
                <thead><tr><th>Product</th><th className="r">Order qty</th><th className="r">Unit cost</th><th className="r">Line</th><th></th></tr></thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.sku}>
                      <td className="pn" style={{ fontSize: 13.5 }}>{l.name}<div className="mono muted" style={{ fontSize: 11 }}>{l.sku}</div></td>
                      <td className="r"><input className="cellinput" type="number" min={1} value={l.ordered} onChange={(e) => setField(l.sku, "ordered", e.target.value)} /></td>
                      <td className="r"><input className="cellinput" type="number" min={0} step="0.01" value={l.cost} onChange={(e) => setField(l.sku, "cost", e.target.value)} /></td>
                      <td className="r mono">{m(l.ordered * l.cost)}</td>
                      <td className="r"><button type="button" className="ia del" onClick={() => drop(l.sku)} aria-label="Remove line"><Close /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            ) : <p className="muted" style={{ fontSize: 14, padding: "6px 0 14px" }}>No lines yet. Pick a product below to start the order.</p>}
            <div className="addline">
              <Combobox
                ariaLabel="Add a product to this PO"
                placeholder="Add a product: type a name or SKU"
                value=""
                onChange={addLine}
                options={products.filter((p) => !lines.some((l) => l.sku === sku(p))).map((p) => ({ value: String(p.id), label: p.name, hint: sku(p) }))}
                emptyText="No products match. Onboard it under Catalog first."
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setImporting(true)}>Import from invoice</button>
            </div>
            {attachment && <p className="hint" style={{ marginTop: 8 }}>Invoice photo attached: {attachment.name}. It stays on the PO after you create it.</p>}
          </div>
        </div>

        <aside className="detail-side">
          <div className="panel anim-in">
            <div className="panel-h"><h3>PO details</h3></div>
            <label className="field"><span>Supplier</span>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}{s.status !== "Active" ? " (inactive)" : ""}</option>)}
              </select>
            </label>
            <label className="field" style={{ marginTop: 12 }}><span>Expected date</span>
              <input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} />
            </label>
            <label className="field" style={{ marginTop: 12 }}><span>Supplier order #</span>
              <input className="mono" value={supplierRef} onChange={(e) => setSupplierRef(e.target.value)} placeholder="Their confirmation #" />
            </label>
            <label className="field" style={{ marginTop: 12 }}><span>Notes</span>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Call-in notes, substitutions…" />
            </label>
            <div className="totals" style={{ marginTop: 14 }}>
              <div className="tl grand"><span>PO total</span><b>{m(total)}</b></div>
            </div>
            <div className="modalbtns" style={{ marginTop: 14 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => router.push("/admin/purchaseorder")}>Cancel</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={create}>Create draft PO</button>
            </div>
          </div>
        </aside>
      </div>

      {importing && (
        <InvoiceImport
          products={products}
          existingSkus={new Set(lines.map((l) => l.sku))}
          onAdd={(ls) => setLines((d) => [...d, ...ls])}
          onAttach={(url, name) => setAttachment({ url, name })}
          onClose={() => setImporting(false)}
          flash={flash}
        />
      )}
    </>
  );
}
