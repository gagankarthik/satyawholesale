"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sku, useInventory, deptName, type DeptKey } from "@/lib/store";
import { useSuppliers, useMovements, usePurchaseOrders, useReceipts, useInvoices, useCredits, poTotal, termsDueDays, PO_FLOW, RECEIVE_TOLERANCE, CREDIT_REASONS, threeWayMatch, type POLine } from "@/lib/wms";
import { useConfirm } from "@/components/Confirm";
import { Search, Close, Check } from "@/components/Icons";
import { m, timeAgo, type Flash } from "../shared";
import { Breadcrumb, Button, Combobox, DialogFrame, Menu } from "@/components/ui";
import { rid, matchClass, lineFromProduct, fmtGp, AuthImage, InvoiceImport } from "./_shared";

/* =======================================================================
   PURCHASE ORDER — full-page detail (/admin/purchaseorder/[id])
   ======================================================================= */
export function AdminPODetail({ id, flash }: { id: string; flash: Flash }) {
  const { pos, advance, update, remove } = usePurchaseOrders();
  const confirm = useConfirm();
  const { suppliers } = useSuppliers();
  const { products, updateProduct } = useInventory();
  const { log } = useMovements();
  const { receipts, add: addReceipt } = useReceipts();
  const { invoices, add: addInvoice, markPaid } = useInvoices();
  const { credits, add: addCredit } = useCredits();
  const router = useRouter();

  const [mode, setMode] = useState<"view" | "receive" | "invoice" | "credit">("view");
  const [importing, setImporting] = useState(false);
  const [viewShot, setViewShot] = useState(false);
  const [cr, setCr] = useState({ ref: "", reason: CREDIT_REASONS[0], amount: "", note: "" });
  const [recvQty, setRecvQty] = useState<Record<string, string>>({});
  const [invQty, setInvQty] = useState<Record<string, string>>({});
  const [invCost, setInvCost] = useState<Record<string, string>>({});
  const [invRef, setInvRef] = useState("");
  const [invDate, setInvDate] = useState(new Date().toISOString().slice(0, 10));
  const [invCharge, setInvCharge] = useState("");
  const [invTax, setInvTax] = useState("");
  const [editing, setEditing] = useState(false);
  const [dSup, setDSup] = useState("");
  const [dExp, setDExp] = useState("");
  const [dRef, setDRef] = useState("");
  const [dNotes, setDNotes] = useState("");
  const [dLines, setDLines] = useState<POLine[]>([]);

  const supName = (sid: string) => suppliers.find((s) => s.id === sid)?.name ?? sid;
  const cur = pos.find((p) => p.id === id) || null;
  const sup = cur ? suppliers.find((s) => s.id === cur.supplierId) : undefined;

  if (!cur) {
    return (
      <>
        <Breadcrumb items={[{ label: "Purchase orders", href: "/admin/purchaseorder" }, { label: "Not found" }]} />
        <div className="empty"><div className="ei" aria-hidden="true"><Search /></div><h3>Purchase order not found</h3><p>It may have been closed or removed.</p></div>
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
    if (!ilines.length) { flash("Nothing to invoice yet. Receive goods first"); return; }
    const charges = Number(invCharge) || 0;
    const tax = Number(invTax) || 0;
    const total = ilines.reduce((s, l) => s + l.qty * l.cost, 0) + charges + tax;
    const date = invDate ? new Date(invDate).getTime() : Date.now();
    // due date follows the supplier's terms (COD: due on delivery, 7 Days EFT, Net 15/30)
    const due = date + termsDueDays(sup?.terms ?? "") * 86400000;
    addInvoice({ id: rid("INV-"), poId: cur.id, date, ref: invRef.trim() || rid("SI-"), lines: ilines, total, charges, tax, due, paid: false });
    flash(`Invoice recorded, ${m(total)} due ${new Date(due).toLocaleDateString()}`);
    setInvRef(""); setInvCharge(""); setInvTax(""); setMode("view");
  };

  /* ---- edit PO (supplier, expected date, lines) ---- */
  const startEdit = () => {
    setDSup(cur.supplierId);
    setDExp(new Date(cur.expected).toISOString().slice(0, 10));
    setDRef(cur.supplierRef ?? "");
    setDNotes(cur.notes ?? "");
    setDLines(cur.lines.map((l) => ({ ...l })));
    setMode("view"); setEditing(true);
  };
  const dTotal = dLines.reduce((s, l) => s + l.ordered * l.cost, 0);
  const setLineField = (code: string, field: "ordered" | "cost", val: string) =>
    setDLines((ls) => ls.map((l) => (l.sku === code ? { ...l, [field]: Number(val) || 0 } : l)));
  const dropLine = (code: string) => setDLines((ls) => ls.filter((l) => l.sku !== code));
  const addLineEdit = (id: string) => {
    const p = products.find((x) => String(x.id) === id);
    if (!p) return;
    const code = sku(p);
    if (dLines.some((l) => l.sku === code)) { flash("Already on this PO"); return; }
    setDLines((ls) => [...ls, lineFromProduct(p, 12)]);
  };
  const saveEdit = () => {
    if (!dLines.length) { flash("A PO needs at least one line"); return; }
    update(cur.id, { supplierId: dSup, expected: new Date(dExp).getTime(), lines: dLines, supplierRef: dRef.trim(), notes: dNotes.trim() });
    setEditing(false);
    flash("Purchase order updated");
  };

  const postCredit = () => {
    const amount = Number(cr.amount);
    if (!amount || amount <= 0) { flash("Enter the credit amount"); return; }
    const ref = cr.ref.trim() || rid("CM-");
    addCredit({ id: rid("CM-"), poId: cur.id, date: Date.now(), ref, reason: cr.reason, amount, note: cr.note.trim() || undefined });
    flash(`Credit #${ref} recorded, ${m(amount)} off the balance`);
    setCr({ ref: "", reason: CREDIT_REASONS[0], amount: "", note: "" });
    setMode("view");
  };

  const match = threeWayMatch(cur, receipts, invoices, credits);
  const idx = PO_FLOW.indexOf(cur.status);
  const poCredits = credits.filter((c) => c.poId === cur.id);
  const creditTotal = poCredits.reduce((s, c) => s + c.amount, 0);
  // category recap, the way distributor invoices summarize the order (lines / units / cost per category)
  const recap = Object.entries(cur.lines.reduce<Record<string, { lines: number; units: number; cost: number }>>((acc, l) => {
    const dep = l.dep ?? products.find((p) => sku(p) === l.sku)?.dep ?? "other";
    const g = (acc[dep] ||= { lines: 0, units: 0, cost: 0 });
    g.lines += 1; g.units += l.ordered; g.cost += l.ordered * l.cost;
    return acc;
  }, {})).sort((a, b) => b[1].cost - a[1].cost);
  const poGrns = receipts.filter((g) => g.poId === cur.id);
  const recBySku: Record<string, number> = {};
  poGrns.forEach((g) => g.lines.forEach((l) => { recBySku[l.sku] = (recBySku[l.sku] || 0) + l.qty; }));
  const poInvs = invoices.filter((i) => i.poId === cur.id);
  const invBySku: Record<string, number> = {};
  poInvs.forEach((i) => i.lines.forEach((l) => { invBySku[l.sku] = (invBySku[l.sku] || 0) + l.qty; }));

  /* ---- guided flow: one clear "next step", the rest de-emphasised (Hick's Law) ---- */
  const PO_STAGES = ["Draft", "Approved", "Sent", "Received", "Closed"];
  const curStage =
    cur.status === "Draft" ? 0 : cur.status === "Approved" ? 1 : cur.status === "Sent" ? 2
    : cur.status === "Partially Received" || cur.status === "Received" ? 3 : 4;
  const canReceive = cur.status === "Sent" || cur.status === "Partially Received" || cur.status === "Approved";
  const doAdvance = () => { advance(cur.id); flash(`${cur.id} → ${PO_FLOW[idx + 1]}`); };
  const primaryAction =
    cur.status === "Draft" ? { label: "Approve this PO", caption: "Confirm the order is correct, then send it to the supplier.", variant: "primary" as const, run: doAdvance }
    : cur.status === "Approved" ? { label: "Mark as sent", caption: "Record that you've placed this order with the supplier.", variant: "primary" as const, run: doAdvance }
    : (cur.status === "Sent" || cur.status === "Partially Received") ? { label: "Receive goods", caption: "Enter the cases that arrived to add them to your stock.", variant: "primary" as const, run: () => setMode("receive") }
    : (cur.status === "Received" && poInvs.length === 0) ? { label: "Record invoice", caption: "Log the supplier invoice into Accounts Payable.", variant: "ink" as const, run: () => setMode("invoice") }
    : null;

  return (
    <>
      <Breadcrumb items={[{ label: "Purchase orders", href: "/admin/purchaseorder" }, { label: cur.id }]} />
      <header className="adminbar">
        <div><h1>{cur.id}</h1><p>{supName(cur.supplierId)} · created {new Date(cur.created).toLocaleDateString()} · expected {new Date(cur.expected).toLocaleDateString()}</p></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {mode === "view" && !editing && <button className="btn btn-ghost btn-sm" onClick={startEdit}>Edit PO</button>}
          {editing && <span className="hint">editing</span>}
          <span className={`pobadge s-${cur.status.replace(/\s+/g, "").toLowerCase()}`}>{cur.status}</span>
          <span className={`matchbadge ${matchClass(match.status)}`}>{match.status}</span>
          <Menu
            label={`More actions for ${cur.id}`}
            items={[{ label: "Delete purchase order", danger: true, onSelect: async () => { if (await confirm({ title: "Delete purchase order?", message: `${cur.id} will be permanently removed.`, confirmLabel: "Delete PO", danger: true })) { remove(cur.id); router.push("/admin/purchaseorder"); flash("Purchase order deleted"); } } }]}
          />
        </div>
      </header>

      {/* where this PO is in its lifecycle */}
      <ol className="steps po-steps" aria-label="Purchase order progress">
        {PO_STAGES.map((s, i) => (
          <li key={s} className={`step ${i === curStage ? "on" : ""} ${i < curStage ? "done" : ""}`}>
            <span className="step-n">{i < curStage ? <Check /> : i + 1}</span>
            <span className="step-l">{s === "Received" && cur.status === "Partially Received" ? "Receiving" : s}</span>
          </li>
        ))}
      </ol>

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
                          <td className="r"><button type="button" className="ia del" onClick={() => dropLine(l.sku)} disabled={l.received > 0} title={l.received > 0 ? "Already received" : "Remove"} aria-label="Remove line"><Close /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="addline">
                  <Combobox
                    ariaLabel="Add a product to this PO"
                    placeholder="Add a product: type a name or SKU"
                    value=""
                    onChange={addLineEdit}
                    options={products.filter((p) => !dLines.some((l) => l.sku === sku(p))).map((p) => ({ value: String(p.id), label: p.name, hint: sku(p) }))}
                    emptyText="No products match. Onboard it under Catalog first."
                  />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setImporting(true)}>Import from invoice</button>
                </div>
              </>
            ) : (
              <>
                {mode === "invoice" && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                    <label className="field" style={{ flex: "1 1 160px" }}><span>Supplier invoice #</span><input className="mono" value={invRef} onChange={(e) => setInvRef(e.target.value)} placeholder="1223917" /></label>
                    <label className="field" style={{ flex: "0 1 160px" }}><span>Invoice date</span><input type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} /></label>
                    <label className="field" style={{ flex: "0 1 140px" }}><span>Tobacco/OTP tax</span><input type="number" step="0.01" min={0} value={invTax} onChange={(e) => setInvTax(e.target.value)} placeholder="0.00" /></label>
                    <label className="field" style={{ flex: "0 1 140px" }}><span>Service charge</span><input type="number" step="0.01" min={0} value={invCharge} onChange={(e) => setInvCharge(e.target.value)} placeholder="0.00" /></label>
                  </div>
                )}
                {mode === "credit" && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                    <label className="field" style={{ flex: "0 1 150px" }}><span>Credit memo #</span><input className="mono" value={cr.ref} onChange={(e) => setCr({ ...cr, ref: e.target.value })} placeholder="Vendor's memo #" /></label>
                    <label className="field" style={{ flex: "0 1 170px" }}><span>Reason</span>
                      <select value={cr.reason} onChange={(e) => setCr({ ...cr, reason: e.target.value })}>{CREDIT_REASONS.map((r) => <option key={r}>{r}</option>)}</select>
                    </label>
                    <label className="field" style={{ flex: "0 1 130px" }}><span>Amount ($)</span><input type="number" step="0.01" min={0} value={cr.amount} onChange={(e) => setCr({ ...cr, amount: e.target.value })} placeholder="0.00" /></label>
                    <label className="field" style={{ flex: "2 1 200px" }}><span>Note</span><input value={cr.note} onChange={(e) => setCr({ ...cr, note: e.target.value })} placeholder="e.g. 2 cases short on Mr Fog Switch" /></label>
                  </div>
                )}
                <div className="tablewrap">
                  <table className="invtable">
                    <thead><tr><th>Line</th><th className="r">Ordered</th><th className="r">Received</th><th className="r">Invoiced</th>
                      {mode === "view" && <th className="r">Unit cost</th>}
                      {mode === "view" && <th className="r">GP%</th>}
                      {mode === "view" && <th className="r">Ext</th>}
                      {mode === "receive" && <th className="r">Receive now</th>}
                      {mode === "invoice" && <th className="r">Inv qty</th>}
                      {mode === "invoice" && <th className="r">Unit cost</th>}
                    </tr></thead>
                    <tbody>
                      {cur.lines.map((l) => {
                        const remaining = l.ordered - l.received;
                        return (
                          <tr key={l.sku}>
                            <td><div className="pn" style={{ fontSize: 13.5 }}>{l.name}</div><div className="mono muted" style={{ fontSize: 11 }}>{l.sku}{l.upc ? ` · UPC ${l.upc}` : ""}</div></td>
                            <td className="r mono">{l.ordered}{l.unit ? <span className="muted"> {l.unit}</span> : null}</td>
                            <td className="r mono">{recBySku[l.sku] ?? l.received}</td>
                            <td className="r mono">{invBySku[l.sku] ?? 0}</td>
                            {mode === "view" && <td className="r mono">{m(l.cost)}</td>}
                            {mode === "view" && <td className="r mono">{fmtGp(l)}</td>}
                            {mode === "view" && <td className="r mono">{m(l.ordered * l.cost)}</td>}
                            {mode === "receive" && <td className="r"><input className="cellinput" type="number" min={0} placeholder={String(remaining)} value={recvQty[l.sku] ?? ""} onChange={(e) => setRecvQty({ ...recvQty, [l.sku]: e.target.value })} disabled={remaining <= 0} /></td>}
                            {mode === "invoice" && <td className="r"><input className="cellinput" type="number" min={0} value={invQty[l.sku] ?? String(l.received)} onChange={(e) => setInvQty({ ...invQty, [l.sku]: e.target.value })} /></td>}
                            {mode === "invoice" && <td className="r"><input className="cellinput" type="number" step="0.01" value={invCost[l.sku] ?? String(l.cost)} onChange={(e) => setInvCost({ ...invCost, [l.sku]: e.target.value })} /></td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {(poGrns.length > 0 || poInvs.length > 0 || poCredits.length > 0) && mode === "view" && (
                  <div className="grnlist">
                    {poGrns.map((g) => <span key={g.id} className="grnchip">{g.id} · {g.lines.reduce((s, l) => s + l.qty, 0)} cs · {timeAgo(g.received)} · {g.by}</span>)}
                    {poInvs.map((i) => {
                      const overdue = !i.paid && i.due != null && i.due < Date.now();
                      return (
                        <span key={i.id} className={`grnchip ${overdue ? "grnchip-overdue" : ""}`}>
                          Invoice #{i.ref} · {m(i.total)}
                          {i.tax ? ` (${m(i.tax)} tax)` : ""}{i.charges ? ` (${m(i.charges)} svc)` : ""}
                          {i.due != null && !i.paid && <> · due {new Date(i.due).toLocaleDateString()}</>}
                          {i.paid
                            ? <b className="grnchip-paid">Paid</b>
                            : <button type="button" className="linklike" style={{ marginLeft: 8 }} onClick={() => { markPaid(i.id); flash(`Invoice #${i.ref} marked paid`); }}>Mark paid</button>}
                        </span>
                      );
                    })}
                    {poCredits.map((c) => (
                      <span key={c.id} className="grnchip grnchip-credit" title={c.note}>
                        Credit #{c.ref} · {c.reason} · −{m(c.amount)}
                      </span>
                    ))}
                    {poCredits.length > 0 && poInvs.length > 0 && (
                      <span className="grnchip grnchip-balance">
                        Payable: {m(poInvs.reduce((s, i) => s + i.total, 0))} − {m(creditTotal)} = <b>{m(Math.max(0, poInvs.reduce((s, i) => s + i.total, 0) - creditTotal))}</b>
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {!editing && recap.length > 1 && (
            <div className="panel">
              <div className="panel-h"><h3>Category recap</h3><span className="hint">Lines · units · cost, the way supplier invoices summarize it</span></div>
              <div className="tablewrap">
                <table className="invtable">
                  <thead><tr><th>Category</th><th className="r">Lines</th><th className="r">Units</th><th className="r">Cost</th></tr></thead>
                  <tbody>
                    {recap.map(([dep, g]) => (
                      <tr key={dep}>
                        <td className="pn" style={{ fontSize: 13.5 }}>{deptName(dep as DeptKey)}</td>
                        <td className="r mono">{g.lines}</td>
                        <td className="r mono">{g.units}</td>
                        <td className="r mono">{m(g.cost)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="pn" style={{ fontWeight: 700 }}>Total</td>
                      <td className="r mono" style={{ fontWeight: 700 }}>{cur.lines.length}</td>
                      <td className="r mono" style={{ fontWeight: 700 }}>{cur.lines.reduce((s, l) => s + l.ordered, 0)}</td>
                      <td className="r mono" style={{ fontWeight: 700 }}>{m(poTotal(cur))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <aside className="detail-side">
          {!editing && (
          <div className="panel">
            <div className="panel-h"><h3>Actions</h3></div>
            <div className="postack">
              {mode === "view" ? (
                <>
                  {primaryAction && (
                    <div className="po-next">
                      <Button variant={primaryAction.variant} fullWidth onClick={primaryAction.run}>{primaryAction.label}</Button>
                      <p className="po-next-cap">{primaryAction.caption}</p>
                    </div>
                  )}
                  <div className="po-secondary">
                    {primaryAction && <span className="po-secondary-l">Other actions</span>}
                    {canReceive && primaryAction?.label !== "Receive goods" && (
                      <Button variant="ghost" size="sm" fullWidth onClick={() => setMode("receive")}>Receive goods</Button>
                    )}
                    {primaryAction?.label !== "Record invoice" && (
                      <Button variant="ghost" size="sm" fullWidth onClick={() => setMode("invoice")}>Record invoice</Button>
                    )}
                    {poInvs.length > 0 && (
                      <Button variant="ghost" size="sm" fullWidth onClick={() => setMode("credit")}>Record credit memo</Button>
                    )}
                  </div>
                </>
              ) : mode === "receive" ? (
                <>
                  <Button variant="primary" fullWidth onClick={postReceipt}>Post goods receipt</Button>
                  <Button variant="ghost" fullWidth onClick={() => setMode("view")}>Cancel</Button>
                </>
              ) : mode === "credit" ? (
                <>
                  <Button variant="primary" fullWidth onClick={postCredit}>Save credit memo</Button>
                  <Button variant="ghost" fullWidth onClick={() => setMode("view")}>Cancel</Button>
                </>
              ) : (
                <>
                  <Button variant="primary" fullWidth onClick={postInvoice}>Save invoice</Button>
                  <Button variant="ghost" fullWidth onClick={() => setMode("view")}>Cancel</Button>
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
                <label className="field" style={{ marginTop: 12 }}><span>Supplier order #</span>
                  <input className="mono" value={dRef} onChange={(e) => setDRef(e.target.value)} placeholder="1191471" />
                </label>
                <label className="field" style={{ marginTop: 12 }}><span>Notes</span>
                  <textarea rows={2} value={dNotes} onChange={(e) => setDNotes(e.target.value)} placeholder="Call-in notes, substitutions…" />
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
                {cur.supplierRef && <div className="kv2"><span>Supplier order #</span><b className="mono">{cur.supplierRef}</b></div>}
                <div className="kv2"><span>Status</span><b>{cur.status}</b></div>
                <div className="kv2"><span>Created</span><b>{new Date(cur.created).toLocaleDateString()}</b></div>
                <div className="kv2"><span>Expected</span><b>{new Date(cur.expected).toLocaleDateString()}</b></div>
                <div className="kv2"><span>PO total</span><b className="mono">{m(poTotal(cur))}</b></div>
                {cur.notes && <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>{cur.notes}</p>}
              </div>
            )}
          </div>
          {!editing && cur.attachment && (
            <div className="panel">
              <div className="panel-h"><h3>Invoice photo</h3><span className="hint">{cur.attachmentName || "attached"}</span></div>
              <button type="button" onClick={() => setViewShot(true)} style={{ display: "block", width: "100%" }} aria-label="View invoice photo full size">
                <AuthImage src={cur.attachment} alt="Vendor invoice" style={{ width: "100%", borderRadius: 10, border: "1px solid var(--line)" }} />
              </button>
            </div>
          )}
          {!editing && sup && (
            <div className="panel">
              <div className="panel-h"><h3>Supplier</h3><span className="hint">From the vendor master</span></div>
              <div className="kvs">
                {sup.accountNo && <div className="kv2"><span>Our account #</span><b className="mono">{sup.accountNo}</b></div>}
                <div className="kv2"><span>Terms</span><b>{sup.terms}</b></div>
                {sup.salesRep && <div className="kv2"><span>Sales rep</span><b>{sup.salesRep}</b></div>}
                {sup.csr && <div className="kv2"><span>CSR</span><b>{sup.csr}</b></div>}
                {sup.phone && <div className="kv2"><span>Phone</span><b className="mono">{sup.phone}</b></div>}
                {sup.deliveryDay && <div className="kv2"><span>Delivery</span><b>{sup.deliveryDay}{sup.truck ? ` · truck ${sup.truck} · stop ${sup.stop}` : ""}</b></div>}
                {sup.address && <div className="kv2"><span>Address</span><b>{sup.address}, {sup.city}, {sup.state} {sup.zip}</b></div>}
              </div>
            </div>
          )}
        </aside>
      </div>

      {importing && (
        <InvoiceImport
          products={products}
          existingSkus={new Set(dLines.map((l) => l.sku))}
          onAdd={(ls) => setDLines((d) => [...d, ...ls])}
          onAttach={(u, n) => update(cur.id, { attachment: u, attachmentName: n })}
          onClose={() => setImporting(false)}
          flash={flash}
        />
      )}
      {viewShot && cur.attachment && (
        <DialogFrame onClose={() => setViewShot(false)} label="Vendor invoice, full size">
          <AuthImage src={cur.attachment} alt="Vendor invoice, full size" style={{ maxWidth: "94vw", maxHeight: "92vh", margin: "auto", borderRadius: 12 }} />
        </DialogFrame>
      )}
    </>
  );
}
