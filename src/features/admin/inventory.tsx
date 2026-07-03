"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  sku, useInventory, LOW_STOCK, deptName,
  type Product, type DeptKey,
} from "@/lib/store";
import {
  useSuppliers, useLocations, useMovements, usePurchaseOrders, useReceipts, useInvoices, useCredits,
  poTotal, gpPct, termsDueDays, parseInvoiceText, PO_FLOW, RECEIVE_TOLERANCE, CREDIT_REASONS, threeWayMatch,
  type POLine, type ParsedInvoiceRow,
} from "@/lib/wms";
import { useConfirm } from "@/components/Confirm";
import { Search, Close, Package, Plus } from "@/components/Icons";
import { Breadcrumb, Button, Combobox, DataTable, Fab, ListToolbar, Progress, ViewToggle, type Column, type ToolbarOption, type ViewMode } from "@/components/ui";
import { Head, FlowGuide, PRODUCT_FLOW, m, timeAgo, type Flash } from "./shared";

const rid = (pre: string) => pre + Math.floor(1000 + Math.random() * 8999);
const matchClass = (s: string) => s === "Matched" ? "matched" : s === "Variance" ? "variance" : "awaiting";

/** Build a PO line from the catalog, carrying the fields distributor invoices print (UPC, unit, retail). */
const lineFromProduct = (p: Product, ordered: number): POLine => ({
  sku: sku(p), name: p.name, ordered, received: 0,
  cost: p.cost ?? Math.round(p.price * 0.7 * 100) / 100,
  upc: p.gtin, unit: p.uom ?? "case", retail: p.price, dep: p.dep,
});
const fmtGp = (l: POLine) => {
  const gp = gpPct(l.retail, l.cost);
  return gp === null ? "—" : `${gp.toFixed(1)}%`;
};

/** Downscale a photo so a PO attachment fits comfortably in localStorage. */
const downscale = (dataUrl: string, maxW = 1400): Promise<string> =>
  new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });

/* =======================================================================
   INVOICE IMPORT — photo (OCR) or pasted text → staged PO lines
   ======================================================================= */
function InvoiceImport({ products, existingSkus, onAdd, onAttach, onClose, flash }: {
  products: Product[];
  existingSkus: Set<string>;
  onAdd: (lines: POLine[]) => void;
  onAttach: (dataUrl: string, name: string) => void;
  onClose: () => void;
  flash: Flash;
}) {
  const [img, setImg] = useState("");
  const [imgName, setImgName] = useState("");
  const [ocring, setOcring] = useState(false);
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ParsedInvoiceRow[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) { flash("Choose a photo of the invoice"); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const small = await downscale(String(reader.result));
      setImg(small);
      setImgName(f.name);
      onAttach(small, f.name);
    };
    reader.readAsDataURL(f);
  };

  const stage = (t: string) => {
    const parsed = parseInvoiceText(t, products);
    setRows(parsed);
    if (!parsed.length) flash("No item lines found in that text");
  };

  const runOcr = async () => {
    if (!img) return;
    setOcring(true);
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const { data } = await Tesseract.recognize(img, "eng");
      setText(data.text);
      stage(data.text);
    } catch {
      flash("Couldn't read the photo. Paste the invoice lines instead");
    }
    setOcring(false);
  };

  const setRow = (i: number, patch: Partial<ParsedInvoiceRow>) =>
    setRows((rs) => rs!.map((r, x) => (x === i ? { ...r, ...patch } : r)));

  const addAll = () => {
    if (!rows) return;
    const usable = rows.filter((r) => r.productId && r.qty > 0);
    const lines: POLine[] = [];
    let skipped = 0;
    for (const r of usable) {
      const p = products.find((x) => String(x.id) === r.productId);
      if (!p) continue;
      if (existingSkus.has(sku(p)) || lines.some((l) => l.sku === sku(p))) { skipped++; continue; }
      lines.push({ ...lineFromProduct(p, r.qty), cost: r.cost });
    }
    if (!lines.length) { flash(skipped ? "Those products are already on the PO" : "Nothing matched to add"); return; }
    onAdd(lines);
    flash(`${lines.length} line${lines.length > 1 ? "s" : ""} added from invoice${skipped ? `, ${skipped} already on the PO` : ""}`);
    onClose();
  };

  const matched = rows?.filter((r) => r.productId).length ?? 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Import invoice lines">
        <h3>Import lines from a vendor invoice</h3>
        <p className="modalp">Photograph the paper invoice and let the app read it, or paste the line items as text. Review every row before it lands on the PO.</p>

        <div className="impgrid">
          <div className="impcol">
            <span className="colabel">1 · Invoice photo</span>
            {img
              ? /* eslint-disable-next-line @next/next/no-img-element */
                <img src={img} alt="Invoice" className="imp-shot" />
              : <button type="button" className="imp-drop" onClick={() => fileRef.current?.click()}>Upload or take a photo</button>}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={onFile} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {img && <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>Replace</Button>}
              {img && <Button variant="primary" size="sm" onClick={runOcr} loading={ocring}>{ocring ? "Reading…" : "Read lines from photo"}</Button>}
            </div>
            {img && <span className="hint" style={{ display: "block", marginTop: 6 }}>The photo is saved on the PO either way.</span>}
          </div>
          <div className="impcol">
            <span className="colabel">2 · Or paste the lines</span>
            <textarea
              className="csvbox"
              rows={7}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"One item per line, e.g.\n142 15 CAMEL KING BLUE BX 012300197403 96.28 1444.20"}
            />
            <Button variant="ghost" size="sm" onClick={() => stage(text)} disabled={!text.trim()} style={{ marginTop: 8 }}>Parse text</Button>
          </div>
        </div>

        {rows && (
          <>
            <div className="panel-h" style={{ marginTop: 16 }}><h3>Review</h3><span className="hint">{matched}/{rows.length} lines matched to the catalog</span></div>
            <div className="tablewrap" style={{ maxHeight: 260, overflowY: "auto" }}>
              <table className="invtable flat">
                <thead><tr><th>Invoice line</th><th>Catalog product</th><th className="r">Qty</th><th className="r">Unit cost</th></tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={r.productId ? "" : "rowdim"}>
                      <td><div style={{ fontSize: 12.5, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.raw}>{r.desc}</div>{r.matchedBy && <div className="mono muted" style={{ fontSize: 10.5 }}>matched by {r.matchedBy === "upc" ? "UPC" : "name"}</div>}</td>
                      <td style={{ minWidth: 200 }}>
                        <Combobox
                          ariaLabel={`Catalog product for ${r.desc}`}
                          placeholder="No match. Pick a product"
                          value={r.productId}
                          onChange={(v) => setRow(i, { productId: v })}
                          options={products.map((p) => ({ value: String(p.id), label: p.name, hint: sku(p) }))}
                        />
                      </td>
                      <td className="r"><input className="cellinput" type="number" min={1} value={r.qty} onChange={(e) => setRow(i, { qty: Number(e.target.value) || 0 })} /></td>
                      <td className="r"><input className="cellinput" type="number" min={0} step="0.01" value={r.cost} onChange={(e) => setRow(i, { cost: Number(e.target.value) || 0 })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="modalbtns" style={{ marginTop: 14 }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={addAll} disabled={!rows || matched === 0}>Add {matched > 0 ? `${matched} line${matched > 1 ? "s" : ""}` : "lines"} to PO</Button>
        </div>
      </div>
    </div>
  );
}

/* =======================================================================
   PURCHASE ORDERS — list (opens /admin/purchaseorder/[id])
   ======================================================================= */
export function POTab({ flash }: { flash: Flash }) {
  const { pos, add } = usePurchaseOrders();
  const { suppliers } = useSuppliers();
  const { products } = useInventory();
  const { receipts } = useReceipts();
  const { invoices } = useInvoices();
  const { credits } = useCredits();
  const router = useRouter();

  const supName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? id;

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState<ViewMode>("grid");

  const poRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = pos.filter((po) =>
      (status === "all" || po.status === status) &&
      (q === "" || po.id.toLowerCase().includes(q) || supName(po.supplierId).toLowerCase().includes(q))
    );
    return [...list].sort((a, b) => (sort === "total-desc" ? poTotal(b) - poTotal(a) : sort === "oldest" ? a.created - b.created : b.created - a.created));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, query, status, sort, suppliers]);

  const suggestions = useMemo(() => {
    const low = products.filter((p) => p.stock <= (p.reorderPoint ?? LOW_STOCK) && p.supplierId);
    const bySup: Record<string, Product[]> = {};
    low.forEach((p) => { const s = p.supplierId!; (bySup[s] ||= []).push(p); });
    return bySup;
  }, [products]);

  const createDraft = (supplierId: string, items: Product[]) => {
    add({
      id: rid("PO-"), supplierId, status: "Draft", created: Date.now(), expected: Date.now() + 4 * 86400000,
      lines: items.map((p) => lineFromProduct(p, Math.max(12, (p.maxStock ?? LOW_STOCK * 4) - p.stock))),
    });
    flash("Draft PO created from reorder suggestions");
  };

  return (
    <>
      <Head title="Purchase orders" sub={`Order stock from suppliers, then receive it to update inventory. Receiving tolerance ±${RECEIVE_TOLERANCE * 100}%`}>
        <button className="btn btn-primary btn-sm" onClick={() => router.push("/admin/purchaseorder/new")}>+ New PO</button>
      </Head>
      <FlowGuide steps={PRODUCT_FLOW} active="po" title="Stock-in flow" />
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
      <ListToolbar
        search={{ value: query, onChange: setQuery, placeholder: "Search PO # or supplier…" }}
        filters={[{ label: "Status", value: status, onChange: setStatus, options: [{ value: "all", label: "All statuses" }, ...PO_FLOW.map((s) => ({ value: s, label: s }))] }]}
        sort={{ value: sort, onChange: setSort, options: [{ value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }, { value: "total-desc", label: "Highest total" }] }}
        right={<ViewToggle view={view} onChange={setView} />}
      />
      {view === "table" ? (
        <DataTable
          columns={[
            { key: "id", header: "PO", render: (po) => <div><div className="pn mono" style={{ fontSize: 13.5 }}>{po.id}</div><div className="mono muted" style={{ fontSize: 11 }}>{supName(po.supplierId)}</div></div> },
            { key: "lines", header: "Lines", align: "right", render: (po) => <span className="mono">{po.lines.length}</span> },
            { key: "recv", header: "Received", align: "right", render: (po) => { const recv = po.lines.reduce((s, l) => s + l.received, 0); const ord = po.lines.reduce((s, l) => s + l.ordered, 0); return <Progress value={recv} max={ord} ariaLabel={`Received ${recv} of ${ord} cases`} showFigure tone="success" />; } },
            { key: "total", header: "Total", align: "right", render: (po) => <span className="mono">{m(poTotal(po))}</span> },
            { key: "status", header: "Status", render: (po) => <span className={`pobadge s-${po.status.replace(/\s+/g, "").toLowerCase()}`}>{po.status}</span> },
            { key: "match", header: "Match", align: "right", render: (po) => { const match = threeWayMatch(po, receipts, invoices, credits); return <span className={`matchbadge ${matchClass(match.status)}`}>{match.status}</span>; } },
          ] satisfies Column<(typeof poRows)[number]>[]}
          rows={poRows}
          rowKey={(po) => po.id}
          onRowClick={(po) => router.push(`/admin/purchaseorder/${po.id}`)}
          empty="No purchase orders match."
        />
      ) : (
      <div className="orders">
        {poRows.map((po) => {
          const total = poTotal(po);
          const recv = po.lines.reduce((s, l) => s + l.received, 0);
          const ord = po.lines.reduce((s, l) => s + l.ordered, 0);
          const match = threeWayMatch(po, receipts, invoices, credits);
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
        {poRows.length === 0 && <div className="empty"><div className="ei" aria-hidden="true"><Package /></div><h3>No purchase orders match</h3><p>Adjust the filters, or create one from the reorder suggestions above.</p></div>}
      </div>
      )}
      <Fab icon={<Plus />} href="/admin/purchaseorder/new">New PO</Fab>
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
                  {(cur.status === "Draft" || cur.status === "Approved") && (
                    <button className="btn btn-ghost" onClick={() => { advance(cur.id); flash(`${cur.id} → ${PO_FLOW[idx + 1]}`); }}>
                      {cur.status === "Draft" ? "Approve PO" : "Mark as sent"}
                    </button>
                  )}
                  {(cur.status === "Sent" || cur.status === "Partially Received" || cur.status === "Approved") && (
                    <button className="btn btn-primary" onClick={() => setMode("receive")}>Receive goods</button>
                  )}
                  <button className="btn btn-ink" onClick={() => setMode("invoice")}>Record invoice</button>
                  {poInvs.length > 0 && <button className="btn btn-ghost" onClick={() => setMode("credit")}>Record credit memo</button>}
                </>
              ) : mode === "receive" ? (
                <>
                  <button className="btn btn-primary" onClick={postReceipt}>Post goods receipt</button>
                  <button className="btn btn-ghost" onClick={() => setMode("view")}>Cancel</button>
                </>
              ) : mode === "credit" ? (
                <>
                  <button className="btn btn-primary" onClick={postCredit}>Save credit memo</button>
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cur.attachment} alt="Vendor invoice" style={{ width: "100%", borderRadius: 10, border: "1px solid var(--line)" }} />
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
        <div className="modal-overlay" onClick={() => setViewShot(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cur.attachment} alt="Vendor invoice, full size" style={{ maxWidth: "94vw", maxHeight: "92vh", margin: "auto", borderRadius: 12 }} />
        </div>
      )}
    </>
  );
}

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
        <div><h1>New purchase order</h1><p>Draft a PO to a supplier, then approve and send</p></div>
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

/* =======================================================================
   INVENTORY LEDGER
   ======================================================================= */
export function InventoryTab({ flash }: { flash: Flash }) {
  const { movements, log } = useMovements();
  const { products, updateProduct } = useInventory();
  const [pid, setPid] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("cycle count");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("newest");

  const typeOpts: ToolbarOption[] = useMemo(
    () => [{ value: "all", label: "All types" }, ...Array.from(new Set(movements.map((mv) => mv.type))).map((t) => ({ value: t, label: t }))],
    [movements]
  );
  const ledger = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = movements.filter((mv) =>
      (type === "all" || mv.type === type) &&
      (q === "" || mv.name.toLowerCase().includes(q) || mv.sku.toLowerCase().includes(q) || (mv.ref || "").toLowerCase().includes(q))
    );
    return [...list].sort((a, b) => (sort === "oldest" ? a.ts - b.ts : b.ts - a.ts));
  }, [movements, query, type, sort]);

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
      <Head title="Stock ledger" sub="The running history of every stock change: receipts, picks, adjustments and transfers" />
      <FlowGuide steps={PRODUCT_FLOW} active="ledger" title="Stock-in flow" />
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-h"><h3>Manual adjustment</h3></div>
        <form style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }} onSubmit={adjust}>
          <label className="field" style={{ flex: "2 1 240px" }}><span>Product</span>
            <Combobox
              ariaLabel="Product to adjust"
              placeholder="Type a product name or SKU"
              value={pid}
              onChange={setPid}
              options={products.map((p) => ({ value: String(p.id), label: p.name, hint: `${p.stock} cs` }))}
            />
          </label>
          <label className="field" style={{ flex: "0 1 130px" }}><span>Qty (±)</span><input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="-3" required /></label>
          <label className="field" style={{ flex: "1 1 160px" }}><span>Reason</span><input value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          <button className="btn btn-primary btn-sm" type="submit" style={{ height: 46 }}>Post adjustment</button>
        </form>
      </div>
      <ListToolbar
        search={{ value: query, onChange: setQuery, placeholder: "Search product, SKU or ref…" }}
        filters={[{ label: "Type", value: type, onChange: setType, options: typeOpts }]}
        sort={{ value: sort, onChange: setSort, options: [{ value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }] }}
      />
      <div className="tablewrap">
        <table className="invtable">
          <thead><tr><th>Time</th><th>Type</th><th>SKU / Product</th><th>Location</th><th>Ref</th><th className="r">Qty</th></tr></thead>
          <tbody>
            {ledger.map((mv) => (
              <tr key={mv.id}>
                <td className="muted" style={{ fontSize: 13 }}>{timeAgo(mv.ts)}</td>
                <td><span className={`movebadge ${mv.type.toLowerCase()}`}>{mv.type}</span></td>
                <td><div className="pn" style={{ fontSize: 13.5 }}>{mv.name}</div><div className="mono muted" style={{ fontSize: 11 }}>{mv.sku}</div></td>
                <td className="mono muted">{mv.loc || "—"}</td>
                <td className="mono muted">{mv.ref}</td>
                <td className="r mono" style={{ color: mv.qty < 0 ? "var(--red)" : "var(--green)", fontWeight: 600 }}>{mv.qty > 0 ? "+" : ""}{mv.qty}</td>
              </tr>
            ))}
            {!ledger.length && <tr><td colSpan={6} className="muted" style={{ textAlign: "center", padding: "28px 0" }}>No movements match.</td></tr>}
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
                  <td className="r" onClick={(e) => e.stopPropagation()}><button className="ia del" onClick={async () => { if (await confirm({ title: "Remove bin?", message: `${l.id} will be removed.`, confirmLabel: "Remove", danger: true })) { remove(l.id); flash("Bin removed"); } }} aria-label="Remove bin"><Close /></button></td>
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
