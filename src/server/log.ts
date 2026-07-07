/* Structured server-side logging. Amplify SSR ships stdout/stderr to
   CloudWatch, so emitting one JSON line per event makes failures queryable
   there instead of vanishing. Dependency-free on purpose — swap the sink for
   Sentry/Datadog at the marked hook point if you adopt one. Never log secrets
   or full request bodies; pass only small, non-sensitive `meta`. */
export function logError(context: string, err: unknown, meta?: Record<string, unknown>): void {
  const e = err as { message?: string; name?: string; status?: number };
  try {
    console.error(
      JSON.stringify({
        level: "error",
        context,
        name: e?.name,
        message: e?.message ?? String(err),
        status: e?.status,
        ...meta,
      })
    );
  } catch {
    // logging must never throw and mask the original error
    console.error(`[${context}]`, err);
  }
  // Hook point: forward to Sentry / CloudWatch metric filter here.
}
