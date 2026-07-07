"use client";

/* Client-side CSV export: build a spreadsheet from in-memory rows and trigger a
   download. Values are escaped so commas, quotes and newlines survive, and a
   UTF-8 BOM is prepended so Excel opens it in the right encoding. */

type Cell = string | number | null | undefined;

const esc = (v: Cell) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function downloadCsv(filename: string, headers: string[], rows: Cell[][]): void {
  const body = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
