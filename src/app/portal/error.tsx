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
        <span className="code">Something broke</span>
        <h1>This page didn&apos;t load</h1>
        <p>
          We couldn&apos;t load your catalog or orders just now. Retry to try
          again — your cart and account stay intact.
        </p>
        <div className="actions">
          <button className="btn btn-primary" onClick={() => unstable_retry()}>
            Try again
          </button>
          <a href="/portal" className="btn btn-ghost">Back to dashboard</a>
        </div>
        {error.digest && <p className="digest">Ref: {error.digest}</p>}
      </div>
    </div>
  );
}
