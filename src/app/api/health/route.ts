import { env } from "@/server/env";
import { logError } from "@/server/log";

/* GET /api/health — unauthenticated readiness probe.

   The `env` getters throw when a required server var is missing, and this app's
   whole design depends on those being inlined at build time (see server/env.ts).
   A misconfigured deploy therefore silently 401s every authenticated request.
   This probe turns that silent failure into a loud, monitorable signal: point an
   Amplify healthcheck / uptime monitor at it and a bad deploy shows as 503
   immediately. Reveals no secrets — details are logged server-side only. */
export async function GET() {
  try {
    // Touch every required var; a missing one throws here.
    void env.region;
    void env.table;
    void env.bucket;
    void env.userPoolId;
    void env.clientId;
    return Response.json({ ok: true });
  } catch (e) {
    logError("health", e);
    return Response.json({ ok: false }, { status: 503 });
  }
}
