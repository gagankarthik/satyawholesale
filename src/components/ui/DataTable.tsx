"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cx } from "./cx";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
  width?: string;
  /** Provide a comparable value to make this column header sortable. */
  sortValue?: (row: T) => string | number;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Shows skeleton rows. */
  loading?: boolean;
  skeletonRows?: number;
  /** Rendered when `rows` is empty and not loading. */
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  /** Extra per-row class (e.g. to flag/highlight rows). */
  rowClassName?: (row: T) => string | undefined;
  /** Initial column sort (the column must have a `sortValue`). */
  defaultSort?: { key: string; dir: "asc" | "desc" };
  /** Enables a leading checkbox column for multi-select. */
  selectable?: boolean;
  selected?: Set<string>;
  onToggle?: (key: string) => void;
  onToggleAll?: (keys: string[], select: boolean) => void;
  className?: string;
}

/**
 * Generic, accessible data table. Handles loading (skeletons), empty, and
 * populated states from a declarative `columns` config. Columns with a
 * `sortValue` get clickable headers that cycle asc → desc → off.
 */
export function DataTable<T>({
  columns, rows, rowKey, loading = false, skeletonRows = 5, empty, onRowClick, rowClassName, defaultSort,
  selectable = false, selected, onToggle, onToggleAll, className,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(defaultSort ?? null);
  const colCls = (c: Column<T>) => (c.align === "right" ? "r" : undefined);
  const span = columns.length + (selectable ? 1 : 0);

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null));

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const sv = col.sortValue;
    const out = [...rows].sort((a, b) => {
      const av = sv(a), bv = sv(b);
      return av < bv ? -1 : av > bv ? 1 : 0;
    });
    return sort.dir === "desc" ? out.reverse() : out;
  }, [rows, sort, columns]);

  const visibleKeys = useMemo(() => sortedRows.map(rowKey), [sortedRows, rowKey]);
  const allSelected = !!selected && visibleKeys.length > 0 && visibleKeys.every((k) => selected.has(k));

  return (
    <div className={cx("tablewrap", className)}>
      <table className="invtable">
        <thead>
          <tr>
            {selectable && (
              <th className="dt-check">
                <input type="checkbox" aria-label="Select all rows" checked={allSelected} onChange={() => onToggleAll?.(visibleKeys, !allSelected)} />
              </th>
            )}
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  className={cx(colCls(c), c.sortValue && "th-sortable", active && "th-active")}
                  style={c.width ? { width: c.width } : undefined}
                  scope="col"
                  aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : c.sortValue ? "none" : undefined}
                >
                  {c.sortValue ? (
                    <button type="button" className="th-sort" onClick={() => toggleSort(c.key)}>
                      {c.header}
                      {active && <span className="th-arrow on" aria-hidden="true">{sort!.dir === "asc" ? "↑" : "↓"}</span>}
                    </button>
                  ) : c.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={`s${i}`} className="dt-loading" aria-hidden="true">
                {selectable && <td className="dt-check" />}
                {columns.map((c) => (
                  <td key={c.key} className={colCls(c)}><span className="skeleton dt-skel" /></td>
                ))}
              </tr>
            ))
          ) : sortedRows.length === 0 ? (
            <tr><td colSpan={span} className="tableempty">{empty ?? "No records."}</td></tr>
          ) : (
            sortedRows.map((row) => {
              const k = rowKey(row);
              return (
                <tr
                  key={k}
                  className={cx(onRowClick && "clickrow", selected?.has(k) && "rowsel", rowClassName?.(row))}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={onRowClick ? (e) => { if (e.key === "Enter") onRowClick(row); } : undefined}
                >
                  {selectable && (
                    <td className="dt-check" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label="Select row" checked={selected?.has(k) ?? false} onChange={() => onToggle?.(k)} />
                    </td>
                  )}
                  {columns.map((c) => <td key={c.key} className={colCls(c)}>{c.render(row)}</td>)}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
