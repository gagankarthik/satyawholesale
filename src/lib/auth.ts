"use client";

import { useCallback, useEffect, useState } from "react";

/* =========================================================
   Demo trade-account session. No backend — a flag in
   localStorage gates the order portal. `NEXT_PUBLIC_SKIP_AUTH=1`
   bypasses the gate for local screenshots / previews.
   ========================================================= */
const KEY = "satya.session.v1";
const BYPASS = process.env.NEXT_PUBLIC_SKIP_AUTH === "1";

export function useSession() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(BYPASS);

  useEffect(() => {
    const read = () => setSignedIn(BYPASS || window.localStorage.getItem(KEY) === "1");
    read();
    setReady(true);
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);

  const signIn = useCallback(() => {
    window.localStorage.setItem(KEY, "1");
    setSignedIn(true);
  }, []);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(KEY);
    setSignedIn(false);
  }, []);

  return { ready, signedIn, signIn, signOut };
}
