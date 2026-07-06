"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CognitoUserPool, CognitoUser, AuthenticationDetails, type CognitoUserSession,
} from "amazon-cognito-identity-js";

/* =========================================================
   Cognito session for the customer portal and admin console.
   Roles come from Cognito groups (admin / buyer); a buyer's
   store name rides on the custom:store attribute.
   ========================================================= */

const poolConfig = () => ({
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? "",
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "",
});

let _pool: CognitoUserPool | null = null;
function pool(): CognitoUserPool | null {
  const cfg = poolConfig();
  if (!cfg.UserPoolId || !cfg.ClientId) return null; // not provisioned yet
  return (_pool ??= new CognitoUserPool(cfg));
}

export interface Session {
  email: string;
  store: string | null;
  isAdmin: boolean;
  isBuyer: boolean;
  idToken: string;
}

function toSession(s: CognitoUserSession): Session {
  const p = s.getIdToken().payload as Record<string, unknown>;
  const groups = (p["cognito:groups"] as string[] | undefined) ?? [];
  return {
    email: String(p.email ?? ""),
    store: (p["custom:store"] as string | undefined) ?? null,
    isAdmin: groups.includes("admin"),
    isBuyer: groups.includes("buyer") || groups.includes("admin"),
    idToken: s.getIdToken().getJwtToken(),
  };
}

/** Fresh ID token for API calls (SDK refreshes via the refresh token). */
export function getIdToken(): Promise<string | null> {
  return new Promise((resolve) => {
    const user = pool()?.getCurrentUser();
    if (!user) return resolve(null);
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      resolve(err || !session?.isValid() ? null : session.getIdToken().getJwtToken());
    });
  });
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

/* the user mid-way through a NEW_PASSWORD_REQUIRED challenge */
let pendingUser: CognitoUser | null = null;

export type SignInResult =
  | { ok: true }
  | { challenge: "NEW_PASSWORD" }
  | { error: string };

export function signIn(email: string, password: string): Promise<SignInResult> {
  return new Promise((resolve) => {
    const p = pool();
    if (!p) return resolve({ error: "Sign-in isn't configured yet. Run the AWS provisioning script first." });
    const user = new CognitoUser({ Username: email, Pool: p });
    user.authenticateUser(new AuthenticationDetails({ Username: email, Password: password }), {
      onSuccess: () => { pendingUser = null; notify(); resolve({ ok: true }); },
      onFailure: (err) => resolve({ error: friendly(err) }),
      newPasswordRequired: () => { pendingUser = user; resolve({ challenge: "NEW_PASSWORD" }); },
    });
  });
}

export function completeNewPassword(newPassword: string): Promise<SignInResult> {
  return new Promise((resolve) => {
    if (!pendingUser) return resolve({ error: "Start again from the sign-in form." });
    pendingUser.completeNewPasswordChallenge(newPassword, {}, {
      onSuccess: () => { pendingUser = null; notify(); resolve({ ok: true }); },
      onFailure: (err) => resolve({ error: friendly(err) }),
    });
  });
}

export function signOutUser() {
  pool()?.getCurrentUser()?.signOut();
  notify();
}

function friendly(err: unknown): string {
  const name = (err as { name?: string })?.name ?? "";
  if (name === "NotAuthorizedException") return "Wrong email or password.";
  if (name === "UserNotFoundException") return "No account with that email. Apply for customer access first.";
  if (name === "PasswordResetRequiredException") return "Your password needs a reset. Call the warehouse and we'll send a new invite.";
  if (name === "InvalidPasswordException") return "Passwords need 10+ characters with upper and lower case letters and a number.";
  return (err as Error)?.message || "Sign-in failed. Try again.";
}

export function useSession() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const read = () => {
      const user = pool()?.getCurrentUser();
      if (!user) { setSession(null); setReady(true); return; }
      user.getSession((err: Error | null, s: CognitoUserSession | null) => {
        setSession(err || !s?.isValid() ? null : toSession(s));
        setReady(true);
      });
    };
    read();
    listeners.add(read);
    return () => { listeners.delete(read); };
  }, []);

  const signOut = useCallback(() => { signOutUser(); }, []);

  return {
    ready,
    signedIn: !!session,
    isAdmin: session?.isAdmin ?? false,
    isBuyer: session?.isBuyer ?? false,
    store: session?.store ?? null,
    email: session?.email ?? "",
    signIn,
    completeNewPassword,
    signOut,
  };
}
