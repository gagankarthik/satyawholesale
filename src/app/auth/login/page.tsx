"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CONTACT } from "@/lib/store";
import { useSession } from "@/lib/auth";
import { Alert, Button } from "@/components/ui";
import Brand from "@/components/Brand";

const DEPARTMENTS = "Tobacco · Vape · Smoke · HBA · Grocery · Auto · Accessories";

export default function Login() {
  const router = useRouter();
  const { ready, signedIn, isAdmin, needsOnboarding, signIn, completeNewPassword } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPw, setNewPw] = useState("");
  const [step, setStep] = useState<"signin" | "newpassword">("signin");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  /* already signed in -> straight to the right surface */
  useEffect(() => {
    if (ready && signedIn) router.replace(isAdmin ? "/admin" : needsOnboarding ? "/onboarding" : "/portal");
  }, [ready, signedIn, isAdmin, needsOnboarding, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = step === "signin"
      ? await signIn(email.trim(), password)
      : await completeNewPassword(newPw);
    setBusy(false);
    if ("error" in r) { setError(r.error); return; }
    if ("challenge" in r) { setStep("newpassword"); return; }
    // Signed in: the effect above routes by role (admin / onboarding / portal).
  };

  return (
    <div className="auth">
      <Link href="/" className="auth-back mono">&larr; Back to the site</Link>

      <div className="auth-grid rise-in">
        {/* Order-desk manifest */}
        <aside className="auth-manifest">
          <div className="mf-top">
            <Brand dark height={32} />
            <span className="mf-ref mono">ACCOUNT</span>
          </div>

          <div className="mf-lead">
            <span className="auth-eyebrow mono">Customer order portal</span>
            <h2>Sign in to your<br />customer portal.</h2>
            <p>Licensed wholesale for Greater Cincinnati c-stores. Browse the full catalog, build orders by the case, and reorder in seconds.</p>
          </div>

          <dl className="mf-specs mono">
            <div><dt>Departments</dt><dd>7</dd></div>
            <div><dt>Origin</dt><dd>Cincinnati, OH</dd></div>
            <div><dt>Access</dt><dd className="mf-hi">21+ wholesale</dd></div>
            <div><dt>Pricing</dt><dd>Live case pack</dd></div>
          </dl>

          <div className="mf-depts mono">{DEPARTMENTS}</div>

          <span className="mf-stamp" aria-hidden="true"><b>21+</b><i>Wholesale</i></span>
        </aside>

        {/* Form */}
        <form className="auth-form" onSubmit={submit}>
          <Link href="/" className="auth-mini-brand" aria-label="Satya Wholesale home"><Brand height={30} /></Link>

          {step === "signin" ? (
            <>
              <div className="auth-head">
                <span className="auth-tag mono">Returning buyer</span>
                <h1 className="auth-h">Sign in</h1>
                <p className="auth-sub">Use the login from your account approval email.</p>
              </div>
              <label className="field">
                <span>Customer account email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@store.com" required autoFocus />
              </label>
              <label className="field">
                <span className="field-row">
                  Password
                  <button type="button" className="linklike" onClick={() => setForgot((v) => !v)}>Forgot password?</button>
                </span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
              </label>
              {forgot && (
                <div className="auth-note">
                  Call the warehouse at <a href={CONTACT.phoneHref}>{CONTACT.phone}</a> and we&apos;ll send you a fresh sign-in invite.
                </div>
              )}
            </>
          ) : (
            <>
              <div className="auth-head">
                <span className="auth-tag mono">First sign-in</span>
                <h1 className="auth-h">Set your password</h1>
                <p className="auth-sub">Replace the temporary password from your invite email.</p>
              </div>
              <label className="field">
                <span>New password</span>
                <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" minLength={10} required autoFocus />
              </label>
              <p className="auth-hint mono">10+ characters &middot; upper and lower case &middot; a number</p>
            </>
          )}

          {error && <Alert tone="danger">{error}</Alert>}

          <Button variant="primary" type="submit" fullWidth loading={busy}>
            {busy ? "Signing in..." : step === "signin" ? "Enter order portal →" : "Save password & sign in →"}
          </Button>

          <div className="auth-alt">
            No account yet? <Link href="/signup">Create your account &rarr;</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
