"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useInventory, LOW_STOCK, type Product } from "@/lib/store";
import { useSuppliers, usePurchaseOrders, useReceipts, useInvoices, useCredits, poTotal, PO_FLOW, RECEIVE_TOLERANCE, threeWayMatch } from "@/lib/wms";
import { Plus, Package } from "@/components/Icons";
import { Head, FlowHelp, PRODUCT_FLOW, tableEmpty, m, timeAgo, type Flash } from "../shared";
import { Button, DataTable, EmptyState, Fab, ListToolbar, Progress, Skeleton, ViewToggle, type Column, type ViewMode } from "@/components/ui";
import { rid, matchClass, lineFromProduct } from "./_shared";

/* =======================================================================
   PURCHASE ORDERS — list (opens /admin/purchaseorder/[id])
   ======================================================================= */
export function POTab({ flash }: { flash: Flash }) {
  const { pos, add, ready, error, refresh } = usePurchaseOrders();
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
        <Button variant="primary" size="sm" iconLeft={<Plus />} onClick={() => router.push("/admin/purchaseorder/new")}>New PO</Button>
      </Head>
      <FlowHelp steps={PRODUCT_FLOW} active="po" title="Stock-in flow" />
      {Object.keys(suggestions).length > 0 && (
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-h"><h3>Reorder suggestions</h3><span className="hint">SKUs at/below reorder point, grouped by supplier</span></div>
          <div className="minirows">
            {Object.entries(suggestions).map(([sid, items]) => (
              <div className="minirow" key={sid}>
                <div><div className="ref" style={{ fontFamily: "var(--font-body-f)", fontWeight: 600 }}>{supName(sid)}</div><div className="st2">{items.length} SKU{items.length > 1 ? "s" : ""} need reordering</div></div>
                <Button variant="primary" size="sm" onClick={() => createDraft(sid, items)}>Create draft PO</Button>
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
          loading={!ready}
          empty={tableEmpty(error, refresh, "No purchase orders match.")}
          pageSize={25}
        />
      ) : !ready ? (
        <div className="orders">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="ordercard"><div className="oc-head"><Skeleton width="40%" height={16} /><Skeleton width={80} height={16} /></div><Skeleton width="70%" height={14} /></div>
          ))}
        </div>
      ) : error && poRows.length === 0 ? (
        <EmptyState icon={<Package />} title="Couldn't load" description="There was a problem loading purchase orders." action={<Button variant="ghost" onClick={refresh}>Retry</Button>} />
      ) : (
      <div className="orders">
        {poRows.map((po) => {
          const total = poTotal(po);
          const recv = po.lines.reduce((s, l) => s + l.received, 0);
          const ord = po.lines.reduce((s, l) => s + l.ordered, 0);
          const match = threeWayMatch(po, receipts, invoices, credits);
          return (
            <div className="ordercard clickrow" key={po.id} role="button" tabIndex={0} onClick={() => router.push(`/admin/purchaseorder/${po.id}`)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(`/admin/purchaseorder/${po.id}`); } }}>
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
