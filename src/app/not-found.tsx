import type { Metadata } from "next";
import Link from "next/link";
import Brand from "@/components/Brand";
import { Arrow, Home } from "@/components/Icons";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main id="main" className="pagestate errpage">
      <div className="errpage-grid" aria-hidden />
      <span className="errpage-num" aria-hidden>404</span>
      <div className="pagestate-in">
        <Link href="/" className="errpage-brand" aria-label="Satya Wholesale home">
          <Brand height={38} />
        </Link>
        <span className="code">404 · Not found</span>
        <h1>This aisle is empty</h1>
        <p>
          The page you&apos;re looking for has moved or never existed. Let&apos;s get you back to
          something in stock.
        </p>
        <div className="actions">
          <Link href="/" className="btn btn-primary"><Home /> Back to home</Link>
          <Link href="/portal" className="btn btn-ghost">Order portal <Arrow /></Link>
        </div>
      </div>
    </main>
  );
}
