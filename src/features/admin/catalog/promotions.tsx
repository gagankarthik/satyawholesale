"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePromotions } from "@/lib/wms";
import { Search } from "@/components/Icons";
import { useConfirm } from "@/components/Confirm";
import { Head, type Flash } from "../shared";
import { Button, Breadcrumb, EmptyState, FieldHelp, ImageUpload, Menu, Skeleton, Switch } from "@/components/ui";

/* =======================================================================
   PROMOTIONS (advertising shown on the buyer dashboard)
   ======================================================================= */
const EMPTY_PROMO = { tag: "New arrivals", title: "", subtitle: "", image: "", link: "", active: true };

/** Full-page create / edit promotion. */
export function PromotionForm({ promoId, flash }: { promoId?: string; flash: Flash }) {
  const router = useRouter();
  const { promos, add, update, remove } = usePromotions();
  const confirm = useConfirm();
  const existing = promoId ? promos.find((p) => p.id === promoId) : undefined;
  const editing = !!existing;
  const [d, setD] = useState(existing
    ? { tag: existing.tag, title: existing.title, subtitle: existing.subtitle, image: existing.image, link: existing.link ?? "", active: existing.active }
    : EMPTY_PROMO);

  if (promoId && !existing) {
    return (
      <>
        <Breadcrumb items={[{ label: "Promotions", href: "/admin/promotions" }, { label: "Not found" }]} />
        <div className="empty"><div className="ei" aria-hidden="true"><Search /></div><h3>Promotion not found</h3></div>
      </>
    );
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!d.image) { flash("A banner image is required"); return; }
    const patch = { tag: d.tag.trim() || "Featured", title: d.title.trim(), subtitle: d.subtitle.trim(), image: d.image, link: d.link.trim(), active: d.active };
    if (editing) { update(existing!.id, patch); flash("Promotion updated"); }
    else { add({ id: "PR-" + Math.floor(10 + Math.random() * 89), ...patch, created: Date.now() }); flash("Promotion published"); }
    router.push("/admin/promotions");
  };

  return (
    <>
      <Breadcrumb items={[{ label: "Promotions", href: "/admin/promotions" }, { label: editing ? (existing!.title || "Untitled") : "New promotion" }]} />
      <header className="adminbar">
        <div><h1>{editing ? (existing!.title || "Untitled promotion") : "New promotion"}</h1><p>{editing ? existing!.id : "Create a banner for the buyer dashboard carousel"}</p></div>
        {editing && (
          <Menu
            label={`More actions for ${existing!.title || "this promotion"}`}
            items={[{ label: "Delete promotion", danger: true, onSelect: async () => { if (await confirm({ title: "Delete promotion?", message: `"${existing!.title}" will be removed from the portal.`, confirmLabel: "Delete", danger: true })) { remove(existing!.id); router.push("/admin/promotions"); flash("Promotion deleted"); } } }]}
          />
        )}
      </header>
      <div className="setpane">
        <form className="panel anim-in" onSubmit={save}>
          <div className="panel-h"><h3>{editing ? "Edit promotion" : "Promotion details"}</h3><span className="hint">Appears on the buyer dashboard carousel while published.</span></div>
          <div className="formgrid">
            <label className="field"><span>Tag</span><input value={d.tag} onChange={(e) => setD({ ...d, tag: e.target.value })} placeholder="New arrivals" /></label>
            <label className="field"><span>Title <FieldHelp text="Optional. Overlaid on the poster in the carousel. Leave blank to show the poster image only." /></span><input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="Fresh vapor & disposables" /></label>
            <label className="field full"><span>Subtitle</span><input value={d.subtitle} onChange={(e) => setD({ ...d, subtitle: e.target.value })} placeholder="The latest Mr Fog, Breeze and EB Design, just landed by the case." /></label>
            <label className="field full"><span>Link <FieldHelp text="Optional. If set, a Shop now button appears on the poster and opens this destination. Leave blank to hide the button." /></span><input value={d.link} onChange={(e) => setD({ ...d, link: e.target.value })} placeholder="/portal/products  or  https://example.com" /></label>
            <div className="field"><span>Visibility</span>
              <Switch checked={d.active} onChange={(v) => setD({ ...d, active: v })} label={d.active ? "Live on the portal carousel" : "Hidden from the portal"} />
            </div>
            <div className="field full"><ImageUpload value={d.image} onChange={(v) => setD({ ...d, image: v })} label="Banner image" aspect="wide" folder="promos" onError={flash} hint="Shown on the buyer dashboard carousel." /></div>
          </div>
          <div className="modalbtns" style={{ marginTop: 8 }}>
            <Button variant="ghost" type="button" onClick={() => router.push("/admin/promotions")}>Cancel</Button>
            <Button variant="primary" type="submit">{editing ? "Save changes" : "Publish promotion"}</Button>
          </div>
        </form>
      </div>
    </>
  );
}

export function PromotionsTab({ flash }: { flash: Flash }) {
  const { promos, update, remove, ready, error, refresh } = usePromotions();
  const confirm = useConfirm();
  const router = useRouter();

  return (
    <>
      <Head title="Promotions" sub="Image banners shown on the buyer dashboard in the order portal">
        <Link className="btn btn-primary btn-sm" href="/admin/promotions/new">+ New promotion</Link>
      </Head>
      {!ready ? (
        <div className="promogrid">
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="promocard" key={i}>
              <span className="promoshot"><Skeleton width="100%" height="100%" radius={0} /></span>
              <div className="promobody"><Skeleton width="60%" height={18} /><Skeleton width="90%" height={14} /></div>
            </div>
          ))}
        </div>
      ) : error && promos.length === 0 ? (
        <EmptyState title="Couldn't load" description="There was a problem loading promotions." action={<Button variant="ghost" onClick={refresh}>Retry</Button>} />
      ) : (
      <div className="promogrid">
        {promos.map((p) => (
          <div className={`promocard ${p.active ? "" : "off"}`} key={p.id}>
            <Link className="promoshot" href={`/admin/promotions/${p.id}`} style={{ backgroundImage: p.image ? `url(${p.image})` : undefined }} aria-label={`Edit ${p.title}`}>
              {!p.image && <span className="muted">no image</span>}
              <span className="promotag">{p.tag}</span>
            </Link>
            <div className="promobody">
              <h3>{p.title}</h3>
              <p>{p.subtitle}</p>
              <div className="rowactions" style={{ marginTop: 12, justifyContent: "space-between", display: "flex", alignItems: "center" }}>
                <Switch checked={p.active} onChange={() => { update(p.id, { active: !p.active }); flash(p.active ? `"${p.title}" hidden from portal` : `"${p.title}" live on portal`); }} label={p.active ? "Live" : "Hidden"} />
                <Menu
                  label={`Actions for ${p.title}`}
                  items={[
                    { label: "Edit promotion", onSelect: () => router.push(`/admin/promotions/${p.id}`) },
                    { label: "Delete promotion", danger: true, onSelect: async () => { if (await confirm({ title: "Delete promotion?", message: `"${p.title}" will be removed from the portal.`, confirmLabel: "Delete", danger: true })) { remove(p.id); flash("Promotion deleted"); } } },
                  ]}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
    </>
  );
}
