"use client";

import { useMemo, useState } from "react";
import { sku, useInventory, type Product } from "@/lib/store";
import { useMovements, type StockMovement } from "@/lib/wms";
import { useConfirm } from "@/components/Confirm";
import { Head, FlowHelp, PRODUCT_FLOW, timeAgo, type Flash } from "../shared";
import { Button, Combobox, DialogFrame, EmptyState, KpiCard, ListToolbar, Menu, Skeleton, type ToolbarOption } from "@/components/ui";

/* =======================================================================
   INVENTORY LEDGER
   ======================================================================= */
export function InventoryTab({ flash }: { flash: Flash }) {
  const { movements, log, update, remove, ready, error, refresh } = useMovements();
  const { products, updateProduct } = useInventory();
  const confirm = useConfirm();
  const [pid, setPid] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("cycle count");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("newest");
  const [focus, setFocus] = useState(""); // product id the ledger is scoped to ("" = all)

  // Editing a ledger entry. For manual "Adjust" rows, changing the quantity
  // re-applies the difference to the product's stock so the two stay in sync;
  // system rows (receipts, picks, transfers) allow only a note correction.
  const [editMv, setEditMv] = useState<StockMovement | null>(null);
  const [eQty, setEQty] = useState("");
  const [eRef, setERef] = useState("");
  const editable = editMv?.type === "Adjust";
  const findProduct = (mv: StockMovement): Product | undefined =>
    products.find((p) => sku(p) === mv.sku) ?? products.find((p) => p.name === mv.name);

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

  const typeOpts: ToolbarOption[] = useMemo(
    () => [{ value: "all", label: "All types" }, ...Array.from(new Set(movements.map((mv) => mv.type))).map((t) => ({ value: t, label: t }))],
    [movements]
  );
  const focusProduct = useMemo(() => products.find((p) => String(p.id) === focus), [products, focus]);
  const mvOfFocus = (mv: StockMovement) => !!focusProduct && (mv.sku === sku(focusProduct) || mv.name === focusProduct.name);

  const ledger = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = movements.filter((mv) =>
      (!focusProduct || mvOfFocus(mv)) &&
      (type === "all" || mv.type === type) &&
      (q === "" || mv.name.toLowerCase().includes(q) || mv.sku.toLowerCase().includes(q) || (mv.ref || "").toLowerCase().includes(q))
    );
    return [...list].sort((a, b) => (sort === "oldest" ? a.ts - b.ts : b.ts - a.ts));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movements, query, type, sort, focusProduct]);

  /* Balance sheet for the movements currently in view: opening balance,
     everything received (in), everything issued (out), and the closing balance.
     A running per-row balance is only meaningful for a single product, so it's
     computed when the ledger is focused on one. */
  const stats = useMemo(() => {
    const received = ledger.reduce((s, mv) => s + (mv.qty > 0 ? mv.qty : 0), 0);
    const issued = ledger.reduce((s, mv) => s + (mv.qty < 0 ? -mv.qty : 0), 0);
    if (!focusProduct) return { received, issued, opening: null as number | null, closing: null as number | null, balances: new Map<string, number>() };
    // opening = current on-hand minus every logged change for this product
    const allDelta = movements.filter(mvOfFocus).reduce((s, mv) => s + mv.qty, 0);
    const closing = focusProduct.stock;
    const opening = closing - allDelta;
    const balances = new Map<string, number>();
    let bal = opening;
    for (const mv of [...movements.filter(mvOfFocus)].sort((a, b) => a.ts - b.ts)) { bal += mv.qty; balances.set(mv.id, bal); }
    return { received, issued, opening, closing, balances };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledger, movements, focusProduct]);

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
      <Head title="Stock ledger" />
      <FlowHelp steps={PRODUCT_FLOW} active="ledger" title="Stock-in flow" />
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
      {/* Balance sheet — opening → in/out → closing for whatever is in view */}
      <div className="kpis">
        {focusProduct
          ? <KpiCard label="Opening balance" value={stats.opening ?? 0} foot="cases at start" />
          : <KpiCard label="Movements" value={ledger.length} foot="in view" />}
        <KpiCard tone="accent" label="Received (in)" value={`+${stats.received}`} foot="cases in" />
        <KpiCard tone="danger" label="Issued (out)" value={`-${stats.issued}`} foot="cases out" />
        {focusProduct
          ? <KpiCard label="Closing balance" value={stats.closing ?? 0} foot="on hand now" />
          : <KpiCard label="Net change" value={`${stats.received - stats.issued >= 0 ? "+" : ""}${stats.received - stats.issued}`} foot="cases net" />}
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="ledger-focus">
          <label className="field" style={{ flex: "1 1 280px", margin: 0 }}><span>Ledger for</span>
            <Combobox
              ariaLabel="Focus the ledger on one product"
              placeholder="All products — type a name or SKU to focus one"
              value={focus}
              onChange={setFocus}
              options={products.map((p) => ({ value: String(p.id), label: p.name, hint: `${p.stock} cs` }))}
            />
          </label>
          {focusProduct && <Button variant="ghost" size="sm" onClick={() => setFocus("")}>Show all products</Button>}
        </div>
      </div>

      <ListToolbar
        search={{ value: query, onChange: setQuery, placeholder: "Search product, SKU or ref…" }}
        filters={[{ label: "Type", value: type, onChange: setType, options: typeOpts }]}
        sort={{ value: sort, onChange: setSort, options: [{ value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }] }}
      />
      <div className="tablewrap">
        <table className="invtable">
          <thead><tr><th>Time</th><th>Type</th><th>SKU / Product</th><th>Ref</th><th className="r">In</th><th className="r">Out</th><th className="r">Balance</th><th className="r"></th></tr></thead>
          <tbody>
            {!ready ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`s${i}`} aria-hidden="true"><td colSpan={8}><Skeleton width="100%" height={18} /></td></tr>
              ))
            ) : (
              <>
                {focusProduct && stats.opening !== null && (
                  <tr className="ledger-opening">
                    <td className="muted" style={{ fontSize: 13 }}>—</td>
                    <td><span className="movebadge">Opening</span></td>
                    <td><div className="pn" style={{ fontSize: 13.5 }}>{focusProduct.name}</div><div className="mono muted" style={{ fontSize: 11 }}>{sku(focusProduct)}</div></td>
                    <td className="mono muted">opening balance</td>
                    <td className="r mono muted">—</td>
                    <td className="r mono muted">—</td>
                    <td className="r mono" style={{ fontWeight: 700 }}>{stats.opening}</td>
                    <td />
                  </tr>
                )}
                {ledger.map((mv) => (
                  <tr key={mv.id}>
                    <td className="muted" style={{ fontSize: 13 }}>{timeAgo(mv.ts)}</td>
                    <td><span className={`movebadge ${mv.type.toLowerCase()}`}>{mv.type}</span></td>
                    <td><div className="pn" style={{ fontSize: 13.5 }}>{mv.name}</div><div className="mono muted" style={{ fontSize: 11 }}>{mv.sku}{mv.loc ? ` · ${mv.loc}` : ""}</div></td>
                    <td className="mono muted">{mv.ref}</td>
                    <td className="r mono" style={{ color: mv.qty > 0 ? "var(--green)" : "var(--slate-3)", fontWeight: mv.qty > 0 ? 600 : 400 }}>{mv.qty > 0 ? `+${mv.qty}` : "—"}</td>
                    <td className="r mono" style={{ color: mv.qty < 0 ? "var(--red)" : "var(--slate-3)", fontWeight: mv.qty < 0 ? 600 : 400 }}>{mv.qty < 0 ? mv.qty : "—"}</td>
                    <td className="r mono" style={{ fontWeight: 600 }}>{stats.balances.has(mv.id) ? stats.balances.get(mv.id) : "—"}</td>
                    <td className="r">
                      <Menu
                        label={`Actions for ${mv.name}`}
                        items={[
                          { label: "Edit entry", onSelect: () => openEdit(mv) },
                          { label: "Delete entry", danger: true, onSelect: () => delEntry(mv) },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
                {!ledger.length && (
                  <tr><td colSpan={8} style={{ padding: 0 }}>
                    {error
                      ? <EmptyState title="Couldn't load" description="There was a problem loading the stock ledger." action={<Button variant="ghost" onClick={refresh}>Retry</Button>} />
                      : <div className="muted" style={{ textAlign: "center", padding: "28px 0" }}>No movements match.</div>}
                  </td></tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

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
