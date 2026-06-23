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
    <main id="main" className="pagestate">
      <div className="pagestate-in">
        <span className="code">Something broke</span>
        <h1>We hit a snag</h1>
        <p>
          An unexpected error stopped this page from loading. Trying again often
          clears it — if it keeps happening, reach out to your account rep.
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
  );
}
