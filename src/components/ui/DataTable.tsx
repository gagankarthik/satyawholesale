"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cx } from "./cx";
import { Arrow, ArrowLeft } from "@/components/Icons";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
  width?: string;
  /** Hide this column on narrow (phone) viewports to keep dense tables readable. */
  hideOnMobile?: boolean;
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
  /** Paginate when rows exceed this size; the pager renders under the table. */
  pageSize?: number;
  /** Row-count choices for the "rows per page" selector. */
  pageSizeOptions?: number[];
  className?: string;
}

/**
 * Generic, accessible data table. Handles loading (skeletons), empty, and
 * populated states from a declarative `columns` config. Columns with a
 * `sortValue` get clickable headers that cycle asc → desc → off.
 */
export function DataTable<T>({
  columns, rows, rowKey, loading = false, skeletonRows = 5, empty, onRowClick, rowClassName, defaultSort,
  selectable = false, selected, onToggle, onToggleAll, pageSize, pageSizeOptions = [25, 50, 100], className,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(defaultSort ?? null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<number | undefined>(pageSize);
  const colCls = (c: Column<T>) => cx(c.align === "right" && "r", c.hideOnMobile && "dt-hide-mobile");
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

  // pagination — clamp the page when the row set shrinks (filtering, deletes)
  const pages = size ? Math.max(1, Math.ceil(sortedRows.length / size)) : 1;
  useEffect(() => { setPage((p) => Math.min(p, pages - 1)); }, [pages]);
  const pagedRows = useMemo(
    () => (size ? sortedRows.slice(page * size, (page + 1) * size) : sortedRows),
    [sortedRows, page, size]
  );

  // compact numbered page window: first, last, and current ±1, ellipses between
  const pageList: (number | "…")[] = [];
  if (size && pages > 1) {
    for (let i = 0; i < pages; i++) {
      if (i === 0 || i === pages - 1 || Math.abs(i - page) <= 1) pageList.push(i);
      else if (pageList[pageList.length - 1] !== "…") pageList.push("…");
    }
  }

  const visibleKeys = useMemo(() => pagedRows.map(rowKey), [pagedRows, rowKey]);
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
            pagedRows.map((row) => {
              const k = rowKey(row);
              return (
                <tr
                  key={k}
                  className={cx(onRowClick && "clickrow", selected?.has(k) && "rowsel", rowClassName?.(row))}
                  role={onRowClick ? "button" : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={onRowClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRowClick(row); } } : undefined}
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
      {size != null && sortedRows.length > pageSizeOptions[0] && (
        <nav className="pager" aria-label="Table pages">
          <label className="pager-size">
            <span>Rows per page</span>
            <select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }} aria-label="Rows per page">
              {pageSizeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <div className="pager-nav">
            <button type="button" className="pager-btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ArrowLeft /></button>
            {pageList.map((pn, i) => pn === "…"
              ? <span key={`e${i}`} className="pager-gap" aria-hidden="true">…</span>
              : <button key={pn} type="button" className={cx("pager-num", pn === page && "on")} aria-current={pn === page ? "page" : undefined} onClick={() => setPage(pn)}>{pn + 1}</button>
            )}
            <button type="button" className="pager-btn" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><Arrow /></button>
          </div>
          <span className="pager-info">{page * size + 1}–{Math.min((page + 1) * size, sortedRows.length)} of {sortedRows.length}</span>
        </nav>
      )}
    </div>
  );
}
