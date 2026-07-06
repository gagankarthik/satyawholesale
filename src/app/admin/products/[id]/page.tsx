"use client";

import Image from "next/image";
import Link from "next/link";
import { use } from "react";
import { deptName, fmt, sku, productImg, useInventory, LOW_STOCK, type Product } from "@/lib/store";
import { Badge, Skeleton } from "@/components/ui";
import { Search } from "@/components/Icons";

export default function AdminProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { products, ready } = useInventory();
  const p = products.find((x) => String(x.id) === id) as Product | undefined;

  if (!p) {
    if (!ready) {
      return (
        <>
          <Link className="detail-back" href="/admin/products">← All products</Link>
          <header className="adminbar">
            <div><Skeleton width={220} height={26} /><Skeleton width={140} height={14} /></div>
          </header>
          <div className="detail-grid">
            <div className="detail-main">
              <div className="panel"><div className="panel-h"><Skeleton width={120} height={18} /></div><Skeleton width="100%" height={120} /></div>
            </div>
            <aside className="detail-side">
              <div className="panel" style={{ minHeight: 210 }}><Skeleton width="100%" height={190} /></div>
            </aside>
          </div>
        </>
      );
    }
    return (
      <>
        <button className="detail-back" onClick={() => history.back()}>← Products</button>
        <div className="empty"><div className="ei" aria-hidden="true"><Search /></div><h3>Product not found</h3><p>It may have been removed from the catalog.</p></div>
      </>
    );
  }

  const tone = p.stock <= 0 ? "danger" : p.stock <= LOW_STOCK ? "warning" : "success";

  return (
    <>
      <Link className="detail-back" href="/admin/products">← All products</Link>
      <header className="adminbar">
        <div><h1>{p.name}</h1><p>{deptName(p.dep)} · {sku(p)}</p></div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Badge tone={tone}>{p.stock} cases</Badge>
          <Link href={`/admin/products/${p.id}/edit`} className="btn btn-primary btn-sm">Edit product</Link>
        </div>
      </header>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="panel">
            <div className="panel-h"><h3>Master data</h3></div>
            <div className="kvs two">
              <div className="kv2"><span>Item #</span><b className="mono">{p.id}</b></div>
              <div className="kv2"><span>SKU</span><b className="mono">{sku(p)}</b></div>
              <div className="kv2"><span>GTIN</span><b className="mono">{p.gtin || "—"}</b></div>
              <div className="kv2"><span>Department</span><b>{deptName(p.dep)}</b></div>
              <div className="kv2"><span>Case pack</span><b>{p.pack}</b></div>
              <div className="kv2"><span>Unit</span><b>{p.unit}</b></div>
              <div className="kv2"><span>Case qty</span><b>{p.caseQty ?? "—"}</b></div>
              <div className="kv2"><span>Reorder point</span><b>{p.reorderPoint ?? LOW_STOCK}</b></div>
            </div>
          </div>
          {p.description && (
            <div className="panel">
              <div className="panel-h"><h3>Description</h3></div>
              <p style={{ fontSize: 13.5, color: "var(--slate)", lineHeight: 1.6 }}>{p.description}</p>
            </div>
          )}
        </div>

        <aside className="detail-side">
          <div className="panel pd-hero" style={{ minHeight: 210 }}>
            <Image src={productImg(p)} alt={p.name} fill sizes="360px" style={{ objectFit: "contain" }} />
          </div>
          <div className="panel">
            <div className="panel-h"><h3>Pricing</h3></div>
            <div className="kvs">
              <div className="kv2"><span>Sell price</span><b className="mono">${fmt(p.price)}</b></div>
              {p.offerPrice ? <div className="kv2"><span>Offer price</span><b className="mono" style={{ color: "#e8453c" }}>${fmt(p.offerPrice)}</b></div> : null}
              <div className="kv2"><span>Landed cost</span><b className="mono">{p.cost != null ? `$${fmt(p.cost)}` : "—"}</b></div>
              <div className="kv2"><span>Suggested retail</span><b className="mono">{p.mrp != null ? `$${fmt(p.mrp)}` : "—"}</b></div>
              <div className="kv2"><span>Margin</span><b className="mono">{p.cost != null && p.price ? `${Math.round((1 - p.cost / p.price) * 100)}%` : "—"}</b></div>
            </div>
          </div>
          <div className="panel">
            <div className="panel-h"><h3>Stock</h3></div>
            <div className="kvs">
              <div className="kv2"><span>On hand</span><b>{p.stock} cases</b></div>
              <div className="kv2"><span>Status</span><Badge tone={tone}>{p.stock <= 0 ? "Out of stock" : p.stock <= LOW_STOCK ? "Low" : "In stock"}</Badge></div>
              <div className="kv2"><span>Max stock</span><b>{p.maxStock ?? "—"}</b></div>
            </div>
            <Link href={`/admin/products/${p.id}/edit`} className="btn btn-ghost btn-sm" style={{ marginTop: 14 }}>Edit product →</Link>
          </div>
          <div className="panel">
            <div className="panel-h"><h3>Storefront placement</h3></div>
            <div className="kvs">
              <div className="kv2"><span>New arrivals</span><Badge tone={p.onArrivals ? "success" : "neutral"}>{p.onArrivals ? "Featured" : "Hidden"}</Badge></div>
              <div className="kv2"><span>Offers</span><Badge tone={p.onOffers ? "success" : "neutral"}>{p.onOffers ? "Featured" : "Hidden"}</Badge></div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
