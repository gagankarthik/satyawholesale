"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="pagestate">
      <div className="pagestate-in">
        <span className="code">Console error</span>
        <h1>This view didn&apos;t load</h1>
        <p>
          Something went wrong rendering this admin screen. Retry to reload just
          this panel — the rest of the console stays put.
        </p>
        <div className="actions">
          <button className="btn btn-primary" onClick={() => unstable_retry()}>
            Try again
          </button>
          <a href="/admin/dashboard" className="btn btn-ghost">Go to dashboard</a>
        </div>
        {error.digest && <p className="digest">Ref: {error.digest}</p>}
      </div>
    </div>
  );
}
