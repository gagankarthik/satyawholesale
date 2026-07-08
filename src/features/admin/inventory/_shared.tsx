"use client";

/* Inventory feature — shared kernel: PO id/format helpers, catalog→PO line
   builder, the private-S3 <AuthImage>, and the InvoiceImport dialog (photo OCR
   / paste → staged PO lines). Imported by the inventory/* screens. */
import { useEffect, useRef, useState } from "react";
import { uploadFile, resolveFileUrl } from "@/lib/api";
import { sku, type Product } from "@/lib/store";
import { gpPct, parseInvoiceText, type POLine, type ParsedInvoiceRow } from "@/lib/wms";
import { Button, Combobox, DialogFrame } from "@/components/ui";
import { type Flash } from "../shared";

export const rid = (pre: string) => pre + Math.floor(1000 + Math.random() * 8999);
export const matchClass = (s: string) => s === "Matched" ? "matched" : s === "Variance" ? "variance" : "awaiting";

/** Build a PO line from the catalog, carrying the fields distributor invoices print (UPC, unit, retail). */
export const lineFromProduct = (p: Product, ordered: number): POLine => ({
  sku: sku(p), name: p.name, ordered, received: 0,
  cost: p.cost ?? Math.round(p.price * 0.7 * 100) / 100,
  upc: p.gtin, unit: p.uom ?? "case", retail: p.price, dep: p.dep,
});
export const fmtGp = (l: POLine) => {
  const gp = gpPct(l.retail, l.cost);
  return gp === null ? "—" : `${gp.toFixed(1)}%`;
};

/** Renders a private S3 image (an /api/file link) by exchanging it for a
    short-lived presigned URL an <img> can load. Public URLs render directly. */
export function AuthImage({ src, alt, style, className }: { src: string; alt: string; style?: React.CSSProperties; className?: string }) {
  const [resolved, setResolved] = useState("");
  useEffect(() => {
    let live = true;
    setResolved("");
    resolveFileUrl(src).then((u) => { if (live) setResolved(u); }).catch(() => {});
    return () => { live = false; };
  }, [src]);
  if (!resolved) return <div className={className} style={{ ...style, display: "grid", placeItems: "center", minHeight: 80 }}><span className="spinner" /></div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={resolved} alt={alt} style={style} className={className} />;
}

/** Downscale a photo before OCR / upload so large phone shots stay manageable. */
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
export function InvoiceImport({ products, existingSkus, onAdd, onAttach, onClose, flash }: {
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
    if (!f.type.startsWith("image/")) { flash.error("Choose a photo of the invoice"); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const small = await downscale(String(reader.result));
      setImg(small);        // keep a local copy for OCR
      setImgName(f.name);
      try {
        const blob = await (await fetch(small)).blob();
        const url = await uploadFile(blob, "image/jpeg", "attachments");
        onAttach(url, f.name); // persist the S3 URL on the PO, not the raw image
      } catch {
        flash.info("Couldn't save the invoice photo, but you can still read its lines.");
      }
    };
    reader.readAsDataURL(f);
  };

  const stage = (t: string) => {
    const parsed = parseInvoiceText(t, products);
    setRows(parsed);
    if (!parsed.length) flash.error("No item lines found in that text");
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
      flash.error("Couldn't read the photo. Paste the invoice lines instead");
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
    if (!lines.length) { flash.info(skipped ? "Those products are already on the PO" : "Nothing matched to add"); return; }
    onAdd(lines);
    flash.info(`${lines.length} line${lines.length > 1 ? "s" : ""} added from invoice${skipped ? `, ${skipped} already on the PO` : ""}`);
    onClose();
  };

  const matched = rows?.filter((r) => r.productId).length ?? 0;

  return (
    <DialogFrame onClose={onClose} label="Import invoice lines">
      <div className="modal modal-wide">
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
    </DialogFrame>
  );
}
