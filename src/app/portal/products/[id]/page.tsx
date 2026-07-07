"use client";

import Image from "next/image";
import Link from "next/link";
import { use } from "react";
import { fmt, sku, productImg, offerActive, effPrice, type Product } from "@/lib/store";
import { Search, Plus, Minus } from "@/components/Icons";
import { EmptyState, Skeleton } from "@/components/ui";
import { usePortal } from "../../PortalShell";
import ProductCard from "../../ProductCard";

export default function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { products, ready, cart, add, changeQty, catName } = usePortal();
  const p = products.find((x) => String(x.id) === id) as Product | undefined;

  if (!p) {
    if (!ready) {
      return (
        <div className="odetail">
          <Link className="detail-back" href="/portal/products">← Back to products</Link>
          <div className="od-cols">
            <div className="panel pd-hero"><Skeleton height={360} radius={12} /></div>
            <aside className="od-side"><div className="panel"><Skeleton height={280} radius={12} /></div></aside>
          </div>
        </div>
      );
    }
    return (
      <div className="odetail">
        <Link className="detail-back" href="/portal/products">← Back to products</Link>
        <EmptyState icon={<Search />} title="Product not found" description="It may have been removed from the catalog." />
      </div>
    );
  }

  const inCart = cart[p.id] || 0;
  const out = p.stock <= 0;
  const related = products.filter((x) => x.dep === p.dep && x.id !== p.id).slice(0, 4);

  return (
    <div className="odetail rise-in">
      <Link className="detail-back" href="/portal/products">← Back to products</Link>
      <div className="od-cols">
        <div className="panel pd-hero">
          <Image src={productImg(p)} alt={p.name} fill sizes="(max-width:1000px) 100vw, 480px" style={{ objectFit: "contain" }} priority />
        </div>
        <aside className="od-side">
          <div className="panel">
            <span className="cat">{catName(p.dep)}</span>
            <h2 className="od-ref" style={{ fontSize: 24, marginTop: 4 }}>{p.name}</h2>
            <div className="pricerow" style={{ margin: "12px 0 16px" }}>
              <span className="pr" style={{ fontSize: 26 }}>${fmt(effPrice(p))}</span>
              {offerActive(p) && <span className="was">${fmt(p.price)}</span>}
              <span className="un">/ {p.unit}</span>
            </div>
            <div className="kvs">
              <div className="kv2"><span>Item #</span><b className="mono">#{p.id}</b></div>
              <div className="kv2"><span>SKU</span><b className="mono">{p.sku?.trim() || "—"}</b></div>
              <div className="kv2"><span>Case pack</span><b>{p.pack}</b></div>
              <div className="kv2"><span>In stock</span><b>{p.stock} cases</b></div>
            </div>
            <div style={{ marginTop: 16 }}>
              {inCart ? (
                <div className="stepper">
                  <button onClick={() => changeQty(p.id, -1)} aria-label="Remove one case"><Minus /></button>
                  <span className="qv">{inCart}<small>cases</small></span>
                  <button onClick={() => changeQty(p.id, 1)} disabled={inCart >= p.stock} aria-label="Add one case"><Plus /></button>
                </div>
              ) : (
                <button className="addbtn" onClick={() => add(p.id)} disabled={out}>{out ? "Out of stock" : <><Plus /> Add to order</>}</button>
              )}
            </div>
          </div>
          {p.description && (
            <div className="panel">
              <div className="panel-h"><h3>Details</h3></div>
              <p style={{ fontSize: 13.5, color: "var(--slate)", lineHeight: 1.6 }}>{p.description}</p>
            </div>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="catrow">
          <div className="catrow-head"><h3>More in {catName(p.dep)}</h3><Link className="viewall" href="/portal/products">Browse all →</Link></div>
          <div className="catrow-scroll">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
        </section>
      )}
    </div>
  );
}
