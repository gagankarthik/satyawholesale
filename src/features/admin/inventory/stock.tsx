"use client";

import { useMemo, useState } from "react";
import { sku, useInventory } from "@/lib/store";
import { useMovements } from "@/lib/wms";
import { Head, FlowHelp, PRODUCT_FLOW, timeAgo, type Flash } from "../shared";
import { Button, Combobox, EmptyState, ListToolbar, Skeleton, type ToolbarOption } from "@/components/ui";

/* =======================================================================
   INVENTORY LEDGER
   ======================================================================= */
export function InventoryTab({ flash }: { flash: Flash }) {
  const { movements, log, ready, error, refresh } = useMovements();
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
      <ListToolbar
        search={{ value: query, onChange: setQuery, placeholder: "Search product, SKU or ref…" }}
        filters={[{ label: "Type", value: type, onChange: setType, options: typeOpts }]}
        sort={{ value: sort, onChange: setSort, options: [{ value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }] }}
      />
      <div className="tablewrap">
        <table className="invtable">
          <thead><tr><th>Time</th><th>Type</th><th>SKU / Product</th><th>Location</th><th>Ref</th><th className="r">Qty</th></tr></thead>
          <tbody>
            {!ready ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`s${i}`} aria-hidden="true"><td colSpan={6}><Skeleton width="100%" height={18} /></td></tr>
              ))
            ) : (
              <>
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
                {!ledger.length && (
                  <tr><td colSpan={6} style={{ padding: 0 }}>
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
    </>
  );
}
