"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  sku, useInventory, LOW_STOCK,
  type Product,
} from "@/lib/store";
import {
  useSuppliers, useLocations, useMovements, usePurchaseOrders, useReceipts, useInvoices,
  poTotal, PO_FLOW, RECEIVE_TOLERANCE, threeWayMatch,
  type POLine,
} from "@/lib/wms";
import { useConfirm } from "@/components/Confirm";
import { Head, m, timeAgo, type Flash } from "./shared";

const rid = (pre: string) => pre + Math.floor(1000 + Math.random() * 8999);
const matchClass = (s: string) => s === "Matched" ? "matched" : s === "Variance" ? "variance" : "awaiting";

/* =======================================================================
   PURCHASE ORDERS — list (opens /admin/purchaseorder/[id])
   ======================================================================= */
export function POTab({ flash }: { flash: Flash }) {
  const { pos, add } = usePurchaseOrders();
  const { suppliers } = useSuppliers();
  const { products } = useInventory();
  const { receipts } = useReceipts();
  const { invoices } = useInvoices();
  const router = useRouter();

  const supName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? id;

  const suggestions = useMemo(() => {
    const low = products.filter((p) => p.stock <= (p.reorderPoint ?? LOW_STOCK) && p.supplierId);
    const bySup: Record<string, Product[]> = {};
    low.forEach((p) => { const s = p.supplierId!; (bySup[s] ||= []).push(p); });
    return bySup;
  }, [products]);

  const createDraft = (supplierId: string, items: Product[]) => {
    add({
      id: rid("PO-"), supplierId, status: "Draft", created: Date.now(), expected: Date.now() + 4 * 86400000,
      lines: items.map((p) => ({ sku: sku(p), name: p.name, ordered: Math.max(12, (p.maxStock ?? LOW_STOCK * 4) - p.stock), received: 0, cost: p.cost ?? p.price * 0.7 })),
    });
    flash("Draft PO created from reorder suggestions");
  };

  return (
    <>
      <Head title="Purchase orders" sub={`Receive · invoice · three-way match — tolerance ±${RECEIVE_TOLERANCE * 100}%`}>
        <button className="btn btn-primary btn-sm" onClick={() => router.push("/admin/purchaseorder/new")}>+ New PO</button>
      </Head>
      {Object.keys(suggestions).length > 0 && (
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-h"><h3>Reorder suggestions</h3><span className="hint">SKUs at/below reorder point, grouped by supplier</span></div>
          <div className="minirows">
            {Object.entries(suggestions).map(([sid, items]) => (
              <div className="minirow" key={sid}>
                <div><div className="ref" style={{ fontFamily: "var(--font-body-f)", fontWeight: 600 }}>{supName(sid)}</div><div className="st2">{items.length} SKU{items.length > 1 ? "s" : ""} need reordering</div></div>
                <button className="btn btn-primary btn-sm" onClick={() => createDraft(sid, items)}>Create draft PO</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="orders">
        {pos.map((po) => {
          const total = poTotal(po);
          const recv = po.lines.reduce((s, l) => s + l.received, 0);
          const ord = po.lines.reduce((s, l) => s + l.ordered, 0);
          const match = threeWayMatch(po, receipts, invoices);
          return (
            <div className="ordercard clickrow" key={po.id} onClick={() => router.push(`/admin/purchaseorder/${po.id}`)}>
              <div className="oc-head">
                <div>
                  <div className="oc-ref mono">{po.id} · {supName(po.supplierId)}</div>
                  <div className="oc-meta">{po.lines.length} lines · received {recv}/{ord} · created {timeAgo(po.created)}</div>
                </div>
                <div className="oc-right">
                  <span className="oc-total mono">{m(total)}</span>
                  <span className={`pobadge s-${po.status.replace(/\s+/g, "").toLowerCase()}`}>{po.status}</span>
                  <span className={`matchbadge ${matchClass(match.status)}`}>{match.status}</span>
                </div>
              </div>
              <div className="oc-lines">
                {po.lines.map((l) => <span key={l.sku} className="oc-line"><b className="mono">{l.received}/{l.ordered}</b> {l.name}</span>)}
              </div>
            </div>
          );
        })}
        {pos.length === 0 && <div className="empty"><div className="ei">📦</div><h3>No purchase orders</h3><p>Create one from the reorder suggestions above.</p></div>}
      </div>
    </>
  );
}

/* =======================================================================
   PURCHASE ORDER — full-page detail (/admin/purchaseorder/[id])
   ======================================================================= */
export function AdminPODetail({ id, flash }: { id: string; flash: Flash }) {
  const { pos, advance, update } = usePurchaseOrders();
  const { suppliers } = useSuppliers();
  const { products, updateProduct } = useInventory();
  const { log } = useMovements();
  const { receipts, add: addReceipt } = useReceipts();
  const { invoices, add: addInvoice } = useInvoices();
  const router = useRouter();

  const [mode, setMode] = useState<"view" | "receive" | "invoice">("view");
  const [recvQty, setRecvQty] = useState<Record<string, string>>({});
  const [invQty, setInvQty] = useState<Record<string, string>>({});
  const [invCost, setInvCost] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [dSup, setDSup] = useState("");
  const [dExp, setDExp] = useState("");
  const [dLines, setDLines] = useState<POLine[]>([]);
  const [addId, setAddId] = useState("");

  const supName = (sid: string) => suppliers.find((s) => s.id === sid)?.name ?? sid;
  const cur = pos.find((p) => p.id === id) || null;

  if (!cur) {
    return (
      <>
        <button className="detail-back" onClick={() => router.push("/admin/purchaseorder")}>← All purchase orders</button>
        <div className="empty"><div className="ei">🔍</div><h3>Purchase order not found</h3><p>It may have been closed or removed.</p></div>
      </>
    );
  }

  const postReceipt = () => {
    const glines = cur.lines.map((l) => ({ sku: l.sku, qty: Number(recvQty[l.sku] || 0) })).filter((x) => x.qty > 0);
    if (!glines.length) { flash("Enter quantities to receive"); return; }
    for (const l of cur.lines) {
      const q = Number(recvQty[l.sku] || 0);
      const maxAllow = Math.ceil(l.ordered * (1 + RECEIVE_TOLERANCE)) - l.received;
      if (q > maxAllow) { flash(`${l.name}: over-receipt beyond ±${RECEIVE_TOLERANCE * 100}% tolerance`); return; }
    }
    addReceipt({ id: rid("GRN-"), poId: cur.id, received: Date.now(), lines: glines, by: "M. Bell" });
    const newLines = cur.lines.map((l) => { const q = Number(recvQty[l.sku] || 0); return q > 0 ? { ...l, received: l.received + q } : l; });
    glines.forEach((g) => {
      const p = products.find((x) => sku(x) === g.sku);
      if (p) { updateProduct(p.id, { stock: p.stock + g.qty }); log({ sku: g.sku, name: cur.lines.find((l) => l.sku === g.sku)?.name || g.sku, type: "Receipt", qty: g.qty, ref: cur.id }); }
    });
    const full = newLines.every((l) => l.received >= l.ordered);
    update(cur.id, { lines: newLines, status: full ? "Received" : "Partially Received" });
    flash("Goods receipt posted to stock");
    setRecvQty({}); setMode("view");
  };

  const postInvoice = () => {
    const ilines = cur.lines
      .map((l) => ({ sku: l.sku, qty: Number(invQty[l.sku] ?? l.received), cost: Number(invCost[l.sku] ?? l.cost) }))
      .filter((x) => x.qty > 0);
    if (!ilines.length) { flash("Nothing to invoice yet — receive first"); return; }
    const total = ilines.reduce((s, l) => s + l.qty * l.cost, 0);
    addInvoice({ id: rid("INV-"), poId: cur.id, date: Date.now(), ref: rid("SI-"), lines: ilines, total });
    flash("Supplier invoice recorded");
    setMode("view");
  };

  /* ---- edit PO (supplier, expected date, lines) ---- */
  const startEdit = () => {
    setDSup(cur.supplierId);
    setDExp(new Date(cur.expected).toISOString().slice(0, 10));
    setDLines(cur.lines.map((l) => ({ ...l })));
    setAddId(""); setMode("view"); setEditing(true);
  };
  const dTotal = dLines.reduce((s, l) => s + l.ordered * l.cost, 0);
  const setLineField = (code: string, field: "ordered" | "cost", val: string) =>
    setDLines((ls) => ls.map((l) => (l.sku === code ? { ...l, [field]: Number(val) || 0 } : l)));
  const dropLine = (code: string) => setDLines((ls) => ls.filter((l) => l.sku !== code));
  const addLineEdit = () => {
    const p = products.find((x) => String(x.id) === addId);
    if (!p) return;
    const code = sku(p);
    if (dLines.some((l) => l.sku === code)) { flash("Already on this PO"); return; }
    setDLines((ls) => [...ls, { sku: code, name: p.name, ordered: 12, received: 0, cost: p.cost ?? Math.round(p.price * 0.7 * 100) / 100 }]);
    setAddId("");
  };
  const saveEdit = () => {
    if (!dLines.length) { flash("A PO needs at least one line"); return; }
    update(cur.id, { supplierId: dSup, expected: new Date(dExp).getTime(), lines: dLines });
    setEditing(false);
    flash("Purchase order updated");
  };

  const match = threeWayMatch(cur, receipts, invoices);
  const idx = PO_FLOW.indexOf(cur.status);
  const poGrns = receipts.filter((g) => g.poId === cur.id);
  const recBySku: Record<string, number> = {};
  poGrns.forEach((g) => g.lines.forEach((l) => { recBySku[l.sku] = (recBySku[l.sku] || 0) + l.qty; }));
  const invBySku: Record<string, number> = {};
  invoices.filter((i) => i.poId === cur.id).forEach((i) => i.lines.forEach((l) => { invBySku[l.sku] = (invBySku[l.sku] || 0) + l.qty; }));

  return (
    <>
      <button className="detail-back" onClick={() => router.push("/admin/purchaseorder")}>← All purchase orders</button>
      <header className="adminbar">
        <div><h1>{cur.id}</h1><p>{supName(cur.supplierId)} · created {new Date(cur.created).toLocaleDateString()} · expected {new Date(cur.expected).toLocaleDateString()}</p></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {mode === "view" && !editing && <button className="btn btn-ghost btn-sm" onClick={startEdit}>Edit PO</button>}
          {editing && <span className="hint">editing</span>}
          <span className={`pobadge s-${cur.status.replace(/\s+/g, "").toLowerCase()}`}>{cur.status}</span>
          <span className={`matchbadge ${matchClass(match.status)}`}>{match.status}</span>
        </div>
      </header>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="panel">
            <div className="panel-h"><h3>Three-way match</h3><span className="hint">PO ↔ receipt ↔ invoice</span></div>
            <div className="match3">
              <div className="m3"><span>Ordered</span><b>{match.ordered} cs · {m(match.poTotal)}</b></div>
              <div className="m3"><span>Received</span><b>{match.received} cs</b></div>
              <div className="m3"><span>Invoiced</span><b>{match.invoicedQty} cs · {m(match.invTotal)}</b></div>
            </div>
            {match.variances.length > 0 && (
              <div className="valbox" style={{ marginTop: 14 }}>
                {match.variances.map((v) => <div key={v.sku}>• {v.name}: received {v.received} vs invoiced {v.invoiced}</div>)}
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-h">
              <h3>Lines</h3>
              <span className="hint">{editing ? "Edit quantities, cost & products" : mode === "receive" ? "Enter quantities received" : mode === "invoice" ? "Enter invoiced qty & cost" : `${cur.lines.length} SKUs`}</span>
            </div>
            {editing ? (
              <>
                <div className="tablewrap">
                  <table className="invtable">
                    <thead><tr><th>Line</th><th className="r">Order qty</th><th className="r">Unit cost</th><th className="r">Line</th><th></th></tr></thead>
                    <tbody>
                      {dLines.map((l) => (
                        <tr key={l.sku}>
                          <td><div className="pn" style={{ fontSize: 13.5 }}>{l.name}</div><div className="mono muted" style={{ fontSize: 11 }}>{l.sku}</div></td>
                          <td className="r"><input className="cellinput" type="number" min={1} value={l.ordered} onChange={(e) => setLineField(l.sku, "ordered", e.target.value)} /></td>
                          <td className="r"><input className="cellinput" type="number" min={0} step="0.01" value={l.cost} onChange={(e) => setLineField(l.sku, "cost", e.target.value)} /></td>
                          <td className="r mono">{m(l.ordered * l.cost)}</td>
                          <td className="r"><button type="button" className="ia del" onClick={() => dropLine(l.sku)} disabled={l.received > 0} title={l.received > 0 ? "Already received" : "Remove"}>✕</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="addline">
                  <select value={addId} onChange={(e) => setAddId(e.target.value)} aria-label="Add product">
                    <option value="">+ Add a product…</option>
                    {products.filter((p) => !dLines.some((l) => l.sku === sku(p))).map((p) => <option key={p.id} value={p.id}>{p.name} · {sku(p)}</option>)}
                  </select>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addLineEdit} disabled={!addId}>Add</button>
                </div>
              </>
            ) : (
              <>
                <div className="tablewrap">
                  <table className="invtable">
                    <thead><tr><th>Line</th><th className="r">Ordered</th><th className="r">Received</th><th className="r">Invoiced</th>
                      {mode === "receive" && <th className="r">Receive now</th>}
                      {mode === "invoice" && <th className="r">Inv qty</th>}
                      {mode === "invoice" && <th className="r">Unit cost</th>}
                    </tr></thead>
                    <tbody>
                      {cur.lines.map((l) => {
                        const remaining = l.ordered - l.received;
                        return (
                          <tr key={l.sku}>
                            <td><div className="pn" style={{ fontSize: 13.5 }}>{l.name}</div><div className="mono muted" style={{ fontSize: 11 }}>{l.sku}</div></td>
                            <td className="r mono">{l.ordered}</td>
                            <td className="r mono">{recBySku[l.sku] ?? l.received}</td>
                            <td className="r mono">{invBySku[l.sku] ?? 0}</td>
                            {mode === "receive" && <td className="r"><input className="cellinput" type="number" min={0} placeholder={String(remaining)} value={recvQty[l.sku] ?? ""} onChange={(e) => setRecvQty({ ...recvQty, [l.sku]: e.target.value })} disabled={remaining <= 0} /></td>}
                            {mode === "invoice" && <td className="r"><input className="cellinput" type="number" min={0} value={invQty[l.sku] ?? String(l.received)} onChange={(e) => setInvQty({ ...invQty, [l.sku]: e.target.value })} /></td>}
                            {mode === "invoice" && <td className="r"><input className="cellinput" type="number" step="0.01" value={invCost[l.sku] ?? String(l.cost)} onChange={(e) => setInvCost({ ...invCost, [l.sku]: e.target.value })} /></td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {poGrns.length > 0 && mode === "view" && (
                  <div className="grnlist">
                    {poGrns.map((g) => <span key={g.id} className="grnchip">{g.id} · {g.lines.reduce((s, l) => s + l.qty, 0)} cs · {timeAgo(g.received)} · {g.by}</span>)}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <aside className="detail-side">
          {!editing && (
          <div className="panel">
            <div className="panel-h"><h3>Actions</h3></div>
            <div className="postack">
              {mode === "view" ? (
                <>
                  {(cur.status === "Draft" || cur.status === "Approved") && (
                    <button className="btn btn-ghost" onClick={() => { advance(cur.id); flash(`${cur.id} → ${PO_FLOW[idx + 1]}`); }}>
                      {cur.status === "Draft" ? "Approve PO" : "Mark as sent"}
                    </button>
                  )}
                  {(cur.status === "Sent" || cur.status === "Partially Received" || cur.status === "Approved") && (
                    <button className="btn btn-primary" onClick={() => setMode("receive")}>Receive goods</button>
                  )}
                  <button className="btn btn-ink" onClick={() => setMode("invoice")}>Record invoice</button>
                </>
              ) : mode === "receive" ? (
                <>
                  <button className="btn btn-primary" onClick={postReceipt}>Post goods receipt</button>
                  <button className="btn btn-ghost" onClick={() => setMode("view")}>Cancel</button>
                </>
              ) : (
                <>
                  <button className="btn btn-primary" onClick={postInvoice}>Save invoice</button>
                  <button className="btn btn-ghost" onClick={() => setMode("view")}>Cancel</button>
                </>
              )}
            </div>
          </div>
          )}
          <div className="panel">
            <div className="panel-h"><h3>Details</h3></div>
            {editing ? (
              <>
                <label className="field"><span>Supplier</span>
                  <select value={dSup} onChange={(e) => setDSup(e.target.value)}>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}{s.status !== "Active" ? " (inactive)" : ""}</option>)}
                  </select>
                </label>
                <label className="field" style={{ marginTop: 12 }}><span>Expected date</span>
                  <input type="date" value={dExp} onChange={(e) => setDExp(e.target.value)} />
                </label>
                <div className="totals" style={{ marginTop: 14 }}><div className="tl grand"><span>PO total</span><b>{m(dTotal)}</b></div></div>
                <div className="modalbtns" style={{ marginTop: 14 }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={saveEdit}>Save changes</button>
                </div>
              </>
            ) : (
              <div className="kvs">
                <div className="kv2"><span>PO #</span><b className="mono">{cur.id}</b></div>
                <div className="kv2"><span>Supplier</span><b>{supName(cur.supplierId)}</b></div>
                <div className="kv2"><span>Status</span><b>{cur.status}</b></div>
                <div className="kv2"><span>Created</span><b>{new Date(cur.created).toLocaleDateString()}</b></div>
                <div className="kv2"><span>Expected</span><b>{new Date(cur.expected).toLocaleDateString()}</b></div>
                <div className="kv2"><span>PO total</span><b className="mono">{m(poTotal(cur))}</b></div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

/* =======================================================================
   PURCHASE ORDER — create (/admin/purchaseorder/new)
   ======================================================================= */
type DraftLine = { sku: string; name: string; ordered: number; received: number; cost: number };
export function AdminPOCreate({ flash }: { flash: Flash }) {
  const router = useRouter();
  const { suppliers } = useSuppliers();
  const { products } = useInventory();
  const { add } = usePurchaseOrders();

  const active = suppliers.filter((s) => s.status === "Active");
  const [supplierId, setSupplierId] = useState(active[0]?.id ?? suppliers[0]?.id ?? "");
  const [expected, setExpected] = useState(new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10));
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [addId, setAddId] = useState("");

  const total = lines.reduce((s, l) => s + l.ordered * l.cost, 0);
  const addLine = () => {
    const p = products.find((x) => String(x.id) === addId);
    if (!p) return;
    const code = sku(p);
    if (lines.some((l) => l.sku === code)) { flash("Already on this PO"); return; }
    setLines((ls) => [...ls, { sku: code, name: p.name, ordered: 12, received: 0, cost: p.cost ?? Math.round(p.price * 0.7 * 100) / 100 }]);
    setAddId("");
  };
  const setField = (code: string, field: "ordered" | "cost", val: string) =>
    setLines((ls) => ls.map((l) => (l.sku === code ? { ...l, [field]: Number(val) || 0 } : l)));
  const drop = (code: string) => setLines((ls) => ls.filter((l) => l.sku !== code));

  const create = () => {
    if (!supplierId) { flash("Pick a supplier"); return; }
    if (!lines.length) { flash("Add at least one line"); return; }
    const id = rid("PO-");
    add({ id, supplierId, status: "Draft", created: Date.now(), expected: new Date(expected).getTime(), lines });
    flash("Draft PO created");
    router.push(`/admin/purchaseorder/${id}`);
  };

  return (
    <>
      <button className="detail-back" onClick={() => router.push("/admin/purchaseorder")}>← All purchase orders</button>
      <header className="adminbar">
        <div><h1>New purchase order</h1><p>Draft a PO to a supplier, then approve and send</p></div>
      </header>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="panel anim-in">
            <div className="panel-h"><h3>Lines</h3><span className="hint">{lines.length} SKUs · {m(total)}</span></div>
            {lines.length ? (
              <table className="invtable flat">
                <thead><tr><th>Product</th><th className="r">Order qty</th><th className="r">Unit cost</th><th className="r">Line</th><th></th></tr></thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.sku}>
                      <td className="pn" style={{ fontSize: 13.5 }}>{l.name}<div className="mono muted" style={{ fontSize: 11 }}>{l.sku}</div></td>
                      <td className="r"><input className="cellinput" type="number" min={1} value={l.ordered} onChange={(e) => setField(l.sku, "ordered", e.target.value)} /></td>
                      <td className="r"><input className="cellinput" type="number" min={0} step="0.01" value={l.cost} onChange={(e) => setField(l.sku, "cost", e.target.value)} /></td>
                      <td className="r mono">{m(l.ordered * l.cost)}</td>
                      <td className="r"><button type="button" className="ia del" onClick={() => drop(l.sku)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="muted" style={{ fontSize: 14, padding: "6px 0 14px" }}>No lines yet — add products below.</p>}
            <div className="addline">
              <select value={addId} onChange={(e) => setAddId(e.target.value)} aria-label="Add product">
                <option value="">+ Add a product…</option>
                {products.filter((p) => !lines.some((l) => l.sku === sku(p))).map((p) => <option key={p.id} value={p.id}>{p.name} · {sku(p)}</option>)}
              </select>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addLine} disabled={!addId}>Add</button>
            </div>
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
    </>
  );
}

/* =======================================================================
   INVENTORY LEDGER
   ======================================================================= */
export function InventoryTab({ flash }: { flash: Flash }) {
  const { movements, log } = useMovements();
  const { products, updateProduct } = useInventory();
  const [pid, setPid] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("cycle count");

  const adjust = (e: React.FormEvent) => {
    e.preventDefault();
    const p = products.find((x) => String(x.id) === pid);
    const q = Number(qty);
    if (!p || !q) return;
    updateProduct(p.id, { stock: Math.max(0, p.stock + q) });
    log({ sku: sku(p), name: p.name, type: "Adjust", qty: q, ref: reason });
    setQty(""); flash("Stock adjusted & logged");
  };

  return (
    <>
      <Head title="Stock ledger" sub="Every receipt, pick, adjustment and transfer — the source of truth" />
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-h"><h3>Manual adjustment</h3></div>
        <form style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }} onSubmit={adjust}>
          <label className="field" style={{ flex: "2 1 240px" }}><span>Product</span>
            <select value={pid} onChange={(e) => setPid(e.target.value)} required>
              <option value="">Select…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.stock} cs)</option>)}
            </select>
          </label>
          <label className="field" style={{ flex: "0 1 130px" }}><span>Qty (±)</span><input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="-3" required /></label>
          <label className="field" style={{ flex: "1 1 160px" }}><span>Reason</span><input value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          <button className="btn btn-primary btn-sm" type="submit" style={{ height: 46 }}>Post adjustment</button>
        </form>
      </div>
      <div className="tablewrap">
        <table className="invtable">
          <thead><tr><th>Time</th><th>Type</th><th>SKU / Product</th><th>Location</th><th>Ref</th><th className="r">Qty</th></tr></thead>
          <tbody>
            {movements.map((mv) => (
              <tr key={mv.id}>
                <td className="muted" style={{ fontSize: 13 }}>{timeAgo(mv.ts)}</td>
                <td><span className={`movebadge ${mv.type.toLowerCase()}`}>{mv.type}</span></td>
                <td><div className="pn" style={{ fontSize: 13.5 }}>{mv.name}</div><div className="mono muted" style={{ fontSize: 11 }}>{mv.sku}</div></td>
                <td className="mono muted">{mv.loc || "—"}</td>
                <td className="mono muted">{mv.ref}</td>
                <td className="r mono" style={{ color: mv.qty < 0 ? "var(--red)" : "var(--green)", fontWeight: 600 }}>{mv.qty > 0 ? "+" : ""}{mv.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* =======================================================================
   WAREHOUSE
   ======================================================================= */
const EMPTY_BIN = { zone: "A", aisle: "01", rack: "R1", bin: "B1", capacity: "240", used: "0" };
export function WarehouseTab({ flash }: { flash: Flash }) {
  const { locations, update, add, remove } = useLocations();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);
  const [nb, setNb] = useState(EMPTY_BIN);
  const [editId, setEditId] = useState<string | null>(null);
  const [eb, setEb] = useState({ capacity: "", used: "" });

  const totalCap = locations.reduce((s, l) => s + l.capacity, 0);
  const totalUsed = locations.reduce((s, l) => s + l.used, 0);
  const cur = locations.find((l) => l.id === editId) || null;

  const createBin = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `${nb.zone}-${nb.aisle}-${nb.rack}-${nb.bin}`.toUpperCase();
    if (locations.some((l) => l.id === id)) { flash("That bin already exists"); return; }
    add({ id, zone: nb.zone.toUpperCase(), aisle: nb.aisle, rack: nb.rack, bin: nb.bin, capacity: Number(nb.capacity) || 0, used: Number(nb.used) || 0 });
    setNb(EMPTY_BIN); setAdding(false); flash("Bin added");
  };
  const openEdit = (id: string) => { const l = locations.find((x) => x.id === id)!; setEb({ capacity: String(l.capacity), used: String(l.used) }); setEditId(id); };
  const saveEdit = (e: React.FormEvent) => { e.preventDefault(); if (cur) { update(cur.id, { capacity: Number(eb.capacity) || 0, used: Math.max(0, Number(eb.used) || 0) }); setEditId(null); flash("Bin updated"); } };

  return (
    <>
      <Head title="Warehouse" sub="Zones → aisles → racks → bins, with live capacity">
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Add bin</button>
      </Head>
      <div className="kpis">
        <div className="kpi"><div className="kl">Bins</div><div className="kv">{locations.length}</div><div className="kf">across {new Set(locations.map((l) => l.zone)).size} zones</div></div>
        <div className="kpi"><div className="kl">Total capacity</div><div className="kv">{totalCap.toLocaleString()}</div><div className="kf">cases</div></div>
        <div className="kpi accent"><div className="kl">Utilization</div><div className="kv">{totalCap ? Math.round((totalUsed / totalCap) * 100) : 0}%</div><div className="kf">{totalUsed.toLocaleString()} cases stored</div></div>
        <div className="kpi warn"><div className="kl">Near full</div><div className="kv">{locations.filter((l) => l.capacity && l.used / l.capacity >= 0.85).length}</div><div className="kf">bins ≥ 85%</div></div>
      </div>
      <div className="tablewrap">
        <table className="invtable">
          <thead><tr><th>Bin</th><th>Zone</th><th>Aisle</th><th>Rack</th><th>Utilization</th><th className="r">Used / Cap</th><th className="r"></th></tr></thead>
          <tbody>
            {locations.map((l) => {
              const pct = l.capacity ? Math.round((l.used / l.capacity) * 100) : 0;
              return (
                <tr key={l.id} className="clickrow" style={{ cursor: "pointer" }} onClick={() => openEdit(l.id)}>
                  <td className="mono">{l.id}</td><td>{l.zone}</td><td>{l.aisle}</td><td>{l.rack}</td>
                  <td><div className="capbar"><span className={`capfill ${pct >= 85 ? "hot" : pct >= 60 ? "mid" : ""}`} style={{ width: `${pct}%` }} /></div></td>
                  <td className="r mono muted">{l.used} / {l.capacity}</td>
                  <td className="r" onClick={(e) => e.stopPropagation()}><button className="ia del" onClick={async () => { if (await confirm({ title: "Remove bin?", message: `${l.id} will be removed.`, confirmLabel: "Remove", danger: true })) { remove(l.id); flash("Bin removed"); } }}>✕</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {adding && (
        <div className="modal-overlay" onClick={() => setAdding(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={createBin}>
            <h3>Add a bin</h3>
            <div className="formgrid">
              <label className="field"><span>Zone</span><input value={nb.zone} onChange={(e) => setNb({ ...nb, zone: e.target.value })} maxLength={2} /></label>
              <label className="field"><span>Aisle</span><input value={nb.aisle} onChange={(e) => setNb({ ...nb, aisle: e.target.value })} /></label>
              <label className="field"><span>Rack</span><input value={nb.rack} onChange={(e) => setNb({ ...nb, rack: e.target.value })} /></label>
              <label className="field"><span>Bin</span><input value={nb.bin} onChange={(e) => setNb({ ...nb, bin: e.target.value })} /></label>
              <label className="field"><span>Capacity (cases)</span><input type="number" min={0} value={nb.capacity} onChange={(e) => setNb({ ...nb, capacity: e.target.value })} /></label>
              <label className="field"><span>Currently used</span><input type="number" min={0} value={nb.used} onChange={(e) => setNb({ ...nb, used: e.target.value })} /></label>
            </div>
            <div className="modalbtns"><button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button><button type="submit" className="btn btn-primary">Add bin</button></div>
          </form>
        </div>
      )}

      {cur && (
        <div className="modal-overlay" onClick={() => setEditId(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={saveEdit}>
            <h3>Bin {cur.id}</h3>
            <p className="modalp">{cur.zone} · aisle {cur.aisle} · rack {cur.rack}</p>
            <div className="formgrid">
              <label className="field"><span>Capacity (cases)</span><input type="number" min={0} value={eb.capacity} onChange={(e) => setEb({ ...eb, capacity: e.target.value })} /></label>
              <label className="field"><span>Currently used</span><input type="number" min={0} value={eb.used} onChange={(e) => setEb({ ...eb, used: e.target.value })} /></label>
            </div>
            <div className="modalbtns"><button type="button" className="btn btn-ghost" onClick={() => setEditId(null)}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div>
          </form>
        </div>
      )}
    </>
  );
}
