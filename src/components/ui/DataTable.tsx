"use client";

import type { ReactNode } from "react";
import { cx } from "./cx";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
  width?: string;
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
  className?: string;
}

/**
 * Generic, accessible data table. Handles the three states every table
 * needs — loading (skeleton rows), empty (zero-data), and populated —
 * from a single declarative `columns` config.
 */
export function DataTable<T>({
  columns, rows, rowKey, loading = false, skeletonRows = 5, empty, onRowClick, rowClassName, className,
}: DataTableProps<T>) {
  const colCls = (c: Column<T>) => (c.align === "right" ? "r" : undefined);

  return (
    <div className={cx("tablewrap", className)}>
      <table className="invtable">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={colCls(c)} style={c.width ? { width: c.width } : undefined} scope="col">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={`s${i}`} className="dt-loading" aria-hidden="true">
                {columns.map((c) => (
                  <td key={c.key} className={colCls(c)}><span className="skeleton dt-skel" /></td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="tableempty">{empty ?? "No records."}</td></tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={cx(onRowClick && "clickrow", rowClassName?.(row))}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === "Enter") onRowClick(row); } : undefined}
              >
                {columns.map((c) => <td key={c.key} className={colCls(c)}>{c.render(row)}</td>)}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
