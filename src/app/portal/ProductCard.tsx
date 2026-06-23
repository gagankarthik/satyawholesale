"use client";

import Link from "next/link";
import { DEPT_BG, deptName, fmt, LOW_STOCK, type Product } from "@/lib/store";
import { DEPT_COLOR, DEPT_ICON } from "./meta";
import { usePortal } from "./PortalShell";

export default function ProductCard({ p }: { p: Product }) {
  const { cart, add, changeQty } = usePortal();
  const inCart = cart[p.id] || 0;
  const out = p.stock <= 0;
  const Thumb = DEPT_ICON[p.dep];
  return (
    <div className="pcard">
      <Link href={`/portal/products/${p.id}`} className="ph" style={{ background: DEPT_BG[p.dep] }} aria-label={p.name}>
        {p.tag === "new" && <span className="pb new">New</span>}
        {p.tag === "pop" && <span className="pb pop">Popular</span>}
        {(p.tag === "low" || (p.stock <= LOW_STOCK && p.stock > 0)) && <span className="pb low">Low stock</span>}
        {out && <span className="pb oos">Out</span>}
        <span className="stk"><i style={{ background: out ? "var(--red)" : "var(--green)" }} />{p.stock} cs</span>
        <span className="thumb" style={{ color: DEPT_COLOR[p.dep] }}><Thumb /></span>
      </Link>
      <div className="info">
        <span className="cat">{deptName(p.dep)}</span>
        <Link href={`/portal/products/${p.id}`} className="nm" style={{ color: "inherit", textDecoration: "none" }}>{p.name}</Link>
        <div className="meta">
          <span className="mono">#{p.id}</span>
          <span className="mono">{p.pack}</span>
        </div>
        <div className="pricerow">
          <span className="pr">${fmt(p.price)}</span>
          <span className="un">/ {p.unit}</span>
        </div>
        {inCart ? (
          <div className="stepper">
            <button onClick={() => changeQty(p.id, -1)} aria-label="Remove one case">−</button>
            <span className="qv">{inCart}<small>cases</small></span>
            <button onClick={() => changeQty(p.id, 1)} disabled={inCart >= p.stock} aria-label="Add one case">+</button>
          </div>
        ) : (
          <button className="addbtn" onClick={() => add(p.id)} disabled={out}>
            {out ? "Out of stock" : "+ Add to order"}
          </button>
        )}
      </div>
    </div>
  );
}
