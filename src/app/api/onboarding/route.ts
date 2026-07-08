import {
  CognitoIdentityProviderClient, AdminAddUserToGroupCommand, AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { getAuth, unauthorized } from "@/server/auth";
import { getItem, putItem, listByType, nextMemberNo } from "@/server/db";
import { env } from "@/server/env";
import { awsClientConfig } from "@/server/aws";
import { readJson, guardResponse, rateLimit } from "@/server/guard";

/* POST /api/onboarding
   Called by a freshly signed-up, email-confirmed customer to finish setting
   up their account. Tags the Cognito user with their store, puts them in the
   `buyer` group (so they can browse the catalog), and writes a PENDING account
   record — the warehouse approves it before the buyer can place orders. The
   client then refreshes its token to pick up the buyer claim.

   Self-service, but strictly a ONE-WAY link: an identity may claim a store
   only if it has none yet, and only a store no one else owns. A client can
   never relocate its own tenant — order isolation is a match on custom:store,
   so letting a buyer rewrite it would expose another store's orders. */

export async function POST(req: Request) {
  const user = await getAuth(req);
  if (!user) return unauthorized();

  // Blunt abuse: a handful of onboarding attempts per identity per minute.
  if (!rateLimit(`onboard:${user.sub}`, 5, 60_000)) {
    return Response.json({ error: "Too many attempts. Please wait a minute and try again." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try { body = await readJson<Record<string, unknown>>(req, 8 * 1024); }
  catch (e) { return guardResponse(e) ?? Response.json({ error: "Send the details as JSON." }, { status: 400 }); }

  const s = (v: unknown, max = 160) => String(v ?? "").trim().slice(0, max);
  // Accept a verification document only when it points at our own private S3
  // documents folder via an /api/file link — never an external or public URL,
  // so a crafted payload can't turn a stored "document" into a phishing link.
  const doc = (v: unknown) => {
    if (!v || typeof v !== "object") return undefined;
    const o = v as Record<string, unknown>;
    const url = String(o.url ?? "");
    if (!url.startsWith("/api/file?key=private%2Fdocuments%2F") || url.length > 400) return undefined;
    return { name: s(o.name, 160) || "document", url, uploaded: Number(o.uploaded) || Date.now() };
  };
  // Cap the store name at the Cognito custom:store schema limit (MaxLength 120);
  // a longer value makes AdminUpdateUserAttributes reject the whole request.
  const store = s(body.store, 120);
  const contact = s(body.contact);
  if (!store || !contact) {
    return Response.json({ error: "Store name and contact name are required." }, { status: 400 });
  }

  // Everything below touches AWS (DynamoDB + Cognito). Any failure here is an
  // infrastructure problem, not the caller's fault: log the real cause so a 500
  // is diagnosable from the server logs, and return a clean message either way.
  try {
    // Already onboarded? The account record is written LAST (after both Cognito
    // steps), so its very presence proves the setup finished on a prior attempt.
    // Hand it straight back — a returning customer must never get trapped here,
    // even if their token is stale or an AWS step would now hiccup. The client
    // refreshes its session on success and enters the portal.
    const existing = await getItem("accounts", user.sub);
    if (existing) {
      return Response.json({ item: existing }, { status: 200 });
    }

    // --- Genuinely new onboarding from here down ---

    // Never let an identity move to a different store. Only a first-time claim
    // (no store yet) is allowed; order isolation is a match on custom:store.
    if (user.store && user.store !== store) {
      return Response.json({ error: "Your login is already linked to a store. Contact us to change it." }, { status: 409 });
    }
    // The store must not already belong to a different account.
    const accounts = await listByType("accounts");
    if (accounts.some((a) => a.store === store && a.id !== user.sub)) {
      return Response.json({ error: "That store is already registered. Call us if this is your business." }, { status: 409 });
    }

    const idp = new CognitoIdentityProviderClient(awsClientConfig());
    // Tag the identity with the store (buyer rows are scoped by custom:store).
    // Skip if it's already set — a redundant call could only add failure.
    if (user.store !== store) {
      await idp.send(new AdminUpdateUserAttributesCommand({
        UserPoolId: env.userPoolId,
        Username: user.email,
        UserAttributes: [{ Name: "custom:store", Value: store }],
      }));
    }
    // Grant portal + ordering access (idempotent, but skip if already a buyer).
    if (!user.roles.includes("buyer")) {
      await idp.send(new AdminAddUserToGroupCommand({
        UserPoolId: env.userPoolId, Username: user.email, GroupName: "buyer",
      }));
    }

    // One account record per identity, keyed by the Cognito sub.
    const account = {
      id: user.sub,
      store,
      contact,
      email: user.email,
      phone: s(body.phone, 30),
      address: s(body.address, 160) || undefined,
      city: s(body.city, 80),
      state: s(body.state, 40) || undefined,
      zip: s(body.zip, 20) || undefined,
      businessLicense: s(body.businessLicense, 60) || undefined,
      tobaccoLicense: s(body.tobaccoLicense, 60) || undefined,
      dob: s(body.dob, 20) || undefined,
      businessLicenseDoc: doc(body.businessLicenseDoc),
      tobaccoLicenseDoc: doc(body.tobaccoLicenseDoc),
      since: String(new Date().getFullYear()),
      // Strictly-sequential 12-digit membership number, assigned once.
      memberNo: await nextMemberNo(),
      // New accounts start Pending; the warehouse approves before they can order.
      status: "Pending",
      applied: Date.now(),
      onboarded: Date.now(),
      selfSignup: true,
    };
    await putItem("accounts", user.sub, account);
    return Response.json({ item: account }, { status: 201 });
  } catch (e) {
    const err = e as { name?: string; message?: string };
    console.error("onboarding failed", { sub: user.sub, store, name: err?.name, message: err?.message });
    return Response.json({ error: "Couldn't finish setting up your account. Please try again, or call the warehouse if it keeps happening." }, { status: 500 });
  }
}
