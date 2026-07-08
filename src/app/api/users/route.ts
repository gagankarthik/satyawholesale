import {
  CognitoIdentityProviderClient, AdminCreateUserCommand, AdminAddUserToGroupCommand,
  AdminEnableUserCommand, AdminDisableUserCommand, AdminRemoveUserFromGroupCommand,
  ListUsersInGroupCommand, type UserType,
} from "@aws-sdk/client-cognito-identity-provider";
import { getAuth, isAdmin, unauthorized, forbidden } from "@/server/auth";
import { env } from "@/server/env";
import { awsClientConfig } from "@/server/aws";
import { readJson, guardResponse } from "@/server/guard";

/* GET /api/users
   Admin-only: the real console administrators — every login in the Cognito
   `admin` group, read live from the user pool (not the local staff roster, which
   can drift). Returns email, account status and whether the login is enabled. */

const attr = (u: UserType, name: string) =>
  u.Attributes?.find((a) => a.Name === name)?.Value ?? "";

export async function GET(req: Request) {
  const user = await getAuth(req);
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();

  try {
    const idp = new CognitoIdentityProviderClient(awsClientConfig());
    const admins: { email: string; status: string; enabled: boolean; created: number | null }[] = [];
    let nextToken: string | undefined;
    do {
      const r = await idp.send(new ListUsersInGroupCommand({
        UserPoolId: env.userPoolId, GroupName: "admin", NextToken: nextToken, Limit: 60,
      }));
      for (const u of r.Users ?? []) {
        admins.push({
          // With UsernameAttributes: ["email"], the email attribute is the login.
          email: attr(u, "email") || u.Username || "",
          status: u.UserStatus ?? "UNKNOWN",
          enabled: u.Enabled ?? true,
          created: u.UserCreateDate ? u.UserCreateDate.getTime() : null,
        });
      }
      nextToken = r.NextToken;
    } while (nextToken);

    admins.sort((a, b) => a.email.localeCompare(b.email));
    return Response.json({ items: admins });
  } catch (e) {
    const err = e as { name?: string; message?: string };
    console.error("list admins failed", { name: err?.name, message: err?.message });
    return Response.json({ error: "Couldn't load the administrator list." }, { status: 500 });
  }
}

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

/* PATCH /api/users { email, action: "enable" | "disable" }
   Admin-only: flip an admin login's sign-in access. Disabling blocks sign-in
   (Cognito AdminDisableUser); enabling restores it. You can't disable your own
   login (that would lock you out of the console). */
export async function PATCH(req: Request) {
  const user = await getAuth(req);
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();

  let body: { email?: string; action?: string };
  try { body = await readJson(req, 2 * 1024); }
  catch (e) { return guardResponse(e) ?? Response.json({ error: "Send the request as JSON." }, { status: 400 }); }

  const email = String(body?.email ?? "").trim().toLowerCase();
  const action = body?.action;
  if (!/\S+@\S+\.\S+/.test(email)) return Response.json({ error: "A valid email is required." }, { status: 400 });
  if (action !== "enable" && action !== "disable") return Response.json({ error: "Unknown action." }, { status: 400 });
  if (action === "disable" && email === user.email.toLowerCase()) {
    return Response.json({ error: "You can't set your own login inactive." }, { status: 400 });
  }

  try {
    const idp = new CognitoIdentityProviderClient(awsClientConfig());
    const Cmd = action === "enable" ? AdminEnableUserCommand : AdminDisableUserCommand;
    await idp.send(new Cmd({ UserPoolId: env.userPoolId, Username: email }));
    return Response.json({ item: { email, enabled: action === "enable" } });
  } catch (e) {
    const err = e as { name?: string; message?: string };
    console.error("update admin failed", { email, action, name: err?.name, message: err?.message });
    return Response.json({ error: "Couldn't update that login." }, { status: 500 });
  }
}

/* DELETE /api/users { email }
   Admin-only: revoke console access by removing the login from the `admin`
   group. The Cognito login itself is left intact (it may also be a buyer);
   it simply drops off the administrator list. You can't remove yourself. */
export async function DELETE(req: Request) {
  const user = await getAuth(req);
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();

  let body: { email?: string };
  try { body = await readJson(req, 2 * 1024); }
  catch (e) { return guardResponse(e) ?? Response.json({ error: "Send the request as JSON." }, { status: 400 }); }

  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!/\S+@\S+\.\S+/.test(email)) return Response.json({ error: "A valid email is required." }, { status: 400 });
  if (email === user.email.toLowerCase()) {
    return Response.json({ error: "You can't remove your own admin access." }, { status: 400 });
  }

  try {
    const idp = new CognitoIdentityProviderClient(awsClientConfig());
    await idp.send(new AdminRemoveUserFromGroupCommand({
      UserPoolId: env.userPoolId, Username: email, GroupName: "admin",
    }));
    return Response.json({ ok: true });
  } catch (e) {
    const err = e as { name?: string; message?: string };
    console.error("remove admin failed", { email, name: err?.name, message: err?.message });
    return Response.json({ error: "Couldn't remove that admin." }, { status: 500 });
  }
}
