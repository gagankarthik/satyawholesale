"use client";

import { useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { useLocations } from "@/lib/wms";
import { Close } from "@/components/Icons";
import { Head, type Flash } from "../shared";
import { Button, DialogFrame, EmptyState, Skeleton } from "@/components/ui";

/* =======================================================================
   WAREHOUSE
   ======================================================================= */
const EMPTY_BIN = { zone: "A", aisle: "01", rack: "R1", bin: "B1", capacity: "240", used: "0" };
export function WarehouseTab({ flash }: { flash: Flash }) {
  const { locations, update, add, remove, ready, error, refresh } = useLocations();
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
        <div className="kpi"><div className="kl">Bins</div><div className="kv">{ready ? locations.length : <Skeleton width={70} height={28} />}</div><div className="kf">across {new Set(locations.map((l) => l.zone)).size} zones</div></div>
        <div className="kpi"><div className="kl">Total capacity</div><div className="kv">{ready ? totalCap.toLocaleString() : <Skeleton width={70} height={28} />}</div><div className="kf">cases</div></div>
        <div className="kpi accent"><div className="kl">Utilization</div><div className="kv">{ready ? `${totalCap ? Math.round((totalUsed / totalCap) * 100) : 0}%` : <Skeleton width={70} height={28} />}</div><div className="kf">{totalUsed.toLocaleString()} cases stored</div></div>
        <div className="kpi warn"><div className="kl">Near full</div><div className="kv">{ready ? locations.filter((l) => l.capacity && l.used / l.capacity >= 0.85).length : <Skeleton width={70} height={28} />}</div><div className="kf">bins ≥ 85%</div></div>
      </div>
      <div className="tablewrap">
        <table className="invtable">
          <thead><tr><th>Bin</th><th>Zone</th><th>Aisle</th><th>Rack</th><th>Utilization</th><th className="r">Used / Cap</th><th className="r"></th></tr></thead>
          <tbody>
            {!ready ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`s${i}`} aria-hidden="true"><td colSpan={7}><Skeleton width="100%" height={18} /></td></tr>
              ))
            ) : locations.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 0 }}>
                {error
                  ? <EmptyState title="Couldn't load" description="There was a problem loading warehouse bins." action={<Button variant="ghost" onClick={refresh}>Retry</Button>} />
                  : <div className="muted" style={{ textAlign: "center", padding: "28px 0" }}>No bins yet. Add one to start mapping the warehouse.</div>}
              </td></tr>
            ) : (
              locations.map((l) => {
                const pct = l.capacity ? Math.round((l.used / l.capacity) * 100) : 0;
                return (
                  <tr key={l.id} className="clickrow" style={{ cursor: "pointer" }} onClick={() => openEdit(l.id)}>
                    <td className="mono">{l.id}</td><td>{l.zone}</td><td>{l.aisle}</td><td>{l.rack}</td>
                    <td><div className="capbar"><span className={`capfill ${pct >= 85 ? "hot" : pct >= 60 ? "mid" : ""}`} style={{ width: `${pct}%` }} /></div></td>
                    <td className="r mono muted">{l.used} / {l.capacity}</td>
                    <td className="r" onClick={(e) => e.stopPropagation()}><button className="ia del" onClick={async () => { if (await confirm({ title: "Remove bin?", message: `${l.id} will be removed.`, confirmLabel: "Remove", danger: true })) { remove(l.id); flash("Bin removed"); } }} aria-label="Remove bin"><Close /></button></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {adding && (
        <DialogFrame onClose={() => setAdding(false)} label="Add a bin">
          <form className="modal" onSubmit={createBin}>
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
        </DialogFrame>
      )}

      {cur && (
        <DialogFrame onClose={() => setEditId(null)} label="Edit bin">
          <form className="modal" onSubmit={saveEdit}>
            <h3>Bin {cur.id}</h3>
            <p className="modalp">{cur.zone} · aisle {cur.aisle} · rack {cur.rack}</p>
            <div className="formgrid">
              <label className="field"><span>Capacity (cases)</span><input type="number" min={0} value={eb.capacity} onChange={(e) => setEb({ ...eb, capacity: e.target.value })} /></label>
              <label className="field"><span>Currently used</span><input type="number" min={0} value={eb.used} onChange={(e) => setEb({ ...eb, used: e.target.value })} /></label>
            </div>
            <div className="modalbtns"><button type="button" className="btn btn-ghost" onClick={() => setEditId(null)}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div>
          </form>
        </DialogFrame>
      )}
    </>
  );
}
