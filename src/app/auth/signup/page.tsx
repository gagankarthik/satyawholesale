"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession, signUp, confirmSignUp, resendCode, signIn } from "@/lib/auth";
import { Alert, Button } from "@/components/ui";
import Brand from "@/components/Brand";
import AuthAside from "@/components/AuthAside";
import { Arrow, ArrowLeft } from "@/components/Icons";

export default function SignUp() {
  const router = useRouter();
  const { ready, signedIn, isAdmin, needsOnboarding } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  /* Already signed in: route to where they belong. */
  useEffect(() => {
    if (!ready || !signedIn) return;
    router.replace(isAdmin ? "/admin" : needsOnboarding ? "/onboarding" : "/portal");
  }, [ready, signedIn, isAdmin, needsOnboarding, router]);

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    const r = await signUp(email.trim().toLowerCase(), password);
    setBusy(false);
    if ("error" in r) { setError(r.error); return; }
    setNote(`We emailed a verification code to ${email.trim().toLowerCase()}.`);
    setStep("confirm");
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    const r = await confirmSignUp(email.trim().toLowerCase(), code);
    if ("error" in r) { setBusy(false); setError(r.error); return; }
    // Auto sign-in with the password they just set, then send to onboarding.
    const s = await signIn(email.trim().toLowerCase(), password);
    setBusy(false);
    if ("error" in s) { router.replace("/auth/login"); return; }
    router.replace("/onboarding");
  };

  const resend = async () => {
    setError(""); setNote("");
    const r = await resendCode(email.trim().toLowerCase());
    if ("error" in r) setError(r.error);
    else setNote("A new code is on its way.");
  };

  return (
    <div id="main" role="main" className="auth">
      <Link href="/" className="auth-back mono"><ArrowLeft /> Back to the site</Link>

      <div className="auth-grid rise-in">
        <AuthAside />

        {step === "form" ? (
          <form className="auth-form" onSubmit={createAccount}>
            <Link href="/" className="auth-mini-brand" aria-label="Satya Wholesale home"><Brand height={30} /></Link>
            <div className="auth-head">
              <span className="auth-tag mono">Get started</span>
              <h1 className="auth-h">Create your account</h1>
              <p className="auth-sub">Use your store email. You will verify it with a code on the next step.</p>
            </div>
            <label className="field">
              <span>Work email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@store.com" required autoFocus />
            </label>
            <label className="field">
              <span>Password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={10} required />
            </label>
            <p className="auth-hint mono">10+ characters &middot; upper and lower case &middot; a number</p>
            {error && <Alert tone="danger">{error}</Alert>}
            <Button variant="primary" type="submit" fullWidth loading={busy} iconRight={<Arrow />}>
              {busy ? "Creating account..." : "Create account"}
            </Button>
            <div className="auth-alt">
              Already have an account? <Link href="/auth/login">Sign in <Arrow /></Link>
            </div>
          </form>
        ) : (
          <form className="auth-form" onSubmit={confirm}>
            <Link href="/" className="auth-mini-brand" aria-label="Satya Wholesale home"><Brand height={30} /></Link>
            <div className="auth-head">
              <span className="auth-tag mono">Verify email</span>
              <h1 className="auth-h">Enter your code</h1>
              <p className="auth-sub">{note || "Enter the 6-digit code we emailed you."}</p>
            </div>
            <label className="field">
              <span>Verification code</span>
              <input inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" required autoFocus />
            </label>
            {error && <Alert tone="danger">{error}</Alert>}
            <Button variant="primary" type="submit" fullWidth loading={busy} iconRight={<Arrow />}>
              {busy ? "Verifying..." : "Verify & continue"}
            </Button>
            <div className="auth-alt">
              Didn&apos;t get it? <button type="button" className="linklike" onClick={resend}>Resend code</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
