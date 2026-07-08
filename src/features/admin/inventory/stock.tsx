"use client";

import { useMemo, useState } from "react";
import { sku, deptName, useInventory, CONTACT, type Product, type DeptKey } from "@/lib/store";
import { useMovements, useLocations } from "@/lib/wms";
import { Head, m, k, type Flash } from "../shared";
import { Button, Combobox, DialogFrame, EmptyState, FieldHelp, KpiCard, ListToolbar, Skeleton, type ToolbarOption } from "@/components/ui";
import { Plus } from "@/components/Icons";

/* =======================================================================
   INVENTORY VALUATION — one row per item, valued at average cost, in the
   NetSuite valuation-report shape: Location, Description, Class, Department,
   Subsidiary, Beginning Inv Qty On-Hand and Beginning Average Cost. On-hand
   is the live figure (there is no per-period snapshot store), so "beginning
   as of the From date" reads as the current on-hand balance.
   ======================================================================= */

// The single operating entity every item rolls up to.
const SUBSIDIARY = CONTACT.legalName;
// The catalog's merchandising tag is the closest thing we carry to a NetSuite class.
const CLASS_LABEL: Record<string, string> = { new: "New arrival", pop: "Best seller", low: "Clearance" };

export function InventoryTab({ flash }: { flash: Flash }) {
  const { products, updateProduct, ready: prodReady, error, refresh } = useInventory();
  const { locations } = useLocations();
  const { log } = useMovements();

  const [query, setQuery] = useState("");
  const [dep, setDep] = useState("all");
  const [sort, setSort] = useState("value-desc");

  // Manual adjustment — a single header button opens this dialog.
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [pid, setPid] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("cycle count");

  const locName = (id?: string) => {
    const l = locations.find((x) => x.id === id);
    return l ? [l.zone, l.aisle, l.rack, l.bin].filter(Boolean).join("-") : "—";
  };
  const avgCostOf = (p: Product) => p.cost ?? p.price * 0.7;

  const depOpts: ToolbarOption[] = useMemo(() => {
    const deps = [...new Set(products.map((p) => p.dep))];
    return [{ value: "all", label: "All departments" }, ...deps.map((d) => ({ value: d, label: deptName(d as DeptKey) }))];
  }, [products]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products
      .filter((p) => (dep === "all" || p.dep === dep) && (q === "" || p.name.toLowerCase().includes(q) || sku(p).toLowerCase().includes(q) || (p.gtin ?? "").includes(q)))
      .map((p) => {
        const avgCost = avgCostOf(p);
        return { p, qty: p.stock, avgCost, value: avgCost * p.stock, loc: locName(p.locationId), department: deptName(p.dep), cls: CLASS_LABEL[p.tag ?? ""] ?? "—" };
      });
    return list.sort((a, b) => {
      if (sort === "qty-desc") return b.qty - a.qty;
      if (sort === "name") return a.p.name.localeCompare(b.p.name);
      return b.value - a.value;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, locations, query, dep, sort]);

  const totals = useMemo(() => {
    const qty = rows.reduce((s, r) => s + r.qty, 0);
    const value = rows.reduce((s, r) => s + r.value, 0);
    return { skus: rows.length, qty, value, avg: qty ? value / qty : 0 };
  }, [rows]);

  const adjust = (e: React.FormEvent) => {
    e.preventDefault();
    const p = products.find((x) => String(x.id) === pid);
    const q = Number(qty);
    if (!p || !q) { flash("Pick a product and a non-zero quantity"); return; }
    updateProduct(p.id, { stock: Math.max(0, p.stock + q) });
    log({ sku: sku(p), name: p.name, type: "Adjust", qty: q, ref: reason });
    setQty(""); setPid(""); setAdjustOpen(false); flash("Stock adjusted & logged");
  };

  return (
    <>
      <Head title="Inventory valuation" sub={`On-hand balances valued at average cost · ${SUBSIDIARY}`}>
        <Button variant="primary" size="sm" iconLeft={<Plus />} onClick={() => setAdjustOpen(true)}>New adjustment</Button>
      </Head>

      <div className="kpis">
        <KpiCard label="Items" value={totals.skus} loading={!prodReady} foot="in view" />
        <KpiCard label="On-hand qty" value={totals.qty} loading={!prodReady} foot="cases" />
        <KpiCard tone="accent" label="Inventory value" value={k(totals.value)} loading={!prodReady} foot="at average cost" />
        <KpiCard label="Blended avg cost" value={m(totals.avg)} loading={!prodReady} foot="per case" />
      </div>

      <ListToolbar
        search={{ value: query, onChange: setQuery, placeholder: "Search item, SKU or UPC…" }}
        filters={[{ label: "Department", value: dep, onChange: setDep, options: depOpts }]}
        sort={{ value: sort, onChange: setSort, options: [{ value: "value-desc", label: "Highest value" }, { value: "qty-desc", label: "Most on hand" }, { value: "name", label: "Name A–Z" }] }}
      />

      <div className="tablewrap">
        <table className="invtable ledger valuation">
          <thead><tr>
            <th>Location</th>
            <th>Description</th>
            <th>Class</th>
            <th>Department</th>
            <th>Subsidiary</th>
            <th className="r">Beginning Inv Qty On-Hand <FieldHelp text="Inventory quantity as of the From date. With no per-period snapshot, this is the current on-hand balance." /></th>
            <th className="r">Beginning Average Cost <FieldHelp text="Average cost = Beginning Inv On-Hand Value / Beginning Inv Qty On-Hand. It can differ from the item's recorded cost, and changes across the time horizon; shown for reference." /></th>
            <th className="r">On-Hand Value</th>
          </tr></thead>
          <tbody>
            {!prodReady ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`s${i}`} aria-hidden="true"><td colSpan={8}><Skeleton width="100%" height={18} /></td></tr>
              ))
            ) : rows.length ? rows.map((r) => (
              <tr key={r.p.id}>
                <td className="mono muted" style={{ fontSize: 12 }}>{r.loc}</td>
                <td><div className="pn">{r.p.name}</div><div className="mono muted" style={{ fontSize: 11 }}>{sku(r.p)}</div></td>
                <td className="muted" style={{ fontSize: 13 }}>{r.cls}</td>
                <td style={{ fontSize: 13 }}>{r.department}</td>
                <td className="muted" style={{ fontSize: 13 }}>{SUBSIDIARY}</td>
                <td className="r mono" style={{ fontWeight: 600 }}>{r.qty}</td>
                <td className="r mono">{m(r.avgCost)}</td>
                <td className="r mono" style={{ fontWeight: 600 }}>{m(r.value)}</td>
              </tr>
            )) : (
              <tr><td colSpan={8} style={{ padding: 0 }}>
                {error
                  ? <EmptyState title="Couldn't load" description="There was a problem loading inventory." action={<Button variant="ghost" onClick={refresh}>Retry</Button>} />
                  : <div className="muted" style={{ textAlign: "center", padding: "28px 0" }}>No items match this filter.</div>}
              </td></tr>
            )}
            {rows.length > 0 && (
              <tr className="totalrow">
                <td colSpan={5}><b>Total · {totals.skus} items</b></td>
                <td className="r mono"><b>{totals.qty}</b></td>
                <td className="r mono muted"><b>{m(totals.avg)}</b></td>
                <td className="r mono"><b>{m(totals.value)}</b></td>
              </tr>
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
    </>
  );
}
