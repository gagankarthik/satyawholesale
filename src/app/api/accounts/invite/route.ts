import {
  CognitoIdentityProviderClient, AdminCreateUserCommand, AdminAddUserToGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { getAuth, isAdmin, unauthorized, forbidden } from "@/server/auth";
import { getItem, patchItem } from "@/server/db";
import { env } from "@/server/env";
import { awsClientConfig } from "@/server/aws";
import { readJson, guardResponse, isValidId } from "@/server/guard";

/* POST /api/accounts/invite { accountId }
   Admin approves a trade account: creates the Cognito buyer user
   (Cognito emails the temporary password), tags it with the store name,
   and flips the account record to Active. Idempotent on re-invite. */

export async function POST(req: Request) {
  const user = await getAuth(req);
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();

  let body: { accountId?: string };
  try { body = await readJson(req, 2 * 1024); }
  catch (e) { return guardResponse(e) ?? Response.json({ error: "Send the request as JSON." }, { status: 400 }); }
  const accountId = body?.accountId ?? "";
  if (!isValidId(accountId)) return Response.json({ error: "Invalid account id." }, { status: 400 });
  const account = await getItem("accounts", accountId);
  if (!account) return Response.json({ error: "Account not found." }, { status: 404 });
  const email = String(account.email ?? "");
  const store = String(account.store ?? "");
  if (!/\S+@\S+\.\S+/.test(email)) return Response.json({ error: "The account has no valid email." }, { status: 400 });

  const idp = new CognitoIdentityProviderClient(awsClientConfig());
  try {
    await idp.send(new AdminCreateUserCommand({
      UserPoolId: env.userPoolId,
      Username: email,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "email_verified", Value: "true" },
        { Name: "custom:store", Value: store },
      ],
      DesiredDeliveryMediums: ["EMAIL"],
    }));
  } catch (e) {
    if ((e as Error).name !== "UsernameExistsException") throw e;
  }
  await idp.send(new AdminAddUserToGroupCommand({
    UserPoolId: env.userPoolId, Username: email, GroupName: "buyer",
  }));
  const item = await patchItem("accounts", accountId, { status: "Active", invited: Date.now() });
  return Response.json({ item });
}
