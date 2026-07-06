import {
  CognitoIdentityProviderClient, AdminAddUserToGroupCommand, AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { getAuth, unauthorized } from "@/server/auth";
import { getItem, putItem } from "@/server/db";
import { env } from "@/server/env";
import { awsClientConfig } from "@/server/aws";
import { readJson, guardResponse } from "@/server/guard";

/* POST /api/onboarding
   Called by a freshly signed-up, email-confirmed customer to finish setting
   up their account. Tags the Cognito user with their store, puts them in the
   `buyer` group (so they can browse + order), and writes an Active account
   record. The client then refreshes its token to pick up the buyer claim.
   Self-service: any authenticated user may onboard themselves, once. */

export async function POST(req: Request) {
  const user = await getAuth(req);
  if (!user) return unauthorized();

  let body: Record<string, unknown>;
  try { body = await readJson<Record<string, unknown>>(req, 8 * 1024); }
  catch (e) { return guardResponse(e) ?? Response.json({ error: "Send the details as JSON." }, { status: 400 }); }

  const s = (v: unknown, max = 160) => String(v ?? "").trim().slice(0, max);
  const store = s(body.store);
  const contact = s(body.contact);
  if (!store || !contact) {
    return Response.json({ error: "Store name and contact name are required." }, { status: 400 });
  }

  const idp = new CognitoIdentityProviderClient(awsClientConfig());
  // Tag the identity with the store (buyer rows are scoped by custom:store).
  await idp.send(new AdminUpdateUserAttributesCommand({
    UserPoolId: env.userPoolId,
    Username: user.email,
    UserAttributes: [{ Name: "custom:store", Value: store }],
  }));
  // Grant portal + ordering access.
  await idp.send(new AdminAddUserToGroupCommand({
    UserPoolId: env.userPoolId, Username: user.email, GroupName: "buyer",
  }));

  // One account record per identity (keyed by the Cognito sub). Re-onboarding
  // updates the same record rather than creating duplicates.
  const existing = await getItem("accounts", user.sub);
  const account = {
    id: user.sub,
    store,
    contact,
    email: user.email,
    phone: s(body.phone, 30),
    city: s(body.city, 80),
    businessLicense: s(body.businessLicense, 60) || undefined,
    tobaccoLicense: s(body.tobaccoLicense, 60) || undefined,
    since: existing?.since ?? String(new Date().getFullYear()),
    status: "Active" as const,
    applied: existing?.applied ?? Date.now(),
    onboarded: Date.now(),
    selfSignup: true,
  };
  await putItem("accounts", user.sub, account);
  return Response.json({ item: account }, { status: 201 });
}
