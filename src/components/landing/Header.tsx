"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Arrow } from "@/components/Icons";
import { useSession } from "@/lib/auth";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);
  const { ready, signedIn, isAdmin, needsOnboarding } = useSession();
  const loggedIn = ready && signedIn;
  const dest = isAdmin ? "/admin" : needsOnboarding ? "/onboarding" : "/portal";
  const destLabel = isAdmin ? "Go to console" : needsOnboarding ? "Finish setup" : "Go to portal";

  return (
    <header className="nav" id="nav">
      <div className="wrap nav-in">
        <a href="#main" className="brand" aria-label="Satya Wholesale home">
          <Image src="/logo.webp" alt="Satya Wholesale, Cincinnati cash and carry distributor" width={232} height={58} priority />
        </a>
        <nav className="nav-links" aria-label="Primary">
          <a href="#departments">Products</a>
          <a href="#how">How it works</a>
          <a href="#process">Get started</a>
          <a href="#why">Why us</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="nav-cta">
          {loggedIn ? (
            <Link className="btn btn-primary btn-sm" href={dest}>{destLabel} <Arrow /></Link>
          ) : (
            <>
              <Link className="btn btn-ghost btn-sm" href="/auth/login">Login</Link>
              <Link className="btn btn-primary btn-sm" href="/auth/signup">Open an account <Arrow /></Link>
            </>
          )}
          <button className="burger" aria-label="Toggle menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d={menuOpen ? "M6 6l12 12M18 6 6 18" : "M4 7h16M4 12h16M4 17h16"} strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="mobmenu">
          <a href="#departments" onClick={close}>Products</a>
          <a href="#how" onClick={close}>How it works</a>
          <a href="#process" onClick={close}>Get started</a>
          <a href="#why" onClick={close}>Why us</a>
          <a href="#faq" onClick={close}>FAQ</a>
          <a href="#contact" onClick={close}>Contact</a>
          {loggedIn ? (
            <Link className="btn btn-primary" href={dest} onClick={close}>{destLabel} <Arrow /></Link>
          ) : (
            <>
              <Link href="/auth/login" onClick={close}>Login <Arrow /></Link>
              <Link className="btn btn-primary" href="/auth/signup" onClick={close}>Open an account <Arrow /></Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
