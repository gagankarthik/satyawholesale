import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main id="main" className="pagestate">
      <div className="pagestate-in">
        <span className="code">404 · Not found</span>
        <h1>This aisle is empty</h1>
        <p>
          The page you&apos;re looking for has moved or never existed. Let&apos;s get you
          back to something in stock.
        </p>
        <div className="actions">
          <Link href="/" className="btn btn-primary">Back to home</Link>
          <Link href="/portal" className="btn btn-ghost">Open order portal</Link>
        </div>
      </div>
    </main>
  );
}
