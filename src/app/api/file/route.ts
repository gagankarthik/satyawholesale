import { getAuth, isAdmin, unauthorized, forbidden } from "@/server/auth";
import { presignDownload } from "@/server/s3";
import { isValidId } from "@/server/guard";

/* GET /api/file?key=private/… → { url } short-lived presigned S3 URL.
   Private files (account docs, PO attachments) are admin-only. Returns JSON
   (not a redirect) so the browser can attach the auth token and then load the
   presigned URL in an <img> or a new tab. */

export async function GET(req: Request) {
  const user = await getAuth(req);
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();

  const key = new URL(req.url).searchParams.get("key") ?? "";
  // Must be a private object key: `private/<folder>/<file>`, no traversal.
  const parts = key.split("/");
  if (parts.length !== 3 || parts[0] !== "private" || !isValidId(parts[1]) || !isValidId(parts[2])) {
    return Response.json({ error: "Unknown file." }, { status: 400 });
  }
  const url = await presignDownload(key);
  return Response.json({ url });
}
