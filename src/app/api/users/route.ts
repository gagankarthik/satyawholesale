import {
  CognitoIdentityProviderClient, AdminCreateUserCommand, AdminAddUserToGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { getAuth, isAdmin, unauthorized, forbidden } from "@/server/auth";
import { env } from "@/server/env";
import { awsClientConfig } from "@/server/aws";
import { readJson, guardResponse } from "@/server/guard";

/* POST /api/users { email, role, store? }
   Admin-only: create a login for staff. role "admin" grants the console;
   role "buyer" creates a customer login tied to a store. Cognito emails the
   temporary password; first sign-in forces a reset. Idempotent on re-add. */

export async function POST(req: Request) {
  const user = await getAuth(req);
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();

  let body: { email?: string; role?: string; store?: string };
  try { body = await readJson(req, 2 * 1024); }
  catch (e) { return guardResponse(e) ?? Response.json({ error: "Send the request as JSON." }, { status: 400 }); }

  const email = String(body?.email ?? "").trim().toLowerCase();
  const role = body?.role === "admin" ? "admin" : "buyer";
  const store = String(body?.store ?? "").trim().slice(0, 120);
  if (!/\S+@\S+\.\S+/.test(email)) return Response.json({ error: "A valid email is required." }, { status: 400 });
  if (role === "buyer" && !store) return Response.json({ error: "A customer login needs a store name." }, { status: 400 });

  const idp = new CognitoIdentityProviderClient(awsClientConfig());
  const attrs = [
    { Name: "email", Value: email },
    { Name: "email_verified", Value: "true" },
    ...(role === "buyer" ? [{ Name: "custom:store", Value: store }] : []),
  ];
  try {
    await idp.send(new AdminCreateUserCommand({
      UserPoolId: env.userPoolId,
      Username: email,
      UserAttributes: attrs,
      DesiredDeliveryMediums: ["EMAIL"],
    }));
  } catch (e) {
    if ((e as Error).name !== "UsernameExistsException") throw e;
  }
  await idp.send(new AdminAddUserToGroupCommand({
    UserPoolId: env.userPoolId, Username: email, GroupName: role,
  }));

  return Response.json({ item: { email, role, store: role === "buyer" ? store : null } }, { status: 201 });
}
