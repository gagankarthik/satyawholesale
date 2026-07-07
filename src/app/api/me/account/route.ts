import { getAuth, unauthorized } from "@/server/auth";
import { getItem, listByType } from "@/server/db";

/* GET /api/me/account → the caller's OWN trade account (licenses + submitted
   documents) for the portal profile page. The `accounts` collection itself is
   admin-only; this endpoint returns only the caller's row, and only the
   profile-relevant fields — never anyone else's data. */
export async function GET(req: Request) {
  const user = await getAuth(req);
  if (!user) return unauthorized();

  // self-signup accounts key by the Cognito sub; older records match on email/store
  const direct = await getItem("accounts", user.sub);
  const acct =
    direct ??
    (await listByType("accounts")).find(
      (a) => a.email === user.email || (!!user.store && a.store === user.store)
    );

  if (!acct) return Response.json({ account: null });

  const a = acct as Record<string, unknown>;
  return Response.json({
    account: {
      memberNo: a.memberNo ?? null,
      store: a.store ?? null,
      contact: a.contact ?? null,
      email: a.email ?? null,
      phone: a.phone ?? null,
      city: a.city ?? null,
      status: a.status ?? null,
      since: a.since ?? null,
      terms: a.terms ?? null,
      businessLicense: a.businessLicense ?? null,
      tobaccoLicense: a.tobaccoLicense ?? null,
      docs: Array.isArray(a.docs) ? a.docs : [],
    },
  });
}
