"use client";

import { useState } from "react";
import { sku, useInventory } from "@/lib/store";
import { useCategories, useSuppliers, useMovements, csvTemplate, parseCsv, validateRows, rowToProduct, type ImportRow } from "@/lib/wms";
import { Head, type Flash } from "../shared";
import { Arrow } from "@/components/Icons";

/* =======================================================================
   BULK IMPORT  (staging → validate → commit)
   ======================================================================= */
export function ImportTab({ flash }: { flash: Flash }) {
  const { products, addProduct } = useInventory();
  const { categories } = useCategories();
  const { suppliers } = useSuppliers();
  const { log } = useMovements();
  const [text, setText] = useState("");
  const [staging, setStaging] = useState<ImportRow[] | null>(null);

  const validate = () => {
    const rows = parseCsv(text);
    const result = validateRows(rows, {
      categories: categories.map((c) => c.key),
      suppliers: suppliers.map((s) => s.id),
      existingSkus: new Set(products.map((p) => sku(p))),
      existingGtins: new Set(products.map((p) => p.gtin || "").filter(Boolean)),
    });
    setStaging(result);
  };

  const clean = staging?.filter((r) => r.level === "ok") ?? [];
  const bad = staging?.filter((r) => r.level !== "ok") ?? [];

  const commit = () => {
    let id = Math.floor(1000 + Math.random() * 8000);
    clean.forEach((r) => {
      id += 1;
      const p = rowToProduct(r, id);
      addProduct(p);
      log({ sku: sku(p), name: p.name, type: "Receipt", qty: p.stock, ref: "bulk import" });
    });
    flash(`${clean.length} products committed to catalog`);
    setStaging(null); setText("");
  };

  return (
    <>
      <Head title="Bulk import">
        <button className="btn btn-ghost btn-sm" onClick={() => setText(csvTemplate())}>Load sample CSV</button>
      </Head>

      {!staging ? (
        <div className="panel">
          <div className="panel-h"><h3>Paste catalog CSV</h3><span className="hint">columns: name, category, upc, cost, price, caseQty, uom, reorderPoint, maxStock, supplierId, stock</span></div>
          <textarea className="csvbox" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste rows here, or load the sample…" spellCheck={false} />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <button className="btn btn-primary btn-sm" disabled={!text.trim()} onClick={validate}>Validate {parseCsv(text).length || ""} rows <Arrow /></button>
          </div>
        </div>
      ) : (
        <>
          <div className="import-summary">
            <div className="isum ok"><b>{clean.length}</b> clean &amp; ready</div>
            <div className="isum bad"><b>{bad.length}</b> with errors</div>
            <div className="isum"><b>{staging.length}</b> total rows</div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setStaging(null)}>Back to CSV</button>
              <button className="btn btn-primary btn-sm" disabled={!clean.length} onClick={commit}>Commit {clean.length} clean rows</button>
            </div>
          </div>
          <div className="tablewrap">
            <table className="invtable">
              <thead><tr><th>#</th><th>Product</th><th>Category</th><th>UPC</th><th className="r">Price</th><th>Status</th></tr></thead>
              <tbody>
                {staging.map((r) => (
                  <tr key={r.line} className={r.level !== "ok" ? "rowbad" : ""}>
                    <td className="mono muted">{r.line}</td>
                    <td>{r.name || <span className="muted">(blank)</span>}</td>
                    <td className="mono muted">{r.category}</td>
                    <td className="mono muted">{r.gtin || "—"}</td>
                    <td className="r mono">{r.price ? "$" + r.price : "—"}</td>
                    <td>
                      {r.level === "ok"
                        ? <span className="levelbadge ok">Ready</span>
                        : <span className="levelbadge bad" title={r.errors.join("; ")}>{r.level}: {r.errors[0]}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
