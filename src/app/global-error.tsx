"use client"; // Error boundaries must be Client Components

import { Bricolage_Grotesque, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import "./app.css";

const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"], weight: ["700", "800"] });
const body = Inter({ variable: "--font-body", subsets: ["latin"], weight: ["400", "600"] });
const mono = IBM_Plex_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["500"] });

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    // global-error replaces the root layout, so it must define <html> and <body>
    <html lang="en" data-scroll-behavior="smooth" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <main className="pagestate">
          <div className="pagestate-in">
            <span className="code">Application error</span>
            <h1>Something went wrong</h1>
            <p>
              The app ran into a problem it couldn&apos;t recover from on its own.
              Try reloading — if this keeps happening, contact Satya Wholesale.
            </p>
            <div className="actions">
              <button className="btn btn-primary" onClick={() => unstable_retry()}>
                Try again
              </button>
              <a href="/" className="btn btn-ghost">Back to home</a>
            </div>
            {error.digest && <p className="digest">Ref: {error.digest}</p>}
          </div>
        </main>
      </body>
    </html>
  );
}
