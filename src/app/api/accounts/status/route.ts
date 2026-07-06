import {
  CognitoIdentityProviderClient, AdminDisableUserCommand, AdminEnableUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { getAuth, isAdmin, unauthorized, forbidden } from "@/server/auth";
import { getItem, patchItem } from "@/server/db";
import { env } from "@/server/env";
import { awsClientConfig } from "@/server/aws";
import { readJson, guardResponse, isValidId } from "@/server/guard";

/* POST /api/accounts/status { accountId, action }
   Admin-only account controls:
     freeze   -> status "Frozen"  (can sign in + browse, cannot order)
     unfreeze -> status "Active"
     block    -> Cognito AdminDisableUser (cannot sign in) + status "Blocked"
     unblock  -> Cognito AdminEnableUser + status "Active"
   Freeze is enforced on the order path; block is enforced by Cognito. */

const ACTIONS = ["freeze", "unfreeze", "block", "unblock"] as const;
type Action = (typeof ACTIONS)[number];

export async function POST(req: Request) {
  const user = await getAuth(req);
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();

  let body: { accountId?: string; action?: string };
  try { body = await readJson(req, 2 * 1024); }
  catch (e) { return guardResponse(e) ?? Response.json({ error: "Send the request as JSON." }, { status: 400 }); }

  const accountId = body?.accountId ?? "";
  const action = body?.action as Action;
  if (!isValidId(accountId)) return Response.json({ error: "Invalid account id." }, { status: 400 });
  if (!ACTIONS.includes(action)) return Response.json({ error: "Unknown action." }, { status: 400 });

  const account = await getItem("accounts", accountId);
  if (!account) return Response.json({ error: "Account not found." }, { status: 404 });
  const email = String(account.email ?? "");

  if (action === "block" || action === "unblock") {
    if (!/\S+@\S+\.\S+/.test(email)) return Response.json({ error: "The account has no valid email to block." }, { status: 400 });
    const idp = new CognitoIdentityProviderClient(awsClientConfig());
    const Cmd = action === "block" ? AdminDisableUserCommand : AdminEnableUserCommand;
    try {
      await idp.send(new Cmd({ UserPoolId: env.userPoolId, Username: email }));
    } catch (e) {
      // A self-signed-up account always has a Cognito user; tolerate a missing
      // one (e.g. an application that was never invited) by just flipping status.
      if ((e as Error).name !== "UserNotFoundException") throw e;
    }
  }

  const status = action === "freeze" ? "Frozen" : action === "block" ? "Blocked" : "Active";
  const item = await patchItem("accounts", accountId, { status, statusChanged: Date.now() });
  return Response.json({ item });
}
