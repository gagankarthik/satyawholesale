/* Server-side environment.

   IMPORTANT (Amplify SSR): read every value via a STATIC `process.env.X`
   reference, never a dynamic `process.env[name]` lookup. Next.js inlines the
   literal for static references at build time; Amplify's SSR compute does NOT
   expose the app's env vars to dynamic runtime lookups, so `process.env[name]`
   returns undefined there and the verifier/data layer silently fails (every
   authenticated request 401s). NEXT_PUBLIC_* inline automatically; SATYA_BUCKET
   is inlined via the `env` map in next.config.ts. Locally, .env.local fills
   process.env so both styles work. */
function req(name: string, v: string | undefined): string {
  if (!v) {
    throw new Error(
      `Missing env var ${name}. Run \`node scripts/provision-aws.mjs\` to write .env.local for local dev, and set it in the Amplify console (App settings > Environment variables) for production.`
    );
  }
  return v;
}

export const env = {
  // AWS_REGION is set automatically by the Lambda runtime in prod; locally and
  // in the browser build the public value is the fallback.
  get region() { return req("NEXT_PUBLIC_AWS_REGION", process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION); },
  get table() { return req("NEXT_PUBLIC_SATYA_TABLE", process.env.NEXT_PUBLIC_SATYA_TABLE); },
  get bucket() { return req("SATYA_BUCKET", process.env.SATYA_BUCKET); },
  // Cognito pool/client IDs are public identifiers (they ship in the browser
  // bundle), so the server reads the same NEXT_PUBLIC_ values — one source of
  // truth, and they inline at build for the SSR runtime.
  get userPoolId() { return req("NEXT_PUBLIC_COGNITO_USER_POOL_ID", process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID); },
  get clientId() { return req("NEXT_PUBLIC_COGNITO_CLIENT_ID", process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID); },
};
