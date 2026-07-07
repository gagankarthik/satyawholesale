"use client";

import Image from "next/image";
import Link from "next/link";
import { fmt, productImg, offerActive, effPrice, LOW_STOCK, type Product } from "@/lib/store";
import { usePortal } from "./PortalShell";
import { Plus, Minus } from "@/components/Icons";

export default function ProductCard({ p }: { p: Product }) {
  const { cart, add, changeQty, catName } = usePortal();
  const inCart = cart[p.id] || 0;
  const out = p.stock <= 0;
  return (
    <div className="pcard">
      <Link href={`/portal/products/${p.id}`} className="ph" aria-label={p.name}>
        <Image src={productImg(p)} alt={p.name} fill sizes="232px" style={{ objectFit: "contain" }} />
        {offerActive(p) ? <span className="pb offer">Sale</span> : (
          <>
            {p.tag === "new" && <span className="pb new">New</span>}
            {p.tag === "pop" && <span className="pb pop">Popular</span>}
          </>
        )}
        {(p.tag === "low" || (p.stock <= LOW_STOCK && p.stock > 0)) && <span className="pb low">Low stock</span>}
        {out && <span className="pb oos">Out</span>}
        <span className="stk"><i style={{ background: out ? "var(--red)" : "var(--green)" }} />{p.stock} cs</span>
      </Link>
      <div className="info">
        <span className="cat">{catName(p.dep)}</span>
        <Link href={`/portal/products/${p.id}`} className="nm" style={{ color: "inherit", textDecoration: "none" }}>{p.name}</Link>
        <div className="meta">
          <span className="mono">#{p.id}</span>
          <span className="mono">{p.pack}</span>
        </div>
        <div className="pricerow">
          <span className="pr">${fmt(effPrice(p))}</span>
          {offerActive(p) && <span className="was">${fmt(p.price)}</span>}
          <span className="un">/ {p.unit}</span>
        </div>
        {inCart ? (
          <div className="stepper">
            <button onClick={() => changeQty(p.id, -1)} aria-label="Remove one case"><Minus /></button>
            <span className="qv">{inCart}<small>cases</small></span>
            <button onClick={() => changeQty(p.id, 1)} disabled={inCart >= p.stock} aria-label="Add one case"><Plus /></button>
          </div>
        ) : (
          <button className="addbtn" onClick={() => add(p.id)} disabled={out}>
            {out ? "Out of stock" : <><Plus /> Add to order</>}
          </button>
        )}
      </div>
    </div>
  );
}
