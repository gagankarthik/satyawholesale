"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CONTACT } from "@/lib/store";
import { useSession } from "@/lib/auth";
import { Check } from "@/components/Icons";
import { Button } from "@/components/ui";
import Brand from "@/components/Brand";

export default function Login() {
  const router = useRouter();
  const { ready, signedIn, signIn } = useSession();
  const [forgot, setForgot] = useState(false);

  /* already signed in → straight to the portal */
  useEffect(() => {
    if (ready && signedIn) router.replace("/portal");
  }, [ready, signedIn, router]);

  return (
    <div className="auth">
      <Link href="/" className="auth-back">← Back to site</Link>
      <div className="auth-card">
        <aside className="auth-aside">
          <div className="auth-top">
            <Brand dark height={40} />
            <span className="auth-eyebrow mono">Trade order portal</span>
          </div>
          <div>
            <h2>The whole counter,<br />one trade login.</h2>
            <p>Browse the full catalog, build orders by the case, and reorder in two taps.</p>
          </div>
          <ul className="auth-trust">
            <li><span className="ac"><Check /></span> Live case-pack pricing</li>
            <li><span className="ac"><Check /></span> Saved orders &amp; templates</li>
            <li><span className="ac"><Check /></span> Next-day regional delivery</li>
          </ul>
        </aside>
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            signIn();
            router.replace("/portal");
          }}
        >
          <div className="auth-h">Sign in</div>
          <p className="auth-sub">Demo mode — any details will sign you in.</p>
          <label className="field">
            <span>Trade account email</span>
            <input type="email" defaultValue="buyer@yourstore.com" required />
          </label>
          <label className="field">
            <span className="field-row">
              Password
              <button type="button" className="linklike" onClick={() => setForgot((v) => !v)}>Forgot password?</button>
            </span>
            <input type="password" defaultValue="demopass" required />
          </label>
          {forgot && (
            <div className="auth-note">
              Enter your trade email and we&apos;ll send a reset link. For urgent help call{" "}
              <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>.
            </div>
          )}
          <label className="auth-check">
            <input type="checkbox" defaultChecked /> Keep me signed in on this device
          </label>
          <Button variant="primary" type="submit" fullWidth>Enter order portal →</Button>
          <div className="auth-alt">
            No account yet? <Link href="/#account">Request trade access →</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
