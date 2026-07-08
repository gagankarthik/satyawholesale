"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession, refreshSession } from "@/lib/auth";
import { onboardAccount, ageFromDob, LEGAL_AGE, type AccountDoc } from "@/lib/wms";
import { uploadFile } from "@/lib/api";
import { Alert, Button } from "@/components/ui";
import Brand from "@/components/Brand";
import AuthAside from "@/components/AuthAside";
import { Arrow, Paperclip, Check } from "@/components/Icons";

export default function Onboarding() {
  const router = useRouter();
  const { ready, signedIn, isAdmin, isBuyer } = useSession();
  const [form, setForm] = useState({ store: "", contact: "", phone: "", address: "", city: "", state: "", zip: "", dob: "", businessLicense: "", tobaccoLicense: "" });
  const [docs, setDocs] = useState<{ business: AccountDoc | null; tobacco: AccountDoc | null }>({ business: null, tobacco: null });
  const [uploading, setUploading] = useState<"business" | "tobacco" | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  /* Must be signed in; anyone already onboarded (buyer) or admin skips this. */
  useEffect(() => {
    if (!ready) return;
    if (!signedIn) router.replace("/auth/login");
    else if (isAdmin) router.replace("/admin");
    else if (isBuyer) router.replace("/portal");
  }, [ready, signedIn, isAdmin, isBuyer, router]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  /* Uploads go to the private "documents" S3 folder — only the warehouse can
     read them back (admin-only /api/file), so they stay confidential. */
  const upload = (which: "business" | "tobacco") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setUploading(which); setError("");
    try {
      const url = await uploadFile(f, f.type || "application/pdf", "documents");
      setDocs((d) => ({ ...d, [which]: { name: f.name.slice(0, 160), url, uploaded: Date.now() } }));
    } catch {
      setError("Couldn't upload that file. Attach a PDF or image and try again.");
    } finally {
      setUploading(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.store.trim() || !form.contact.trim()) { setError("Store name and your name are required."); return; }
    const age = ageFromDob(form.dob);
    if (!form.dob) { setError("Please enter your date of birth."); return; }
    if (age == null) { setError("Enter a valid date of birth."); return; }
    if (age < LEGAL_AGE) { setError(`You must be ${LEGAL_AGE} or older to buy from us.`); return; }
    setBusy(true); setError("");
    try {
      await onboardAccount({ ...form, businessLicenseDoc: docs.business ?? undefined, tobaccoLicenseDoc: docs.tobacco ?? undefined });
      // Pick up the new buyer claim before entering the portal. If the in-place
      // token refresh succeeds, a soft nav lands on the dashboard with no reload;
      // if it fails, force a full navigation so the portal reads a fresh session
      // instead of bouncing the buyer straight back here.
      const refreshed = await refreshSession();
      if (refreshed) router.replace("/portal");
      else window.location.assign("/portal");
    } catch (err) {
      setBusy(false);
      setError((err as Error)?.message || "Couldn't complete onboarding. Try again.");
    }
  };

  if (!ready || !signedIn || isAdmin || isBuyer) return <div className="auth" />;

  const uploadField = (which: "business" | "tobacco") => (
    <div className="ob-upload">
      <label className={`btn btn-ghost btn-sm ${uploading === which ? "is-busy" : ""}`}>
        <Paperclip /> {docs[which] ? "Replace document" : "Attach document"}
        <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={upload(which)} disabled={uploading === which} />
      </label>
      {uploading === which
        ? <span className="ob-file muted">Uploading…</span>
        : docs[which] && <span className="ob-file"><Check /> {docs[which]!.name}</span>}
    </div>
  );

  return (
    <div id="main" role="main" className="auth">
      <div className="auth-grid rise-in">
        <AuthAside />

        <form className="auth-form onboard" onSubmit={submit}>
          <Link href="/" className="auth-mini-brand" aria-label="Satya Wholesale home"><Brand height={30} /></Link>
          <div className="auth-head">
            <span className="auth-tag mono">Almost there</span>
            <h1 className="auth-h">Complete your account</h1>
            <p className="auth-sub">One last step before you can browse the catalog and place orders.</p>
          </div>

          <fieldset className="ob-section">
            <legend className="ob-legend mono">Your business</legend>
            <label className="field">
              <span>Store name</span>
              <input value={form.store} onChange={set("store")} placeholder="Your business name" maxLength={120} required autoFocus />
            </label>
            <div className="field-row two">
              <label className="field">
                <span>Your name</span>
                <input value={form.contact} onChange={set("contact")} placeholder="Full name" autoComplete="name" required />
              </label>
              <label className="field">
                <span>Phone</span>
                <input type="tel" value={form.phone} onChange={set("phone")} placeholder="(513) 555-0100" autoComplete="tel" />
              </label>
            </div>
          </fieldset>

          <fieldset className="ob-section">
            <legend className="ob-legend mono">Where you&apos;re located</legend>
            <label className="field">
              <span>Street address</span>
              <input value={form.address} onChange={set("address")} placeholder="123 Reading Rd" autoComplete="address-line1" />
            </label>
            <div className="field-row">
              <label className="field"><span>City</span><input value={form.city} onChange={set("city")} placeholder="Cincinnati" autoComplete="address-level2" /></label>
              <label className="field"><span>State</span><input value={form.state} onChange={set("state")} placeholder="OH" maxLength={2} autoComplete="address-level1" /></label>
              <label className="field"><span>ZIP</span><input value={form.zip} onChange={set("zip")} placeholder="45202" inputMode="numeric" autoComplete="postal-code" /></label>
            </div>
          </fieldset>

          <fieldset className="ob-section">
            <legend className="ob-legend mono">Age &amp; licensing</legend>
            <label className="field">
              <span>Date of birth</span>
              <input type="date" value={form.dob} onChange={set("dob")} max="9999-12-31" required />
              <span className="ob-note mono">We verify you are {LEGAL_AGE} or older.</span>
            </label>
            <div className="field-row two">
              <label className="field">
                <span>Business license # <span className="ob-opt">optional</span></span>
                <input value={form.businessLicense} onChange={set("businessLicense")} placeholder="Speeds up verification" />
                {uploadField("business")}
              </label>
              <label className="field">
                <span>Tobacco license # <span className="ob-opt">optional</span></span>
                <input value={form.tobaccoLicense} onChange={set("tobaccoLicense")} placeholder="For tobacco & vape" />
                {uploadField("tobacco")}
              </label>
            </div>
          </fieldset>

          <p className="auth-hint mono">Buying is limited to licensed retailers, 21 and older.</p>
          {error && <Alert tone="danger">{error}</Alert>}
          <Button variant="primary" type="submit" fullWidth loading={busy} iconRight={<Arrow />}>
            {busy ? "Setting up..." : "Enter the portal"}
          </Button>
          <div className="auth-alt">
            Need help? <Link href="/">Back to the site <Arrow /></Link>
          </div>
        </form>
      </div>
    </div>
  );
}
