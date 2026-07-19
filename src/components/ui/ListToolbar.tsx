import type { ReactNode } from "react";
import { Search } from "@/components/Icons";
import { cx } from "./cx";

export interface ToolbarOption {
  value: string;
  label: string;
}

export interface ToolbarSelect {
  /** Visible label shown before the control. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ToolbarOption[];
}

export interface ListToolbarProps {
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  /** Zero or more dropdown filters. */
  filters?: ToolbarSelect[];
  /** Optional sort dropdown (labelled "Sort" by default). */
  sort?: Omit<ToolbarSelect, "label"> & { label?: string };
  /** Extra controls rendered at the start of the bar (e.g. filter chips). */
  left?: ReactNode;
  /** Extra controls pinned to the right (e.g. a primary action). */
  right?: ReactNode;
  className?: string;
}

/**
 * Consistent search + filter + sort bar for every list view in the app.
 * Config-driven: pass the controls a page needs and it lays them out the
 * same way everywhere (Jakob's Law — one familiar pattern across pages).
 */
export function ListToolbar({ search, filters, sort, left, right, className }: ListToolbarProps) {
  const selects: ToolbarSelect[] = [
    ...(filters ?? []),
    ...(sort ? [{ ...sort, label: sort.label ?? "Sort" }] : []),
  ];

  return (
    <div className={cx("listbar", className)}>
      {left}
      {search && (
        <div className="lb-search">
          <Search />
          <input
            type="search"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? "Search…"}
            aria-label={search.placeholder ?? "Search"}
          />
        </div>
      )}
      {(selects.length > 0 || right) && (
        <div className="lb-controls">
          {selects.map((s) => (
            <label className="lb-select" key={s.label}>
              <span>{s.label}</span>
              <select value={s.value} onChange={(e) => s.onChange(e.target.value)} aria-label={s.label}>
                {s.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          ))}
          {right}
        </div>
      )}
    </div>
  );
}
