/* Server-side environment. Fails loudly with the fix when unconfigured. */
function req(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing env var ${name}. Run \`aws login\`, then \`node scripts/provision-aws.mjs\` to create AWS resources and write .env.local, and restart the server.`
    );
  }
  return v;
}

export const env = {
  // AWS_REGION is the server value; fall back to the public one so a single
  // provisioned region drives both the browser (Cognito) and the data plane.
  get region() { return process.env.AWS_REGION || req("NEXT_PUBLIC_AWS_REGION"); },
  get table() { return req("NEXT_PUBLIC_SATYA_TABLE"); },
  get bucket() { return req("SATYA_BUCKET"); },
  get userPoolId() { return req("COGNITO_USER_POOL_ID"); },
  get clientId() { return req("COGNITO_CLIENT_ID"); },
};
