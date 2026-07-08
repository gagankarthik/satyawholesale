"use client";

import { useMemo, useState, Fragment } from "react";
import { useConfirm } from "@/components/Confirm";
import { useLocations, type WLocation } from "@/lib/wms";
import { Plus, Pencil, Trash } from "@/components/Icons";
import { Head, type Flash } from "../shared";
import { Button, DialogFrame, EmptyState, KpiCard, ListToolbar, Menu, Skeleton, type ToolbarOption } from "@/components/ui";

/* =======================================================================
   WAREHOUSE — bins grouped by zone so the storage map reads clearly:
   zone summary rows carry the roll-up utilization, bin rows sit under them.
   ======================================================================= */
const EMPTY_BIN = { zone: "A", aisle: "01", rack: "R1", bin: "B1", capacity: "240", used: "0" };
const fillClass = (pct: number) => (pct >= 85 ? "hot" : pct >= 60 ? "mid" : "");

function CapCell({ pct }: { pct: number }) {
  return (
    <div className="capcell">
      <div className="capbar"><span className={`capfill ${fillClass(pct)}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
      <span className="capnum">{pct}%</span>
    </div>
  );
}

export function WarehouseTab({ flash }: { flash: Flash }) {
  const { locations, update, add, remove, ready, error, refresh } = useLocations();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);
  const [nb, setNb] = useState(EMPTY_BIN);
  const [editId, setEditId] = useState<string | null>(null);
  const [eb, setEb] = useState({ capacity: "", used: "" });
  const [query, setQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState("all");

  const totalCap = locations.reduce((s, l) => s + l.capacity, 0);
  const totalUsed = locations.reduce((s, l) => s + l.used, 0);
  const util = totalCap ? Math.round((totalUsed / totalCap) * 100) : 0;
  const nearFull = locations.filter((l) => l.capacity && l.used / l.capacity >= 0.85).length;
  const zoneCount = new Set(locations.map((l) => l.zone)).size;
  const cur = locations.find((l) => l.id === editId) || null;

  const zoneOpts: ToolbarOption[] = useMemo(
    () => [{ value: "all", label: "All zones" }, ...[...new Set(locations.map((l) => l.zone))].sort().map((z) => ({ value: z, label: `Zone ${z}` }))],
    [locations]
  );

  // Bins grouped by zone, each zone carrying its rolled-up capacity + fill.
  const zones = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = locations.filter((l) =>
      (zoneFilter === "all" || l.zone === zoneFilter) &&
      (q === "" || l.id.toLowerCase().includes(q) || l.aisle.toLowerCase().includes(q) || l.rack.toLowerCase().includes(q) || l.bin.toLowerCase().includes(q))
    );
    const byZone = new Map<string, WLocation[]>();
    for (const l of [...filtered].sort((a, b) => a.id.localeCompare(b.id))) {
      if (!byZone.has(l.zone)) byZone.set(l.zone, []);
      byZone.get(l.zone)!.push(l);
    }
    return [...byZone.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([zone, bins]) => {
      const cap = bins.reduce((s, l) => s + l.capacity, 0);
      const used = bins.reduce((s, l) => s + l.used, 0);
      return { zone, bins, cap, used, pct: cap ? Math.round((used / cap) * 100) : 0 };
    });
  }, [locations, query, zoneFilter]);

  const createBin = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `${nb.zone}-${nb.aisle}-${nb.rack}-${nb.bin}`.toUpperCase();
    if (locations.some((l) => l.id === id)) { flash("That bin already exists"); return; }
    add({ id, zone: nb.zone.toUpperCase(), aisle: nb.aisle, rack: nb.rack, bin: nb.bin, capacity: Number(nb.capacity) || 0, used: Number(nb.used) || 0 });
    setNb(EMPTY_BIN); setAdding(false); flash("Bin added");
  };
  const openEdit = (id: string) => { const l = locations.find((x) => x.id === id)!; setEb({ capacity: String(l.capacity), used: String(l.used) }); setEditId(id); };
  const saveEdit = (e: React.FormEvent) => { e.preventDefault(); if (cur) { update(cur.id, { capacity: Number(eb.capacity) || 0, used: Math.max(0, Number(eb.used) || 0) }); setEditId(null); flash("Bin updated"); } };
  const removeBin = async (l: WLocation) => {
    if (await confirm({ title: "Remove bin?", message: `${l.id} will be removed from the warehouse map.`, confirmLabel: "Remove", danger: true })) { remove(l.id); flash("Bin removed"); }
  };

  return (
    <>
      <Head title="Warehouse">
        <Button variant="primary" size="sm" iconLeft={<Plus />} onClick={() => setAdding(true)}>Add bin</Button>
      </Head>

      <div className="kpis">
        <KpiCard label="Bins" value={locations.length} loading={!ready} foot={`across ${zoneCount} zone${zoneCount === 1 ? "" : "s"}`} />
        <KpiCard label="Total capacity" value={totalCap.toLocaleString()} loading={!ready} foot="cases" />
        <KpiCard tone="accent" label="Utilization" value={`${util}%`} loading={!ready} foot={`${totalUsed.toLocaleString()} cases stored`} />
        <KpiCard tone="warn" label="Near full" value={nearFull} loading={!ready} foot="bins ≥ 85%" />
      </div>

      <ListToolbar
        search={{ value: query, onChange: setQuery, placeholder: "Search bin, aisle or rack…" }}
        filters={[{ label: "Zone", value: zoneFilter, onChange: setZoneFilter, options: zoneOpts }]}
      />

      <div className="tablewrap">
        <table className="invtable ledger">
          <thead><tr>
            <th>Bin</th>
            <th>Aisle</th>
            <th>Rack</th>
            <th>Utilization</th>
            <th className="r">Used / Cap</th>
            <th className="r" aria-label="Actions"></th>
          </tr></thead>
          <tbody>
            {!ready ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`s${i}`} aria-hidden="true"><td colSpan={6}><Skeleton width="100%" height={18} /></td></tr>
              ))
            ) : zones.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 0 }}>
                {error
                  ? <EmptyState title="Couldn't load" description="There was a problem loading warehouse bins." action={<Button variant="ghost" onClick={refresh}>Retry</Button>} />
                  : <div className="muted" style={{ textAlign: "center", padding: "28px 0" }}>{locations.length ? "No bins match." : "No bins yet. Add one to start mapping the warehouse."}</div>}
              </td></tr>
            ) : (
              zones.map((z) => (
                <Fragment key={z.zone}>
                  <tr className="binzone">
                    <td colSpan={3}><span className="binzone-name">Zone {z.zone}</span><span className="binzone-meta">{z.bins.length} bin{z.bins.length === 1 ? "" : "s"}</span></td>
                    <td><CapCell pct={z.pct} /></td>
                    <td className="r mono muted">{z.used} / {z.cap}</td>
                    <td />
                  </tr>
                  {z.bins.map((l) => {
                    const pct = l.capacity ? Math.round((l.used / l.capacity) * 100) : 0;
                    return (
                      <tr key={l.id} className={pct >= 85 ? "rowhot" : ""}>
                        <td className="mono">{l.id}</td>
                        <td>{l.aisle}</td>
                        <td>{l.rack}</td>
                        <td><CapCell pct={pct} /></td>
                        <td className="r mono muted">{l.used} / {l.capacity}</td>
                        <td className="r">
                          <Menu
                            label={`Actions for bin ${l.id}`}
                            items={[
                              { label: "Edit bin", icon: <Pencil />, onSelect: () => openEdit(l.id) },
                              { label: "Remove bin", icon: <Trash />, danger: true, onSelect: () => removeBin(l) },
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {adding && (
        <DialogFrame onClose={() => setAdding(false)} label="Add a bin">
          <form className="modal" onSubmit={createBin}>
            <h3>Add a bin</h3>
            <p className="modalp">A bin ID is built from zone, aisle, rack and bin — e.g. A-01-R1-B1.</p>
            <div className="formgrid">
              <label className="field"><span>Zone</span><input value={nb.zone} onChange={(e) => setNb({ ...nb, zone: e.target.value })} maxLength={2} /></label>
              <label className="field"><span>Aisle</span><input value={nb.aisle} onChange={(e) => setNb({ ...nb, aisle: e.target.value })} /></label>
              <label className="field"><span>Rack</span><input value={nb.rack} onChange={(e) => setNb({ ...nb, rack: e.target.value })} /></label>
              <label className="field"><span>Bin</span><input value={nb.bin} onChange={(e) => setNb({ ...nb, bin: e.target.value })} /></label>
              <label className="field"><span>Capacity (cases)</span><input type="number" min={0} value={nb.capacity} onChange={(e) => setNb({ ...nb, capacity: e.target.value })} /></label>
              <label className="field"><span>Currently used</span><input type="number" min={0} value={nb.used} onChange={(e) => setNb({ ...nb, used: e.target.value })} /></label>
            </div>
            <div className="modalbtns">
              <Button variant="ghost" type="button" onClick={() => setAdding(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Add bin</Button>
            </div>
          </form>
        </DialogFrame>
      )}

      {cur && (
        <DialogFrame onClose={() => setEditId(null)} label="Edit bin">
          <form className="modal" onSubmit={saveEdit}>
            <h3>Bin {cur.id}</h3>
            <p className="modalp">Zone {cur.zone} · aisle {cur.aisle} · rack {cur.rack}</p>
            <div className="formgrid">
              <label className="field"><span>Capacity (cases)</span><input type="number" min={0} value={eb.capacity} onChange={(e) => setEb({ ...eb, capacity: e.target.value })} /></label>
              <label className="field"><span>Currently used</span><input type="number" min={0} value={eb.used} onChange={(e) => setEb({ ...eb, used: e.target.value })} /></label>
            </div>
            <div className="modalbtns">
              <Button variant="ghost" type="button" onClick={() => setEditId(null)}>Cancel</Button>
              <Button variant="primary" type="submit">Save</Button>
            </div>
          </form>
        </DialogFrame>
      )}
    </>
  );
}
