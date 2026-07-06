"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession, refreshSession } from "@/lib/auth";
import { onboardAccount } from "@/lib/wms";
import { Alert, Button } from "@/components/ui";
import Brand from "@/components/Brand";

export default function Onboarding() {
  const router = useRouter();
  const { ready, signedIn, isAdmin, isBuyer, email } = useSession();
  const [form, setForm] = useState({ store: "", contact: "", phone: "", city: "", businessLicense: "", tobaccoLicense: "" });
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.store.trim() || !form.contact.trim()) { setError("Store name and your name are required."); return; }
    setBusy(true); setError("");
    try {
      await onboardAccount(form);
      await refreshSession(); // pick up the new buyer claim before entering the portal
      router.replace("/portal");
    } catch (err) {
      setBusy(false);
      setError((err as Error)?.message || "Couldn't complete onboarding. Try again.");
    }
  };

  if (!ready || !signedIn || isAdmin || isBuyer) return <div className="auth" />;

  return (
    <div className="auth">
      <div className="auth-grid rise-in">
        <aside className="auth-manifest">
          <div className="mf-top">
            <Brand dark height={32} />
            <span className="mf-ref mono">STEP 2</span>
          </div>
          <div className="mf-lead">
            <span className="auth-eyebrow mono">Onboarding</span>
            <h2>Tell us about<br />your store.</h2>
            <p>A few details about your business so we can set up your customer account. Your login is {email}.</p>
          </div>
          <dl className="mf-specs mono">
            <div><dt>Next</dt><dd>Full catalog</dd></div>
            <div><dt>Pricing</dt><dd className="mf-hi">Live case pack</dd></div>
          </dl>
          <span className="mf-stamp" aria-hidden="true"><b>21+</b><i>Wholesale</i></span>
        </aside>

        <form className="auth-form" onSubmit={submit}>
          <div className="auth-head">
            <span className="auth-tag mono">Almost there</span>
            <h1 className="auth-h">Complete your account</h1>
            <p className="auth-sub">This is the last step before you can browse and order.</p>
          </div>
          <label className="field">
            <span>Store name</span>
            <input value={form.store} onChange={set("store")} placeholder="Your business name" required autoFocus />
          </label>
          <label className="field">
            <span>Your name</span>
            <input value={form.contact} onChange={set("contact")} placeholder="Full name" required />
          </label>
          <label className="field">
            <span>Phone</span>
            <input value={form.phone} onChange={set("phone")} placeholder="(513) 555-0100" autoComplete="tel" />
          </label>
          <label className="field">
            <span>City</span>
            <input value={form.city} onChange={set("city")} placeholder="Cincinnati" />
          </label>
          <label className="field">
            <span>Business license #</span>
            <input value={form.businessLicense} onChange={set("businessLicense")} placeholder="Speeds up verification" />
          </label>
          <label className="field">
            <span>Tobacco license #</span>
            <input value={form.tobaccoLicense} onChange={set("tobaccoLicense")} placeholder="Needed for tobacco & vape" />
          </label>
          <p className="auth-hint mono">Buying is limited to licensed retailers, 21 and older.</p>
          {error && <Alert tone="danger">{error}</Alert>}
          <Button variant="primary" type="submit" fullWidth loading={busy}>
            {busy ? "Setting up..." : "Enter the portal →"}
          </Button>
          <div className="auth-alt">
            Need help? <Link href="/">Back to the site &rarr;</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
