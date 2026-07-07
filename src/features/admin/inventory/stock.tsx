"use client";

import { useMemo, useState } from "react";
import { sku, useInventory, useOrders, LOW_STOCK, type Product, type OrderStatus } from "@/lib/store";
import { useMovements, usePurchaseOrders, useSuppliers, poTotal, type StockMovement, type POStatus } from "@/lib/wms";
import { useConfirm } from "@/components/Confirm";
import { Head, FlowHelp, PRODUCT_FLOW, m, k, type Flash } from "../shared";
import { Badge, Button, Combobox, DialogFrame, EmptyState, KpiCard, ListToolbar, Menu, Skeleton, type BadgeTone, type ToolbarOption } from "@/components/ui";
import { Plus } from "@/components/Icons";

/* =======================================================================
   STOCK LEDGER — one activity table for every stock event: movements,
   inbound purchase orders, outbound sales, and stock-health alerts
   (missing / overstock). The "Show" filter navigates between them; the
   search box narrows whatever is in view.
   ======================================================================= */
type Source = "all" | "movement" | "po" | "sale" | "alert";
const SOURCE_OPTS: ToolbarOption[] = [
  { value: "all", label: "All activity" },
  { value: "movement", label: "Movements" },
  { value: "po", label: "Purchase orders" },
  { value: "sale", label: "Sales" },
  { value: "alert", label: "Stock health" },
];
const PO_TONE: Record<POStatus, BadgeTone> = {
  Draft: "neutral", Approved: "info", Sent: "info",
  "Partially Received": "warning", Received: "success", Closed: "neutral",
};
const ORDER_TONE: Record<OrderStatus, BadgeTone> = {
  Pending: "warning", Processing: "info", "At Local Facility": "info",
  "Out for delivery": "info", Completed: "success", Cancelled: "danger",
};
type HealthStatus = "out" | "low" | "over";
const HEALTH_LABEL: Record<HealthStatus, { tone: BadgeTone; text: string }> = {
  out: { tone: "danger", text: "Out of stock" },
  low: { tone: "warning", text: "Below reorder" },
  over: { tone: "info", text: "Overstock" },
};

/** One row of the unified ledger, normalized from a movement, PO, sale or alert. */
interface LedgerRow {
  key: string;
  kind: Exclude<Source, "all">;
  ts: number;            // event time; 0 for alerts (a state, not an event)
  moveType?: string;     // movement badge (Receipt / Pick / Adjust…)
  title: string;         // primary label
  sub: string;           // secondary (mono, muted)
  inQty: number | null;  // cases in (positive)
  outQty: number | null; // cases out (negative)
  value: number | null;  // dollar value (PO / sale)
  status: { text: string; tone: BadgeTone } | null;
  mv?: StockMovement;    // present on movement rows → edit / delete
}

export function InventoryTab({ flash }: { flash: Flash }) {
  const { movements, log, update, remove, ready, error, refresh } = useMovements();
  const { products, updateProduct, ready: prodReady } = useInventory();
  const { orders, ready: ordReady } = useOrders();
  const { pos, ready: poReady } = usePurchaseOrders();
  const { suppliers } = useSuppliers();
  const confirm = useConfirm();
  const allReady = ready && prodReady && ordReady && poReady;

  const [source, setSource] = useState<Source>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");

  // Manual adjustment — a single header button opens this dialog.
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [pid, setPid] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("cycle count");

  // Editing a ledger entry. For manual "Adjust" rows, changing the quantity
  // re-applies the difference to the product's stock so the two stay in sync;
  // system rows (receipts, picks, transfers) allow only a note correction.
  const [editMv, setEditMv] = useState<StockMovement | null>(null);
  const [eQty, setEQty] = useState("");
  const [eRef, setERef] = useState("");
  const editable = editMv?.type === "Adjust";
  const findProduct = (mv: StockMovement): Product | undefined =>
    products.find((p) => sku(p) === mv.sku) ?? products.find((p) => p.name === mv.name);

  // Ledger timestamps read as real dates, not "2h ago" — a ledger is an audit trail.
  const ledgerDate = (ts: number) => new Date(ts).toLocaleDateString("en-US", { year: "2-digit", month: "2-digit", day: "2-digit" });
  const ledgerTime = (ts: number) => new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

  const openEdit = (mv: StockMovement) => { setEditMv(mv); setEQty(String(mv.qty)); setERef(mv.ref || ""); };
  const saveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const mv = editMv;
    if (!mv) return;
    const patch: Partial<StockMovement> = { ref: eRef.trim() };
    if (editable) {
      const nq = Number(eQty);
      if (!Number.isFinite(nq) || nq === 0) { flash("Enter a non-zero quantity"); return; }
      if (nq !== mv.qty) {
        const p = findProduct(mv);
        if (p) updateProduct(p.id, { stock: Math.max(0, p.stock + (nq - mv.qty)) });
        patch.qty = nq;
      }
    }
    update(mv.id, patch);
    setEditMv(null);
    flash("Ledger entry updated");
  };
  const delEntry = async (mv: StockMovement) => {
    const isAdjust = mv.type === "Adjust";
    const ok = await confirm({
      title: "Delete this entry?",
      message: isAdjust
        ? `This removes the ledger entry and reverses its ${mv.qty > 0 ? "+" : ""}${mv.qty} stock change.`
        : "This removes the ledger entry. Stock is not changed (this was a system movement).",
      confirmLabel: "Delete entry",
      danger: true,
    });
    if (!ok) return;
    if (isAdjust) {
      const p = findProduct(mv);
      if (p) updateProduct(p.id, { stock: Math.max(0, p.stock - mv.qty) });
    }
    remove(mv.id);
    flash("Ledger entry deleted");
  };

  const adjust = (e: React.FormEvent) => {
    e.preventDefault();
    const p = products.find((x) => String(x.id) === pid);
    const q = Number(qty);
    if (!p || !q) { flash("Pick a product and a non-zero quantity"); return; }
    updateProduct(p.id, { stock: Math.max(0, p.stock + q) });
    log({ sku: sku(p), name: p.name, type: "Adjust", qty: q, ref: reason });
    setQty(""); setPid(""); setAdjustOpen(false); flash("Stock adjusted & logged");
  };

  // Missing / overstock classification for the stock-health rows.
  const classify = (p: Product): HealthStatus | "ok" => {
    const rp = p.reorderPoint ?? LOW_STOCK;
    if (p.stock <= 0) return "out";
    if (p.stock <= rp) return "low";
    if (p.maxStock != null && p.stock > p.maxStock) return "over";
    return "ok";
  };

  // Every source normalized into one row shape.
  const allRows = useMemo<LedgerRow[]>(() => {
    const out: LedgerRow[] = [];
    for (const mv of movements) {
      out.push({
        key: `mv-${mv.id}`, kind: "movement", ts: mv.ts, moveType: mv.type,
        title: mv.name, sub: [mv.sku, mv.loc, mv.ref].filter(Boolean).join(" · "),
        inQty: mv.qty > 0 ? mv.qty : null, outQty: mv.qty < 0 ? mv.qty : null,
        value: null, status: null, mv,
      });
    }
    for (const po of pos) {
      const sup = suppliers.find((s) => s.id === po.supplierId);
      const ordered = po.lines.reduce((s, l) => s + l.ordered, 0);
      out.push({
        key: `po-${po.id}`, kind: "po", ts: po.created,
        title: sup?.name ?? po.id, sub: `${po.id} · ${po.lines.length} line${po.lines.length === 1 ? "" : "s"}`,
        inQty: ordered || null, outQty: null, value: poTotal(po),
        status: { text: po.status, tone: PO_TONE[po.status] },
      });
    }
    for (const o of orders) {
      out.push({
        key: `sale-${o.ref}`, kind: "sale", ts: o.placed,
        title: o.store, sub: `${o.ref} · ${o.cases} cs`,
        inQty: null, outQty: o.cases ? -o.cases : null, value: o.total,
        status: { text: o.status, tone: ORDER_TONE[o.status] },
      });
    }
    for (const p of products) {
      const st = classify(p);
      if (st === "ok") continue;
      const rp = p.reorderPoint ?? LOW_STOCK;
      out.push({
        key: `alert-${p.id}`, kind: "alert", ts: 0,
        title: p.name,
        sub: [sku(p), `${p.stock} on hand`, `reorder ${rp}`, p.maxStock != null ? `max ${p.maxStock}` : ""].filter(Boolean).join(" · "),
        inQty: null, outQty: null, value: null,
        status: { text: HEALTH_LABEL[st].text, tone: HEALTH_LABEL[st].tone },
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movements, pos, suppliers, orders, products]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = allRows.filter((r) =>
      (source === "all" || r.kind === source) &&
      (q === "" || r.title.toLowerCase().includes(q) || r.sub.toLowerCase().includes(q))
    );
    return list.sort((a, b) => (sort === "oldest" ? a.ts - b.ts : b.ts - a.ts));
  }, [allRows, source, query, sort]);

  // Aggregates for whatever the filter currently shows.
  const kpi = useMemo(() => ({
    count: rows.length,
    cin: rows.reduce((s, r) => s + (r.inQty ?? 0), 0),
    cout: rows.reduce((s, r) => s + (r.outQty ? -r.outQty : 0), 0),
    value: rows.reduce((s, r) => s + (r.value ?? 0), 0),
  }), [rows]);

  const kindBadge = (r: LedgerRow) => {
    if (r.kind === "movement") return <span className={`movebadge ${(r.moveType || "").toLowerCase()}`}>{r.moveType}</span>;
    if (r.kind === "po") return <Badge tone="info">Purchase order</Badge>;
    if (r.kind === "sale") return <Badge tone="brand">Sale</Badge>;
    return <Badge tone="warning">Stock alert</Badge>;
  };

  return (
    <>
      <Head title="Stock ledger">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <FlowHelp steps={PRODUCT_FLOW} active="ledger" title="Stock-in flow" />
          <Button variant="primary" size="sm" iconLeft={<Plus />} onClick={() => setAdjustOpen(true)}>New adjustment</Button>
        </div>
      </Head>

      {/* Aggregates for the current filter */}
      <div className="kpis">
        <KpiCard label="Records" value={kpi.count} loading={!allReady} foot="in view" />
        <KpiCard tone="accent" label="Cases in" value={`+${kpi.cin}`} loading={!allReady} foot="received / on order" />
        <KpiCard tone="danger" label="Cases out" value={`-${kpi.cout}`} loading={!allReady} foot="sold / issued" />
        <KpiCard label="Value" value={k(kpi.value)} loading={!allReady} foot="POs + sales in view" />
      </div>

      {/* The "Show" filter navigates between movements / POs / sales / stock health */}
      <ListToolbar
        search={{ value: query, onChange: setQuery, placeholder: "Search item, ref, supplier or store…" }}
        filters={[{ label: "Show", value: source, onChange: (v) => setSource(v as Source), options: SOURCE_OPTS }]}
        sort={{ value: sort, onChange: setSort, options: [{ value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }] }}
      />

      <div className="tablewrap">
        <table className="invtable ledger">
          <thead><tr>
            <th>Date</th>
            <th>Type</th>
            <th>Detail</th>
            <th className="r">In</th>
            <th className="r">Out</th>
            <th className="r">Value</th>
            <th>Status</th>
            <th className="r" aria-label="Actions"></th>
          </tr></thead>
          <tbody>
            {!allReady ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`s${i}`} aria-hidden="true"><td colSpan={8}><Skeleton width="100%" height={18} /></td></tr>
              ))
            ) : rows.length ? rows.map((r) => (
              <tr key={r.key}>
                <td className="mono" style={{ whiteSpace: "nowrap" }}>
                  {r.ts ? <>{ledgerDate(r.ts)} <span className="muted">{ledgerTime(r.ts)}</span></> : <span className="muted">—</span>}
                </td>
                <td>{kindBadge(r)}</td>
                <td><div className="pn">{r.title}</div><div className="mono muted" style={{ fontSize: 11 }}>{r.sub || "—"}</div></td>
                <td className="r mono" style={{ color: r.inQty ? "var(--green)" : "var(--slate-3)", fontWeight: r.inQty ? 600 : 400 }}>{r.inQty ? `+${r.inQty}` : "—"}</td>
                <td className="r mono" style={{ color: r.outQty ? "var(--red)" : "var(--slate-3)", fontWeight: r.outQty ? 600 : 400 }}>{r.outQty ?? "—"}</td>
                <td className="r mono" style={{ fontWeight: r.value != null ? 600 : 400 }}>{r.value != null ? m(r.value) : "—"}</td>
                <td>{r.status ? <Badge tone={r.status.tone}>{r.status.text}</Badge> : <span className="muted">—</span>}</td>
                <td className="r">
                  {r.mv && (
                    <Menu
                      label={`Actions for ${r.title}`}
                      items={[
                        { label: "Edit entry", onSelect: () => openEdit(r.mv!) },
                        { label: "Delete entry", danger: true, onSelect: () => delEntry(r.mv!) },
                      ]}
                    />
                  )}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={8} style={{ padding: 0 }}>
                {error
                  ? <EmptyState title="Couldn't load" description="There was a problem loading the stock ledger." action={<Button variant="ghost" onClick={refresh}>Retry</Button>} />
                  : <div className="muted" style={{ textAlign: "center", padding: "28px 0" }}>Nothing to show for this filter.</div>}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===== Manual adjustment dialog ===== */}
      {adjustOpen && (
        <DialogFrame onClose={() => setAdjustOpen(false)} label="Manual stock adjustment">
          <form className="modal flow" onSubmit={adjust}>
            <h3>Manual adjustment</h3>
            <p className="auth-sub" style={{ marginTop: 0 }}>Correct on-hand stock and record it in the ledger.</p>
            <div className="formgrid">
              <label className="field full"><span>Product</span>
                <Combobox
                  ariaLabel="Product to adjust"
                  placeholder="Type a product name or SKU"
                  value={pid}
                  onChange={setPid}
                  options={products.map((p) => ({ value: String(p.id), label: p.name, hint: `${p.stock} cs` }))}
                />
              </label>
              <label className="field"><span>Qty (±)</span><input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="-3" required /></label>
              <label className="field"><span>Reason</span><input value={reason} onChange={(e) => setReason(e.target.value)} /></label>
            </div>
            <div className="modalbtns">
              <Button variant="ghost" type="button" onClick={() => setAdjustOpen(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Post adjustment</Button>
            </div>
          </form>
        </DialogFrame>
      )}

      {/* ===== Edit ledger entry dialog ===== */}
      {editMv && (
        <DialogFrame onClose={() => setEditMv(null)} label="Edit ledger entry">
          <form className="modal" onSubmit={saveEntry}>
            <h3>Edit ledger entry</h3>
            <p className="auth-sub" style={{ marginTop: 0 }}>{editMv.type} · {editMv.name} · {editMv.sku}</p>
            <div className="formgrid">
              <label className="field full"><span>Reference / reason</span><input value={eRef} onChange={(e) => setERef(e.target.value)} placeholder="cycle count, damage, correction…" /></label>
              <label className="field full"><span>Quantity (±)</span>
                <input type="number" value={eQty} onChange={(e) => setEQty(e.target.value)} disabled={!editable} />
                <small className="muted" style={{ fontSize: 12, marginTop: 5, display: "block" }}>
                  {editable ? "Changing this re-applies the difference to on-hand stock." : "Quantity is locked on system movements. Only the reference can be corrected."}
                </small>
              </label>
            </div>
            <div className="modalbtns">
              <Button variant="ghost" type="button" onClick={() => setEditMv(null)}>Cancel</Button>
              <Button variant="primary" type="submit">Save changes</Button>
            </div>
          </form>
        </DialogFrame>
      )}
    </>
  );
}
