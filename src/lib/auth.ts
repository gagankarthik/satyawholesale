"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CognitoUserPool, CognitoUser, CognitoUserAttribute, AuthenticationDetails, type CognitoUserSession,
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

/* ---- Customer self-signup (email + password, then email-code confirm) ---- */
export function signUp(email: string, password: string): Promise<SignInResult> {
  return new Promise((resolve) => {
    const p = pool();
    if (!p) return resolve({ error: "Sign-up isn't configured yet. Run the AWS provisioning script first." });
    const attrs = [new CognitoUserAttribute({ Name: "email", Value: email })];
    p.signUp(email, password, attrs, [], (err) => {
      if (err) return resolve({ error: friendly(err) });
      resolve({ ok: true });
    });
  });
}

export function confirmSignUp(email: string, code: string): Promise<SignInResult> {
  return new Promise((resolve) => {
    const p = pool();
    if (!p) return resolve({ error: "Sign-up isn't configured yet." });
    new CognitoUser({ Username: email, Pool: p }).confirmRegistration(code.trim(), true, (err) => {
      if (err) return resolve({ error: friendly(err) });
      resolve({ ok: true });
    });
  });
}

export function resendCode(email: string): Promise<SignInResult> {
  return new Promise((resolve) => {
    const p = pool();
    if (!p) return resolve({ error: "Sign-up isn't configured yet." });
    new CognitoUser({ Username: email, Pool: p }).resendConfirmationCode((err) => {
      if (err) return resolve({ error: friendly(err) });
      resolve({ ok: true });
    });
  });
}

/* Force-refresh the tokens so a just-added group claim (e.g. buyer, after
   onboarding) takes effect without making the user sign out and back in. */
export function refreshSession(): Promise<boolean> {
  return new Promise((resolve) => {
    const user = pool()?.getCurrentUser();
    if (!user) return resolve(false);
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session) return resolve(false);
      user.refreshSession(session.getRefreshToken(), (e2: Error | null) => {
        if (!e2) notify();
        resolve(!e2);
      });
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
  if (name === "UserNotFoundException") return "No account with that email. Create one to get started.";
  if (name === "PasswordResetRequiredException") return "Your password needs a reset. Call the warehouse and we'll send a new invite.";
  if (name === "InvalidPasswordException") return "Passwords need 10+ characters with upper and lower case letters and a number.";
  if (name === "UsernameExistsException") return "An account with this email already exists. Sign in instead.";
  if (name === "CodeMismatchException") return "That verification code isn't correct. Check the email and try again.";
  if (name === "ExpiredCodeException") return "That code has expired. Request a new one.";
  if (name === "LimitExceededException") return "Too many attempts. Please wait a moment and try again.";
  if (name === "UserNotConfirmedException") return "Please confirm your email with the code we sent before signing in.";
  return (err as Error)?.message || "Something went wrong. Try again.";
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

  const isAdmin = session?.isAdmin ?? false;
  const isBuyer = session?.isBuyer ?? false;
  return {
    ready,
    signedIn: !!session,
    isAdmin,
    isBuyer,
    /* Signed in but not yet in a role group => finished sign-up but hasn't
       completed onboarding, so they can't order until they do. */
    needsOnboarding: !!session && !isAdmin && !isBuyer,
    store: session?.store ?? null,
    email: session?.email ?? "",
    signIn,
    completeNewPassword,
    signOut,
  };
}
