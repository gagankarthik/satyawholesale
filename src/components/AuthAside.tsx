import Link from "next/link";
import Brand from "@/components/Brand";

/* The branding half of the split auth layout: the logo centered, with Terms
   and Privacy links directly below. Shared by every auth page so sign-in and
   sign-up look identical. */
export default function AuthAside() {
  return (
    <aside className="auth-aside">
      <div className="auth-aside-top">
        <Brand dark height={46} />
      </div>
      <nav className="auth-aside-links" aria-label="Legal">
        <Link href="/terms">Terms &amp; Conditions</Link>
        <span aria-hidden="true">·</span>
        <Link href="/privacy">Privacy Policy</Link>
      </nav>
    </aside>
  );
}
