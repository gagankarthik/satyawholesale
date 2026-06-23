"use client";

import { Table, GridView } from "@/components/Icons";

export type ViewMode = "table" | "grid";

export interface ViewToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}

/** Segmented table/grid view switch for list pages. */
export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="viewtoggle" role="group" aria-label="Switch view">
      <button type="button" className={view === "table" ? "on" : ""} aria-pressed={view === "table"} aria-label="Table view" title="Table view" onClick={() => onChange("table")}><Table /></button>
      <button type="button" className={view === "grid" ? "on" : ""} aria-pressed={view === "grid"} aria-label="Grid view" title="Grid view" onClick={() => onChange("grid")}><GridView /></button>
    </div>
  );
}
